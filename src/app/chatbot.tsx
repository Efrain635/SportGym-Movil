import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { updateClientProfile } from "../../assets/database/firebase";
import { ThemedText } from "../components/themed-text";
import { useAuth } from "../contexts/AuthContext";
import {
    buildFitnessCoachPrompt,
    generateCoachReply,
    type ClientProfile,
} from "../lib/fitness-ai";

const fitnessGoals = [
  "ganar masa muscular",
  "perder grasa",
  "tonificar",
  "mejorar resistencia",
];

const fitnessLevels = ["principiante", "intermedio", "avanzado"] as const;

const unknownMachineOption = "No sé qué máquinas tiene mi gimnasio";

const machineOptions = [
  "press banca",
  "remo",
  "leg press",
  "polea",
  "cinta",
  "mancuernas",
  "smith",
  "barra libre",
  "bandas",
  "abdominales",
  unknownMachineOption,
];

const daysOptions = [1, 2, 3, 4, 5, 6];

type Message = {
  id: number;
  text: string;
  sender: "sporti" | "user";
};

const initialMessage: Message = {
  id: 1,
  sender: "sporti",
  text: "¡Hola! Soy Sporti. Antes de empezar, sigue estos pasos:\n1) Elige tu objetivo.\n2) Selecciona tu nivel.\n3) Indica los días que vas al gimnasio por semana.\n4) Elige tus máquinas o marca 'No sé qué máquinas tiene mi gimnasio'.\n5) Pulsa 'Guardar perfil'.\n6) Escribe tu pregunta para recibir una rutina o plan personalizado.",
};

function getSportiResponse(question: string, profile: ClientProfile | null) {
  return generateCoachReply(profile, question);
}

export default function ChatbotScreen() {
  const { user, setUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(
    user?.goal ?? "ganar masa muscular",
  );
  const [selectedLevel, setSelectedLevel] = useState<
    "principiante" | "intermedio" | "avanzado"
  >(user?.level ?? "principiante");
  const [selectedDays, setSelectedDays] = useState(user?.daysPerWeek ?? 4);
  const [selectedMachines, setSelectedMachines] = useState<string[]>(
    user?.gymMachines ?? ["press banca", "remo", "mancuernas", "cinta"],
  );
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
        goal: selectedGoal,
        level: selectedLevel,
        gymMachines: selectedMachines,
        daysPerWeek: selectedDays,
        restrictions: user.restrictions ?? [],
        weight: user.weight ?? null,
        height: user.height ?? null,
        age: user.age ?? null,
      }
    : {
        goal: selectedGoal,
        level: selectedLevel,
        gymMachines: selectedMachines,
        daysPerWeek: selectedDays,
      };

  const toggleMachine = (machine: string) => {
    setSelectedMachines((currentMachines) => {
      if (machine === unknownMachineOption) {
        return currentMachines.includes(machine)
          ? currentMachines.filter((item) => item !== machine)
          : [machine];
      }

      const next = currentMachines.filter(
        (item) => item !== unknownMachineOption,
      );

      return currentMachines.includes(machine)
        ? next.filter((item) => item !== machine)
        : [...next, machine];
    });
  };

  const handleSaveProfile = async () => {
    const clientIdentifier = (user?.username ?? user?.email ?? "").trim();

    if (!clientIdentifier) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          sender: "sporti",
          text: "No pude identificar tu usuario activo para guardar el perfil. Inicia sesión de nuevo e inténtalo otra vez.",
        },
      ]);
      return;
    }

    setIsSavingProfile(true);

    try {
      await updateClientProfile(clientIdentifier, {
        goal: selectedGoal,
        level: selectedLevel,
        daysPerWeek: selectedDays,
        gymMachines: selectedMachines,
        restrictions: user?.restrictions ?? [],
      });

      setUser({
        ...user,
        goal: selectedGoal,
        level: selectedLevel,
        daysPerWeek: selectedDays,
        gymMachines: selectedMachines,
        restrictions: user?.restrictions ?? [],
      });
      setShowProfilePanel(false);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          sender: "sporti",
          text: `Perfecto, tu perfil quedó guardado para ${selectedGoal} con nivel ${selectedLevel}. Ahora Sporti tendrá en cuenta tus días y máquinas disponibles. Puedes empezar a preguntarle lo que necesites.`,
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message === "client-not-found"
          ? "No encontré el cliente asociado a tu cuenta. Revisa tu usuario o vuelve a iniciar sesión."
          : "No pude guardar tu perfil de entrenamiento en este momento. Revisa tu conexión e inténtalo de nuevo.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          sender: "sporti",
          text: errorMessage,
        },
      ]);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const sendMessage = () => {
    const question = input.trim();

    if (!question) {
      return;
    }

    const prompt = buildFitnessCoachPrompt(profile, question);
    const response = getSportiResponse(question, profile);

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: nextMessageId, sender: "user", text: question },
      {
        id: nextMessageId + 1,
        sender: "sporti",
        text: `${response}\n\nPrompt base: ${prompt}`,
      },
    ]);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.appShell}>
          <View style={styles.sidebarCard}>
            <View style={styles.sidebarGlow} />
            <Image
              source={require("../Imagen/Sporti.png")}
              style={styles.botImage}
              resizeMode="contain"
            />
            <ThemedText style={styles.sidebarTitle}>Sporti</ThemedText>
            <ThemedText style={styles.sidebarDescription}>
              Entrena con inteligencia artificial, rutinas personalizadas y
              seguimiento inteligente.
            </ThemedText>

            <Pressable
              style={styles.primaryAction}
              onPress={() => setShowProfilePanel(true)}
            >
              <ThemedText style={styles.primaryActionText}>
                ¿Cuál es tu objetivo?
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.secondaryAction}
              onPress={() =>
                setInput("¿Cuánto tiempo puedo entrenar cada día?")
              }
            >
              <ThemedText style={styles.secondaryActionText}>
                ¿Cuánto tiempo puedo entrenar?
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.secondaryAction}
              onPress={() => setInput("Quiero mejorar mi alimentación")}
            >
              <ThemedText style={styles.secondaryActionText}>
                Quiero mejorar mi alimentación
              </ThemedText>
            </Pressable>

            <View style={styles.sidebarFooter}>
              <ThemedText style={styles.footerLabel}>Perfil actual</ThemedText>
              <ThemedText style={styles.footerValue}>
                {selectedGoal} · {selectedLevel} · {selectedDays} días
              </ThemedText>
            </View>
          </View>

          <View style={styles.mainPanel}>
            {showProfilePanel ? (
              <View style={styles.profilePanel}>
                <View style={styles.profileHeaderRow}>
                  <ThemedText style={styles.sectionTitle}>
                    Tu perfil de coach
                  </ThemedText>
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveProfileButton,
                      pressed && styles.saveProfileButtonPressed,
                      isSavingProfile && styles.saveProfileButtonDisabled,
                    ]}
                    onPress={handleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    <ThemedText style={styles.saveProfileButtonText}>
                      {isSavingProfile ? "Guardando..." : "Guardar perfil"}
                    </ThemedText>
                  </Pressable>
                </View>

                <View style={styles.optionGroup}>
                  <ThemedText style={styles.optionLabel}>Objetivo</ThemedText>
                  <View style={styles.chipRow}>
                    {fitnessGoals.map((goal) => (
                      <Pressable
                        key={goal}
                        style={[
                          styles.chip,
                          selectedGoal === goal && styles.chipSelected,
                        ]}
                        onPress={() => setSelectedGoal(goal)}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            selectedGoal === goal && styles.chipTextSelected,
                          ]}
                        >
                          {goal}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.optionGroup}>
                  <ThemedText style={styles.optionLabel}>Nivel</ThemedText>
                  <View style={styles.chipRow}>
                    {fitnessLevels.map((level) => (
                      <Pressable
                        key={level}
                        style={[
                          styles.chip,
                          selectedLevel === level && styles.chipSelected,
                        ]}
                        onPress={() => setSelectedLevel(level)}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            selectedLevel === level && styles.chipTextSelected,
                          ]}
                        >
                          {level}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.optionGroup}>
                  <ThemedText style={styles.optionLabel}>
                    Días que voy al gimnasio por semana
                  </ThemedText>
                  <View style={styles.chipRow}>
                    {daysOptions.map((days) => (
                      <Pressable
                        key={days}
                        style={[
                          styles.dayChip,
                          selectedDays === days && styles.chipSelected,
                        ]}
                        onPress={() => setSelectedDays(days)}
                      >
                        <ThemedText
                          style={[
                            styles.chipText,
                            selectedDays === days && styles.chipTextSelected,
                          ]}
                        >
                          {days}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.optionGroup}>
                  <ThemedText style={styles.optionLabel}>
                    Máquinas disponibles
                  </ThemedText>
                  <View style={styles.machineGrid}>
                    {machineOptions.map((machine) => {
                      const active = selectedMachines.includes(machine);

                      return (
                        <Pressable
                          key={machine}
                          style={[
                            styles.machineChip,
                            active && styles.machineChipSelected,
                          ]}
                          onPress={() => toggleMachine(machine)}
                        >
                          <ThemedText
                            style={[
                              styles.machineChipText,
                              active && styles.machineChipTextSelected,
                            ]}
                          >
                            {machine}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.profileSummary}
                onPress={() => setShowProfilePanel(true)}
              >
                <ThemedText style={styles.profileSummaryTitle}>
                  Perfil guardado
                </ThemedText>
                <ThemedText style={styles.profileSummaryText}>
                  {selectedGoal} · {selectedLevel} · {selectedDays} días ·{" "}
                  {selectedMachines.length} máquinas
                </ThemedText>
                <ThemedText style={styles.profileSummaryAction}>
                  Toca para editarlo
                </ThemedText>
              </Pressable>
            )}

            <ScrollView
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <View style={styles.suggestionGrid}>
                {quickActions.map((action, index) => (
                  <Pressable
                    key={index}
                    style={styles.suggestionCard}
                    onPress={() => setInput(action)}
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
                    {message.text}
                  </ThemedText>
                </View>
              ))}
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
  appShell: {
    flex: 1,
    flexDirection: "row",
    padding: 14,
    gap: 14,
    backgroundColor: "#0C0D0D",
  },
  sidebarCard: {
    width: 330,
    backgroundColor: "#0A0D0D",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E2B29",
    shadowColor: "#5CF5BB",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  sidebarGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    backgroundColor: "#12D16A",
    opacity: 0.12,
    borderRadius: 110,
    top: -40,
    left: 55,
  },
  botImage: {
    width: 210,
    height: 210,
    marginTop: 10,
    marginBottom: 4,
  },
  sidebarTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    marginBottom: 8,
  },
  sidebarDescription: {
    color: "#D6D6D6",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 18,
  },
  primaryAction: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#0FBE76",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#07130D",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryAction: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: "#1C2424",
    borderWidth: 1,
    borderColor: "#2D3837",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  secondaryActionText: {
    color: "#EAEAEA",
    fontSize: 12,
    fontWeight: "600",
  },
  sidebarFooter: {
    width: "100%",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#23312F",
  },
  footerLabel: {
    color: "#9AC9B8",
    fontSize: 11,
    marginBottom: 4,
  },
  footerValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  mainPanel: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#E7E7E7",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D6D6D6",
  },
  header: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#292A2A",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D92D55",
    marginRight: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  status: {
    color: "#AFAFAF",
    fontSize: 12,
    marginTop: 1,
  },
  profilePanel: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#292A2A",
    backgroundColor: "#111212",
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  profileSummary: {
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#171919",
    borderWidth: 1,
    borderColor: "#2A2B2B",
  },
  profileSummaryTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  profileSummaryText: {
    color: "#D7D7D7",
    fontSize: 12,
  },
  profileSummaryAction: {
    color: "#D92D55",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  saveProfileButton: {
    backgroundColor: "#D92D55",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveProfileButtonPressed: {
    opacity: 0.8,
  },
  saveProfileButtonDisabled: {
    opacity: 0.7,
  },
  saveProfileButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  optionGroup: {
    marginBottom: 12,
  },
  optionLabel: {
    color: "#C9C9C9",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#242525",
    borderWidth: 1,
    borderColor: "#343434",
  },
  chipSelected: {
    backgroundColor: "#D92D55",
    borderColor: "#D92D55",
  },
  chipText: {
    color: "#E6E6E6",
    fontSize: 12,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayChip: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#242525",
    borderWidth: 1,
    borderColor: "#343434",
  },
  machineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  machineChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#242525",
    borderWidth: 1,
    borderColor: "#343434",
  },
  machineChipSelected: {
    backgroundColor: "#1F2D2B",
    borderColor: "#2BAA6B",
  },
  machineChipText: {
    color: "#E6E6E6",
    fontSize: 11,
  },
  machineChipTextSelected: {
    color: "#B5FFD8",
    fontWeight: "700",
  },
  messages: {
    flex: 1,
    backgroundColor: "#E6E6E6",
  },
  messagesContent: {
    padding: 18,
    gap: 12,
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  suggestionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    minWidth: 150,
    flex: 1,
  },
  suggestionCardText: {
    color: "#1B1B1B",
    fontSize: 12,
    fontWeight: "700",
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    color: "#E9E9E9",
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  disclaimer: {
    color: "#858585",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
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
    opacity: 0.75,
  },
});
