import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type Filter = 'Todos' | 'Hoy' | 'Semana';

type Routine = {
  id: number;
  day: string;
  title: string;
  exercises: number;
  duration: string;
  status: 'Completado' | 'Pendiente';
};

const routines: Routine[] = [
  {
    id: 1,
    day: 'Hoy',
    title: 'Pecho y Tríceps',
    exercises: 8,
    duration: '45 min',
    status: 'Pendiente',
  },
  {
    id: 2,
    day: 'Mañana',
    title: 'Espalda y Bíceps',
    exercises: 10,
    duration: '50 min',
    status: 'Pendiente',
  },
  {
    id: 3,
    day: 'Miércoles',
    title: 'Pierna y Hombros',
    exercises: 12,
    duration: '55 min',
    status: 'Pendiente',
  },
  {
    id: 4,
    day: 'Jueves',
    title: 'Cardio y Core',
    exercises: 6,
    duration: '30 min',
    status: 'Pendiente',
  },
  {
    id: 5,
    day: 'Viernes',
    title: 'Pecho y Tríceps',
    exercises: 8,
    duration: '45 min',
    status: 'Pendiente',
  },
];

export default function RoutineView() {
  const [activeFilter, setActiveFilter] =
    useState<Filter>('Todos');

  const filteredRoutines = routines.filter((routine) => {
    if (activeFilter === 'Todos') {
      return true;
    }

    if (activeFilter === 'Hoy') {
      return routine.day === 'Hoy';
    }

    return true; // Semana muestra todos
  });

  return (
    <View style={styles.screen}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <View style={styles.card}>

          {/* ========================================= */}
          {/* HEADER */}
          {/* ========================================= */}

          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                console.log('Volver');
              }}
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color="#D8D8D8"
              />
            </Pressable>

            <ThemedText style={styles.headerTitle}>
              Mi Rutina
            </ThemedText>

            <Pressable
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityLabel="Abrir perfil"
            >
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* ========================================= */}
          {/* FILTROS */}
          {/* ========================================= */}

          <View style={styles.filtersContainer}>

            <FilterButton
              title="Todos"
              active={activeFilter === 'Todos'}
              onPress={() => setActiveFilter('Todos')}
            />

            <FilterButton
              title="Hoy"
              active={activeFilter === 'Hoy'}
              onPress={() => setActiveFilter('Hoy')}
            />

            <FilterButton
              title="Semana"
              active={activeFilter === 'Semana'}
              onPress={() =>
                setActiveFilter('Semana')
              }
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
              <RoutineCard
                key={routine.id}
                routine={routine}
              />
            ))}

            {filteredRoutines.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="barbell-outline"
                  size={40}
                  color="#555555"
                />

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
              active={false}
              onPress={() => {
                router.navigate('/(tabs)/index' as any);
              }}
            />

            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              active={true}
              onPress={() => {
                router.push('/(tabs)/routine');
              }}
            />

            <BottomTab
              label="Tienda"
              icon="flask-outline"
              activeIcon="flask"
              active={false}
              onPress={() => {
                router.push('/(tabs)/store');
              }}
            />

            <BottomTab
              label="Nutrición"
              icon="nutrition-outline"
              activeIcon="nutrition"
              active={false}
              onPress={() => {
                router.push('/(tabs)/nutrition');
              }}
            />

          </View>

        </View>
      </SafeAreaView>
    </View>
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

function FilterButton({
  title,
  active,
  onPress,
}: FilterButtonProps) {
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
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
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

function RoutineCard({
  routine,
}: RoutineCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.routineCard,
        pressed && styles.routinePressed,
      ]}
      onPress={() => {
        console.log('Rutina seleccionada:', routine.id);
      }}
    >
      {/* DÍA */}

      <ThemedText style={styles.routineDay}>
        {routine.day}
      </ThemedText>

      {/* TÍTULO */}

      <View style={styles.routineTitleRow}>
        <ThemedText style={styles.routineTitle}>
          {routine.title}
        </ThemedText>

        <Ionicons
          name="chevron-forward"
          size={25}
          color="#222222"
        />
      </View>

      {/* DETALLES */}

      <View style={styles.routineBottomRow}>

        <View style={styles.detailsContainer}>

          <View style={styles.detailRow}>
            <Ionicons
              name="list-outline"
              size={14}
              color="#555555"
            />

            <ThemedText style={styles.detailText}>
              {routine.exercises} ejercicios
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={14}
              color="#555555"
            />

            <ThemedText style={styles.detailText}>
              {routine.duration}
            </ThemedText>
          </View>

        </View>

        <View style={styles.statusContainer}>

          <ThemedText
            style={[
              styles.status,
              routine.status === 'Pendiente' &&
                styles.pendingStatus,
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
      style={({ pressed }) => [
        styles.bottomTab,
        pressed && styles.tabPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={23}
        color={
          active
            ? SportGymColors.primary
            : '#929292'
        }
      />

      <ThemedText
        style={[
          styles.bottomTabLabel,
          active && styles.bottomTabLabelActive,
        ]}
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
    backgroundColor: '#090A0A',
  },

  safeArea: {
    flex: 1,
  },

  card: {
    flex: 1,

    marginHorizontal: 5,
    marginBottom: 4,

    borderWidth: 2,
    borderColor: '#4A4A4A',

    borderRadius: 24,

    backgroundColor: '#0B0C0C',

    overflow: 'hidden',
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    height: 64,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 17,
  },

  backButton: {
    width: 40,
    height: 40,

    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#F2F2F2',

    fontSize: 17,

    fontWeight: '800',

    textAlign: 'center',
  },

  headerRightSpace: {
    width: 40,
  },

  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#3A3B3B',
  },

  // ===================================================
  // FILTROS
  // ===================================================

  filtersContainer: {
    height: 54,

    flexDirection: 'row',

    alignItems: 'center',

    marginHorizontal: 16,
    marginBottom: 12,

    padding: 4,

    borderRadius: 12,

    backgroundColor: '#151616',
  },

  filterButton: {
    flex: 1,

    height: 43,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: 2,
  },

  filterButtonActive: {
    backgroundColor: SportGymColors.primary,
  },

  filterText: {
    color: '#B7B7B7',

    fontSize: 13,

    fontWeight: '600',
  },

  filterTextActive: {
    color: '#FFFFFF',

    fontWeight: '800',
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

    backgroundColor: '#F4F4F4',

    borderRadius: 14,

    paddingHorizontal: 17,
    paddingVertical: 15,

    marginBottom: 12,
  },

  routineDay: {
    color: '#777777',

    fontSize: 13,

    fontWeight: '500',

    marginBottom: 13,
  },

  routineTitleRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 12,
  },

  routineTitle: {
    color: '#171717',

    fontSize: 16,

    fontWeight: '800',
  },

  routineBottomRow: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'flex-end',

    justifyContent: 'space-between',
  },

  detailsContainer: {
    flex: 1,
  },

  detailRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 6,
  },

  detailText: {
    color: '#555555',

    fontSize: 13,

    fontWeight: '500',

    marginLeft: 6,
  },

  statusContainer: {
    alignItems: 'flex-end',
  },

  status: {
    color: '#69B84A',

    fontSize: 13,

    fontWeight: '700',
  },

  pendingStatus: {
    color: '#D99A2B',
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
    alignItems: 'center',
    justifyContent: 'center',

    paddingTop: 80,
  },

  emptyText: {
    color: '#777777',

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

    backgroundColor: '#0C0D0D',

    borderTopWidth: 1,
    borderTopColor: '#292A2A',

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
    color: '#929292',

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
});