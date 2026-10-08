import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getClientFavoriteExercises,
  getClientRoutineExercises,
  removeFavoriteExercise,
  saveCompletedWorkout,
  updateRoutineExerciseTargets,
  type CompletedWorkoutExercise,
  type SavedFavoriteExercise,
  type SavedRoutineExercise,
} from "../../assets/database/firebase";
import exerciseData from "../../assets/exercises/exercises.json";
import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { ThemedText } from "../components/themed-text";
import { SportGymColors } from "../constants/theme";
import { useAuth, type User } from "../contexts/AuthContext";

type Exercise = {
  id: string;
  name_es: string;
  description_es?: string;
  category: string;
  body_part: string;
  equipment?: string;
  primary_muscles: string[];
  tags?: string[];
  variation_group?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  instructions_es?: string[];
  images?: { flat?: { start?: string; peak?: string; main?: string } };
};

const sourceExercises = (exerciseData as { exercises: Exercise[] }).exercises;
const exerciseImages = require.context(
  "../../assets/exercises/images/flat",
  false,
  /\.webp$/i,
);
const exerciseImageKeys = new Set(exerciseImages.keys());

function getImageSource(exercise: Exercise) {
  const filePaths = [
    exercise.images?.flat?.start,
    exercise.images?.flat?.peak,
    exercise.images?.flat?.main,
    `${exercise.id}-start.webp`,
    `${exercise.id}-peak.webp`,
    `${exercise.id}-main.webp`,
  ];

  for (const filePath of filePaths) {
    if (!filePath) continue;
    const key = `./${filePath.split("/").pop()}`;
    if (exerciseImageKeys.has(key)) return exerciseImages(key) as number;
  }

  return undefined;
}

function getExerciseById(id: string): Exercise | undefined {
  return sourceExercises.find((ex) => ex.id === id);
}

type Filter = "Todos" | "Hoy" | "Semana";
type MuscleFilter = "Todos" | "Pecho" | "Espalda" | "Hombros" | "Brazos" | "Abdomen" | "Piernas";

const tabKeyToIndex: Record<string, number> = {
  inicio: 0,
  rutina: 1,
  tienda: 2,
  nutricion: 3,
};

type TabName = "Inicio" | "Rutina" | "Tienda" | "Nutrición";

type Routine = Pick<
  SavedRoutineExercise,
  | "id"
  | "dia"
  | "ejercicioId"
  | "ejercicioNombre"
  | "equipo"
  | "grupoMuscular"
  | "seriesAsignadas"
  | "repeticionesAsignadas"
>;

const routineDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const currentDay = new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(
  new Date(),
);
const currentDayLabel =
  currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

export default function RoutineView() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos");
  const [activeTab, setActiveTab] = useState<TabName>("Rutina");
  const [screen, setScreen] = useState<"hub" | "routine" | "saved" | "session">(
    "hub",
  );
  const [selectedRoutineDay, setSelectedRoutineDay] = useState("Lunes");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedFavoriteExercise[]>([]);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [bottomNavIndex, setBottomNavIndex] = useState(0); // Start at Inicio (hub)
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (screen !== "routine") return;
    if (!user?.clientId) {
      setRoutines([]);
      setIsLoadingRoutine(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingRoutine(true);
    getClientRoutineExercises(user.clientId)
      .then((exercises) => {
        if (isCurrent) {
          setRoutines(
            exercises.map((exercise) => ({
              id: exercise.id,
              dia: exercise.dia,
              ejercicioId: exercise.ejercicioId,
              ejercicioNombre: exercise.ejercicioNombre,
              equipo: exercise.equipo,
              grupoMuscular: exercise.grupoMuscular,
              seriesAsignadas: exercise.seriesAsignadas,
              repeticionesAsignadas: exercise.repeticionesAsignadas,
            })),
          );
        }
      })
      .catch(() => {
        if (isCurrent)
          Alert.alert(
            "No se pudo cargar Mi rutina",
            "Revisa tu conexión e inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (isCurrent) setIsLoadingRoutine(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [screen, user?.clientId]);

  useEffect(() => {
    if (screen !== "saved") return;
    if (!user?.clientId) {
      setSavedExercises([]);
      setIsLoadingFavorites(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingFavorites(true);
    getClientFavoriteExercises(user.clientId)
      .then((favorites) => {
        if (isCurrent) setSavedExercises(favorites);
      })
      .catch(() => {
        if (isCurrent)
          Alert.alert(
            "No se pudieron cargar tus favoritos",
            "Revisa tu conexión e inténtalo de nuevo.",
          );
      })
      .finally(() => {
        if (isCurrent) setIsLoadingFavorites(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [screen, user?.clientId]);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    const indexMap: Record<TabName, number> = {
      Inicio: 0,
      Rutina: 1,
      Tienda: 2,
      Nutrición: 3,
    };
    setBottomNavIndex(indexMap[tab]);

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

  const handleBottomNavChange = (index: number, key: string) => {
    const tabMap: Record<string, TabName> = {
      inicio: "Inicio",
      rutina: "Rutina",
      tienda: "Tienda",
      nutricion: "Nutrición",
    };
    handleTabPress(tabMap[key]);
  };

  const filteredRoutines = routines.filter((routine) => {
    return activeFilter !== "Hoy" || routine.dia === currentDayLabel;
  });

  if (screen === "session") {
    return (
      <WorkoutSessionScreen
        day={selectedRoutineDay}
        exercises={routines.filter(
          (routine) => routine.dia === selectedRoutineDay,
        )}
        user={user}
        onBack={() => setScreen("routine")}
        bottomNavIndex={bottomNavIndex}
        onBottomNavChange={handleBottomNavChange}
      />
    );
  }

  if (screen === "hub" || screen === "saved") {
    return (
      <TrainingHub
        isSavedView={screen === "saved"}
        onBack={() => setScreen("hub")}
        onExplore={() => router.push("/explore")}
        onOpenRoutine={() => setScreen("routine")}
        onOpenSaved={() => setScreen("saved")}
        onTabPress={handleTabPress}
        savedExercises={savedExercises}
        isLoadingSaved={isLoadingFavorites}
        isClientSignedIn={Boolean(user?.clientId)}
        onRemoveFavorite={async (exerciseId) => {
          if (!user?.clientId) return;
          try {
            await removeFavoriteExercise(user.clientId, exerciseId);
            setSavedExercises((current) =>
              current.filter((exercise) => exercise.ejercicioId !== exerciseId),
            );
          } catch {
            Alert.alert(
              "No se pudo quitar el favorito",
              "Inténtalo de nuevo en unos momentos.",
            );
          }
        }}
        bottomNavIndex={bottomNavIndex}
        onBottomNavChange={handleBottomNavChange}
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
            {routineDays
              .filter((day) =>
                filteredRoutines.some((routine) => routine.dia === day),
              )
              .map((day) => (
                <RoutineDayCard
                  key={day}
                  day={day}
                  exercises={filteredRoutines.filter(
                    (routine) => routine.dia === day,
                  )}
                  onPress={() => {
                    setSelectedRoutineDay(day);
                    setScreen("session");
                  }}
                />
              ))}

            {isLoadingRoutine ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator color={SportGymColors.primary} />
                <ThemedText style={styles.emptyText}>
                  Cargando Mi rutina...
                </ThemedText>
              </View>
            ) : filteredRoutines.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={40} color="#555555" />

                <ThemedText style={styles.emptyText}>
                  {user?.clientId
                    ? activeFilter === "Hoy"
                      ? "No hay ejercicios guardados para hoy"
                      : "Aún no agregas ejercicios a Mi rutina"
                    : "Inicia sesión como cliente para ver Mi rutina"}
                </ThemedText>
                {user?.clientId ? (
                  <Pressable
                    style={styles.exploreButton}
                    onPress={() => router.push("/explore")}
                  >
                    <ThemedText style={styles.exploreButtonText}>
                      Explorar ejercicios
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* ESPACIO PARA QUE EL ÚLTIMO CARD NO QUEDE PEGADO */}
            <View style={styles.bottomSpace} />
          </ScrollView>

          {/* ========================================= */}
          {/* NAVEGACIÓN */}
          {/* ========================================= */}

          <AnimatedBottomNav
            initialIndex={bottomNavIndex}
            onChange={onBottomNavChange}
          />
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
  savedExercises: SavedFavoriteExercise[];
  isLoadingSaved: boolean;
  isClientSignedIn: boolean;
  onRemoveFavorite: (exerciseId: string) => void;
  bottomNavIndex: number;
  onBottomNavChange: (index: number, key: string) => void;
};

function TrainingHub({
  isSavedView,
  onBack,
  onExplore,
  onOpenRoutine,
  onOpenSaved,
  onTabPress,
  savedExercises,
  isLoadingSaved,
  isClientSignedIn,
  onRemoveFavorite,
  bottomNavIndex,
  onBottomNavChange,
}: TrainingHubProps) {
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>("Todos");

  const muscleGroups: MuscleFilter[] = [
    "Todos",
    "Pecho",
    "Espalda",
    "Hombros",
    "Brazos",
    "Abdomen",
    "Piernas",
  ];

  const filteredExercises = savedExercises.filter((exercise) => {
    if (muscleFilter === "Todos") return true;
    const exerciseDetail = getExerciseById(exercise.ejercicioId);
    if (!exerciseDetail) return false;

    const bodyPartMap: Record<string, MuscleFilter> = {
      chest: "Pecho",
      back: "Espalda",
      shoulders: "Hombros",
      upper_arms: "Brazos",
      lower_arms: "Brazos",
      core: "Abdomen",
      upper_legs: "Piernas",
      lower_legs: "Piernas",
    };

    return bodyPartMap[exerciseDetail.body_part] === muscleFilter;
  });
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
                {isSavedView
                  ? "Tus ejercicios favoritos"
                  : "Tu siguiente sesión empieza aquí"}
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
              isLoadingSaved ? (
                <View style={styles.savedState}>
                  <ActivityIndicator color={SportGymColors.primary} />
                  <ThemedText style={styles.savedDescription}>
                    Cargando favoritos...
                  </ThemedText>
                </View>
              ) : savedExercises.length > 0 ? (
                <>
                  {/* Filtros por grupo muscular */}
                  <View style={styles.savedFiltersContainer}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.savedFiltersScroll}
                    >
                      {muscleGroups.map((group) => (
                        <Pressable
                          key={group}
                          style={[
                            styles.savedFilterChip,
                            muscleFilter === group && styles.savedFilterChipActive,
                          ]}
                          onPress={() => setMuscleFilter(group)}
                        >
                          <ThemedText
                            style={[
                              styles.savedFilterChipText,
                              muscleFilter === group && styles.savedFilterChipTextActive,
                            ]}
                          >
                            {group}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Lista de ejercicios */}
                  <View style={styles.savedExercisesList}>
                    {filteredExercises.map((exercise) => {
                      const exerciseDetail = getExerciseById(exercise.ejercicioId);
                      const imageSource = exerciseDetail ? getImageSource(exerciseDetail) : undefined;

                      return (
                        <AnimatedExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          exerciseDetail={exerciseDetail}
                          imageSource={imageSource}
                          onRemoveFavorite={() => onRemoveFavorite(exercise.ejercicioId)}
                        />
                      );
                    })}
                  </View>

                  {filteredExercises.length === 0 && (
                    <View style={styles.savedState}>
                      <Ionicons
                        name="filter-outline"
                        size={30}
                        color={SportGymColors.primary}
                      />
                      <ThemedText style={styles.savedTitle}>
                        No hay ejercicios en este grupo
                      </ThemedText>
                      <ThemedText style={styles.savedDescription}>
                        Prueba con otro filtro o agrega más ejercicios a tus favoritos.
                      </ThemedText>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.savedState}>
                  <View style={styles.savedIcon}>
                    <Ionicons
                      name="heart-outline"
                      size={30}
                      color={SportGymColors.primary}
                    />
                  </View>
                  <ThemedText style={styles.savedTitle}>
                    {isClientSignedIn
                      ? "Aún no guardas ejercicios"
                      : "Inicia sesión como cliente"}
                  </ThemedText>
                  <ThemedText style={styles.savedDescription}>
                    {isClientSignedIn
                      ? "Explora el catálogo y guarda tus favoritos para encontrarlos aquí."
                      : "Tus ejercicios favoritos se mostrarán aquí."}
                  </ThemedText>
                  {isClientSignedIn ? (
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
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  ) : null}
                </View>
              )
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
                      <Ionicons
                        name="arrow-forward"
                        size={17}
                        color="#FFFFFF"
                      />
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

          <AnimatedBottomNav
            initialIndex={bottomNavIndex}
            onChange={onBottomNavChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

type AnimatedExerciseCardProps = {
  exercise: SavedFavoriteExercise;
  exerciseDetail?: Exercise;
  imageSource?: number;
  onRemoveFavorite: () => void;
};

function AnimatedExerciseCard({
  exercise,
  exerciseDetail,
  imageSource,
  onRemoveFavorite,
}: AnimatedExerciseCardProps) {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const opacityAnim = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemoveFavorite();
    });
  };

  return (
    <Animated.View
      style={[
        styles.savedExerciseCard,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.savedExercisePressable}
      >
        <View style={styles.savedExerciseMain}>
          {/* Imagen del ejercicio */}
          <View style={styles.savedExerciseImageContainer}>
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.savedExerciseImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View style={styles.savedExerciseImageFallback}>
                <Ionicons
                  name="barbell-outline"
                  size={28}
                  color="#B7D9A9"
                />
              </View>
            )}
          </View>

          {/* Información del ejercicio */}
          <View style={styles.savedExerciseTitleBlock}>
            <ThemedText
              style={styles.savedExerciseName}
              numberOfLines={2}
            >
              {exercise.ejercicioNombre}
            </ThemedText>
            <View style={styles.favoriteBadge}>
              <Ionicons name="heart" size={12} color="#F18B86" />
              <ThemedText style={styles.favoriteBadgeText}>
                FAVORITO
              </ThemedText>
            </View>
          </View>

          {/* Botón de eliminar */}
          <Pressable
            style={({ pressed }) => [
              styles.removeFavoriteButton,
              pressed && styles.removeFavoriteButtonPressed,
            ]}
            onPress={handleRemove}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${exercise.ejercicioNombre} de favoritos`}
            hitSlop={12}
          >
            <Ionicons
              name="heart-dislike-outline"
              size={20}
              color="#F18B86"
            />
          </Pressable>
        </View>

        {/* Tags */}
        <View style={styles.savedExerciseTags}>
          <View style={styles.savedExerciseTag}>
            <Ionicons
              name="body-outline"
              size={14}
              color="#B8C2B2"
            />
            <ThemedText
              style={styles.savedExerciseTagText}
              numberOfLines={1}
            >
              {exercise.grupoMuscular}
            </ThemedText>
          </View>
          <View style={styles.savedExerciseTag}>
            <Ionicons
              name="barbell-outline"
              size={14}
              color="#B8C2B2"
            />
            <ThemedText
              style={styles.savedExerciseTagText}
              numberOfLines={1}
            >
              {exercise.equipo}
            </ThemedText>
          </View>
          {exerciseDetail?.difficulty && (
            <View style={styles.savedExerciseTag}>
              <Ionicons
                name="flash-outline"
                size={14}
                color="#B8C2B2"
              />
              <ThemedText
                style={styles.savedExerciseTagText}
                numberOfLines={1}
              >
                {exerciseDetail.difficulty === "beginner" ? "Principiante" :
                 exerciseDetail.difficulty === "intermediate" ? "Intermedio" : "Avanzado"}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
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
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.routinePressed,
      ]}
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

type RoutineDayCardProps = {
  day: string;
  exercises: Routine[];
  onPress: () => void;
};

function RoutineDayCard({ day, exercises, onPress }: RoutineDayCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.routineCard,
        pressed && styles.routinePressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Iniciar entrenamiento del ${day}`}
    >
      <View style={styles.routineDayHeader}>
        <View>
          <ThemedText style={styles.routineDay}>{day}</ThemedText>
          <ThemedText style={styles.dayExerciseCount}>
            {exercises.length}{" "}
            {exercises.length === 1 ? "ejercicio" : "ejercicios"}
          </ThemedText>
        </View>
        <View style={styles.startDayIcon}>
          <Ionicons name="play" size={17} color="#FFFFFF" />
        </View>
      </View>
      <ThemedText style={styles.dayExercisePreview} numberOfLines={2}>
        {exercises
          .slice(0, 3)
          .map((exercise) => exercise.ejercicioNombre)
          .join(" · ")}
        {exercises.length > 3 ? ` +${exercises.length - 3} más` : ""}
      </ThemedText>
      <View style={styles.dayCardFooter}>
        <ThemedText style={styles.dayCardMeta}>Toca para iniciar</ThemedText>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={SportGymColors.primary}
        />
      </View>
    </Pressable>
  );
}

type SessionExercise = Routine & {
  seriesRealizadas: string;
  repeticionesRealizadas: string;
};

type WorkoutSessionScreenProps = {
  day: string;
  exercises: Routine[];
  user: User | null;
  onBack: () => void;
  bottomNavIndex: number;
  onBottomNavChange: (index: number, key: string) => void;
};

function WorkoutSessionScreen({
  day,
  exercises,
  user,
  onBack,
  bottomNavIndex,
  onBottomNavChange,
}: WorkoutSessionScreenProps) {
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restDuration, setRestDuration] = useState("60");
  const [restRemaining, setRestRemaining] = useState(0);
  const [isRestRunning, setIsRestRunning] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    () =>
      exercises.map((exercise) => ({
        ...exercise,
        seriesRealizadas: "",
        repeticionesRealizadas: "",
      })),
  );

  useEffect(() => {
    if (!startedAt || isCompleted) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt, isCompleted]);

  useEffect(() => {
    if (!isRestRunning) return;
    if (restRemaining <= 0) {
      setIsRestRunning(false);
      return;
    }

    const timer = setInterval(() => {
      setRestRemaining((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRestRunning, restRemaining]);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const updateSessionExercise = (
    index: number,
    patch: Partial<SessionExercise>,
  ) => {
    setSessionExercises((current) =>
      current.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, ...patch } : exercise,
      ),
    );
    setValidationMessage("");
  };

  const persistTargets = async (exercise: SessionExercise) => {
    const series = exercise.seriesAsignadas ?? 3;
    const repetitions = exercise.repeticionesAsignadas ?? 12;
    if (series < 1 || series > 99 || repetitions < 1 || repetitions > 999)
      return;
    try {
      await updateRoutineExerciseTargets(exercise.id, series, repetitions);
    } catch {
      Alert.alert(
        "No se guardaron los objetivos",
        "Verifica tu conexión e inténtalo de nuevo.",
      );
    }
  };

  const handleStartWorkout = () => {
    if (!user?.clientId) {
      Alert.alert(
        "Inicia sesión",
        "Necesitas iniciar sesión como cliente para registrar el entrenamiento.",
      );
      return;
    }
    if (sessionExercises.length === 0) {
      Alert.alert(
        "Rutina vacía",
        "Agrega ejercicios a este día antes de iniciar.",
      );
      return;
    }
    setStartedAt(new Date());
    setElapsedSeconds(0);
  };

  const handleStartRest = () => {
    if (restRemaining > 0) {
      setIsRestRunning(true);
      return;
    }

    const seconds = Number(restDuration);
    if (!Number.isInteger(seconds) || seconds < 15 || seconds > 600) {
      Alert.alert(
        "Tiempo no válido",
        "El descanso debe estar entre 15 y 600 segundos.",
      );
      return;
    }
    setRestRemaining(seconds);
    setIsRestRunning(true);
  };

  const handleFinishWorkout = async () => {
    if (!user?.clientId || !startedAt || isSaving || isCompleted) return;
    const hasInvalidResults = sessionExercises.some((exercise) => {
      const sets = Number(exercise.seriesRealizadas);
      const repetitions = Number(exercise.repeticionesRealizadas);
      const assignedSets = exercise.seriesAsignadas ?? 3;
      const assignedRepetitions = exercise.repeticionesAsignadas ?? 12;
      return (
        !Number.isInteger(assignedSets) ||
        assignedSets < 1 ||
        assignedSets > 99 ||
        !Number.isInteger(assignedRepetitions) ||
        assignedRepetitions < 1 ||
        assignedRepetitions > 999 ||
        !Number.isInteger(sets) ||
        sets < 1 ||
        sets > 99 ||
        !Number.isInteger(repetitions) ||
        repetitions < 1 ||
        repetitions > 999
      );
    });

    if (hasInvalidResults) {
      setValidationMessage(
        "Revisa los objetivos y registra series y repeticiones realizadas para cada ejercicio.",
      );
      return;
    }

    setIsSaving(true);
    setValidationMessage("");
    const durationSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAt.getTime()) / 1000),
    );
    const completedExercises: CompletedWorkoutExercise[] = sessionExercises.map(
      (exercise) => ({
        ejercicioId: exercise.ejercicioId,
        ejercicioNombre: exercise.ejercicioNombre,
        seriesAsignadas: exercise.seriesAsignadas || 3,
        repeticionesAsignadas: exercise.repeticionesAsignadas || 12,
        seriesRealizadas: Number(exercise.seriesRealizadas),
        repeticionesRealizadas: Number(exercise.repeticionesRealizadas),
      }),
    );

    try {
      await saveCompletedWorkout({
        clientId: user.clientId,
        clientUsername: user.username,
        clientName: `${user.firstName} ${user.lastName}`.trim(),
        day,
        startedAt,
        durationSeconds,
        exercises: completedExercises,
      });
      setElapsedSeconds(durationSeconds);
      setIsCompleted(true);
      setIsRestRunning(false);
      Alert.alert(
        "Entrenamiento finalizado",
        `Sesión del ${day.toLowerCase()} completada en ${formatDuration(durationSeconds)}.`,
      );
    } catch {
      Alert.alert(
        "No se pudo finalizar",
        "No pudimos guardar la sesión. Inténtalo otra vez.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={onBack}
              accessibilityLabel="Volver a Mi rutina"
            >
              <Ionicons name="arrow-back" size={25} color="#D8D8D8" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Entrenamiento</ThemedText>
            <View style={styles.headerRightSpace} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.sessionContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sessionSummary}>
              <View>
                <ThemedText style={styles.sessionDay}>{day}</ThemedText>
                <ThemedText style={styles.sessionSummaryText}>
                  {sessionExercises.length}{" "}
                  {sessionExercises.length === 1 ? "ejercicio" : "ejercicios"}
                </ThemedText>
              </View>
              <View style={styles.elapsedBox}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={SportGymColors.primary}
                />
                <ThemedText style={styles.elapsedText}>
                  {formatDuration(elapsedSeconds)}
                </ThemedText>
              </View>
            </View>

            {!startedAt ? (
              <Pressable
                style={({ pressed }) => [
                  styles.startWorkoutButton,
                  pressed && styles.routinePressed,
                ]}
                onPress={handleStartWorkout}
                disabled={sessionExercises.length === 0}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <ThemedText style={styles.startWorkoutText}>
                  Iniciar entrenamiento
                </ThemedText>
              </Pressable>
            ) : null}

            {sessionExercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.sessionExerciseCard}>
                <View style={styles.sessionExerciseHeading}>
                  <View style={styles.sessionExerciseNumber}>
                    <ThemedText style={styles.sessionExerciseNumberText}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <View style={styles.sessionExerciseCopy}>
                    <ThemedText style={styles.sessionExerciseName}>
                      {exercise.ejercicioNombre}
                    </ThemedText>
                    <ThemedText style={styles.sessionExerciseMeta}>
                      {exercise.grupoMuscular} · {exercise.equipo}
                    </ThemedText>
                  </View>
                  {exercise.seriesRealizadas &&
                  exercise.repeticionesRealizadas ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={SportGymColors.primary}
                    />
                  ) : null}
                </View>

                <View style={styles.targetsRow}>
                  <View style={styles.targetField}>
                    <ThemedText style={styles.targetLabel}>
                      Series objetivo
                    </ThemedText>
                    <TextInput
                      style={styles.targetInput}
                      value={String(exercise.seriesAsignadas ?? 3)}
                      keyboardType="number-pad"
                      editable={!isCompleted}
                      onChangeText={(value) => {
                        if (/^\d{0,2}$/.test(value)) {
                          updateSessionExercise(index, {
                            seriesAsignadas: value ? Number(value) : 0,
                          });
                        }
                      }}
                      onBlur={() => void persistTargets(exercise)}
                      accessibilityLabel={`Series objetivo para ${exercise.ejercicioNombre}`}
                    />
                  </View>
                  <ThemedText style={styles.targetMultiply}>×</ThemedText>
                  <View style={styles.targetField}>
                    <ThemedText style={styles.targetLabel}>
                      Repeticiones objetivo
                    </ThemedText>
                    <TextInput
                      style={styles.targetInput}
                      value={String(exercise.repeticionesAsignadas ?? 12)}
                      keyboardType="number-pad"
                      editable={!isCompleted}
                      onChangeText={(value) => {
                        if (/^\d{0,3}$/.test(value)) {
                          updateSessionExercise(index, {
                            repeticionesAsignadas: value ? Number(value) : 0,
                          });
                        }
                      }}
                      onBlur={() => void persistTargets(exercise)}
                      accessibilityLabel={`Repeticiones objetivo para ${exercise.ejercicioNombre}`}
                    />
                  </View>
                </View>

                <View style={styles.actualResultsRow}>
                  <View style={styles.actualField}>
                    <ThemedText style={styles.targetLabel}>
                      Series realizadas
                    </ThemedText>
                    <TextInput
                      style={styles.actualInput}
                      value={exercise.seriesRealizadas}
                      onChangeText={(value) => {
                        if (/^\d{0,2}$/.test(value))
                          updateSessionExercise(index, {
                            seriesRealizadas: value,
                          });
                      }}
                      keyboardType="number-pad"
                      editable={Boolean(startedAt) && !isCompleted}
                      placeholder="0"
                      placeholderTextColor="#777D75"
                      accessibilityLabel={`Series realizadas para ${exercise.ejercicioNombre}`}
                    />
                  </View>
                  <View style={styles.actualField}>
                    <ThemedText style={styles.targetLabel}>
                      Repeticiones realizadas
                    </ThemedText>
                    <TextInput
                      style={styles.actualInput}
                      value={exercise.repeticionesRealizadas}
                      onChangeText={(value) => {
                        if (/^\d{0,3}$/.test(value))
                          updateSessionExercise(index, {
                            repeticionesRealizadas: value,
                          });
                      }}
                      keyboardType="number-pad"
                      editable={Boolean(startedAt) && !isCompleted}
                      placeholder="0"
                      placeholderTextColor="#777D75"
                      accessibilityLabel={`Repeticiones realizadas para ${exercise.ejercicioNombre}`}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.restCard}>
              <View style={styles.restHeading}>
                <View>
                  <ThemedText style={styles.restTitle}>Descanso</ThemedText>
                  <ThemedText style={styles.restSubtitle}>
                    Configura tu pausa entre ejercicios
                  </ThemedText>
                </View>
                <ThemedText style={styles.restClock}>
                  {formatDuration(restRemaining)}
                </ThemedText>
              </View>
              <View style={styles.restControls}>
                <ThemedText style={styles.restInputLabel}>Segundos</ThemedText>
                <TextInput
                  style={styles.restInput}
                  value={restDuration}
                  onChangeText={(value) => {
                    if (/^\d{0,3}$/.test(value)) setRestDuration(value);
                  }}
                  keyboardType="number-pad"
                  editable={!isRestRunning && !isCompleted}
                  accessibilityLabel="Duración del descanso en segundos"
                />
                {!isRestRunning ? (
                  <Pressable
                    style={styles.restButton}
                    onPress={handleStartRest}
                    disabled={!startedAt || isCompleted}
                  >
                    <Ionicons name="play" size={15} color="#FFFFFF" />
                    <ThemedText style={styles.restButtonText}>
                      {restRemaining > 0 ? "Reanudar" : "Iniciar"}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={styles.restButton}
                      onPress={() => setIsRestRunning(false)}
                    >
                      <Ionicons name="pause" size={15} color="#FFFFFF" />
                      <ThemedText style={styles.restButtonText}>
                        Pausar
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={styles.restSecondaryButton}
                      onPress={() => {
                        setIsRestRunning(false);
                        setRestRemaining(0);
                      }}
                    >
                      <ThemedText style={styles.restButtonText}>
                        Finalizar
                      </ThemedText>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {validationMessage ? (
              <ThemedText style={styles.validationMessage}>
                {validationMessage}
              </ThemedText>
            ) : null}

            {startedAt && !isCompleted ? (
              <Pressable
                style={({ pressed }) => [
                  styles.finishWorkoutButton,
                  pressed && styles.routinePressed,
                ]}
                onPress={handleFinishWorkout}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-done" size={19} color="#FFFFFF" />
                )}
                <ThemedText style={styles.startWorkoutText}>
                  {isSaving
                    ? "Guardando entrenamiento..."
                    : "Finalizar entrenamiento"}
                </ThemedText>
              </Pressable>
            ) : null}

            {isCompleted ? (
              <View style={styles.completionNotice}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={SportGymColors.primary}
                />
                <ThemedText style={styles.completionText}>
                  Sesión completada · {formatDuration(elapsedSeconds)}
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <AnimatedBottomNav
            initialIndex={bottomNavIndex}
            onChange={onBottomNavChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ===================================================== */
/* TAB INFERIOR */
/* ===================================================== */

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
    minHeight: 138,
    justifyContent: "center",
    backgroundColor: "#171917",
    borderWidth: 1,
    borderColor: "#303330",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 10,
  },

  routineDay: {
    color: "#F2F2F2",
    fontSize: 16,
    fontWeight: "800",
  },

  routineDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dayExerciseCount: {
    color: "#A4AAA0",
    fontSize: 11,
    marginTop: 4,
  },

  startDayIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: SportGymColors.primary,
  },

  dayExercisePreview: {
    color: "#D5D9D2",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 13,
  },

  dayCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  dayCardMeta: {
    color: "#9FAA99",
    fontSize: 10,
    fontWeight: "700",
  },

  routineTitleRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 12,
  },

  routineTitle: {
    color: "#F3F4F1",
    fontSize: 14,
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
    color: "#A9AEA6",

    fontSize: 13,

    fontWeight: "500",

    marginLeft: 6,
  },

  statusContainer: {
    alignItems: "flex-end",
  },

  status: {
    color: "#A9D399",

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
    color: "#A5AAA2",

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
  },

  sessionContent: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 20,
  },

  sessionSummary: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2E352D",
    borderRadius: 10,
    backgroundColor: "#171B16",
  },

  sessionDay: {
    color: "#F1F4EE",
    fontSize: 18,
    fontWeight: "800",
  },

  sessionSummaryText: {
    color: "#A9B1A4",
    fontSize: 11,
    marginTop: 3,
  },

  elapsedBox: {
    minWidth: 85,
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 8,
    backgroundColor: "#252B23",
  },

  elapsedText: {
    color: "#F1F4EE",
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  startWorkoutButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },

  finishWorkoutButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },

  startWorkoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  sessionExerciseCard: {
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#303530",
    borderRadius: 9,
    backgroundColor: "#171917",
  },

  sessionExerciseHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sessionExerciseNumber: {
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#2C4327",
    marginRight: 9,
  },

  sessionExerciseNumberText: {
    color: "#D8EBCF",
    fontSize: 12,
    fontWeight: "800",
  },

  sessionExerciseCopy: {
    flex: 1,
    marginRight: 8,
  },

  sessionExerciseName: {
    color: "#F1F3EE",
    fontSize: 13,
    fontWeight: "800",
  },

  sessionExerciseMeta: {
    color: "#9EA69A",
    fontSize: 10,
    marginTop: 3,
  },

  targetsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },

  targetField: {
    flex: 1,
  },

  targetLabel: {
    color: "#A9AEA6",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 5,
  },

  targetInput: {
    minHeight: 39,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#424841",
    borderRadius: 7,
    backgroundColor: "#202320",
    paddingHorizontal: 8,
  },

  targetMultiply: {
    color: "#879083",
    fontSize: 15,
    fontWeight: "800",
    paddingBottom: 10,
  },

  actualResultsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#2E332D",
  },

  actualField: {
    flex: 1,
  },

  actualInput: {
    minHeight: 39,
    color: "#F3F5F1",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#41473F",
    borderRadius: 7,
    backgroundColor: "#111311",
    paddingHorizontal: 8,
  },

  restCard: {
    padding: 13,
    marginTop: 3,
    borderWidth: 1,
    borderColor: "#343A32",
    borderRadius: 9,
    backgroundColor: "#171917",
  },

  restHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  restTitle: {
    color: "#F0F2ED",
    fontSize: 14,
    fontWeight: "800",
  },

  restSubtitle: {
    color: "#999F96",
    fontSize: 10,
    marginTop: 3,
  },

  restClock: {
    color: "#D5ECCB",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  restControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },

  restInputLabel: {
    color: "#A9AEA6",
    fontSize: 10,
  },

  restInput: {
    width: 55,
    height: 36,
    color: "#F4F5F1",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#41473F",
    borderRadius: 6,
    backgroundColor: "#111311",
    paddingHorizontal: 4,
  },

  restButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 7,
    backgroundColor: SportGymColors.primary,
  },

  restSecondaryButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: "#343A32",
  },

  restButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  validationMessage: {
    color: "#F39A91",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 11,
    textAlign: "center",
  },

  completionNotice: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#42603A",
    borderRadius: 8,
    backgroundColor: "#1B2818",
  },

  completionText: {
    color: "#DBEED4",
    fontSize: 12,
    fontWeight: "800",
  },

  savedExercisesList: {
    gap: 12,
  },

  savedFiltersContainer: {
    marginBottom: 16,
  },

  savedFiltersScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },

  savedFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3A4037",
    backgroundColor: "#1C1F1C",
  },

  savedFilterChipActive: {
    backgroundColor: SportGymColors.primary,
    borderColor: SportGymColors.primary,
  },

  savedFilterChipText: {
    color: "#A8ACA5",
    fontSize: 12,
    fontWeight: "600",
  },

  savedFilterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  savedExerciseCard: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: "#3A4037",
    borderRadius: 14,
    backgroundColor: "#1C1F1C",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  savedExercisePressable: {
    flex: 1,
  },

  savedExerciseMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  savedExerciseImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#252A25",
    borderWidth: 1,
    borderColor: "#3A4037",
  },

  savedExerciseImage: {
    width: "100%",
    height: "100%",
  },

  savedExerciseImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252A25",
  },

  savedExerciseTitleBlock: {
    flex: 1,
    marginHorizontal: 12,
  },

  savedExerciseName: {
    color: "#F2F4EF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },

  favoriteBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(241, 139, 134, 0.15)",
  },

  favoriteBadgeText: {
    color: "#F18B86",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  removeFavoriteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#2C211F",
    borderWidth: 1,
    borderColor: "#4A3735",
  },

  removeFavoriteButtonPressed: {
    backgroundColor: "#3A2A27",
    transform: [{ scale: 0.95 }],
  },

  savedExerciseTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginLeft: 68,
  },

  savedExerciseTag: {
    maxWidth: "100%",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#252A25",
    borderWidth: 1,
    borderColor: "#363D34",
  },

  savedExerciseTagText: {
    flexShrink: 1,
    color: "#B8C2B2",
    fontSize: 11,
    fontWeight: "600",
  },

  savedState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 80,
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

  exploreButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },

  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  tabPressed: {
    opacity: 0.65,
  },
});
