import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

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
            actions: actions.length > 0 ? actions : [{ label: 'OK', onPress: () => hideDialog(), style: 'default' }],
        });
    }, []);

    const hideDialog = useCallback(() => {
        setDialogState((prev) => ({ ...prev, visible: false }));
    }, []);

    const getIcon = (type: DialogType) => {
        switch (type) {
            case 'success': return { name: 'checkmark-circle', color: '#4CAF50' }; // Green
            case 'error': return { name: 'alert-circle', color: theme.colors.error }; // Red
            case 'warning': return { name: 'warning', color: '#FFC107' }; // Amber
            default: return { name: 'information-circle', color: theme.colors.primary }; // Primary
        }
    };

    const { name, color } = getIcon(dialogState.type || 'info');

    return (
        <DialogContext.Provider value={{ showDialog, hideDialog }}>
            {children}
            <Portal>
                <Dialog
                    visible={dialogState.visible}
                    onDismiss={hideDialog}
                    style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
                >
                    <View style={styles.headerContainer}>
                        <Ionicons name={name as any} size={40} color={color} style={styles.icon} />
                        <Dialog.Title style={[styles.title, { color: theme.colors.onSurface }]}>
                            {dialogState.title}
                        </Dialog.Title>
                    </View>

                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                            {dialogState.message}
                        </Text>
                    </Dialog.Content>

                    <Dialog.Actions style={styles.actions}>
                        {dialogState.actions?.map((action, index) => (
                            <Button
                                key={index}
                                onPress={() => {
                                    action.onPress();
                                    if (dialogState.actions?.length === 1 && action.style !== 'cancel') {
                                        // Auto close if it's a simple OK button, unless it's a specific action flow
                                        // Actually, user action.onPress might not close it, so we rely on the caller to call hideDialog if needed?
                                        // Standard Alert behavior is to close on press.
                                        hideDialog();
                                    } else {
                                        // For custom actions, we generally expect the specific handler to close it or not.
                                        // But to mimic Alert, we should probably close it.
                                        // Let's assume the user provided actions should close it, so we wrap.
                                        // Wait, if I wrap it here, I might close it prematurely if they have async validation.
                                        // But standardized Alerts usually close on press. 
                                        // Let's keep it simple: We execute onPress, then hideDialog.
                                    }
                                    hideDialog();
                                }}
                                mode={action.style === 'default' || !action.style ? 'contained' : 'text'}
                                textColor={action.style === 'destructive' ? theme.colors.error : (action.style === 'cancel' ? theme.colors.onSurface : theme.colors.surface)}
                                buttonColor={action.style === 'default' || !action.style ? theme.colors.primary : undefined}
                                style={styles.button}
                                labelStyle={styles.buttonLabel}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </DialogContext.Provider>
    );
};

const styles = StyleSheet.create({
    dialog: {
        borderRadius: 16,
        paddingBottom: 8,
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 16,
    },
    icon: {
        marginBottom: 8,
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 20,
        marginTop: 0,
        marginBottom: 4,
    },
    actions: {
        justifyContent: 'center',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    button: {
        marginHorizontal: 4,
        marginVertical: 4,
        minWidth: 80,
        borderRadius: 8,
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: '600',
    }
});
