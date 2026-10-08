import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../components/themed-text";
import { useAuth } from "../contexts/AuthContext";
import { type ClientProfile } from "../lib/fitness-ai";
import { askSporti } from "../lib/sporti-groq";

const formatTime = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes.toString().padStart(2, '0');
  return `${hours12}:${minutesStr} ${ampm}`;
};

type Message = {
  id: number;
  text: string;
  sender: "sporti" | "user";
  timestamp: Date;
};

export default function ChatbotScreen() {
  const { user } = useAuth();
  
  const initialMessage = useMemo(() => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName;
    const greeting = fullName ? `¡Hola ${fullName}!` : "¡Hola!";
    return {
      id: 1,
      sender: "sporti" as const,
      text: `${greeting} Soy Sporti, tu asistente de fitness 💪. Puedo ayudarte con rutinas, nutrición, técnica de ejercicios y más. Pregúntame lo que necesites sobre el gimnasio.`,
      timestamp: new Date(),
    };
  }, [user?.firstName, user?.lastName]);
  
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nextMessageId = useMemo(() => messages.length + 1, [messages.length]);
  const quickActions = [
    "Ganar masa muscular",
    "Perder grasa",
    "Mejorar condición física",
    "Mantenerme en forma",
    "¿Cuánto tiempo puedo entrenar?",
    "Quiero mejorar mi alimentación",
  ];

  const profile: ClientProfile | null = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        goal: user.goal,
        level: user.level,
        gymMachines: user.gymMachines,
        daysPerWeek: user.daysPerWeek,
        restrictions: user.restrictions ?? [],
        weight: user.weight ?? null,
        height: user.height ?? null,
        age: user.age ?? null,
        gender: user.gender ?? null,
      }
    : null;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 140;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight / 2, headerHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const sendMessage = async (question?: string) => {
    const textToSend = question || input.trim();

    if (!textToSend) {
      return;
    }

    setIsLoading(true);

    const userMessage = { id: nextMessageId, sender: "user" as const, text: textToSend, timestamp: new Date() };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);
    setInput("");

    const historial = messages.map((m) => ({
      role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

    // Agregar la pregunta actual al historial
    historial.push({
      role: "user",
      content: textToSend,
    });

    const perfil = {
      objetivo: profile?.goal,
      nivel: profile?.level,
      dias: profile?.daysPerWeek,
      maquinas: profile?.gymMachines,
      peso: profile?.weight,
      altura: profile?.height,
      edad: profile?.age,
      genero: profile?.gender,
      restricciones: profile?.restrictions,
    };

    const response = await askSporti(historial, perfil);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: nextMessageId + 1,
        sender: "sporti",
        text: response,
        timestamp: new Date(),
      },
    ]);
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.headerContainer,
              {
                transform: [{ translateY: headerTranslateY }],
                opacity: headerOpacity,
              },
            ]}
          >
            <View style={styles.header}>
              <Image
                source={require("../Imagen/Sporti.png")}
                style={styles.headerImage}
                resizeMode="contain"
              />
              <ThemedText style={styles.headerTitle}>Sporti</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Tu asistente de fitness
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.ScrollView
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            <View style={styles.headerPlaceholder} />

            <View style={styles.suggestionGrid}>
              {quickActions.map((action, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => {
                    const text = action;
                    setInput(text);
                    sendMessage(text);
                  }}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.suggestionCardText}>
                    {action}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === "user"
                    ? styles.userBubble
                    : styles.sportiBubble,
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    message.sender === "user" && styles.userMessageText,
                  ]}
                >
                  {String(message.text)}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.messageTime,
                    message.sender === "user" && styles.userMessageTime,
                  ]}
                >
                  {formatTime(message.timestamp)}
                </ThemedText>
              </View>
            ))}
          </Animated.ScrollView>

          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escribe tu pregunta..."
              placeholderTextColor="#8F8F8F"
              style={styles.input}
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage()}
              accessibilityLabel="Pregunta para Sporti"
              editable={!isLoading}
            />
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <ThemedText style={styles.loadingText}>...</ThemedText>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
                onPress={() => sendMessage()}
                accessibilityRole="button"
                accessibilityLabel="Enviar pregunta"
              >
                <Ionicons name="send" size={19} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090A0A",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0B0C0C",
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#0C0D0D",
    borderBottomWidth: 1,
    borderBottomColor: "#1E2B29",
  },
  header: {
    padding: 20,
    alignItems: "center",
  },
  headerPlaceholder: {
    height: 140,
  },
  headerImage: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#D6D6D6",
    fontSize: 14,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    flexGrow: 1,
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  suggestionCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1A1D1D",
    borderWidth: 1,
    borderColor: "#2A2B2B",
  },
  suggestionCardText: {
    color: "#D7D7D7",
    fontSize: 12,
    fontWeight: "600",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sportiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#202121",
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D92D55",
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  messageTime: {
    color: "#FFFFFF",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userMessageTime: {
    color: "#FFFFFF",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#292A2A",
    backgroundColor: "#111212",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: "#FFFFFF",
    backgroundColor: "#242525",
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D92D55",
    marginLeft: 8,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  loadingIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#242525",
    marginLeft: 8,
  },
  loadingText: {
    color: "#0FBE76",
    fontSize: 16,
    fontWeight: "600",
  },
});
