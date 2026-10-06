import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../components/themed-text";
import { SportGymColors } from "../constants/theme";

type Filter = "Todos" | "Hoy" | "Semana";

type TabName = "Inicio" | "Rutina" | "Tienda" | "Nutrición";

type Routine = {
  id: number;
  day: string;
  title: string;
  exercises: number;
  duration: string;
  status: "Completado" | "Pendiente";
};

const routines: Routine[] = [
  {
    id: 1,
    day: "Hoy",
    title: "Pecho y Tríceps",
    exercises: 8,
    duration: "45 min",
    status: "Pendiente",
  },
  {
    id: 2,
    day: "Mañana",
    title: "Espalda y Bíceps",
    exercises: 10,
    duration: "50 min",
    status: "Pendiente",
  },
  {
    id: 3,
    day: "Miércoles",
    title: "Pierna y Hombros",
    exercises: 12,
    duration: "55 min",
    status: "Pendiente",
  },
  {
    id: 4,
    day: "Jueves",
    title: "Cardio y Core",
    exercises: 6,
    duration: "30 min",
    status: "Pendiente",
  },
  {
    id: 5,
    day: "Viernes",
    title: "Pecho y Tríceps",
    exercises: 8,
    duration: "45 min",
    status: "Pendiente",
  },
];

export default function RoutineView() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const [activeTab, setActiveTab] = useState<TabName>("Rutina");
  const [screen, setScreen] = useState<"hub" | "routine" | "saved">("hub");

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    switch (tab) {
      case "Inicio":
        router.push("/(tabs)");
        break;
      case "Rutina":
        router.push("/(tabs)/routine");
        break;
      case "Tienda":
        router.push("/(tabs)/store");
        break;
      case "Nutrición":
        router.push("/(tabs)/nutrition");
        break;
    }
  };

  const filteredRoutines = routines.filter((routine) => {
    if (activeFilter === "Todos") {
      return true;
    }

    if (activeFilter === "Hoy") {
      return routine.day === "Hoy";
    }

    return true; // Semana muestra todos
  });

  if (screen !== "routine") {
    return (
      <TrainingHub
        isSavedView={screen === "saved"}
        onBack={() => setScreen("hub")}
        onExplore={() => router.push("/explore")}
        onOpenRoutine={() => setScreen("routine")}
        onOpenSaved={() => setScreen("saved")}
        onTabPress={handleTabPress}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          {/* ========================================= */}
          {/* HEADER */}
          {/* ========================================= */}

          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => setScreen("hub")}
              accessibilityLabel="Volver a entrenamiento"
            >
              <Ionicons name="arrow-back" size={25} color="#D8D8D8" />
            </Pressable>

            <ThemedText style={styles.headerTitle}>Mi Rutina</ThemedText>

            <View style={styles.headerRightSpace} />
          </View>

          {/* ========================================= */}
          {/* FILTROS */}
          {/* ========================================= */}

          <View style={styles.filtersContainer}>
            <FilterButton
              title="Todos"
              active={activeFilter === "Todos"}
              onPress={() => setActiveFilter("Todos")}
            />

            <FilterButton
              title="Hoy"
              active={activeFilter === "Hoy"}
              onPress={() => setActiveFilter("Hoy")}
            />

            <FilterButton
              title="Semana"
              active={activeFilter === "Semana"}
              onPress={() => setActiveFilter("Semana")}
            />
          </View>

          {/* ========================================= */}
          {/* LISTA DE RUTINAS */}
          {/* ========================================= */}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.routineList}
            showsVerticalScrollIndicator={false}
          >
            {filteredRoutines.map((routine) => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}

            {filteredRoutines.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={40} color="#555555" />

                <ThemedText style={styles.emptyText}>
                  No hay rutinas para hoy
                </ThemedText>
              </View>
            )}

            {/* ESPACIO PARA QUE EL ÚLTIMO CARD NO QUEDE PEGADO */}
            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* ========================================= */}
          {/* NAVEGACIÓN */}
          {/* ========================================= */}

          <View style={styles.bottomNavigation}>
            <BottomTab
              label="Inicio"
              icon="home-outline"
              activeIcon="home"
              active={activeTab === "Inicio"}
              onPress={() => handleTabPress("Inicio")}
            />

            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              active={activeTab === "Rutina"}
              onPress={() => handleTabPress("Rutina")}
            />

            <BottomTab
              label="Tienda"
              icon="flask-outline"
              activeIcon="flask"
              active={activeTab === "Tienda"}
              onPress={() => handleTabPress("Tienda")}
            />

            <BottomTab
              label="Nutrición"
              icon="nutrition-outline"
              activeIcon="nutrition"
              active={activeTab === "Nutrición"}
              onPress={() => handleTabPress("Nutrición")}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

type TrainingHubProps = {
  isSavedView: boolean;
  onBack: () => void;
  onExplore: () => void;
  onOpenRoutine: () => void;
  onOpenSaved: () => void;
  onTabPress: (tab: TabName) => void;
};

function TrainingHub({
  isSavedView,
  onBack,
  onExplore,
  onOpenRoutine,
  onOpenSaved,
  onTabPress,
}: TrainingHubProps) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.hubHeader}>
            {isSavedView ? (
              <Pressable
                style={styles.backButton}
                onPress={onBack}
                accessibilityLabel="Volver a entrenamiento"
              >
                <Ionicons name="arrow-back" size={23} color="#F2F2F2" />
              </Pressable>
            ) : (
              <View style={styles.headerRightSpace} />
            )}
            <View style={styles.hubHeading}>
              <ThemedText style={styles.hubTitle}>
                {isSavedView ? "Guardados" : "Entrenamiento"}
              </ThemedText>
              <ThemedText style={styles.hubSubtitle}>
                {isSavedView ? "Tus ejercicios favoritos" : "Tu siguiente sesión empieza aquí"}
              </ThemedText>
            </View>
            <View style={styles.headerRightSpace} />
          </View>

          <ScrollView
            style={styles.hubScroll}
            contentContainerStyle={[
              styles.hubContent,
              isSavedView && styles.savedContent,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {isSavedView ? (
              <View style={styles.savedState}>
                <View style={styles.savedIcon}>
                  <Ionicons
                    name="heart-outline"
                    size={30}
                    color={SportGymColors.primary}
                  />
                </View>
                <ThemedText style={styles.savedTitle}>
                  Aún no guardas ejercicios
                </ThemedText>
                <ThemedText style={styles.savedDescription}>
                  Explora los ejercicios y guarda tus favoritos para encontrarlos aquí.
                </ThemedText>
                <Pressable
                  style={({ pressed }) => [
                    styles.savedButton,
                    pressed && styles.filterPressed,
                  ]}
                  onPress={onExplore}
                >
                  <ThemedText style={styles.savedButtonText}>
                    Explorar ejercicios
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <>
                <ImageBackground
                  source={require("../Imagen/Imagen 1.webp")}
                  style={styles.trainingHero}
                  imageStyle={styles.trainingHeroImage}
                  resizeMode="cover"
                >
                  <View style={styles.trainingHeroOverlay}>
                    <ThemedText style={styles.heroEyebrow}>
                      SPORTGYM · ENTRENA HOY
                    </ThemedText>
                    <ThemedText style={styles.heroTitle}>
                      Cada sesión cuenta.
                    </ThemedText>
                    <Pressable
                      style={({ pressed }) => [
                        styles.heroButton,
                        pressed && styles.filterPressed,
                      ]}
                      onPress={onOpenRoutine}
                    >
                      <ThemedText style={styles.heroButtonText}>
                        Ver mi rutina
                      </ThemedText>
                      <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </ImageBackground>

                <ThemedText style={styles.hubSectionTitle}>
                  Entrena a tu manera
                </ThemedText>
                <ActionCard
                  icon="barbell-outline"
                  title="Mi rutina"
                  description="Tu plan personalizado"
                  onPress={onOpenRoutine}
                />
                <ActionCard
                  icon="search-outline"
                  title="Explorar ejercicios"
                  description="Encuentra tu próximo ejercicio"
                  onPress={onExplore}
                />
                <ActionCard
                  icon="heart-outline"
                  title="Mis ejercicios guardados"
                  description="Tus favoritos, siempre a mano"
                  onPress={onOpenSaved}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.bottomNavigation}>
            <BottomTab
              label="Inicio"
              icon="home-outline"
              activeIcon="home"
              active={false}
              onPress={() => onTabPress("Inicio")}
            />
            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              active
              onPress={() => onTabPress("Rutina")}
            />
            <BottomTab
              label="Tienda"
              icon="flask-outline"
              activeIcon="flask"
              active={false}
              onPress={() => onTabPress("Tienda")}
            />
            <BottomTab
              label="Nutrición"
              icon="nutrition-outline"
              activeIcon="nutrition"
              active={false}
              onPress={() => onTabPress("Nutrición")}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

type ActionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function ActionCard({ icon, title, description, onPress }: ActionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.routinePressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.actionCopy}>
        <ThemedText style={styles.actionTitle}>{title}</ThemedText>
        <ThemedText style={styles.actionDescription}>{description}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#A6AAA5" />
    </Pressable>
  );
}

/* ===================================================== */
/* FILTRO */
/* ===================================================== */

type FilterButtonProps = {
  title: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({ title, active, onPress }: FilterButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.filterPressed,
      ]}
      onPress={onPress}
    >
      <ThemedText
        style={[styles.filterText, active && styles.filterTextActive]}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

/* ===================================================== */
/* TARJETA DE RUTINA */
/* ===================================================== */

type RoutineCardProps = {
  routine: Routine;
};

function RoutineCard({ routine }: RoutineCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.routineCard,
        pressed && styles.routinePressed,
      ]}
      onPress={() => {
        console.log("Rutina seleccionada:", routine.id);
      }}
    >
      {/* DÍA */}

      <ThemedText style={styles.routineDay}>{routine.day}</ThemedText>

      {/* TÍTULO */}

      <View style={styles.routineTitleRow}>
        <ThemedText style={styles.routineTitle}>{routine.title}</ThemedText>

        <Ionicons name="chevron-forward" size={25} color="#222222" />
      </View>

      {/* DETALLES */}

      <View style={styles.routineBottomRow}>
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="list-outline" size={14} color="#555555" />

            <ThemedText style={styles.detailText}>
              {routine.exercises} ejercicios
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#555555" />

            <ThemedText style={styles.detailText}>
              {routine.duration}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <ThemedText
            style={[
              styles.status,
              routine.status === "Pendiente" && styles.pendingStatus,
            ]}
          >
            {routine.status}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

/* ===================================================== */
/* TAB INFERIOR */
/* ===================================================== */

type BottomTabProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function BottomTab({
  label,
  icon,
  activeIcon,
  active,
  onPress,
}: BottomTabProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.bottomTab, pressed && styles.tabPressed]}
      onPress={onPress}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={23}
        color={active ? SportGymColors.primary : "#929292"}
      />

      <ThemedText
        style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

/* ===================================================== */
/* ESTILOS */
/* ===================================================== */

const styles = StyleSheet.create({
  // ===================================================
  // PANTALLA
  // ===================================================

  screen: {
    flex: 1,
    backgroundColor: "#090A0A",
  },

  safeArea: {
    flex: 1,
  },

  card: {
    flex: 1,

    marginHorizontal: 5,
    marginBottom: 4,

    borderWidth: 2,
    borderColor: "#4A4A4A",

    borderRadius: 24,

    backgroundColor: "#0B0C0C",

    overflow: "hidden",
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    height: 64,

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 17,
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#F2F2F2",

    fontSize: 17,

    fontWeight: "800",

    textAlign: "center",
  },

  headerRightSpace: {
    width: 40,
  },

  // ===================================================
  // FILTROS
  // ===================================================

  filtersContainer: {
    height: 54,

    flexDirection: "row",

    alignItems: "center",

    marginHorizontal: 16,
    marginBottom: 12,

    padding: 4,

    borderRadius: 12,

    backgroundColor: "#151616",
  },

  filterButton: {
    flex: 1,

    height: 43,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    marginHorizontal: 2,
  },

  filterButtonActive: {
    backgroundColor: SportGymColors.primary,
  },

  filterText: {
    color: "#B7B7B7",

    fontSize: 13,

    fontWeight: "600",
  },

  filterTextActive: {
    color: "#FFFFFF",

    fontWeight: "800",
  },

  filterPressed: {
    opacity: 0.75,
  },

  // ===================================================
  // LISTA
  // ===================================================

  scroll: {
    flex: 1,
  },

  routineList: {
    paddingHorizontal: 16,
    paddingTop: 3,
    paddingBottom: 15,
  },

  // ===================================================
  // TARJETA
  // ===================================================

  routineCard: {
    height: 145,

    backgroundColor: "#F4F4F4",

    borderRadius: 14,

    paddingHorizontal: 17,
    paddingVertical: 15,

    marginBottom: 12,
  },

  routineDay: {
    color: "#777777",

    fontSize: 13,

    fontWeight: "500",

    marginBottom: 13,
  },

  routineTitleRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 12,
  },

  routineTitle: {
    color: "#171717",

    fontSize: 16,

    fontWeight: "800",
  },

  routineBottomRow: {
    flex: 1,

    flexDirection: "row",

    alignItems: "flex-end",

    justifyContent: "space-between",
  },

  detailsContainer: {
    flex: 1,
  },

  detailRow: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 6,
  },

  detailText: {
    color: "#555555",

    fontSize: 13,

    fontWeight: "500",

    marginLeft: 6,
  },

  statusContainer: {
    alignItems: "flex-end",
  },

  status: {
    color: "#69B84A",

    fontSize: 13,

    fontWeight: "700",
  },

  pendingStatus: {
    color: "#D99A2B",
  },

  routinePressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  // ===================================================
  // SIN RESULTADOS
  // ===================================================

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",

    paddingTop: 80,
  },

  emptyText: {
    color: "#777777",

    fontSize: 14,

    marginTop: 12,
  },

  // ===================================================
  // ESPACIO FINAL
  // ===================================================

  bottomSpace: {
    height: 18,
  },

  // ===================================================
  // NAVEGACIÓN
  // ===================================================

  bottomNavigation: {
    height: 76,

    backgroundColor: "#0C0D0D",

    borderTopWidth: 1,
    borderTopColor: "#292A2A",

    flexDirection: "row",

    alignItems: "center",
    justifyContent: "space-around",

    paddingHorizontal: 5,
  },

  bottomTab: {
    flex: 1,

    height: 68,

    alignItems: "center",
    justifyContent: "center",
  },

  bottomTabLabel: {
    color: "#929292",

    fontSize: 11,

    fontWeight: "500",

    marginTop: 4,
  },

  bottomTabLabelActive: {
    color: SportGymColors.primary,

    fontWeight: "800",
  },

  hubHeader: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingVertical: 10,
  },

  hubHeading: {
    flex: 1,
    marginHorizontal: 10,
  },

  hubTitle: {
    color: "#F2F2F2",
    fontSize: 22,
    fontWeight: "800",
  },

  hubSubtitle: {
    color: "#A5A5A5",
    fontSize: 12,
    marginTop: 3,
  },

  hubScroll: {
    flex: 1,
  },

  hubContent: {
    paddingHorizontal: 16,
    paddingTop: 5,
    paddingBottom: 18,
  },

  trainingHero: {
    height: 228,
    overflow: "hidden",
    borderRadius: 14,
    marginBottom: 23,
    backgroundColor: "#202820",
  },

  trainingHeroImage: {
    borderRadius: 14,
  },

  trainingHeroOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 17,
    backgroundColor: "rgba(6, 10, 7, 0.44)",
  },

  heroEyebrow: {
    color: "#B9E7A5",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    marginBottom: 13,
  },

  heroButton: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },

  heroButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  hubSectionTitle: {
    color: "#F2F2F2",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  actionCard: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#303330",
    backgroundColor: "#171917",
  },

  actionIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: SportGymColors.primary,
  },

  actionCopy: {
    flex: 1,
    marginHorizontal: 12,
  },

  actionTitle: {
    color: "#F5F5F5",
    fontSize: 13,
    fontWeight: "800",
  },

  actionDescription: {
    color: "#A6AAA5",
    fontSize: 11,
    marginTop: 4,
  },

  savedContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  savedState: {
    alignItems: "center",
    paddingHorizontal: 12,
  },

  savedIcon: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: "#202A1D",
    marginBottom: 18,
  },

  savedTitle: {
    color: "#F2F2F2",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  savedDescription: {
    color: "#A5A5A5",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  savedButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },

  savedButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  tabPressed: {
    opacity: 0.65,
  },
});
