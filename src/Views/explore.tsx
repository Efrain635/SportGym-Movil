import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import exerciseData from '../../assets/exercises/exercises.json';
import { SportGymColors } from '../constants/theme';

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
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  instructions_es?: string[];
  images?: { flat?: { start?: string; peak?: string; main?: string } };
};

type FilterMode = 'muscle' | 'equipment' | 'focus';
type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición';

const sourceExercises = (exerciseData as { exercises: Exercise[] }).exercises;
const commonGymEquipmentOrder = [
  'barbell',
  'dumbbell',
  'bodyweight',
  'cable',
  'kettlebell',
  'smith_machine',
  'leg_press',
  'pull_up_bar',
  'ez_bar',
  'resistance_band',
  'loop_band',
  'flat_bench',
  'lat_pulldown_machine',
  'leg_curl',
  'leg_extension',
  'chest_press_machine',
  'shoulder_press_machine',
  'stability_ball',
  'treadmill',
  'stationary_bike',
  'elliptical',
  'suspension_trainer',
  'rower',
];
const commonGymEquipment = new Set(commonGymEquipmentOrder);
const exerciseFamilies = new Map<string, Exercise[]>();
const selectedExerciseIds = new Set<string>();

for (const exercise of sourceExercises) {
  const equipment = exercise.equipment || 'bodyweight';
  if (!commonGymEquipment.has(equipment)) continue;

  if (!exercise.variation_group) {
    selectedExerciseIds.add(exercise.id);
    continue;
  }

  const family = exerciseFamilies.get(exercise.variation_group) || [];
  family.push(exercise);
  exerciseFamilies.set(exercise.variation_group, family);
}

const equipmentPriority = new Map(commonGymEquipmentOrder.map((equipment, index) => [equipment, index]));
const difficultyPriority = { beginner: 0, intermediate: 1, advanced: 2 };

for (const family of exerciseFamilies.values()) {
  const representatives = [...family].sort((left, right) => {
    const leftEquipment = equipmentPriority.get(left.equipment || 'bodyweight') ?? 99;
    const rightEquipment = equipmentPriority.get(right.equipment || 'bodyweight') ?? 99;
    const leftDifficulty = difficultyPriority[left.difficulty || 'advanced'];
    const rightDifficulty = difficultyPriority[right.difficulty || 'advanced'];
    return leftEquipment - rightEquipment || leftDifficulty - rightDifficulty;
  });
  const selectedEquipment = new Set<string>();

  for (const exercise of representatives) {
    const equipment = exercise.equipment || 'bodyweight';
    if (selectedEquipment.has(equipment)) continue;

    selectedEquipment.add(equipment);
    selectedExerciseIds.add(exercise.id);
    if (selectedEquipment.size === 3) break;
  }
}

for (const exercise of sourceExercises) {
  if (exercise.category === 'stretching' || (exercise.tags || []).includes('warm_up')) {
    selectedExerciseIds.add(exercise.id);
  }
}

const exercises = sourceExercises.filter((exercise) => selectedExerciseIds.has(exercise.id));
const exerciseImages = require.context(
  '../../assets/exercises/images/flat',
  false,
  /\.webp$/i,
);
const muscleImages = require.context(
  '../../assets/exercises/images/muscles',
  false,
  /\.webp$/i,
);
const equipmentImages = require.context(
  '../../assets/exercises/images/equipment',
  false,
  /\.webp$/i,
);
const exerciseImageKeys = new Set(exerciseImages.keys());
const muscleImageKeys = new Set(muscleImages.keys());
const equipmentImageKeys = new Set(equipmentImages.keys());

const muscleGroups = [
  { id: 'all', label: 'Todos', bodyParts: [] as string[], image: '' },
  { id: 'chest', label: 'Pecho', bodyParts: ['chest'], image: 'pectoralis-major' },
  { id: 'back', label: 'Espalda', bodyParts: ['back'], image: 'latissimus-dorsi' },
  { id: 'shoulders', label: 'Hombros', bodyParts: ['shoulders'], image: 'anterior-deltoid' },
  { id: 'arms', label: 'Brazos', bodyParts: ['upper_arms', 'lower_arms'], image: 'biceps-brachii' },
  { id: 'core', label: 'Abdomen', bodyParts: ['core'], image: 'rectus-abdominis' },
  { id: 'legs', label: 'Piernas', bodyParts: ['upper_legs', 'lower_legs'], image: 'quadriceps' },
  { id: 'full_body', label: 'Cuerpo completo', bodyParts: ['full_body'], image: '' },
];

const focusOptions = [
  { id: 'all', label: 'Todos', image: '' },
  { id: 'warm_up', label: 'Calentamiento', image: '' },
  { id: 'stretching', label: 'Estiramiento', image: '' },
];

const equipmentNames: Record<string, string> = {
  ab_crunch_machine: 'Máquina abdominal',
  ab_wheel: 'Rueda abdominal',
  air_bike: 'Bicicleta de aire',
  assisted_pullup_machine: 'Dominadas asistidas',
  back_extension_machine: 'Máquina lumbar',
  barbell: 'Barra',
  battle_rope: 'Cuerda de batalla',
  bicep_curl_machine: 'Máquina de bíceps',
  bodyweight: 'Peso corporal',
  cable: 'Polea',
  chest_fly_machine: 'Contractora',
  chest_press_machine: 'Press de pecho',
  climbing_rope: 'Cuerda de trepa',
  dip_machine: 'Máquina de fondos',
  dip_station: 'Estación de fondos',
  donkey_calf_raise_machine: 'Máquina de pantorrilla',
  dumbbell: 'Mancuernas',
  elliptical: 'Elíptica',
  ez_bar: 'Barra Z',
  flat_bench: 'Banco',
  glute_ham_developer: 'Banco de glúteo e isquios',
  hack_squat: 'Hack squat',
  hip_abduction_machine: 'Máquina de abductores',
  hip_adduction_machine: 'Máquina de aductores',
  hip_thrust_machine: 'Máquina de hip thrust',
  jump_rope: 'Cuerda para saltar',
  kettlebell: 'Pesa rusa',
  lat_pulldown_machine: 'Jalón al pecho',
  leg_curl: 'Curl femoral',
  leg_extension: 'Extensión de pierna',
  leg_press: 'Prensa de piernas',
  loop_band: 'Banda circular',
  pec_deck: 'Pec deck',
  plate_loaded_lateral_raise_machine: 'Elevación lateral en máquina',
  plates: 'Discos',
  plyo_box: 'Cajón pliométrico',
  preacher_curl_machine: 'Banco predicador',
  pull_up_bar: 'Barra de dominadas',
  resistance_band: 'Banda elástica',
  rings: 'Anillas',
  rower: 'Remo',
  seated_calf_raise_machine: 'Pantorrilla sentado',
  shoulder_press_machine: 'Press de hombros',
  shrug_machine: 'Máquina de encogimientos',
  ski_erg: 'Ski erg',
  slam_ball: 'Balón medicinal',
  sled: 'Trineo',
  smith_machine: 'Máquina Smith',
  stability_ball: 'Pelota de estabilidad',
  stair_climber: 'Escaladora',
  standing_calf_raise_machine: 'Pantorrilla de pie',
  stationary_bike: 'Bicicleta fija',
  suspension_trainer: 'Entrenador de suspensión',
  trap_bar: 'Barra hexagonal',
  treadmill: 'Caminadora',
  tricep_extension_machine: 'Máquina de tríceps',
  wrist_roller: 'Rodillo de muñeca',
};

const equipmentOptions = [
  { id: 'all', label: 'Todos', image: '' },
  ...Array.from(new Set(exercises.map((exercise) => exercise.equipment || 'bodyweight')))
    .filter((id) => commonGymEquipment.has(id))
    .sort((left, right) => getEquipmentName(left).localeCompare(getEquipmentName(right), 'es'))
    .map((id) => ({ id, label: getEquipmentName(id), image: id.replaceAll('_', '-') })),
];

function getEquipmentName(id: string) {
  return equipmentNames[id] || id.replaceAll('_', ' ');
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
    const key = `./${filePath.split('/').pop()}`;
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
    back: 'Espalda',
    chest: 'Pecho',
    core: 'Abdomen',
    full_body: 'Cuerpo completo',
    lower_arms: 'Brazos',
    lower_legs: 'Piernas',
    shoulders: 'Hombros',
    upper_arms: 'Brazos',
    upper_legs: 'Piernas',
  };

  return names[bodyPart] || 'Entrenamiento';
}

export default function ExploreExercisesScreen() {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('muscle');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [selectedFocus, setSelectedFocus] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const filteredExercises = exercises.filter((exercise) => {
    const matchesQuery = `${exercise.name_es} ${exercise.description_es || ''}`
      .toLocaleLowerCase('es')
      .includes(query.trim().toLocaleLowerCase('es'));
    const group = muscleGroups.find((item) => item.id === selectedMuscle);
    const matchesMuscle =
      selectedMuscle === 'all' || Boolean(group?.bodyParts.includes(exercise.body_part));
    const matchesEquipment =
      selectedEquipment === 'all' || (exercise.equipment || 'bodyweight') === selectedEquipment;
    const matchesFocus =
      selectedFocus === 'all' ||
      (selectedFocus === 'warm_up' && (exercise.tags || []).includes('warm_up')) ||
      (selectedFocus === 'stretching' &&
        (exercise.category === 'stretching' || (exercise.tags || []).includes('stretching')));

    return matchesQuery && matchesMuscle && matchesEquipment && matchesFocus;
  });

  const handleTabPress = (tab: TabName) => {
    const routes: Record<TabName, string> = {
      Inicio: '/(tabs)',
      Rutina: '/(tabs)/routine',
      Tienda: '/(tabs)/store',
      Nutrición: '/(tabs)/nutrition',
    };

    router.push(routes[tab] as never);
  };

  const visibleFilters =
    filterMode === 'muscle'
      ? muscleGroups
      : filterMode === 'equipment'
        ? equipmentOptions
        : focusOptions;
  const activeFilter =
    filterMode === 'muscle'
      ? selectedMuscle
      : filterMode === 'equipment'
        ? selectedEquipment
        : selectedFocus;
  const setActiveFilter =
    filterMode === 'muscle'
      ? setSelectedMuscle
      : filterMode === 'equipment'
        ? setSelectedEquipment
        : setSelectedFocus;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              <Text style={styles.title}>Explorar ejercicios</Text>
              <Text style={styles.subtitle}>Encuentra tu próximo movimiento</Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={19} color="#A7ABA3" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ejercicio"
              placeholderTextColor="#858A81"
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Buscar ejercicio"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color="#A7ABA3" />
              </Pressable>
            )}
          </View>

          <View style={styles.filterHeader}>
            <View style={styles.filterTabs}>
              <FilterModeButton
                title="Grupo muscular"
                active={filterMode === 'muscle'}
                onPress={() => setFilterMode('muscle')}
              />
              <FilterModeButton
                title="Equipo"
                active={filterMode === 'equipment'}
                onPress={() => setFilterMode('equipment')}
              />
              <FilterModeButton
                title="Enfoque"
                active={filterMode === 'focus'}
                onPress={() => setFilterMode('focus')}
              />
            </View>
            {(selectedMuscle !== 'all' ||
              selectedEquipment !== 'all' ||
              selectedFocus !== 'all' ||
              query.length > 0) && (
              <Pressable
                onPress={() => {
                  setSelectedMuscle('all');
                  setSelectedEquipment('all');
                  setSelectedFocus('all');
                  setQuery('');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            style={styles.filterScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            keyboardShouldPersistTaps="handled"
          >
            {visibleFilters.map((filter) => {
              const selected = activeFilter === filter.id;
              const filterImage =
                filterMode === 'muscle'
                  ? getFilterImageSource(filter.image, muscleImageKeys, muscleImages)
                  : getFilterImageSource(filter.image, equipmentImageKeys, equipmentImages);

              return (
                <Pressable
                  key={filter.id}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                  onPress={() => setActiveFilter(filter.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  {filterImage ? (
                    <Image source={filterImage} style={styles.filterIcon} contentFit="contain" />
                  ) : null}
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Ejercicios</Text>
            <Text style={styles.resultsCount}>{filteredExercises.length} resultados</Text>
          </View>

          <FlatList
            style={styles.exerciseList}
            data={filteredExercises}
            keyExtractor={(exercise) => exercise.id}
            numColumns={3}
            columnWrapperStyle={styles.exerciseRow}
            contentContainerStyle={styles.exerciseGrid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.exerciseCard, pressed && styles.cardPressed]}
                onPress={() => setSelectedExercise(item)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${item.name_es}`}
              >
                <View style={styles.exerciseImageFrame}>
                  {getImageSource(item) ? (
                    <Image
                      source={getImageSource(item)}
                      style={styles.exerciseImage}
                      contentFit="cover"
                      transition={120}
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Ionicons name="barbell-outline" size={27} color="#7C9B70" />
                    </View>
                  )}
                </View>
                <Text style={styles.exerciseName} numberOfLines={2}>
                  {item.name_es}
                </Text>
                <Text style={styles.exerciseCategory} numberOfLines={1}>
                  {getBodyPartName(item.body_part)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={34} color="#697065" />
                <Text style={styles.emptyTitle}>No encontramos ejercicios</Text>
                <Text style={styles.emptyCopy}>Prueba otra búsqueda o cambia los filtros.</Text>
              </View>
            }
          />

          <View style={styles.bottomNavigation}>
            <BottomTab label="Inicio" icon="home-outline" activeIcon="home" onPress={() => handleTabPress('Inicio')} />
            <BottomTab label="Rutina" icon="barbell-outline" activeIcon="barbell" onPress={() => handleTabPress('Rutina')} />
            <BottomTab label="Tienda" icon="flask-outline" activeIcon="flask" onPress={() => handleTabPress('Tienda')} />
            <BottomTab label="Nutrición" icon="nutrition-outline" activeIcon="nutrition" onPress={() => handleTabPress('Nutrición')} />
          </View>
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
  active: boolean;
  onPress: () => void;
};

function FilterModeButton({ title, active, onPress }: FilterModeButtonProps) {
  return (
    <Pressable
      style={[styles.filterModeButton, active && styles.filterModeButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filterModeText, active && styles.filterModeTextActive]}>{title}</Text>
    </Pressable>
  );
}

type BottomTabProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function BottomTab({ label, icon, activeIcon, onPress }: BottomTabProps) {
  const active = label === 'Rutina';

  return (
    <Pressable
      style={({ pressed }) => [styles.bottomTab, pressed && styles.tabPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={22}
        color={active ? SportGymColors.primary : '#929792'}
      />
      <Text style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

type ExerciseDetailsProps = {
  exercise: Exercise | null;
  onClose: () => void;
};

function ExerciseDetails({ exercise, onClose }: ExerciseDetailsProps) {
  return (
    <Modal
      visible={exercise !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.detailsSheet} edges={['bottom']}>
          <View style={styles.detailsHeader}>
            <View style={styles.detailsHandle} />
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Cerrar detalle">
              <Ionicons name="close" size={22} color="#E9ECE7" />
            </Pressable>
          </View>
          {exercise ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsContent}>
              <View style={styles.detailsImageFrame}>
                {getImageSource(exercise) ? (
                  <Image source={getImageSource(exercise)} style={styles.detailsImage} contentFit="contain" />
                ) : null}
              </View>
              <Text style={styles.detailsTitle}>{exercise.name_es}</Text>
              <View style={styles.detailsTags}>
                <Text style={styles.detailsTag}>{getBodyPartName(exercise.body_part)}</Text>
                <Text style={styles.detailsTag}>{getEquipmentName(exercise.equipment || 'bodyweight')}</Text>
              </View>
              {exercise.description_es ? <Text style={styles.detailsDescription}>{exercise.description_es}</Text> : null}
              <Text style={styles.instructionsTitle}>Ejecución</Text>
              {(exercise.instructions_es || []).map((instruction, index) => (
                <View key={`${exercise.id}-${index}`} style={styles.instructionRow}>
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
    backgroundColor: '#090A0A',
  },
  safeArea: {
    flex: 1,
  },
  shell: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#4A4A4A',
    borderRadius: 24,
    backgroundColor: '#0B0C0C',
    overflow: 'hidden',
  },
  header: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  headerIconButton: {
    width: 37,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    marginHorizontal: 7,
  },
  title: {
    color: '#F2F3F0',
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9FA39D',
    fontSize: 11,
    marginTop: 3,
  },
  searchBox: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#4C9A3A',
    borderRadius: 9,
    backgroundColor: '#151715',
  },
  searchInput: {
    flex: 1,
    color: '#F4F5F2',
    fontSize: 13,
    paddingVertical: 0,
  },
  filterHeader: {
    height: 40,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  filterModeButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#272927',
  },
  filterModeButtonActive: {
    backgroundColor: SportGymColors.primary,
  },
  filterModeText: {
    color: '#D1D3CE',
    fontSize: 10,
    fontWeight: '700',
  },
  filterModeTextActive: {
    color: '#FFFFFF',
  },
  clearText: {
    color: '#A9D399',
    fontSize: 11,
    fontWeight: '700',
  },
  filterScroll: {
    height: 44,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterList: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
  },
  filterChip: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#3B3E39',
    borderRadius: 7,
    backgroundColor: '#191B19',
  },
  filterChipSelected: {
    borderColor: SportGymColors.primary,
    backgroundColor: '#315D29',
  },
  filterIcon: {
    width: 19,
    height: 19,
  },
  filterChipText: {
    color: '#D4D6D1',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultsHeader: {
    height: 42,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 2,
    paddingBottom: 3,
  },
  resultsTitle: {
    color: '#F1F2EF',
    fontSize: 14,
    fontWeight: '800',
  },
  resultsCount: {
    color: '#929792',
    fontSize: 11,
  },
  exerciseGrid: {
    flexGrow: 1,
    paddingHorizontal: 13,
    paddingTop: 5,
    paddingBottom: 16,
  },
  exerciseRow: {
    gap: 10,
  },
  exerciseList: {
    flex: 1,
    minHeight: 0,
  },
  exerciseCard: {
    flex: 1,
    minWidth: 0,
    marginBottom: 11,
    padding: 6,
    borderWidth: 1,
    borderColor: '#2B2E2A',
    borderRadius: 10,
    backgroundColor: '#151715',
  },
  exerciseImageFrame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: '#D9EAF0',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDEBE0',
  },
  exerciseName: {
    minHeight: 31,
    color: '#F0F2EE',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  exerciseCategory: {
    color: '#A7C69B',
    fontSize: 9,
    marginTop: 2,
    marginBottom: 3,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 58,
  },
  emptyTitle: {
    color: '#E5E8E2',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyCopy: {
    color: '#A0A49E',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  bottomNavigation: {
    height: 76,
    borderTopWidth: 1,
    borderTopColor: '#292A2A',
    backgroundColor: '#0C0D0D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  bottomTab: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabLabel: {
    color: '#929792',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  bottomTabLabelActive: {
    color: SportGymColors.primary,
    fontWeight: '800',
  },
  tabPressed: {
    opacity: 0.65,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  detailsSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#353935',
    backgroundColor: '#111311',
    overflow: 'hidden',
  },
  detailsHeader: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5B6059',
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 5,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#252825',
  },
  detailsContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  detailsImageFrame: {
    height: 220,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#D9EAF0',
  },
  detailsImage: {
    width: '100%',
    height: '100%',
  },
  detailsTitle: {
    color: '#F4F5F2',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 15,
  },
  detailsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  detailsTag: {
    color: '#D8E9D0',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#263923',
  },
  detailsDescription: {
    color: '#C3C7C0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 15,
  },
  instructionsTitle: {
    color: '#F1F2EF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 19,
    marginBottom: 10,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 11,
  },
  instructionNumber: {
    width: 23,
    height: 23,
    overflow: 'hidden',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 12,
    backgroundColor: SportGymColors.primary,
    marginRight: 9,
  },
  instructionText: {
    flex: 1,
    color: '#C3C7C0',
    fontSize: 12,
    lineHeight: 18,
  },
});