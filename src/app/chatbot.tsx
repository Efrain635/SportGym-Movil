import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


import {
  createClientChatConversation,
  getChatConversationMessages,
  getClientChatConversations,
  saveChatConversationMessage,
  saveGeneratedRoutine,
  updateChatConversation,
  type ChatConversation,
} from "../../assets/database/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  findSpanishVoice,
  isVoiceRecognitionAvailable,
  setupVoiceRecognition,
  speakText,
  startVoiceRecognition,
  stopVoiceRecognition,
  type VoiceCallbacks,
  type VoiceState
} from "../lib/audio-service";
import {
  createChatbotRoutine,
  formatChatbotRoutine,
  getCardioRecommendation,
} from "../lib/chatbot-routines";
import { type ClientProfile } from "../lib/fitness-ai";
import {
  getRecipesForNutritionFocus,
  saveFavoriteRecipes,
} from "../lib/recipes";
import { askSporti } from "../lib/sporti-groq";

import VozSporti from "../components/VozSporti";

const GREEN = "#4C9A3A";
const GREEN_DARK = "#3F8A2F";
const BUBBLE_BG = "#E6E6E6";
const TEXT_DARK = "#111111";
const TEXT_MUTED = "#8A8A8A";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
};

type Option = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

type QuestionOption = {
  label: string;
  value: string;
};

type Question = {
  key: string;
  question: string;
  options: QuestionOption[];
};

const OPTIONS: Option[] = [
  {
    id: "masa",
    title: "Ganar masa muscular",
    subtitle: "Aumentar fuerza y volumen",
    icon: "arm-flex",
  },
  {
    id: "grasa",
    title: "Perder grasa",
    subtitle: "Definir y tonificar",
    icon: "human-handsdown",
  },
  {
    id: "condicion",
    title: "Mejorar condición física",
    subtitle: "Más energía y resistencia",
    icon: "heart-pulse",
  },
  {
    id: "mantener",
    title: "Mantenerme en forma",
    subtitle: "Salud y bienestar general",
    icon: "yoga",
  },
];

export default function ChatbotScreen() {
  const { user } = useAuth();
  const listRef = useRef<FlatList<Message>>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const userName = useMemo(() => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return firstName && lastName ? `${firstName} ${lastName}` : firstName || "Usuario";
  }, [user?.firstName, user?.lastName]);

  const initialMessage = useMemo(() => {
    return {
      id: "welcome",
      from: "bot" as const,
      text: `¡Hola ${userName}! Soy Sporti, tu asistente de fitness 💪. Para crear tu plan personalizado, primero necesito saber cuál es tu objetivo principal. Selecciona una de las opciones:`,
    };
  }, [userName]);

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [showOptions, setShowOptions] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [conversationStep, setConversationStep] = useState<"initial" | "goal" | "details" | "complete" | "summary">("initial");
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showOptionsDelayed, setShowOptionsDelayed] = useState(false);

  // Estados de voz
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("es-MX");
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceTranscriptRef = useRef("");
  const voiceAbortRef = useRef<AbortController | null>(null);
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;
  const micPulseAnim = useRef(new Animated.Value(1)).current;

  // ElevenLabs Voice
  const [showVozSporti, setShowVozSporti] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setIsKeyboardOpen(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setIsKeyboardOpen(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (showOptions || currentQuestion) {
      setShowOptionsDelayed(false);
      setTimeout(() => setShowOptionsDelayed(true), 300);
    } else {
      setShowOptionsDelayed(false);
    }
  }, [showOptions, currentQuestion]);

  // Configurar voz al montar
  useEffect(() => {
    const initVoice = async () => {
      if (!isVoiceRecognitionAvailable()) {
        console.warn('[VOZ] Reconocimiento de voz no disponible (necesita regenerar build con npx expo run:android)');
        return;
      }

      const hasPermission = await setupVoiceRecognition();
      if (!hasPermission) {
        console.log('[VOZ] No se otorgaron permisos de reconocimiento de voz');
      }
      const spanishVoice = await findSpanishVoice();
      setVoiceLanguage(spanishVoice);
      console.log('[VOZ] Voz en español configurada:', spanishVoice);
    };
    initVoice();

    // Limpiar reconocimiento de voz al desmontar
    return () => {
      console.log('[VOZ] Desmontando componente, deteniendo reconocimiento');
      stopVoiceRecognition();
    };
  }, []);

  // Animación de ondas de voz
  useEffect(() => {
    if (voiceState === "listening") {
      const animateWaves = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(micPulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
            Animated.timing(micPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      };
      animateWaves();
    } else {
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
      micPulseAnim.setValue(1);
    }
  }, [voiceState]);

  // Manejar transcripción de voz
  const handleVoiceTranscript = useCallback((text: string, isFinal: boolean) => {
    console.log('[VOZ] handleVoiceTranscript:', text, 'isFinal:', isFinal);
    voiceTranscriptRef.current = text;
    setVoiceTranscript(text);

    if (isFinal) {
      console.log('[VOZ] Transcripción final, enviando mensaje:', text);
      stopVoiceRecognition();
      setVoiceState("processing");
      void sendMessage(text);
    }
  }, []);

  // Manejar error de voz
  const handleVoiceError = useCallback((error: string) => {
    console.error('[VOZ] handleVoiceError:', error);
    setVoiceState("idle");
    setVoiceTranscript("");
    Alert.alert("Error de voz", error);
  }, []);

  // Manejar inicio de reconocimiento
  const handleVoiceStart = useCallback(() => {
    console.log('[VOZ] handleVoiceStart');
    setVoiceState("listening");
    setVoiceTranscript("");
  }, []);

  // Manejar fin de reconocimiento
  const handleVoiceEnd = useCallback(() => {
    console.log('[VOZ] handleVoiceEnd');
    setVoiceState("idle");
    setVoiceTranscript("");
  }, []);

  // Iniciar reconocimiento de voz
  const startListening = useCallback(async () => {
    console.log('[VOZ] startListening llamado');
    if (voiceState === "listening") {
      console.log('[VOZ] Ya está escuchando, deteniendo...');
      stopVoiceRecognition();
      setVoiceState("idle");
      return;
    }

    const hasPermission = await setupVoiceRecognition();
    if (!hasPermission) {
      Alert.alert(
        "🎤 Permiso de micrófono",
        "Sporti necesita acceso a tu micrófono para escucharte. Ve a configuración de la app y habilita el permiso.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Abrir configuración",
            onPress: () => {
              // Intentar abrir configuración de la app
              if (Platform.OS === 'android') {
                Alert.alert(
                  "Android",
                  "Ve a Configuración > Aplicaciones > SportGym > Permisos > Micrófono y permite el acceso"
                );
              } else {
                Alert.alert(
                  "iOS",
                  "Ve a Configuración > SportGym > Micrófono y permite el acceso"
                );
              }
            }
          }
        ]
      );
      return;
    }

    const callbacks: VoiceCallbacks = {
      onTranscript: handleVoiceTranscript,
      onError: handleVoiceError,
      onStart: handleVoiceStart,
      onEnd: handleVoiceEnd,
    };

    await startVoiceRecognition(callbacks, voiceLanguage);
  }, [voiceState, voiceLanguage, handleVoiceTranscript, handleVoiceError, handleVoiceStart, handleVoiceEnd]);

  // Hablar respuesta de Sporti
  const speakResponse = useCallback(async (text: string) => {
    if (!voiceEnabled) {
      console.log('[VOZ] Voz desactivada, no hablando');
      setVoiceState("idle");
      if (isContinuousMode) {
        console.log('[VOZ] Modo continuo activo, iniciando escucha aunque la voz esté desactivada');
        setTimeout(() => startListening(), 500);
      }
      return;
    }

    console.log('[VOZ] speakResponse:', text);
    setVoiceState("speaking");
    await speakText(
      text,
      voiceLanguage,
      () => {
        console.log('[VOZ] speakResponse: onDone');
        setVoiceState("idle");
        if (isContinuousMode) {
          console.log('[VOZ] Reanudando escucha en modo continuo');
          setTimeout(() => startListening(), 500);
        }
      },
      (error) => {
        console.error('[VOZ] speakResponse: onError', error);
        setVoiceState("idle");
        if (isContinuousMode) {
          console.log('[VOZ] Error en voz, reanudando escucha en modo continuo');
          setTimeout(() => startListening(), 500);
        }
      }
    );
  }, [voiceLanguage, isContinuousMode, startListening, voiceEnabled]);

  const dynamicOptions = useMemo(() => {
    return OPTIONS;
  }, []);

  React.useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      loadingAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isLoading]);

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

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const copyMessage = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const resetConversationState = () => {
    stopVoiceRecognition();
    setVoiceState("idle");
    setVoiceTranscript("");
    setMessages([initialMessage]);
    setShowOptions(true);
    setUserGoal(null);
    setUserResponses({});
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setConversationStep("initial");
    setShowSummary(false);
  };

  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const MessageBubble = memo(({ item, onCopy, isCopied }: { item: Message; onCopy: (text: string, id: string) => void; isCopied: boolean }) => {
    const isBot = item.from === "bot";
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, [item.id]);

    return (
      <Animated.View
        style={[
          styles.bubble,
          isBot ? styles.botBubble : styles.userBubble,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={[styles.bubbleText, !isBot && styles.userBubbleText]}>
          {item.text}
        </Text>
        {isBot && (
          <Pressable
            onPress={() => onCopy(item.text, item.id)}
            style={styles.copyBtn}
            hitSlop={8}
          >
            <Ionicons
              name={isCopied ? "checkmark" : "copy-outline"}
              size={16}
              color={TEXT_MUTED}
            />
          </Pressable>
        )}
      </Animated.View>
    );
  });

  const OptionCard = memo(({ opt, index, onSelect }: { opt: Option; index: number; onSelect: (title: string) => void }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, [opt.id, index]);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Pressable
          onPress={() => onSelect(opt.title)}
          style={({ pressed }) => [
            styles.optionCard,
            pressed && styles.optionPressed,
          ]}
          accessibilityLabel={opt.title}
          accessibilityHint={opt.subtitle}
          accessibilityRole="button"
        >
          <View style={styles.optionIconBox}>
            <MaterialCommunityIcons
              name={opt.icon}
              size={30}
              color={TEXT_DARK}
            />
          </View>
          <View style={styles.optionTextBox}>
            <Text style={styles.optionTitle}>{opt.title}</Text>
            <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  });

  const getQuestionsForGoal = (goal: string): Question[] => {
    const baseQuestions: Question[] = [
      {
        key: "duration",
        question: "¿Cuánto tiempo puedes entrenar por sesión?",
        options: [
          { label: "30 minutos", value: "30 minutos" },
          { label: "45 minutos", value: "45 minutos" },
          { label: "60 minutos", value: "60 minutos" },
          { label: "Más de 60 minutos", value: "más de 60 minutos" },
        ],
      },
      {
        key: "days",
        question: "¿Cuántos días por semana puedes entrenar?",
        options: [
          { label: "2 días", value: "2 días" },
          { label: "3 días", value: "3 días" },
          { label: "4 días", value: "4 días" },
          { label: "5 días", value: "5 días" },
          { label: "6 días", value: "6 días" },
        ],
      },
      {
        key: "injuries",
        question: "¿Tienes alguna condición física o lesión que deba considerar?",
        options: [
          { label: "Ninguna", value: "Ninguna" },
          { label: "Dolor de espalda", value: "Dolor de espalda" },
          { label: "Dolor de rodillas", value: "Dolor de rodillas" },
          { label: "Lesión de hombro", value: "Lesión de hombro" },
          { label: "Otra", value: "Otra" },
        ],
      },
      {
        key: "lifestyle",
        question: "¿Cuál es tu estilo de vida?",
        options: [
          { label: "Estudiante", value: "Estudiante" },
          { label: "Trabajo de oficina", value: "Trabajo de oficina" },
          { label: "Trabajo físico", value: "Trabajo físico" },
        ],
      },
    ];

    const goalSpecificQuestions: Record<string, Question[]> = {
      "Ganar masa muscular": [
        {
          key: "focus",
          question: "¿En qué áreas quieres enfocarte más?",
          options: [
            { label: "Pecho", value: "Pecho" },
            { label: "Espalda", value: "Espalda" },
            { label: "Piernas", value: "Piernas" },
            { label: "Brazos", value: "Brazos" },
            { label: "Hombros", value: "Hombros" },
            { label: "Todo el cuerpo", value: "Todo el cuerpo" },
          ],
        },
      ],
      "Perder grasa": [
        {
          key: "current_weight",
          question: "¿Cuál es tu peso actual?",
          options: [
            { label: "Menos de 60kg", value: "Menos de 60kg" },
            { label: "60-70kg", value: "60-70kg" },
            { label: "70-80kg", value: "70-80kg" },
            { label: "80-90kg", value: "80-90kg" },
            { label: "Más de 90kg", value: "Más de 90kg" },
          ],
        },
        {
          key: "cardio",
          question: "¿Te gusta hacer cardio?",
          options: [
            { label: "Correr", value: "Correr" },
            { label: "Caminar", value: "Caminar" },
            { label: "Bicicleta", value: "Bicicleta" },
            { label: "No me gusta el cardio", value: "No me gusta el cardio" },
          ],
        },
      ],
      "Mejorar condición física": [
        {
          key: "current_activity",
          question: "¿Qué tipo de actividad física haces actualmente?",
          options: [
            { label: "Ninguna", value: "Ninguna" },
            { label: "Caminar", value: "Caminar" },
            { label: "Correr", value: "Correr" },
            { label: "Deportes", value: "Deportes" },
          ],
        },
        {
          key: "cardio_preference",
          question: "¿Prefieres cardio de alta o baja intensidad?",
          options: [
            { label: "Alta intensidad", value: "Alta intensidad" },
            { label: "Baja intensidad", value: "Baja intensidad" },
            { label: "Mixto", value: "Mixto" },
          ],
        },
      ],
      "Mantenerme en forma": [
        {
          key: "current_activity",
          question: "¿Qué tipo de actividad física haces actualmente?",
          options: [
            { label: "Ninguna", value: "Ninguna" },
            { label: "Caminar", value: "Caminar" },
            { label: "Yoga", value: "Yoga" },
            { label: "Deportes", value: "Deportes" },
          ],
        },
        {
          key: "goals",
          question: "¿Qué es lo más importante para ti?",
          options: [
            { label: "Flexibilidad", value: "Flexibilidad" },
            { label: "Salud general", value: "Salud general" },
            { label: "Energía", value: "Energía" },
            { label: "Equilibrio", value: "Equilibrio" },
          ],
        },
      ],
    };

    return [...baseQuestions, ...(goalSpecificQuestions[goal] || [])];
  };

  const persistConversationState = async (
    id: string,
    step = conversationStep,
    goal = userGoal,
    responses = userResponses,
    summary = showSummary,
  ) => {
    if (!id) return;
    try {
      await updateChatConversation(id, {
        goal,
        responses,
        step,
        showSummary: summary,
      });
    } catch (error) {
      console.error("No se pudo guardar el estado de la conversación:", error);
      Alert.alert(
        "No se guardó el progreso",
        "Revisa tu conexión e inténtalo de nuevo.",
      );
    }
  };

  const persistMessage = async (
    id: string | null,
    message: Message,
  ) => {
    if (!id) return;
    try {
      await saveChatConversationMessage(id, {
        from: message.from,
        text: message.text,
      });
    } catch (error) {
      console.error("No se pudo guardar el mensaje del chatbot:", error);
      Alert.alert(
        "No se guardó el mensaje",
        "El chat sigue disponible, pero este mensaje no quedó en el historial.",
      );
    }
  };

  const startNewConversation = async () => {
    resetConversationState();
    setShowHistory(false);
    setConversationId(null);
    if (!user?.clientId) return;

    try {
      const id = await createClientChatConversation(
        user.clientId,
        "Nueva conversación",
      );
      setConversationId(id);
      setConversations((current) => [
        {
          id,
          title: "Nueva conversación",
          goal: null,
          responses: {},
          step: "initial",
          showSummary: false,
        },
        ...current,
      ]);
      await persistMessage(id, initialMessage);
    } catch (error) {
      console.error("No se pudo crear una conversación:", error);
      Alert.alert(
        "No se pudo iniciar un chat nuevo",
        "Revisa tu conexión e inténtalo de nuevo.",
      );
    }
  };

  const openConversation = async (conversation: ChatConversation) => {
    try {
      const loadedMessages = await getChatConversationMessages(conversation.id);
      const restoredStep = conversation.step ?? "initial";
      const restoredGoal = conversation.goal ?? null;
      const restoredResponses = conversation.responses ?? {};
      const questions = getQuestionsForGoal(restoredGoal ?? "");
      const answeredCount = Math.max(
        0,
        Object.keys(restoredResponses).filter((key) => key !== "goal").length,
      );

      setConversationId(conversation.id);
      setMessages(loadedMessages.length ? loadedMessages : [initialMessage]);
      setUserGoal(restoredGoal);
      setUserResponses(restoredResponses);
      setConversationStep(restoredStep);
      setShowSummary(conversation.showSummary === true);
      setShowOptions(restoredStep === "initial");
      setCurrentQuestion(
        restoredStep === "goal" || restoredStep === "details"
          ? questions[answeredCount] ?? null
          : null,
      );
      setCurrentQuestionIndex(answeredCount);
      setShowHistory(false);
      scrollToEnd();
    } catch (error) {
      console.error("No se pudo cargar la conversación:", error);
      Alert.alert(
        "No se pudo abrir la conversación",
        "Revisa tu conexión e inténtalo de nuevo.",
      );
    }
  };

  const deleteConversation = async (idToDelete: string) => {
    Alert.alert(
      "Eliminar conversación",
      "¿Estás seguro de que quieres eliminar esta conversación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Note: You would need to implement deleteChatConversation in firebase.ts
              setConversations((current) =>
                current.filter((conv) => conv.id !== idToDelete)
              );
              if (conversationId === idToDelete) {
                void startNewConversation();
              }
            } catch (error) {
              console.error("No se pudo eliminar la conversación:", error);
              Alert.alert("Error", "No se pudo eliminar la conversación");
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!user?.clientId) return;

    let isCurrent = true;
    const loadRecentConversation = async () => {
      try {
        const savedConversations = await getClientChatConversations(
          user.clientId!,
        );
        if (!isCurrent) return;
        setConversations(savedConversations);
      } catch (error) {
        console.error("No se pudo cargar el historial del chatbot:", error);
        if (isCurrent) {
          Alert.alert(
            "No se pudo cargar el historial",
            "Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      }
    };

    void loadRecentConversation();
    return () => {
      isCurrent = false;
    };
  }, [user?.clientId]);

  const sendMessage = async (text?: string) => {
    const textToSend = text || input.trim();
    if (!textToSend || textToSend.length < 1) {
      shakeInput();
      Alert.alert("Mensaje vacío", "Por favor escribe algo antes de enviar");
      return;
    }
    if (textToSend.length > 500) {
      Alert.alert("Mensaje muy largo", "Tu mensaje es demasiado largo. Acórtalo a menos de 500 caracteres");
      return;
    }

    // Detener reconocimiento de voz si está activo
    if (voiceState === "listening") {
      console.log('[VOZ] Deteniendo reconocimiento antes de enviar');
      stopVoiceRecognition();
      setVoiceState("processing");
    }

    let activeConversationId = conversationId;
    if (!activeConversationId && user?.clientId) {
      try {
        activeConversationId = await createClientChatConversation(
          user.clientId,
          textToSend.slice(0, 60),
        );
        setConversationId(activeConversationId);
        setConversations((current) => [
          {
            id: activeConversationId!,
            title: textToSend.slice(0, 60),
            goal: null,
            responses: {},
            step: "initial",
            showSummary: false,
          },
          ...current,
        ]);
      } catch (error) {
        console.error("No se pudo crear la conversación:", error);
        Alert.alert(
          "No se pudo guardar el chat",
          "Revisa tu conexión e inténtalo de nuevo.",
        );
      }
    }

    // Actualizar mensajes primero
    const newUserMessage = { id: `u-${Date.now()}`, from: "user" as const, text: textToSend };
    setMessages((prev) => [...prev, newUserMessage]);
    await persistMessage(activeConversationId, newUserMessage);
    if (
      activeConversationId &&
      conversations.some(
        (conversation) =>
          conversation.id === activeConversationId &&
          conversation.title === "Nueva conversación",
      )
    ) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? { ...conversation, title: textToSend.slice(0, 60) }
            : conversation,
        ),
      );
    }
    setInput("");
    setIsLoading(true);
    scrollToEnd();

    // Manejo del flujo de conversación
    if (conversationStep === "initial") {
      // Verificar si el usuario seleccionó una de las opciones principales
      const selectedOption = OPTIONS.find(opt => opt.title === textToSend);
      if (selectedOption) {
        setUserGoal(selectedOption.title);
        setConversationStep("goal");
        setUserResponses({ goal: selectedOption.title });
        setShowOptions(false);

        const questions = getQuestionsForGoal(selectedOption.title);
        setCurrentQuestion(questions[0]);
        setCurrentQuestionIndex(0);

        setTimeout(async () => {
          const botMessage = {
            id: `b-${Date.now()}`,
            from: "bot" as const,
            text: `¡Excelente! Para crear tu rutina perfecta, necesito algunos datos.\n\n${questions[0].question}`,
          };
          setMessages((prev) => [...prev, botMessage]);
          await persistMessage(activeConversationId, botMessage);
          await persistConversationState(
            activeConversationId ?? "",
            "goal",
            selectedOption.title,
            { goal: selectedOption.title },
            false,
          );
          setIsLoading(false);
          scrollToEnd();
        }, 500);
        return;
      }
    }

    if (conversationStep === "goal" || conversationStep === "details") {
      const questions = getQuestionsForGoal(userGoal || "");
      const answeredCount = Object.keys(userResponses).length - 1; // -1 porque goal ya está incluido

      if (answeredCount < questions.length) {
        // Guardar la respuesta
        const currentQ = questions[answeredCount];
        const updatedResponses = { ...userResponses, [currentQ.key]: textToSend };
        setUserResponses(updatedResponses);

        // Si hay más preguntas, hacer la siguiente
        if (answeredCount + 1 < questions.length) {
          const nextQuestion = questions[answeredCount + 1];
          setCurrentQuestion(nextQuestion);
          setCurrentQuestionIndex(answeredCount + 1);

          setTimeout(async () => {
            const botMessage = {
              id: `b-${Date.now()}`,
              from: "bot" as const,
              text: nextQuestion.question,
            };
            setMessages((prev) => [...prev, botMessage]);
            await persistMessage(activeConversationId, botMessage);
            await persistConversationState(
              activeConversationId ?? "",
              "goal",
              userGoal,
              updatedResponses,
              false,
            );
            setIsLoading(false);
            scrollToEnd();
          }, 500);
          return;
        } else {
          const routine = createChatbotRoutine({
            goal: userGoal ?? "Mantenerme en forma",
            daysAnswer: updatedResponses.days ?? "4 días",
            durationAnswer: updatedResponses.duration ?? "60 minutos",
            focus: updatedResponses.focus,
            restriction: updatedResponses.injuries,
            level:
              profile?.level ??
              (updatedResponses.current_activity === "Ninguna"
                ? "principiante"
                : undefined),
          });
          const restSeconds =
            userGoal === "Ganar masa muscular" ? 90 : 60;
          let routineSaved = false;
          let nutritionMessage = "";
          if (user?.clientId && routine.length > 0) {
            try {
              await saveGeneratedRoutine(
                user.clientId,
                user.username,
                `${user.firstName} ${user.lastName}`.trim(),
                routine,
              );
              routineSaved = true;
            } catch (error) {
              console.error("No se pudo guardar la rutina generada:", error);
              Alert.alert(
                "No se guardó la rutina",
                "Sporti generó el plan, pero no se guardó en Mi rutina. Revisa tu conexión e inténtalo de nuevo.",
              );
            }
          } else if (!user?.clientId) {
            Alert.alert(
              "Rutina no guardada",
              "Inicia sesión como cliente para guardar la rutina y editarla en Mi rutina.",
            );
          }

          if (user?.clientId && userGoal) {
            try {
              const recommendedRecipes =
                await getRecipesForNutritionFocus(userGoal);
              if (recommendedRecipes.length > 0) {
                await saveFavoriteRecipes(user.clientId, recommendedRecipes);
                nutritionMessage =
                  `\n\nTambién guardé ${recommendedRecipes.length} receta(s) en tus favoritos de Nutrición para tu enfoque de ${userGoal.toLowerCase()}:\n` +
                  recommendedRecipes.map((recipe) => `• ${recipe.name}`).join("\n");
              } else {
                nutritionMessage =
                  `\n\nNo encontré recetas en el catálogo etiquetadas para ${userGoal.toLowerCase()}. No guardé recetas que no correspondan a tu enfoque.`;
              }
            } catch (error) {
              console.error(
                "No se pudieron guardar las recetas recomendadas:",
                error,
              );
              nutritionMessage =
                "\n\nNo pude guardar las recetas recomendadas en tus favoritos. Revisa tu conexión e inténtalo de nuevo.";
              Alert.alert(
                "No se guardaron las recetas",
                "La rutina está lista, pero no se pudieron actualizar tus favoritos de Nutrición.",
              );
            }
          } else {
            nutritionMessage =
              "\n\nInicia sesión como cliente para guardar recetas en tus favoritos de Nutrición.";
          }

          const routineText = formatChatbotRoutine(
            routine,
            restSeconds,
            getCardioRecommendation(
              userGoal ?? "",
              updatedResponses,
              profile?.level,
            ),
            routineSaved,
          );
          setConversationStep("summary");
          setCurrentQuestion(null);
          setShowSummary(true);
          const botMessage = {
            id: `b-${Date.now()}`,
            from: "bot" as const,
            text: `${routineText}${nutritionMessage}`,
          };
          setMessages((prev) => [...prev, botMessage]);
          await persistMessage(activeConversationId, botMessage);
          await persistConversationState(
            activeConversationId ?? "",
            "summary",
            userGoal,
            updatedResponses,
            true,
          );
          setIsLoading(false);
          scrollToEnd();
          return;
        }
      }
    }

    // Si estamos en modo completo o el usuario envió un mensaje normal, usar la API
    const historial = messages.map((m) => ({
      role: (m.from === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

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

    const response = await askSporti(historial, {
      ...perfil,
      objetivo: userGoal ?? perfil.objetivo,
      respuestas: userResponses,
    });
    const botMessage = { id: `b-${Date.now()}`, from: "bot" as const, text: response };
    setMessages((prev) => [...prev, botMessage]);
    await persistMessage(activeConversationId, botMessage);
    setIsLoading(false);
    scrollToEnd();

    // Si el mensaje vino de voz, hablar la respuesta
    if (text && voiceState === "processing") {
      console.log('[VOZ] Respuesta recibida, hablando:', response);
      await speakResponse(response);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <MessageBubble
        item={item}
        onCopy={copyMessage}
        isCopied={copiedMessageId === item.id}
      />
    );
  }, [copiedMessageId]);

  const QuestionOptionButton = memo(({ option, index, onSelect }: { option: QuestionOption; index: number; onSelect: (value: string) => void }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    React.useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, [option.value, index]);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Pressable
          onPress={() => onSelect(option.value)}
          style={({ pressed }) => [
            styles.questionOptionBtn,
            pressed && styles.questionOptionPressed,
          ]}
        >
          <Text style={styles.questionOptionText}>{option.label}</Text>
        </Pressable>
      </Animated.View>
    );
  });

  const renderFooter = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingAvatar, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={require("../Imagen/Sporti.png")}
              style={styles.loadingAvatarImg}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.loadingMessage}>Sporti está pensando...</Text>
        </View>
      );
    }

    if (showSummary) {
      return (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>¡Listo {userName}! Tu rutina personalizada está preparada</Text>

          <Pressable
            style={styles.summaryCard}
            onPress={() => {
              router.navigate("/(tabs)/routine?view=routine" as never);
            }}
          >
            <View style={styles.summaryCardHeader}>
              <Ionicons name="fitness" size={32} color={GREEN} />
              <View style={styles.summaryCardHeaderText}>
                <Text style={styles.summaryCardTitle}>Tu rutina editable</Text>
                <Text style={styles.summaryCardSubtitle}>{userResponses.days || "4"} días por semana</Text>
              </View>
            </View>
            <View style={styles.summaryCardFooter}>
              <Text style={styles.summaryCardButtonText}>Ver mi rutina</Text>
              <Ionicons name="arrow-forward" size={20} color={GREEN} />
            </View>
          </Pressable>

          <Pressable
            style={styles.summaryCard}
            onPress={() => {
              router.navigate("/(tabs)/nutrition?view=favorites" as never);
            }}
          >
            <View style={styles.summaryCardHeader}>
              <Ionicons name="restaurant" size={32} color={GREEN} />
              <View style={styles.summaryCardHeaderText}>
                <Text style={styles.summaryCardTitle}>Recetas para tu enfoque</Text>
                <Text style={styles.summaryCardSubtitle}>
                  Guardadas en tus favoritos de Nutrición
                </Text>
              </View>
            </View>
            <View style={styles.summaryCardFooter}>
              <Text style={styles.summaryCardButtonText}>Ver recetas favoritas</Text>
              <Ionicons name="arrow-forward" size={20} color={GREEN} />
            </View>
          </Pressable>

          <Pressable
            style={styles.continueChatBtn}
            onPress={() => {
              setShowSummary(false);
              setConversationStep("complete");
              if (conversationId) {
                void persistConversationState(
                  conversationId,
                  "complete",
                  userGoal,
                  userResponses,
                  false,
                );
              }
            }}
          >
            <Text style={styles.continueChatText}>Continuar chat con Sporti</Text>
          </Pressable>
        </View>
      );
    }

    if (showOptionsDelayed && showOptions) {
      return (
        <View style={styles.optionsWrapper}>
          {dynamicOptions.map((opt, index) => (
            <OptionCard key={opt.id} opt={opt} index={index} onSelect={sendMessage} />
          ))}
        </View>
      );
    }

    if (showOptionsDelayed && currentQuestion && (conversationStep === "goal" || conversationStep === "details")) {
      return (
        <View style={styles.questionOptionsWrapper}>
          {currentQuestion.options.map((opt, index) => (
            <QuestionOptionButton key={opt.value} option={opt} index={index} onSelect={sendMessage} />
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header} accessible accessibilityRole="header">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityLabel="Volver atrás"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-undo" size={38} color={GREEN} />
          </Pressable>

          <View style={styles.avatar} accessibilityLabel="Avatar de Sporti">
            <Image
              source={require("../Imagen/Sporti.png")}
              style={styles.avatarImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.headerTitle}>Sporti</Text>
            <Text style={styles.headerSubtitle}>Asistente virtual</Text>
          </View>

          <Pressable
            onPress={() => setShowHistory(true)}
            hitSlop={12}
            style={styles.clearBtn}
            accessibilityLabel="Ver historial de conversaciones"
            accessibilityRole="button"
          >
            <Ionicons name="chatbubbles-outline" size={23} color={TEXT_MUTED} />
          </Pressable>

          <Pressable
            onPress={() => void startNewConversation()}
            hitSlop={12}
            style={styles.newChatBtn}
            accessibilityLabel="Iniciar conversación nueva"
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={25} color={TEXT_MUTED} />
          </Pressable>

          <Pressable
            onPress={() => setVoiceEnabled(!voiceEnabled)}
            hitSlop={12}
            style={styles.voiceToggleBtn}
            accessibilityLabel={voiceEnabled ? "Desactivar voz" : "Activar voz"}
            accessibilityRole="button"
          >
            <Ionicons
              name={voiceEnabled ? "volume-high" : "volume-mute"}
              size={22}
              color={voiceEnabled ? GREEN : TEXT_MUTED}
            />
          </Pressable>

          <Pressable
            onPress={() => setIsContinuousMode(!isContinuousMode)}
            hitSlop={12}
            style={styles.voiceToggleBtn}
            accessibilityLabel={isContinuousMode ? "Desactivar modo continuo" : "Activar modo continuo"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isContinuousMode ? "repeat" : "repeat-outline"}
              size={22}
              color={isContinuousMode ? GREEN : TEXT_MUTED}
            />
          </Pressable>
        </View>

        {/* Mensajes + opciones */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        />

        {/* Input */}
        <Animated.View
          style={[
            styles.inputBar,
            {
              transform: [{ translateX: shakeAnim }],
              marginBottom: isKeyboardOpen ? 5 : 14,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor="#555"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            editable={!isLoading && voiceState !== "listening"}
            accessibilityLabel="Campo de texto para escribir tu pregunta"
            accessibilityHint="Escribe tu pregunta y presiona enviar"
          />

          {/* Botón de micrófono - solo si está disponible */}
          {isVoiceRecognitionAvailable() && (
            voiceState === "listening" ? (
              <Pressable
                onPress={startListening}
                style={styles.voiceBtnActive}
                accessibilityLabel="Detener grabación"
                accessibilityRole="button"
                accessibilityHint="Detén la grabación de voz"
              >
                <Ionicons name="mic" size={18} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={startListening}
                style={styles.voiceBtn}
                accessibilityLabel="Usar voz"
                accessibilityRole="button"
                accessibilityHint="Graba tu pregunta con voz"
              >
                <Ionicons name="mic-outline" size={18} color={GREEN} />
              </Pressable>
            )
          )}

          {/* Botón de voz IA con ElevenLabs */}
          <Pressable
            onPress={() => setShowVozSporti(true)}
            style={styles.aiVoiceBtn}
            accessibilityLabel="Hablar con Sporti AI"
            accessibilityRole="button"
            accessibilityHint="Abre el chat de voz con Sporti IA"
          >
            <Ionicons name="headset" size={18} color={GREEN} />
          </Pressable>

          {isLoading || voiceState === "processing" ? (
            <Animated.View
              style={styles.loadingBtn}
              accessibilityLabel="Sporti está escribiendo"
              accessibilityRole="text"
            >
              <Animated.Text
                style={[
                  styles.loadingText,
                  {
                    opacity: loadingAnim,
                  },
                ]}
              >
                ...
              </Animated.Text>
            </Animated.View>
          ) : (
            <Pressable
              onPress={() => sendMessage(input)}
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && { backgroundColor: GREEN_DARK },
              ]}
              accessibilityLabel="Enviar mensaje"
              accessibilityRole="button"
              accessibilityHint="Envía tu pregunta a Sporti"
            >
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          )}
        </Animated.View>

        {/* Estado de voz */}
        {voiceState === "listening" && (
          <Pressable
            onPress={() => {
              console.log('[VOZ] Cancelando voz con tap');
              stopVoiceRecognition();
              setVoiceState("idle");
              setVoiceTranscript("");
            }}
            style={styles.voiceStatusContainer}
          >
            <Animated.View style={[styles.voiceMicCircle, { transform: [{ scale: micPulseAnim }] }]}>
              <Ionicons name="mic" size={24} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.voiceWaves}>
              <Animated.View style={[styles.voiceWave, { height: Animated.multiply(waveAnim1, 20) }]} />
              <Animated.View style={[styles.voiceWave, { height: Animated.multiply(waveAnim2, 30) }]} />
              <Animated.View style={[styles.voiceWave, { height: Animated.multiply(waveAnim3, 20) }]} />
            </View>
            <Text style={styles.voiceStatusText}>
              {voiceTranscript || "Escuchando..."}
            </Text>
            {isContinuousMode && (
              <Text style={styles.voiceModeText}>Modo continuo activo</Text>
            )}
            <Text style={styles.voiceCancelText}>Toca para cancelar</Text>
          </Pressable>
        )}

        {showHistory ? (
          <View style={styles.historyOverlay}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Tus conversaciones</Text>
              <Pressable
                onPress={() => setShowHistory(false)}
                accessibilityLabel="Cerrar historial"
                hitSlop={10}
              >
                <Ionicons name="close" size={24} color={TEXT_DARK} />
              </Pressable>
            </View>
            <Pressable
              style={styles.historyNewButton}
              onPress={() => void startNewConversation()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.historyNewButtonText}>Nueva conversación</Text>
            </Pressable>
            <FlatList
              data={conversations}
              keyExtractor={(conversation) => conversation.id}
              ListEmptyComponent={
                <Text style={styles.historyEmpty}>
                  Todavía no tienes conversaciones guardadas.
                </Text>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.historyItem,
                    item.id === conversationId && styles.historyItemActive,
                  ]}
                >
                  <Pressable
                    style={styles.historyItemContent}
                    onPress={() => void openConversation(item)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={GREEN} />
                    <Text style={styles.historyItemText} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.id === conversationId ? (
                      <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => void deleteConversation(item.id)}
                    style={styles.historyDeleteBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </Pressable>
                </View>
              )}
            />
          </View>
        ) : null}

        {/* ElevenLabs Voice Modal */}
        {showVozSporti && (
          <View style={styles.elevenLabsOverlay}>
            <View style={styles.elevenLabsContainer}>
              <Pressable
                onPress={() => setShowVozSporti(false)}
                style={styles.elevenLabsCloseBtn}
                hitSlop={12}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.elevenLabsTitle}>Sporti AI con voz real</Text>
              <VozSporti onClose={() => setShowVozSporti(false)} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    marginRight: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: GREEN,
    backgroundColor: "#0B0B0B",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  headerTextBox: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: GREEN,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    color: TEXT_DARK,
  },
  clearBtn: {
    marginLeft: "auto",
    padding: 8,
  },
  newChatBtn: {
    marginLeft: 2,
    padding: 8,
  },
  voiceToggleBtn: {
    marginLeft: 8,
    padding: 8,
  },
  historyOverlay: {
    position: "absolute",
    zIndex: 10,
    top: 84,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    backgroundColor: "#FFFFFF",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  historyTitle: {
    color: TEXT_DARK,
    fontSize: 21,
    fontWeight: "800",
  },
  historyNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  historyNewButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: "#F4F4F4",
  },
  historyItemActive: {
    borderWidth: 1,
    borderColor: GREEN,
  },
  historyItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  historyItemText: {
    flex: 1,
    color: TEXT_DARK,
    fontSize: 14,
  },
  historyDeleteBtn: {
    padding: 8,
    marginLeft: 4,
  },
  historyEmpty: {
    color: TEXT_MUTED,
    textAlign: "center",
    paddingTop: 24,
    fontSize: 14,
  },

  /* Lista */
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  /* Loading */
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0B0B0B",
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  loadingAvatarImg: {
    width: "80%",
    height: "80%",
  },
  loadingMessage: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },

  /* Burbujas */
  bubble: {
    maxWidth: "92%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: BUBBLE_BG,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: GREEN,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: TEXT_DARK,
  },
  userBubbleText: {
    color: "#FFFFFF",
  },
  copyBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    padding: 4,
  },

  /* Opciones */
  optionsWrapper: {
    paddingHorizontal: 6,
    marginTop: 2,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BUBBLE_BG,
    borderWidth: 1.2,
    borderColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    // sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // sombra Android
    elevation: 4,
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  optionIconBox: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
  },

  /* Opciones de preguntas */
  questionOptionsWrapper: {
    paddingHorizontal: 12,
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  questionOptionBtn: {
    backgroundColor: BUBBLE_BG,
    borderWidth: 1.2,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    // sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    // sombra Android
    elevation: 2,
  },
  questionOptionPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  questionOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },

  /* Resumen */
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: BUBBLE_BG,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    // sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // sombra Android
    elevation: 3,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryCardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  summaryCardSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  summaryCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#D0D0D0",
  },
  summaryCardButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GREEN,
    marginRight: 8,
  },
  continueChatBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    // sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // sombra Android
    elevation: 4,
  },
  continueChatText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Input */
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: -15,
    marginTop: 0,
    paddingLeft: 18,
    paddingRight: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.2,
    borderColor: GREEN,
    backgroundColor: "#F3F3F3",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1F7A2E",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: GREEN,
    fontSize: 16,
    fontWeight: "600",
  },

  /* Voz */
  voiceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F3F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  voiceBtnActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  aiVoiceBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E6F4FE",
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  voiceStatusContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#E6F4FE",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
  },
  voiceMicCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  voiceWaves: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
  },
  voiceWave: {
    width: 5,
    backgroundColor: GREEN,
    borderRadius: 2.5,
  },
  voiceStatusText: {
    fontSize: 15,
    color: TEXT_DARK,
    fontStyle: "italic",
    textAlign: "center",
    fontWeight: "500",
  },
  voiceModeText: {
    fontSize: 12,
    color: GREEN,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  voiceCancelText: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "400",
  },

  /* ElevenLabs Overlay */
  elevenLabsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  elevenLabsContainer: {
    backgroundColor: "#E6F4FE",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  elevenLabsCloseBtn: {
    alignSelf: "flex-end",
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 8,
    marginBottom: 16,
  },
  elevenLabsTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: GREEN,
    marginBottom: 20,
    textAlign: "center",
  },
});
