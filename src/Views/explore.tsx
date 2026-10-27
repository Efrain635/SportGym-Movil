import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    hasFavoriteExercise,
    removeFavoriteExercise,
    saveExerciseToRoutine,
    saveFavoriteExercise,
} from "../../assets/database/firebase";
import exerciseData from "../../assets/exercises/exercises.json";
import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { SportGymColors } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";

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

type FilterMode = "muscle" | "equipment" | "focus";
type TabName = "Inicio" | "Rutina" | "Tienda" | "Nutrición";

const sourceExercises = (exerciseData as { exercises: Exercise[] }).exercises;
const commonGymEquipmentOrder = [
  "barbell",
  "dumbbell",
  "bodyweight",
  "cable",
  "kettlebell",
  "smith_machine",
  "leg_press",
  "pull_up_bar",
  "ez_bar",
  "resistance_band",
  "loop_band",
  "flat_bench",
  "lat_pulldown_machine",
  "leg_curl",
  "leg_extension",
  "chest_press_machine",
  "shoulder_press_machine",
  "stability_ball",
  "treadmill",
  "stationary_bike",
  "elliptical",
  "suspension_trainer",
  "rower",
];
const commonGymEquipment = new Set(commonGymEquipmentOrder);
const exerciseFamilies = new Map<string, Exercise[]>();
const selectedExerciseIds = new Set<string>();

for (const exercise of sourceExercises) {
  const equipment = exercise.equipment || "bodyweight";
  if (!commonGymEquipment.has(equipment)) continue;

  if (!exercise.variation_group) {
    selectedExerciseIds.add(exercise.id);
    continue;
  }

  const family = exerciseFamilies.get(exercise.variation_group) || [];
  family.push(exercise);
  exerciseFamilies.set(exercise.variation_group, family);
}

const equipmentPriority = new Map(
  commonGymEquipmentOrder.map((equipment, index) => [equipment, index]),
);
const difficultyPriority = { beginner: 0, intermediate: 1, advanced: 2 };

for (const family of exerciseFamilies.values()) {
  const representatives = [...family].sort((left, right) => {
    const leftEquipment =
      equipmentPriority.get(left.equipment || "bodyweight") ?? 99;
    const rightEquipment =
      equipmentPriority.get(right.equipment || "bodyweight") ?? 99;
    const leftDifficulty = difficultyPriority[left.difficulty || "advanced"];
    const rightDifficulty = difficultyPriority[right.difficulty || "advanced"];
    return leftEquipment - rightEquipment || leftDifficulty - rightDifficulty;
  });
  const selectedEquipment = new Set<string>();

  for (const exercise of representatives) {
    const equipment = exercise.equipment || "bodyweight";
    if (selectedEquipment.has(equipment)) continue;

    selectedEquipment.add(equipment);
    selectedExerciseIds.add(exercise.id);
    if (selectedEquipment.size === 3) break;
  }
}

for (const exercise of sourceExercises) {
  if (
    exercise.category === "stretching" ||
    (exercise.tags || []).includes("warm_up")
  ) {
    selectedExerciseIds.add(exercise.id);
  }
}

const exercises = sourceExercises.filter((exercise) =>
  selectedExerciseIds.has(exercise.id),
);
const exerciseImages = require.context(
  "../../assets/exercises/images/flat",
  false,
  /\.webp$/i,
);
const muscleImages = require.context(
  "../../assets/exercises/images/muscles",
  false,
  /\.webp$/i,
);
const equipmentImages = require.context(
  "../../assets/exercises/images/equipment",
  false,
  /\.webp$/i,
);
const exerciseImageKeys = new Set(exerciseImages.keys());
const muscleImageKeys = new Set(muscleImages.keys());
const equipmentImageKeys = new Set(equipmentImages.keys());

type MuscleGroup = {
  id: string;
  label: string;
  bodyParts: string[];
  primaryMuscles: string[];
  image: string;
  color: string;
  description: string;
};

const muscleGroups: MuscleGroup[] = [
  {
    id: "chest",
    label: "Pecho",
    bodyParts: ["chest"],
    primaryMuscles: [],
    image: "pectoralis-major",
    color: "#F3224B",
    description: "Desarrolla fuerza y volumen en el pecho.",
  },
  {
    id: "back",
    label: "Espalda",
    bodyParts: ["back"],
    primaryMuscles: [],
    image: "latissimus-dorsi",
    color: "#168BFF",
    description: "Mejora tu postura y aumenta tu fuerza.",
  },
  {
    id: "shoulders",
    label: "Hombros",
    bodyParts: ["shoulders"],
    primaryMuscles: [],
    image: "anterior-deltoid",
    color: "#FF7A00",
    description: "Logra hombros más fuertes y definidos.",
  },
  {
    id: "biceps",
    label: "Bíceps",
    bodyParts: [],
    primaryMuscles: ["biceps_brachii", "brachialis"],
    image: "biceps-brachii",
    color: "#19C653",
    description: "Aumenta la fuerza de tus brazos.",
  },
  {
    id: "triceps",
    label: "Tríceps",
    bodyParts: [],
    primaryMuscles: ["triceps_brachii"],
    image: "triceps-brachii",
    color: "#A42BEE",
    description: "Refuerza y define la parte posterior del brazo.",
  },
  {
    id: "forearms",
    label: "Antebrazos",
    bodyParts: ["lower_arms"],
    primaryMuscles: [
      "brachioradialis",
      "forearm_extensors",
      "forearm_flexors",
    ],
    image: "forearm-flexors",
    color: "#00A7CE",
    description: "Mejora tu agarre y resistencia.",
  },
  {
    id: "legs",
    label: "Piernas",
    bodyParts: ["upper_legs", "lower_legs"],
    primaryMuscles: [],
    image: "quadriceps",
    color: "#F3224B",
    description: "Desarrolla potencia y estabilidad.",
  },
  {
    id: "glutes",
    label: "Glúteos",
    bodyParts: [],
    primaryMuscles: ["gluteus_maximus", "gluteus_medius"],
    image: "gluteus-maximus",
    color: "#E6A900",
    description: "Tonifica y fortalece tu tren inferior.",
  },
  {
    id: "core",
    label: "Core",
    bodyParts: ["core"],
    primaryMuscles: [],
    image: "rectus-abdominis",
    color: "#18C64B",
    description: "Fortalece tu centro y mejora tu estabilidad.",
  },
  {
    id: "full_body",
    label: "Cuerpo completo",
    bodyParts: ["full_body"],
    primaryMuscles: [],
    image: "",
    color: "#08A8D0",
    description: "Entrena todo tu cuerpo en una sesión.",
  },
];

const focusOptions = [
  { id: "all", label: "Todos", image: "" },
  { id: "warm_up", label: "Calentamiento", image: "" },
  { id: "stretching", label: "Estiramiento", image: "" },
];

const routineDays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const todayDay = new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(
  new Date(),
);
const defaultRoutineDay =
  routineDays.find((day) => day.toLowerCase() === todayDay.toLowerCase()) ||
  "Lunes";

const equipmentNames: Record<string, string> = {
  ab_crunch_machine: "Máquina abdominal",
  ab_wheel: "Rueda abdominal",
  air_bike: "Bicicleta de aire",
  assisted_pullup_machine: "Dominadas asistidas",
  back_extension_machine: "Máquina lumbar",
  barbell: "Barra",
  battle_rope: "Cuerda de batalla",
  bicep_curl_machine: "Máquina de bíceps",
  bodyweight: "Peso corporal",
  cable: "Polea",
  chest_fly_machine: "Contractora",
  chest_press_machine: "Press de pecho",
  climbing_rope: "Cuerda de trepa",
  dip_machine: "Máquina de fondos",
  dip_station: "Estación de fondos",
  donkey_calf_raise_machine: "Máquina de pantorrilla",
  dumbbell: "Mancuernas",
  elliptical: "Elíptica",
  ez_bar: "Barra Z",
  flat_bench: "Banco",
  glute_ham_developer: "Banco de glúteo e isquios",
  hack_squat: "Hack squat",
  hip_abduction_machine: "Máquina de abductores",
  hip_adduction_machine: "Máquina de aductores",
  hip_thrust_machine: "Máquina de hip thrust",
  jump_rope: "Cuerda para saltar",
  kettlebell: "Pesa rusa",
  lat_pulldown_machine: "Jalón al pecho",
  leg_curl: "Curl femoral",
  leg_extension: "Extensión de pierna",
  leg_press: "Prensa de piernas",
  loop_band: "Banda circular",
  pec_deck: "Pec deck",
  plate_loaded_lateral_raise_machine: "Elevación lateral en máquina",
  plates: "Discos",
  plyo_box: "Cajón pliométrico",
  preacher_curl_machine: "Banco predicador",
  pull_up_bar: "Barra de dominadas",
  resistance_band: "Banda elástica",
  rings: "Anillas",
  rower: "Remo",
  seated_calf_raise_machine: "Pantorrilla sentado",
  shoulder_press_machine: "Press de hombros",
  shrug_machine: "Máquina de encogimientos",
  ski_erg: "Ski erg",
  slam_ball: "Balón medicinal",
  sled: "Trineo",
  smith_machine: "Máquina Smith",
  stability_ball: "Pelota de estabilidad",
  stair_climber: "Escaladora",
  standing_calf_raise_machine: "Pantorrilla de pie",
  stationary_bike: "Bicicleta fija",
  suspension_trainer: "Entrenador de suspensión",
  trap_bar: "Barra hexagonal",
  treadmill: "Caminadora",
  tricep_extension_machine: "Máquina de tríceps",
  wrist_roller: "Rodillo de muñeca",
};

const equipmentOptions = [
  { id: "all", label: "Todos", image: "" },
  ...Array.from(
    new Set(exercises.map((exercise) => exercise.equipment || "bodyweight")),
  )
    .filter((id) => commonGymEquipment.has(id))
    .sort((left, right) =>
      getEquipmentName(left).localeCompare(getEquipmentName(right), "es"),
    )
    .map((id) => ({
      id,
      label: getEquipmentName(id),
      image: id.replaceAll("_", "-"),
    })),
];

function getEquipmentName(id: string) {
  return equipmentNames[id] || id.replaceAll("_", " ");
}

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

function getFilterImageSource(
  image: string,
  keys: Set<string>,
  context: __MetroModuleApi.RequireContext,
) {
  const key = `./${image}.webp`;
  return image && keys.has(key) ? (context(key) as number) : undefined;
}

function getBodyPartName(bodyPart: string) {
  const names: Record<string, string> = {
    back: "Espalda",
    chest: "Pecho",
    core: "Abdomen",
    full_body: "Cuerpo completo",
    lower_arms: "Brazos",
    lower_legs: "Piernas",
    shoulders: "Hombros",
    upper_arms: "Brazos",
    upper_legs: "Piernas",
  };

  return names[bodyPart] || "Entrenamiento";
}

function matchesMuscleGroup(exercise: Exercise, group: MuscleGroup) {
  return (
    group.bodyParts.includes(exercise.body_part) ||
    (exercise.primary_muscles || []).some((muscle) =>
      group.primaryMuscles.includes(muscle),
    )
  );
}

export default function ExploreExercisesScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("muscle");
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [selectedEquipment, setSelectedEquipment] = useState("all");
  const [selectedFocus, setSelectedFocus] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [bottomNavIndex, setBottomNavIndex] = useState(1);
  const pathname = usePathname();

  const filteredExercises = exercises.filter((exercise) => {
    const matchesQuery = `${exercise.name_es} ${exercise.description_es || ""}`
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es"));
    const group = muscleGroups.find((item) => item.id === selectedMuscle);
    const matchesMuscle =
      selectedMuscle === "all" ||
      Boolean(group && matchesMuscleGroup(exercise, group));
    const matchesEquipment =
      selectedEquipment === "all" ||
      (exercise.equipment || "bodyweight") === selectedEquipment;
    const matchesFocus =
      selectedFocus === "all" ||
      (selectedFocus === "warm_up" &&
        (exercise.tags || []).includes("warm_up")) ||
      (selectedFocus === "stretching" &&
        (exercise.category === "stretching" ||
          (exercise.tags || []).includes("stretching")));

    return matchesQuery && matchesMuscle && matchesEquipment && matchesFocus;
  });

  const handleTabPress = (tab: TabName) => {
    const routes: Record<TabName, string> = {
      Inicio: "/(tabs)",
      Rutina: "/(tabs)/routine",
      Tienda: "/(tabs)/store",
      Nutrición: "/(tabs)/nutrition",
    };

    router.navigate(routes[tab] as never);
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

  const visibleFilters =
    filterMode === "muscle"
      ? muscleGroups
      : filterMode === "equipment"
        ? equipmentOptions
        : focusOptions;
  const activeFilter =
    filterMode === "muscle"
      ? selectedMuscle
      : filterMode === "equipment"
        ? selectedEquipment
        : selectedFocus;
  const setActiveFilter =
    filterMode === "muscle"
      ? setSelectedMuscle
      : filterMode === "equipment"
        ? setSelectedEquipment
        : setSelectedFocus;
  const isBrowsingMuscleGroups =
    filterMode === "muscle" && selectedMuscle === "all" && query.trim() === "";
  const selectedMuscleGroup = muscleGroups.find(
    (group) => group.id === selectedMuscle,
  );
  const groupCardColumns = screenWidth >= 700 ? 3 : 2;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={22} color="#F3F4F1" />
            </Pressable>
            <View style={styles.heading}>
              <Text style={styles.title}>
                Explorar <Text style={styles.titleAccent}>ejercicios</Text>
              </Text>
              <View style={styles.subtitleRow}>
                <Ionicons name="barbell" size={15} color="#8BEA67" />
                <Text style={styles.subtitle}>
                  Encuentra tu próximo movimiento
                </Text>
              </View>
            </View>
            {screenWidth >= 500 && (
              <View style={styles.motivationCard}>
                <Ionicons name="flame" size={23} color="#9AF06E" />
                <View style={styles.motivationCopy}>
                  <Text style={styles.motivationTitle}>Mantente constante</Text>
                  <Text style={styles.motivationSubtitle}>
                    Cada repetición te acerca a tu mejor versión
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#A7ABA3" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ejercicio (ej. sentadilla, press...)"
              placeholderTextColor="#858A81"
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Buscar ejercicio"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery("")}
                accessibilityLabel="Limpiar búsqueda"
              >
                <Ionicons name="close-circle" size={18} color="#A7ABA3" />
              </Pressable>
            )}
          </View>

          <View style={styles.filterHeader}>
            <View style={styles.filterTabs}>
              <FilterModeButton
                title="Grupo muscular"
                icon="body-outline"
                active={filterMode === "muscle"}
                onPress={() => setFilterMode("muscle")}
              />
              <FilterModeButton
                title="Equipo"
                icon="barbell-outline"
                active={filterMode === "equipment"}
                onPress={() => setFilterMode("equipment")}
              />
              <FilterModeButton
                title="Enfoque"
                icon="locate-outline"
                active={filterMode === "focus"}
                onPress={() => setFilterMode("focus")}
              />
            </View>
            {(selectedMuscle !== "all" ||
              selectedEquipment !== "all" ||
              selectedFocus !== "all" ||
              query.length > 0) && (
              <Pressable
                onPress={() => {
                  setSelectedMuscle("all");
                  setSelectedEquipment("all");
                  setSelectedFocus("all");
                  setQuery("");
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            )}
          </View>

          {filterMode !== "muscle" ? (
            <ScrollView
              horizontal
              style={styles.filterScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              keyboardShouldPersistTaps="handled"
            >
              {visibleFilters.map((filter) => {
                const selected = activeFilter === filter.id;
                const filterImage = getFilterImageSource(
                  filter.image,
                  equipmentImageKeys,
                  equipmentImages,
                );

                return (
                  <Pressable
                    key={filter.id}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                    onPress={() => setActiveFilter(filter.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    {filterImage ? (
                      <Image
                        source={filterImage}
                        style={styles.filterIcon}
                        contentFit="contain"
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : selectedMuscleGroup ? (
            <View style={styles.selectedGroupHeader}>
              <Pressable
                style={styles.changeGroupButton}
                onPress={() => setSelectedMuscle("all")}
                accessibilityRole="button"
                accessibilityLabel="Cambiar grupo muscular"
              >
                <Ionicons name="arrow-back" size={17} color="#D8E9D0" />
                <Text style={styles.changeGroupText}>Grupos</Text>
              </Pressable>
              <View
                style={[
                  styles.selectedGroupDot,
                  { backgroundColor: selectedMuscleGroup.color },
                ]}
              />
              <Text style={styles.selectedGroupTitle}>
                {selectedMuscleGroup.label}
              </Text>
            </View>
          ) : null}

          {isBrowsingMuscleGroups ? (
            <ScrollView
              style={styles.groupBrowseList}
              contentContainerStyle={styles.groupBrowseContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.resultsHeader}>
                <View>
                  <View style={styles.groupBrowseTitleRow}>
                    <Ionicons
                      name="body-outline"
                      size={22}
                      color="#54DA4F"
                    />
                    <Text style={styles.resultsTitle}>
                      Explora por grupo muscular
                    </Text>
                  </View>
                  <Text style={styles.groupBrowseSubtitle}>
                    Elige un músculo y enfoca mejor tu entrenamiento.
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.muscleGroupGrid,
                  groupCardColumns === 3 && styles.muscleGroupGridWide,
                ]}
              >
                {muscleGroups.map((group) => {
                  const image = getFilterImageSource(
                    group.image,
                    muscleImageKeys,
                    muscleImages,
                  );
                  const count = exercises.filter((exercise) =>
                    matchesMuscleGroup(exercise, group),
                  ).length;

                  if (count === 0) return null;

                  return (
                    <Pressable
                      key={group.id}
                      style={({ pressed }) => [
                        styles.muscleGroupCard,
                        {
                          borderColor: group.color,
                          width: groupCardColumns === 3 ? "31.6%" : "48.5%",
                        },
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => setSelectedMuscle(group.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${group.label}, ${count} ejercicios`}
                    >
                      <View
                        style={[
                          styles.muscleGroupImageFrame,
                          { backgroundColor: `${group.color}12` },
                        ]}
                      >
                        {image ? (
                          <Image
                            source={image}
                            style={styles.muscleGroupImage}
                            contentFit="contain"
                            transition={120}
                          />
                        ) : (
                          <Ionicons
                            name="body-outline"
                            size={66}
                            color={group.color}
                          />
                        )}
                      </View>
                      <View style={styles.muscleGroupCopy}>
                        <Text
                          style={styles.muscleGroupName}
                          numberOfLines={1}
                        >
                          {group.label}
                        </Text>
                        <Text
                          style={[
                            styles.muscleGroupCount,
                            { color: group.color },
                          ]}
                        >
                          {count} ejercicios
                        </Text>
                        <Text
                          style={styles.muscleGroupDescription}
                          numberOfLines={2}
                        >
                          {group.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.muscleGroupArrow,
                          {
                            borderColor: group.color,
                            backgroundColor: `${group.color}24`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={17}
                          color="#FFFFFF"
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>
                  {selectedMuscleGroup
                    ? `Ejercicios de ${selectedMuscleGroup.label}`
                    : "Ejercicios"}
                </Text>
                <Text style={styles.resultsCount}>
                  {filteredExercises.length} resultados
                </Text>
              </View>

              <FlatList
                style={styles.exerciseList}
                data={filteredExercises}
                keyExtractor={(exercise) => exercise.id}
                contentContainerStyle={styles.exerciseListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.exerciseRowCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => setSelectedExercise(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${item.name_es}`}
                  >
                    <View style={styles.exerciseRowImageFrame}>
                      {getImageSource(item) ? (
                        <Image
                          source={getImageSource(item)}
                          style={styles.exerciseImage}
                          contentFit="cover"
                          transition={120}
                        />
                      ) : (
                        <View style={styles.imageFallback}>
                          <Ionicons
                            name="barbell-outline"
                            size={27}
                            color="#7C9B70"
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.exerciseRowCopy}>
                      <Text style={styles.exerciseName} numberOfLines={2}>
                        {item.name_es}
                      </Text>
                      <Text style={styles.exerciseCategory} numberOfLines={1}>
                        {getBodyPartName(item.body_part)} ·{" "}
                        {getEquipmentName(item.equipment || "bodyweight")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color="#899087"
                    />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="search-outline"
                      size={34}
                      color="#697065"
                    />
                    <Text style={styles.emptyTitle}>
                      No encontramos ejercicios
                    </Text>
                    <Text style={styles.emptyCopy}>
                      Prueba otra búsqueda o cambia los filtros.
                    </Text>
                  </View>
                }
              />
            </>
          )}

          <AnimatedBottomNav
            initialIndex={bottomNavIndex}
            onChange={handleBottomNavChange}
            dark
          />
        </View>
      </SafeAreaView>

      <ExerciseDetails
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </View>
  );
}

type FilterModeButtonProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
};

function FilterModeButton({
  title,
  icon,
  active,
  onPress,
}: FilterModeButtonProps) {
  return (
    <Pressable
      style={[styles.filterModeButton, active && styles.filterModeButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? "#152012" : "#B9BDB8"}
      />
      <Text
        style={[styles.filterModeText, active && styles.filterModeTextActive]}
      >
        {title}
      </Text>
    </Pressable>
  );
}



type ExerciseDetailsProps = {
  exercise: Exercise | null;
  onClose: () => void;
};

function ExerciseDetails({ exercise, onClose }: ExerciseDetailsProps) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(defaultRoutineDay);
  const [isChoosingDay, setIsChoosingDay] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setIsFavorite(false);

    if (!exercise || !user?.clientId)
      return () => {
        isCurrent = false;
      };

    hasFavoriteExercise(user.clientId, exercise.id)
      .then((favorite) => {
        if (isCurrent) setIsFavorite(favorite);
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [exercise?.id, user?.clientId]);

  const getSaveContext = () => {
    if (!user?.clientId) {
      Alert.alert(
        "Inicia sesión",
        "Necesitas iniciar sesión como cliente para guardar ejercicios.",
      );
      return null;
    }

    return {
      clientId: user.clientId,
      clientUsername: user.username,
      clientName: `${user.firstName} ${user.lastName}`.trim(),
      exercise: {
        id: exercise!.id,
        name: exercise!.name_es,
        bodyPart: getBodyPartName(exercise!.body_part),
        equipment: getEquipmentName(exercise!.equipment || "bodyweight"),
        category: exercise!.category,
      },
    };
  };

  const handleSaveRoutine = async () => {
    if (!exercise || isSavingRoutine) return;
    const saveContext = getSaveContext();
    if (!saveContext) return;

    setIsSavingRoutine(true);
    try {
      await saveExerciseToRoutine({ ...saveContext, day: selectedDay });
      setIsChoosingDay(false);
      Alert.alert(
        "Agregado a Mi rutina",
        `${exercise.name_es} se guardó para el ${selectedDay.toLowerCase()}.`,
      );
    } catch {
      Alert.alert("No se pudo guardar", "Inténtalo de nuevo en unos momentos.");
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!exercise || isSavingFavorite) return;
    const saveContext = getSaveContext();
    if (!saveContext) return;

    setIsSavingFavorite(true);
    try {
      if (isFavorite) {
        await removeFavoriteExercise(saveContext.clientId, exercise.id);
        setIsFavorite(false);
      } else {
        await saveFavoriteExercise(saveContext);
        setIsFavorite(true);
      }
    } catch {
      Alert.alert(
        "No se pudo actualizar",
        "Inténtalo de nuevo en unos momentos.",
      );
    } finally {
      setIsSavingFavorite(false);
    }
  };

  return (
    <Modal
      visible={exercise !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.detailsSheet} edges={["bottom"]}>
          <View style={styles.detailsHeader}>
            <View style={styles.detailsHandle} />
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Cerrar detalle"
            >
              <Ionicons name="close" size={22} color="#E9ECE7" />
            </Pressable>
          </View>
          {exercise ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsContent}
            >
              <View style={styles.detailsImageFrame}>
                {getImageSource(exercise) ? (
                  <Image
                    source={getImageSource(exercise)}
                    style={styles.detailsImage}
                    contentFit="contain"
                  />
                ) : null}
              </View>
              <Text style={styles.detailsTitle}>{exercise.name_es}</Text>
              <View style={styles.detailsTags}>
                <Text style={styles.detailsTag}>
                  {getBodyPartName(exercise.body_part)}
                </Text>
                <Text style={styles.detailsTag}>
                  {getEquipmentName(exercise.equipment || "bodyweight")}
                </Text>
              </View>
              {exercise.description_es ? (
                <Text style={styles.detailsDescription}>
                  {exercise.description_es}
                </Text>
              ) : null}
              <View style={styles.exerciseActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.routineAction,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => setIsChoosingDay((visible) => !visible)}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.routineActionText}>
                    Agregar a mi rutina
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.favoriteAction,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleToggleFavorite}
                  disabled={isSavingFavorite}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: isFavorite,
                    disabled: isSavingFavorite,
                  }}
                >
                  <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={isFavorite ? "#F07A79" : "#FFFFFF"}
                  />
                  <Text style={styles.favoriteActionText}>
                    {isSavingFavorite
                      ? "Guardando..."
                      : isFavorite
                        ? "En favoritos"
                        : "Agregar como favorito"}
                  </Text>
                </Pressable>
              </View>
              {isChoosingDay ? (
                <View style={styles.dayPicker}>
                  <Text style={styles.dayPickerTitle}>
                    ¿Qué día entrenarás?
                  </Text>
                  <View style={styles.dayOptions}>
                    {routineDays.map((day) => (
                      <Pressable
                        key={day}
                        style={[
                          styles.dayOption,
                          selectedDay === day && styles.dayOptionSelected,
                        ]}
                        onPress={() => setSelectedDay(day)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedDay === day }}
                      >
                        <Text
                          style={[
                            styles.dayOptionText,
                            selectedDay === day && styles.dayOptionTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmRoutineButton,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={handleSaveRoutine}
                    disabled={isSavingRoutine}
                  >
                    <Text style={styles.confirmRoutineText}>
                      {isSavingRoutine
                        ? "Guardando..."
                        : `Guardar para ${selectedDay.toLowerCase()}`}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.instructionsTitle}>Ejecución</Text>
              {(exercise.instructions_es || []).map((instruction, index) => (
                <View
                  key={`${exercise.id}-${index}`}
                  style={styles.instructionRow}
                >
                  <Text style={styles.instructionNumber}>{index + 1}</Text>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090A0A",
  },
  safeArea: {
    flex: 1,
  },
  shell: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#4A4A4A",
    borderRadius: 24,
    backgroundColor: "#0B0C0C",
    overflow: "hidden",
  },
  header: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0B110D",
  },
  headerIconButton: {
    width: 33,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  heading: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 5,
  },
  title: {
    color: "#F2F3F0",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: "#4ED957",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 4,
  },
  subtitle: {
    color: "#B0B8B3",
    fontSize: 12,
  },
  motivationCard: {
    width: 160,
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#174A2C",
    borderRadius: 13,
    backgroundColor: "#0D2015",
  },
  motivationCopy: {
    flex: 1,
  },
  motivationTitle: {
    color: "#78E75C",
    fontSize: 10,
    fontWeight: "800",
  },
  motivationSubtitle: {
    color: "#C0C9C1",
    fontSize: 8,
    lineHeight: 11,
    marginTop: 3,
  },
  searchBox: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#56C951",
    borderRadius: 12,
    backgroundColor: "#121915",
  },
  searchInput: {
    flex: 1,
    color: "#F4F5F2",
    fontSize: 12,
    paddingVertical: 0,
  },
  filterHeader: {
    minHeight: 43,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  filterTabs: {
    flex: 1,
    flexDirection: "row",
    gap: 7,
    marginRight: 8,
  },
  filterModeButton: {
    flex: 1,
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#303733",
    borderRadius: 11,
    backgroundColor: "#191E1B",
  },
  filterModeButtonActive: {
    borderColor: "#A4F47F",
    backgroundColor: "#A5F47E",
  },
  filterModeText: {
    color: "#D1D8D2",
    fontSize: 10,
    fontWeight: "700",
  },
  filterModeTextActive: {
    color: "#182018",
  },
  clearText: {
    color: "#A9D399",
    fontSize: 10,
    fontWeight: "700",
  },
  filterScroll: {
    height: 44,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterList: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 15,
  },
  filterChip: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#3B3E39",
    borderRadius: 7,
    backgroundColor: "#191B19",
  },
  filterChipSelected: {
    borderColor: SportGymColors.primary,
    backgroundColor: "#315D29",
  },
  filterIcon: {
    width: 19,
    height: 19,
  },
  filterChipText: {
    color: "#D4D6D1",
    fontSize: 11,
    fontWeight: "600",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  resultsHeader: {
    minHeight: 53,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 7,
    paddingBottom: 5,
  },
  resultsTitle: {
    color: "#F1F2EF",
    fontSize: 14,
    fontWeight: "900",
  },
  groupBrowseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultsCount: {
    color: "#929792",
    fontSize: 11,
  },
  groupBrowseList: {
    flex: 1,
    minHeight: 0,
  },
  groupBrowseContent: {
    paddingBottom: 12,
  },
  groupBrowseSubtitle: {
    color: "#B0B8B3",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 30,
  },
  muscleGroupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
    paddingHorizontal: 13,
    paddingTop: 4,
  },
  muscleGroupGridWide: {
    rowGap: 8,
  },
  muscleGroupCard: {
    minHeight: 132,
    justifyContent: "center",
    padding: 11,
    borderWidth: 1,
    borderRadius: 15,
    backgroundColor: "#101613",
    overflow: "hidden",
  },
  muscleGroupImageFrame: {
    position: "absolute",
    right: -3,
    bottom: -7,
    width: "58%",
    height: "112%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 0,
  },
  muscleGroupImage: {
    width: "100%",
    height: "100%",
    opacity: 0.9,
  },
  muscleGroupCopy: {
    width: "70%",
    zIndex: 1,
  },
  muscleGroupName: {
    overflow: "hidden",
    color: "#F4F5F2",
    fontSize: 13,
    fontWeight: "900",
  },
  muscleGroupCount: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
  },
  muscleGroupDescription: {
    color: "#C0C8C2",
    fontSize: 9,
    lineHeight: 12,
    marginTop: 8,
  },
  muscleGroupArrow: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 15,
    zIndex: 2,
  },
  selectedGroupHeader: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#252925",
  },
  changeGroupButton: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 8,
  },
  changeGroupText: {
    color: "#D8E9D0",
    fontSize: 11,
    fontWeight: "700",
  },
  selectedGroupDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  selectedGroupTitle: {
    color: "#F1F2EF",
    fontSize: 12,
    fontWeight: "800",
  },
  exerciseListContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 16,
  },
  exerciseList: {
    flex: 1,
    minHeight: 0,
  },
  exerciseRowCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#2B2E2A",
    borderRadius: 12,
    backgroundColor: "#151715",
  },
  exerciseRowImageFrame: {
    width: 76,
    height: 76,
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: 9,
    backgroundColor: "#D9EAF0",
    marginRight: 11,
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDEBE0",
  },
  exerciseRowCopy: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingVertical: 4,
  },
  exerciseName: {
    color: "#F0F2EE",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  exerciseCategory: {
    color: "#A7C69B",
    fontSize: 10,
    marginTop: 5,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 58,
  },
  emptyTitle: {
    color: "#E5E8E2",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
  },
  emptyCopy: {
    color: "#A0A49E",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  detailsSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#353935",
    backgroundColor: "#111311",
    overflow: "hidden",
  },
  detailsHeader: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5B6059",
  },
  closeButton: {
    position: "absolute",
    right: 14,
    top: 5,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#252825",
  },
  detailsContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  detailsImageFrame: {
    height: 220,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#D9EAF0",
  },
  detailsImage: {
    width: "100%",
    height: "100%",
  },
  detailsTitle: {
    color: "#F4F5F2",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 15,
  },
  detailsTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  detailsTag: {
    color: "#D8E9D0",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#263923",
  },
  detailsDescription: {
    color: "#C3C7C0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 15,
  },
  exerciseActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 17,
  },
  routineAction: {
    minHeight: 42,
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },
  routineActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  favoriteAction: {
    minHeight: 42,
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#464B45",
    borderRadius: 8,
    backgroundColor: "#202320",
  },
  favoriteActionText: {
    color: "#F0F2EE",
    fontSize: 12,
    fontWeight: "700",
  },
  dayPicker: {
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#343934",
    borderRadius: 9,
    backgroundColor: "#191C19",
  },
  dayPickerTitle: {
    color: "#EEF1EA",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  dayOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  dayOption: {
    minWidth: 72,
    minHeight: 33,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#414640",
    borderRadius: 7,
    backgroundColor: "#232723",
  },
  dayOptionSelected: {
    borderColor: SportGymColors.primary,
    backgroundColor: "#315D29",
  },
  dayOptionText: {
    color: "#C9CEC6",
    fontSize: 11,
    fontWeight: "600",
  },
  dayOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  confirmRoutineButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
    borderRadius: 8,
    backgroundColor: SportGymColors.primary,
  },
  confirmRoutineText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  instructionsTitle: {
    color: "#F1F2EF",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 19,
    marginBottom: 10,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 11,
  },
  instructionNumber: {
    width: 23,
    height: 23,
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 12,
    backgroundColor: SportGymColors.primary,
    marginRight: 9,
  },
  instructionText: {
    flex: 1,
    color: "#C3C7C0",
    fontSize: 12,
    lineHeight: 18,
  },
});
