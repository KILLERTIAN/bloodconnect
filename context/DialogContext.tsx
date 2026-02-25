import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react-native';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Dimensions, Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const { width } = Dimensions.get('window');

type DialogType = 'info' | 'success' | 'error' | 'warning';

interface DialogAction {
    label: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface DialogState {
    visible: boolean;
    title: string;
    message: string;
    type?: DialogType;
    actions?: DialogAction[];
}

interface DialogContextType {
    showDialog: (title: string, message: string, type?: DialogType, actions?: DialogAction[]) => void;
    hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

interface DialogProviderProps {
    children: ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const theme = useTheme();
    const [dialogState, setDialogState] = useState<DialogState>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        actions: [],
    });

    const showDialog = useCallback((
        title: string,
        message: string,
        type: DialogType = 'info',
        actions: DialogAction[] = []
    ) => {
        setDialogState({
            visible: true,
            title,
            message,
            type,
            actions: actions.length > 0 ? actions : [{ label: 'OK', onPress: () => { }, style: 'default' }],
        });
    }, []);

    const hideDialog = useCallback(() => {
        setDialogState((prev) => ({ ...prev, visible: false }));
    }, []);

    const getIconInfo = (type: DialogType) => {
        switch (type) {
            case 'success': return { Icon: CheckCircle2, color: '#34C759', colors: ['#34C759', '#248A3D'] };
            case 'error': return { Icon: AlertCircle, color: '#FF3B30', colors: ['#FF3B30', '#C42D25'] };
            case 'warning': return { Icon: AlertTriangle, color: '#FFCC00', colors: ['#FFCC00', '#D4AA00'] };
            default: return { Icon: Info, color: '#007AFF', colors: ['#007AFF', '#005BBF'] };
        }
    };

    const iconInfo = getIconInfo(dialogState.type || 'info');
    const { Icon, colors } = iconInfo;

    return (
        <DialogContext.Provider value={{ showDialog, hideDialog }}>
            {children}
            <RNModal
                visible={dialogState.visible}
                transparent
                animationType="fade"
                onRequestClose={hideDialog}
            >
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={hideDialog}
                    />
                    <View style={styles.dialogContainer}>
                        <LinearGradient
                            colors={colors as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            <Icon size={32} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>

                        <TouchableOpacity style={styles.closeBtn} onPress={hideDialog}>
                            <X size={20} color="#C7C7CC" />
                        </TouchableOpacity>

                        <View style={styles.content}>
                            <Text style={styles.title}>{dialogState.title}</Text>
                            <Text style={styles.message}>{dialogState.message}</Text>
                        </View>

                        <View style={styles.actionsRow}>
                            {dialogState.actions?.map((action, index) => {
                                const isDefault = action.style === 'default' || !action.style;
                                const isDestructive = action.style === 'destructive';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            action.onPress();
                                            hideDialog();
                                        }}
                                        style={[
                                            styles.button,
                                            isDefault && styles.buttonPrimary,
                                            isDestructive && styles.buttonDestructive,
                                            dialogState.actions!.length > 1 && { flex: 1 }
                                        ]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            isDefault && styles.buttonTextPrimary,
                                            isDestructive && styles.buttonTextDestructive
                                        ]}>
                                            {action.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </RNModal>
        </DialogContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    dialogContainer: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -60,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
    },
    content: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1C1C1E',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        fontWeight: '500',
        color: '#636366',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    button: {
        paddingHorizontal: 24,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        minWidth: 100,
    },
    buttonPrimary: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDestructive: {
        backgroundColor: '#FFEBEA',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8E8E93',
    },
    buttonTextPrimary: {
        color: '#FFFFFF',
    },
    buttonTextDestructive: {
        color: '#FF3B30',
    },
});
