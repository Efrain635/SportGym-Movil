import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
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
    deleteClientChatConversation,
    getChatConversationMessages,
    getClientChatConversations,
    getClientWorkoutProgress,
    saveChatConversationMessage,
    saveGeneratedRoutine,
    subscribeClientProgressHistory,
    updateChatConversation,
    type ChatConversation,
    type ClientProgressHistory
} from "../../assets/database/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
    createChatbotRoutine,
    formatChatbotRoutine,
    getCardioRecommendation,
} from "../lib/chatbot-routines";
import { type ClientProfile } from "../lib/fitness-ai";
import {
    formatRecipesForAI,
    getRecipesForNutritionFocus,
    getRecommendedRecipesForProfile,
    saveFavoriteRecipes,
    type Recipe,
} from "../lib/recipes";
import { askSporti } from "../lib/sporti-groq";

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

type RecentWorkout = Awaited<ReturnType<typeof getClientWorkoutProgress>>["recentWorkouts"][number];

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

// Fuera del componente (nivel de módulo)
const animatedOptionIds = new Set<string>();
const animatedQuestionOptionIds = new Set<string>();

// Componentes fuera del componente principal para evitar re-renders
const MessageBubble = memo(({ item, onCopy, isCopied }: { item: Message; onCopy: (text: string, id: string) => void; isCopied: boolean }) => {
  const isBot = item.from === "bot";

  return (
    <View
      style={[
        styles.bubble,
        isBot ? styles.botBubble : styles.userBubble,
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
    </View>
  );
});

const OptionCard = memo(
  ({ opt, index, onSelect }: { opt: Option; index: number; onSelect: (title: string) => void }) => {
    const alreadyAnimated = animatedOptionIds.has(opt.id);
    const fadeAnim = useRef(new Animated.Value(alreadyAnimated ? 1 : 0)).current;
    const slideAnim = useRef(new Animated.Value(alreadyAnimated ? 0 : 30)).current;

    React.useEffect(() => {
      if (animatedOptionIds.has(opt.id)) return; // ya se animó, no repetir
      animatedOptionIds.add(opt.id);
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Pressable
          onPress={() => onSelect(opt.title)}
          style={({ pressed }) => [styles.optionCard, pressed && styles.optionPressed]}
          accessibilityLabel={opt.title}
          accessibilityHint={opt.subtitle}
          accessibilityRole="button"
        >
          <View style={styles.optionIconBox}>
            <MaterialCommunityIcons name={opt.icon} size={30} color={TEXT_DARK} />
          </View>
          <View style={styles.optionTextBox}>
            <Text style={styles.optionTitle}>{opt.title}</Text>
            <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
  (prev, next) =>
    prev.opt.id === next.opt.id &&
    prev.index === next.index &&
    prev.onSelect === next.onSelect
);

const QuestionOptionButton = memo(
  ({ option, index, onSelect }: { option: QuestionOption; index: number; onSelect: (value: string) => void }) => {
    const alreadyAnimated = animatedQuestionOptionIds.has(option.value);
    const fadeAnim = useRef(new Animated.Value(alreadyAnimated ? 1 : 0)).current;
    const slideAnim = useRef(new Animated.Value(alreadyAnimated ? 0 : 20)).current;

    React.useEffect(() => {
      if (animatedQuestionOptionIds.has(option.value)) return; // ya se animó, no repetir
      animatedQuestionOptionIds.add(option.value);
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
  },
  (prev, next) =>
    prev.option.value === next.option.value &&
    prev.index === next.index &&
    prev.onSelect === next.onSelect
);

const RecipeRecommendationCard = memo(({ recipe, onView }: { recipe: Recipe; onView: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [styles.recipeCard, pressed && styles.recipeCardPressed]}
      >
        <View style={styles.recipeCardHeader}>
          <Ionicons name="restaurant-outline" size={24} color={GREEN} />
          <Text style={styles.recipeCardTitle}>Receta Recomendada</Text>
        </View>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <View style={styles.recipeNutrition}>
          {recipe.calories && (
            <Text style={styles.nutritionText}>{recipe.calories} kcal</Text>
          )}
          {recipe.protein && (
            <Text style={styles.nutritionText}>{recipe.protein}g proteína</Text>
          )}
          {recipe.preparationMinutes && (
            <Text style={styles.nutritionText}>{recipe.preparationMinutes} min</Text>
          )}
        </View>
        <View style={styles.recipeCardFooter}>
          <Text style={styles.recipeCardAction}>Ver receta completa →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const RoutineRecommendationCard = memo(({ onView }: { onView: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [styles.recipeCard, pressed && styles.recipeCardPressed]}
      >
        <View style={styles.recipeCardHeader}>
          <Ionicons name="fitness" size={24} color={GREEN} />
          <Text style={styles.recipeCardTitle}>Rutina Recomendada</Text>
        </View>
        <Text style={styles.recipeName}>Ver tu rutina personalizada</Text>
        <View style={styles.recipeNutrition}>
          <Text style={styles.nutritionText}>Ejercicios adaptados a tu objetivo</Text>
          <Text style={styles.nutritionText}>Series y repeticiones incluidas</Text>
        </View>
        <View style={styles.recipeCardFooter}>
          <Text style={styles.recipeCardAction}>Ver rutina →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const StoreRecommendationCard = memo(({ onView }: { onView: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={onView}
        style={({ pressed }) => [styles.recipeCard, pressed && styles.recipeCardPressed]}
      >
        <View style={styles.recipeCardHeader}>
          <Ionicons name="cart-outline" size={24} color={GREEN} />
          <Text style={styles.recipeCardTitle}>Suplementos Recomendados</Text>
        </View>
        <Text style={styles.recipeName}>Explora suplementos básicos</Text>
        <View style={styles.recipeNutrition}>
          <Text style={styles.nutritionText}>Proteína, creatina, pre-entreno</Text>
          <Text style={styles.nutritionText}>Opciones según tu objetivo</Text>
        </View>
        <View style={styles.recipeCardFooter}>
          <Text style={styles.recipeCardAction}>Ver tienda →</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const DrinkRecommendationCard = memo(({ drink, onDismiss }: { drink: string; onDismiss: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.recipeCard}>
        <View style={styles.recipeCardHeader}>
          <Ionicons name="water-outline" size={24} color={GREEN} />
          <Text style={styles.recipeCardTitle}>Recomendación de Hidratación</Text>
        </View>
        <Text style={styles.recipeName}>{drink}</Text>
        <View style={styles.recipeNutrition}>
          <Text style={styles.nutritionText}>Importante para tu recuperación</Text>
          <Text style={styles.nutritionText}>Mantén buena hidratación</Text>
        </View>
        <View style={styles.recipeCardFooter}>
          <Pressable onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});

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
  const [isPreparingRecipes, setIsPreparingRecipes] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [recommendedRecipe, setRecommendedRecipe] = useState<Recipe | null>(null);
  const [recommendedRoutine, setRecommendedRoutine] = useState<string | null>(null);
  const [recommendedStore, setRecommendedStore] = useState<string | null>(null);
  const [recommendedDrink, setRecommendedDrink] = useState<string | null>(null);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [clientProgressSnapshot, setClientProgressSnapshot] = useState<{
    clientId: string;
    history: ClientProgressHistory;
  } | null>(null);
  const clientProgressHistory =
    clientProgressSnapshot?.clientId === user?.clientId
      ? clientProgressSnapshot.history
      : null;

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

  const dynamicOptions = useMemo(() => OPTIONS, []);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const recipes = await getRecommendedRecipesForProfile(profile?.goal);
        setAllRecipes(recipes);
      } catch (error) {
        console.error("Error loading recipes:", error);
      }
    };
    loadRecipes();
  }, [profile?.goal]);

  useEffect(() => {
    const loadRecentWorkouts = async () => {
      if (!user?.clientId) return;
      try {
        const progress = await getClientWorkoutProgress(user.clientId);
        setRecentWorkouts(progress.recentWorkouts.slice(0, 3));
      } catch (error) {
        console.error("Error loading workouts:", error);
      }
    };
    loadRecentWorkouts();
  }, [user?.clientId]);

  useEffect(() => {
    const clientId = user?.clientId;
    if (!clientId) return;

    return subscribeClientProgressHistory(
      clientId,
      (history) => setClientProgressSnapshot({ clientId, history }),
      (error) => {
        console.error("Error loading client progress:", error);
      },
    );
  }, [user?.clientId]);

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

  const copyMessage = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Guardar referencias a estado para que sendMessage sea estable
  const stateRef = useRef({
    input,
    conversationId,
    user,
    userGoal,
    userResponses,
    conversationStep,
    currentQuestion,
    messages,
    profile,
    showOptions,
    initialMessage,
    conversations,
    recentWorkouts,
    clientProgressHistory,
    recommendedRecipe,
    recommendedRoutine,
    recommendedStore,
    recommendedDrink,
  });

  stateRef.current = {
    input,
    conversationId,
    user,
    userGoal,
    userResponses,
    conversationStep,
    currentQuestion,
    messages,
    profile,
    showOptions,
    initialMessage,
    conversations,
    recentWorkouts,
    clientProgressHistory,
    recommendedRecipe,
    recommendedRoutine,
    recommendedStore,
    recommendedDrink,
  };

  const resetConversationState = () => {
    setMessages([initialMessage]);
    setShowOptions(true);
    setUserGoal(null);
    setUserResponses({});
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setConversationStep("initial");
    setShowSummary(false);
    animatedOptionIds.clear();
    animatedQuestionOptionIds.clear();
  };

  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

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
    animatedOptionIds.clear(); // Limpiar registro de animaciones para volver a animar
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
    const confirmDeletion = async () => {
      try {
        if (!user?.clientId) {
          throw new Error("Debes iniciar sesión para eliminar conversaciones.");
        }
        await deleteClientChatConversation(user.clientId, idToDelete);
        setConversations((current) =>
          current.filter((conv) => conv.id !== idToDelete)
        );
        if (conversationId === idToDelete) {
          setConversationId(null);
          setInput("");
          resetConversationState();
          setShowHistory(false);
        }
      } catch (error) {
        const details =
          error instanceof Error ? error.message : "Error desconocido.";
        console.error("No se pudo eliminar la conversación:", error);
        Alert.alert(
          "No se pudo eliminar",
          details,
        );
      }
    };

    const confirmationMessage =
      "¿Estás seguro de que quieres eliminar esta conversación?";

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(confirmationMessage)) {
        await confirmDeletion();
      }
      return;
    }

    Alert.alert(
      "Eliminar conversación",
      confirmationMessage,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void confirmDeletion(),
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

  const sendMessage = useCallback(async (text?: string) => {
    const s = stateRef.current;
    const textToSend = text || s.input.trim();
    if (!textToSend || textToSend.length < 1) {
      shakeInput();
      Alert.alert("Mensaje vacío", "Por favor escribe algo antes de enviar");
      return;
    }
    if (textToSend.length > 500) {
      Alert.alert("Mensaje muy largo", "Tu mensaje es demasiado largo. Acórtalo a menos de 500 caracteres");
      return;
    }


    let activeConversationId = s.conversationId;
    if (!activeConversationId && s.user?.clientId) {
      try {
        activeConversationId = await createClientChatConversation(
          s.user.clientId,
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
    if (s.conversationStep === "initial") {
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

    if (s.conversationStep === "goal" || s.conversationStep === "details") {
      const questions = getQuestionsForGoal(s.userGoal || "");
      const answeredCount = Object.keys(s.userResponses).length - 1; // -1 porque goal ya está incluido

      if (answeredCount < questions.length) {
        // Guardar la respuesta
        const currentQ = questions[answeredCount];
        const updatedResponses = { ...s.userResponses, [currentQ.key]: textToSend };
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
              s.userGoal,
              updatedResponses,
              false,
            );
            setIsLoading(false);
            scrollToEnd();
          }, 500);
          return;
        } else {
          const routine = createChatbotRoutine({
            goal: s.userGoal ?? "Mantenerme en forma",
            daysAnswer: updatedResponses.days ?? "4 días",
            durationAnswer: updatedResponses.duration ?? "60 minutos",
            focus: updatedResponses.focus,
            restriction: updatedResponses.injuries,
            level:
              s.profile?.level ??
              (updatedResponses.current_activity === "Ninguna"
                ? "principiante"
                : undefined),
          });
          const restSeconds =
            s.userGoal === "Ganar masa muscular" ? 90 : 60;
          let routineSaved = false;
          let nutritionMessage = "";
          if (s.user?.clientId && routine.length > 0) {
            try {
              await saveGeneratedRoutine(
                s.user.clientId,
                s.user.username,
                `${s.user.firstName} ${s.user.lastName}`.trim(),
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
          } else if (!s.user?.clientId) {
            Alert.alert(
              "Rutina no guardada",
              "Inicia sesión como cliente para guardar la rutina y editarla en Mi rutina.",
            );
          }

          nutritionMessage =
            "\n\nCuando pulses “Ver recetas”, Sporti buscará en el recetario opciones para tu objetivo y las guardará en Mis recetas.";

          const routineText = formatChatbotRoutine(
            routine,
            restSeconds,
            getCardioRecommendation(
              s.userGoal ?? "",
              updatedResponses,
              s.profile?.level,
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
            s.userGoal,
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
    const historial = s.messages.map((m) => ({
      role: (m.from === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

    historial.push({
      role: "user",
      content: textToSend,
    });

    const perfil = {
      nivel: s.profile?.level,
      dias: s.profile?.daysPerWeek,
      maquinas: s.profile?.gymMachines,
      peso: s.clientProgressHistory?.weights.at(-1)?.weight ?? s.profile?.weight,
      altura: s.profile?.height,
      edad: s.profile?.age,
      pesoObjetivo: s.clientProgressHistory?.targetWeight,
      objetivo: s.clientProgressHistory?.goal ?? s.profile?.goal,
      genero: s.profile?.gender,
      restricciones: s.profile?.restrictions,
      entrenamientosRecientes: recentWorkouts.length > 0 ? recentWorkouts.map((workout) => ({
        dia: workout.date ? new Date(workout.date).toLocaleDateString() : "Fecha desconocida",
        duracion: workout.durationMinutes,
        fecha: workout.date,
      })) : [],
    };

    const recipesContext = formatRecipesForAI(allRecipes);

    const response = await askSporti(historial, {
      ...perfil,
      objetivo: s.userGoal ?? perfil.objetivo,
      respuestas: s.userResponses,
    }, recipesContext);

    const botMessage = { id: `b-${Date.now()}`, from: "bot" as const, text: response };
    setMessages((prev) => [...prev, botMessage]);
    await persistMessage(activeConversationId, botMessage);

    const recommendationMatch = response.match(/\[([^\]]+)\]/);
    if (recommendationMatch) {
      const recommendation = recommendationMatch[1];

      const matchedRecipe = allRecipes.find(r =>
        r.name.toLowerCase().includes(recommendation.toLowerCase()) ||
        recommendation.toLowerCase().includes(r.name.toLowerCase())
      );

      if (matchedRecipe) {
        setRecommendedRecipe(matchedRecipe);
      } else if (recommendation.toLowerCase().includes("rutina")) {
        setRecommendedRoutine(recommendation);
      } else if (recommendation.toLowerCase().includes("suplemento") || recommendation.toLowerCase().includes("tienda")) {
        setRecommendedStore(recommendation);
      } else if (recommendation.toLowerCase().includes("bebida")) {
        setRecommendedDrink(recommendation);
      }
    }

    setIsLoading(false);
    scrollToEnd();


  }, []); // Dependencias vacías porque usa stateRef

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return (
      <MessageBubble
        item={item}
        onCopy={copyMessage}
        isCopied={copiedMessageId === item.id}
      />
    );
  }, [copiedMessageId, copyMessage]);

  const handleSelect = useCallback((title: string) => {
    sendMessage(title);
  }, [sendMessage]);

  const handleViewRecipe = useCallback(() => {
    if (recommendedRecipe) {
      router.push({
        pathname: "/(tabs)/nutrition",
        params: { recipeId: recommendedRecipe.id }
      } as never);
      setRecommendedRecipe(null);
    }
  }, [recommendedRecipe]);

  const handleViewRoutine = useCallback(() => {
    router.navigate("/(tabs)/routine?view=routine" as never);
    setRecommendedRoutine(null);
  }, []);

  const handleViewStore = useCallback(() => {
    router.navigate("/(tabs)/nutrition" as never);
    setRecommendedStore(null);
  }, []);

  const handleDismissDrink = useCallback(() => {
    setRecommendedDrink(null);
  }, []);

  const openRecommendedRecipes = async () => {
    const { user: currentUser, userGoal: currentGoal } = stateRef.current;
    if (!currentGoal) {
      Alert.alert(
        "No se encontró tu objetivo",
        "Vuelve a crear tu rutina para recibir recomendaciones de recetas.",
      );
      return;
    }

    setIsPreparingRecipes(true);
    try {
      const recommendedRecipes =
        await getRecipesForNutritionFocus(currentGoal);
      if (currentUser?.clientId && recommendedRecipes.length > 0) {
        await saveFavoriteRecipes(currentUser.clientId, recommendedRecipes);
      }

      if (currentUser?.clientId) {
        router.navigate("/(tabs)/nutrition?view=favorites" as never);
      } else {
        router.navigate("/(tabs)/nutrition" as never);
      }
      if (recommendedRecipes.length === 0) {
        Alert.alert(
          "No encontramos recetas para este objetivo",
          "No hay recetas etiquetadas para tu objetivo en el recetario. Puedes explorar el catálogo y agregar recetas manualmente.",
        );
      }
    } catch (error) {
      console.error("No se pudieron preparar las recetas recomendadas:", error);
      Alert.alert(
        "No se pudieron guardar las recetas",
        "Sporti no pudo cargar o guardar las recetas del recetario. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setIsPreparingRecipes(false);
    }
  };

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

    if (recommendedRecipe) {
      return (
        <View style={styles.recipeCardWrapper}>
          <RecipeRecommendationCard
            recipe={recommendedRecipe}
            onView={handleViewRecipe}
          />
        </View>
      );
    }

    if (recommendedRoutine) {
      return (
        <View style={styles.recipeCardWrapper}>
          <RoutineRecommendationCard
            onView={handleViewRoutine}
          />
        </View>
      );
    }

    if (recommendedStore) {
      return (
        <View style={styles.recipeCardWrapper}>
          <StoreRecommendationCard
            onView={handleViewStore}
          />
        </View>
      );
    }

    if (recommendedDrink) {
      return (
        <View style={styles.recipeCardWrapper}>
          <DrinkRecommendationCard
            drink={recommendedDrink}
            onDismiss={handleDismissDrink}
          />
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
            onPress={() => void openRecommendedRecipes()}
            disabled={isPreparingRecipes}
          >
            <View style={styles.summaryCardHeader}>
              {isPreparingRecipes ? (
                <ActivityIndicator size="large" color={GREEN} />
              ) : (
                <Ionicons name="restaurant" size={32} color={GREEN} />
              )}
              <View style={styles.summaryCardHeaderText}>
                <Text style={styles.summaryCardTitle}>Mis recetas</Text>
                <Text style={styles.summaryCardSubtitle}>
                  Recomendadas para tu objetivo. Agrega más desde Nutrición.
                </Text>
              </View>
            </View>
            <View style={styles.summaryCardFooter}>
              <Text style={styles.summaryCardButtonText}>
                {isPreparingRecipes ? "Preparando recetas..." : "Ver recetas"}
              </Text>
              {!isPreparingRecipes && (
                <Ionicons name="arrow-forward" size={20} color={GREEN} />
              )}
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

    if (showOptions) {
      return (
        <View style={styles.optionsWrapper}>
          {dynamicOptions.map((opt, index) => (
            <OptionCard key={opt.id} opt={opt} index={index} onSelect={handleSelect} />
          ))}
        </View>
      );
    }

    if (currentQuestion && (conversationStep === "goal" || conversationStep === "details")) {
      return (
        <View style={styles.questionOptionsWrapper}>
          {currentQuestion.options.map((opt, index) => (
            <QuestionOptionButton key={opt.value} option={opt} index={index} onSelect={handleSelect} />
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
            editable={!isLoading}
            accessibilityLabel="Campo de texto para escribir tu pregunta"
            accessibilityHint="Escribe tu pregunta y presiona enviar"
          />

          {isLoading ? (
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

  /* Recipe Card */
  recipeCardWrapper: {
    paddingHorizontal: 12,
    marginTop: 8,
  },
  recipeCard: {
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  recipeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recipeCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GREEN,
    marginLeft: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 8,
  },
  recipeNutrition: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  nutritionText: {
    fontSize: 13,
    color: TEXT_MUTED,
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recipeCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  recipeCardAction: {
    fontSize: 14,
    fontWeight: "600",
    color: GREEN,
  },
  dismissBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dismissText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
