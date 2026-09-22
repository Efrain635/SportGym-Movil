import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type Message = {
  id: number;
  text: string;
  sender: 'sporti' | 'user';
};

const initialMessage: Message = {
  id: 1,
  sender: 'sporti',
  text: '¡Hola! Soy Sporti. Puedo orientarte con rutinas, recuperación, salud y nutrición. ¿Qué te gustaría trabajar hoy?',
};

function getSportiResponse(question: string) {
  const normalizedQuestion = question.toLowerCase();

  if (normalizedQuestion.includes('rutina') || normalizedQuestion.includes('entren')) {
    return 'Para una rutina segura, empieza con 5-10 minutos de calentamiento, usa una carga que te permita mantener la técnica y deja al menos un día de recuperación por grupo muscular. Puedo ayudarte a organizar una sesión por objetivo.';
  }

  if (
    normalizedQuestion.includes('comida') ||
    normalizedQuestion.includes('nutri') ||
    normalizedQuestion.includes('prote') ||
    normalizedQuestion.includes('dieta')
  ) {
    return 'Prioriza alimentos variados, proteína en cada comida, verduras, carbohidratos de calidad y agua. Tus necesidades dependen de tu edad, objetivo y salud; evita dietas extremas y consulta a un nutricionista para un plan personalizado.';
  }

  if (
    normalizedQuestion.includes('dolor') ||
    normalizedQuestion.includes('lesión') ||
    normalizedQuestion.includes('lesion') ||
    normalizedQuestion.includes('salud')
  ) {
    return 'Si tienes dolor intenso, inflamación, mareo, falta de aire o una lesión, detén el ejercicio y busca atención médica. No puedo diagnosticarte, pero sí ayudarte a adaptar una sesión cuando un profesional te haya autorizado.';
  }

  if (
    normalizedQuestion.includes('descanso') ||
    normalizedQuestion.includes('recuper')
  ) {
    return 'La recuperación también es parte del progreso: intenta dormir 7-9 horas, hidrátate y alterna días intensos con sesiones suaves o descanso. Aumenta el volumen gradualmente y escucha las señales de tu cuerpo.';
  }

  return 'Puedo ayudarte con rutinas, ejercicios, recuperación y nutrición general. Cuéntame tu objetivo (fuerza, músculo, pérdida de grasa o condición) y tu nivel de experiencia.';
}

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const nextMessageId = useMemo(() => messages.length + 1, [messages.length]);

  const sendMessage = () => {
    const question = input.trim();

    if (!question) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId, sender: 'user', text: question },
      {
        id: nextMessageId + 1,
        sender: 'sporti',
        text: getSportiResponse(question),
      },
    ]);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver a inicio"
          >
            <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
          </Pressable>
          <View style={styles.titleContainer}>
            <View style={styles.avatar}>
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
            </View>
            <View>
              <ThemedText style={styles.title}>Sporti</ThemedText>
              <ThemedText style={styles.status}>Asistente fitness</ThemedText>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'user'
                  ? styles.userBubble
                  : styles.sportiBubble,
              ]}
            >
              <ThemedText
                style={[
                  styles.messageText,
                  message.sender === 'user' && styles.userMessageText,
                ]}
              >
                {message.text}
              </ThemedText>
            </View>
          ))}
          <ThemedText style={styles.disclaimer}>
            Sporti ofrece orientación general y no sustituye a un médico, entrenador o nutricionista.
          </ThemedText>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#8F8F8F"
            style={styles.input}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            accessibilityLabel="Pregunta para Sporti"
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={sendMessage}
            accessibilityRole="button"
            accessibilityLabel="Enviar pregunta"
          >
            <Ionicons name="send" size={19} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0A',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0B0C0C',
  },
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#292A2A',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D92D55',
    marginRight: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  status: {
    color: '#AFAFAF',
    fontSize: 12,
    marginTop: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 18,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sportiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#202121',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D92D55',
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: '#E9E9E9',
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  disclaimer: {
    color: '#858585',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#292A2A',
    backgroundColor: '#111212',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#FFFFFF',
    backgroundColor: '#242525',
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D92D55',
    marginLeft: 8,
  },
  sendButtonPressed: {
    opacity: 0.75,
  },
});
