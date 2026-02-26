import { uploadImage } from '@/lib/cloudinary.service';
import { execute } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BannerType = 'offline' | 'online' | 'syncing' | 'info' | null;

interface PendingUpload {
    localUri: string;
    eventId: string | number;
    fieldName: string;
    timestamp: number;
}

interface NetworkContextType {
    isOnline: boolean;
    bannerType: BannerType;
    bannerMessage: string;
    pendingUploads: PendingUpload[];
    queueImageUpload: (localUri: string, eventId: string | number, fieldName?: string) => void;
    showBanner: (type: BannerType, message: string, autoDismiss?: number) => void;
    dismissBanner: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const PENDING_UPLOADS_KEY = 'bloodconnect_pending_uploads';

// ─── Provider ────────────────────────────────────────────────────────────────

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [bannerType, setBannerType] = useState<BannerType>(null);
    const [bannerMessage, setBannerMessage] = useState('');
    const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOnlineRef = useRef(true); // Ref to avoid stale closures

    useEffect(() => {
        loadPendingUploads();
    }, []);

    // Setup network listener
    useEffect(() => {
        if (Platform.OS === 'web') return;

        let unsubscribe: (() => void) | null = null;

        const setupNetInfo = async () => {
            try {
                const NetInfo = require('@react-native-community/netinfo').default;

                unsubscribe = NetInfo.addEventListener((state: any) => {
                    const connected = state.isConnected ?? false;
                    const wasOnline = isOnlineRef.current;

                    isOnlineRef.current = connected;
                    setIsOnline(connected);

                    if (!connected && wasOnline) {
                        // Just went offline
                        showBannerInternal('offline', 'No internet connection');
                    } else if (connected && !wasOnline) {
                        // Back online
                        showBannerInternal('online', 'Back online — syncing data...', 4000);
                    }
                });

                const state = await NetInfo.fetch();
                const initialOnline = state.isConnected ?? true;
                isOnlineRef.current = initialOnline;
                setIsOnline(initialOnline);

                if (!initialOnline) {
                    showBannerInternal('offline', 'No internet connection');
                }
            } catch (e) {
                console.warn('⚠️ NetInfo not available, defaulting to online');
                isOnlineRef.current = true;
                setIsOnline(true);
            }
        };

        setupNetInfo();

        return () => {
            if (unsubscribe) unsubscribe();
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
        };
    }, []);

    // Process pending uploads when coming back online
    useEffect(() => {
        if (isOnline && pendingUploads.length > 0) {
            processPendingUploads();
        }
    }, [isOnline]);

    const showBannerInternal = (type: BannerType, message: string, autoDismiss?: number) => {
        // Don't let info/syncing banners override an active offline banner
        if (!isOnlineRef.current && (type === 'online' || type === 'syncing')) {
            return;
        }

        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        setBannerType(type);
        setBannerMessage(message);

        if (autoDismiss && autoDismiss > 0) {
            dismissTimer.current = setTimeout(() => {
                // Only auto-dismiss if we're still online (don't hide offline banner)
                if (isOnlineRef.current || type !== 'offline') {
                    setBannerType(null);
                    setBannerMessage('');
                }
            }, autoDismiss);
        }
    };

    const showBanner = (type: BannerType, message: string, autoDismiss?: number) => {
        showBannerInternal(type, message, autoDismiss);
    };

    const dismissBanner = () => {
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        setBannerType(null);
        setBannerMessage('');
    };

    const loadPendingUploads = async () => {
        try {
            const stored = await AsyncStorage.getItem(PENDING_UPLOADS_KEY);
            if (stored) {
                setPendingUploads(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load pending uploads:', e);
        }
    };

    const savePendingUploads = async (uploads: PendingUpload[]) => {
        try {
            await AsyncStorage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(uploads));
        } catch (e) {
            console.error('Failed to save pending uploads:', e);
        }
    };

    const queueImageUpload = (localUri: string, eventId: string | number, fieldName: string = 'image_url') => {
        const newUpload: PendingUpload = {
            localUri,
            eventId,
            fieldName,
            timestamp: Date.now(),
        };

        setPendingUploads(prev => {
            const updated = [...prev, newUpload];
            savePendingUploads(updated);
            return updated;
        });

        showBannerInternal('info', 'Image saved locally. Will upload when online.', 4000);
    };

    const processPendingUploads = async () => {
        if (pendingUploads.length === 0) return;

        showBannerInternal('syncing', `Uploading ${pendingUploads.length} pending image(s)...`);

        const remaining: PendingUpload[] = [];

        for (const upload of pendingUploads) {
            try {
                const cloudUrl = await uploadImage(upload.localUri);
                console.log(`✅ Pending image uploaded: ${cloudUrl}`);

                await execute(
                    `UPDATE events SET ${upload.fieldName} = ?, updated_at = datetime('now') WHERE id = ?`,
                    [cloudUrl, upload.eventId]
                );

                DeviceEventEmitter.emit('db_synced');
            } catch (e) {
                console.error(`❌ Failed to upload pending image for event ${upload.eventId}:`, e);
                remaining.push(upload);
            }
        }

        setPendingUploads(remaining);
        await savePendingUploads(remaining);

        if (remaining.length === 0) {
            showBannerInternal('online', 'All pending uploads complete!', 3000);
        } else {
            showBannerInternal('info', `${remaining.length} upload(s) still pending`, 4000);
        }
    };

    return (
        <NetworkContext.Provider value={{
            isOnline,
            bannerType,
            bannerMessage,
            pendingUploads,
            queueImageUpload,
            showBanner,
            dismissBanner,
        }}>
            {children}
        </NetworkContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}
