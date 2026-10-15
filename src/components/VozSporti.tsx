import { useConversation } from '@elevenlabs/react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const GREEN = '#4C9A3A';
const AGENT_ID = 'agent_9301m50br88xe7c8fh9ey0q95dca';

interface VozSportiProps {
  onClose?: () => void;
}

export default function VozSporti({ onClose }: VozSportiProps) {
  const [isConnected, setIsConnected] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ELEVENLABS] Conectado a la conversación');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('[ELEVENLABS] Desconectado de la conversación');
      setIsConnected(false);
    },
    onMessage: (message) => {
      console.log('[ELEVENLABS] Mensaje recibido:', message);
    },
    onError: (error) => {
      console.error('[ELEVENLABS] Error de conversación:', error);
      Alert.alert(
        'Error de conexión',
        'Hubo un error al conectar con Sporti. Intenta de nuevo.',
        [{ text: 'OK', style: 'default' }]
      );
    },
  });

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de micrófono',
            message: 'Sporti necesita acceso al micrófono para hablarte',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('[ELEVENLABS] Error al pedir permiso:', err);
        return false;
      }
    }
    return true;
  }, []);

  const startConversation = useCallback(async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert(
          'Permiso denegado',
          'Sporti necesita acceso al micrófono para funcionar. Ve a configuración y habilita el permiso.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      console.log('[ELEVENLABS] Iniciando sesión con agente:', AGENT_ID);
      await conversation.startSession({
        agentId: AGENT_ID,
      });
    } catch (error) {
      console.error('[ELEVENLABS] Error al iniciar conversación:', error);
      Alert.alert(
        'Error al conectar',
        'No se pudo conectar con Sporti. Verifica tu conexión a internet e intenta de nuevo.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [conversation, requestMicrophonePermission]);

  const endConversation = useCallback(async () => {
    try {
      console.log('[ELEVENLABS] Terminando conversación');
      await conversation.endSession();
    } catch (error) {
      console.error('[ELEVENLABS] Error al terminar conversación:', error);
    }
  }, [conversation]);

  // Cerrar sesión al desmontar
  useEffect(() => {
    return () => {
      if (isConnected) {
        endConversation();
      }
    };
  }, [isConnected, endConversation]);

  const getStatusText = () => {
    if (conversation.status === 'connecting') return 'Conectando...';
    if (conversation.status === 'connected') return conversation.isSpeaking ? 'Sporti está hablando' : 'Escuchando...';
    if (conversation.status === 'disconnected') return 'Desconectado';
    return 'Toca para hablar con Sporti';
  };

  const getStatusIcon = () => {
    if (conversation.status === 'connecting') return 'ellipsis-horizontal-circle';
    if (conversation.status === 'connected') return conversation.isSpeaking ? 'volume-high' : 'mic';
    if (conversation.status === 'disconnected') return 'mic-outline';
    return 'mic-outline';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>Estado: {conversation.status}</Text>
      <Text style={styles.speaking}>
        Sporti está {conversation.isSpeaking ? 'hablando' : 'escuchando'}
      </Text>

      <Pressable
        style={[styles.button, isConnected && styles.buttonActive]}
        onPress={isConnected ? endConversation : startConversation}
      >
        <Ionicons
          name={getStatusIcon()}
          size={48}
          color={isConnected ? '#FFFFFF' : GREEN}
        />
      </Pressable>

      <Text style={styles.label}>{getStatusText()}</Text>

      {conversation.canSendFeedback && (
        <View style={styles.feedbackContainer}>
          <Pressable
            style={styles.feedbackButton}
            onPress={() => conversation.sendFeedback(true)}
          >
            <Text style={styles.feedbackText}>👍</Text>
          </Pressable>
          <Pressable
            style={styles.feedbackButton}
            onPress={() => conversation.sendFeedback(false)}
          >
            <Text style={styles.feedbackText}>👎</Text>
          </Pressable>
        </View>
      )}

      {onClose && (
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4FE',
    padding: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    fontWeight: '600',
  },
  speaking: {
    fontSize: 14,
    marginBottom: 20,
    color: '#666',
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: GREEN,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  feedbackButton: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 24,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(76, 154, 58, 0.1)',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: GREEN,
  },
});
