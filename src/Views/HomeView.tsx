import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type TabName = 'Inicio' | 'Rutina' | 'Pagos' | 'Perfil';

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<TabName>('Inicio');

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    switch (tab) {
      case 'Inicio':
        router.push('/(tabs)');
        break;
      case 'Rutina':
        router.push('/(tabs)/routine');
        break;
      case 'Pagos':
        router.push('/(tabs)/payments');
        break;
      case 'Perfil':
        router.push('/(tabs)/profile');
        break;
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* ================================================= */}
        {/* CONTENEDOR PRINCIPAL */}
        {/* ================================================= */}

        <View style={styles.card}>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >

            {/* ================================================= */}
            {/* SALUDO */}
            {/* ================================================= */}

            <View style={styles.header}>
              <ThemedText style={styles.greeting}>
                ¡Hola, Juan! <ThemedText style={styles.wave}>👋</ThemedText>
              </ThemedText>

              <ThemedText style={styles.greetingSubtitle}>
                Listo para entrenar hoy?
              </ThemedText>
            </View>

            {/* ================================================= */}
            {/* MEMBRESÍA */}
            {/* ================================================= */}

            <Pressable
              style={({ pressed }) => [
                styles.membershipCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.membershipTopRow}>
                <ThemedText style={styles.membershipLabel}>
                  Membresía
                </ThemedText>

                <Ionicons
                  name="chevron-forward"
                  size={25}
                  color={SportGymColors.primary}
                />
              </View>

              <View style={styles.membershipMainRow}>
                <ThemedText style={styles.premiumText}>
                  PREMIUM
                </ThemedText>

                <ThemedText style={styles.activeText}>
                  Activa
                </ThemedText>
              </View>

              <ThemedText style={styles.expirationText}>
                Vence: 25 Sep 2026
              </ThemedText>

              <View style={styles.remainingRow}>
                <View style={styles.remainingIcon}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={SportGymColors.primary}
                  />
                </View>

                <ThemedText style={styles.remainingText}>
                  16 días restantes
                </ThemedText>
              </View>
            </Pressable>

            {/* ================================================= */}
            {/* PRÓXIMO ENTRENAMIENTO */}
            {/* ================================================= */}

            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Próximo entrenamiento
              </ThemedText>
            </View>

            <View style={styles.workoutCard}>

              <ThemedText style={styles.workoutTitle}>
                Pecho y Tríceps
              </ThemedText>

              <ThemedText style={styles.workoutTime}>
                Hoy · 6:00 PM
              </ThemedText>

              <Pressable
                style={({ pressed }) => [
                  styles.routineButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  handleTabPress('Rutina');
                }}
              >
                <ThemedText style={styles.routineButtonText}>
                  Ver rutina
                </ThemedText>
              </Pressable>

            </View>

            {/* ================================================= */}
            {/* MI PROGRESO */}
            {/* ================================================= */}

            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Mi progreso
              </ThemedText>
            </View>

            <View style={styles.progressCard}>

              <View style={styles.progressContent}>

                {/* ICONO */}
                <View style={styles.progressIconContainer}>
                  <Ionicons
                    name="barbell-outline"
                    size={34}
                    color={SportGymColors.primary}
                  />
                </View>

                {/* PESO */}
                <View style={styles.weightContainer}>

                  <View style={styles.weightRow}>
                    <ThemedText style={styles.weight}>
                      72.5 kg
                    </ThemedText>
                  </View>

                  <View style={styles.weightChangeRow}>
                    <ThemedText style={styles.sinceText}>
                      Desde el inicio:
                    </ThemedText>

                    <ThemedText style={styles.weightChange}>
                      -1.5 kg
                    </ThemedText>
                  </View>

                </View>

              </View>

            </View>

            {/* ESPACIO PARA QUE EL ÚLTIMO CARD NO QUEDE PEGADO */}
            <View style={styles.bottomSpace} />

          </ScrollView>

          {/* ================================================= */}
          {/* NAVEGACIÓN INFERIOR */}
          {/* ================================================= */}

          <View style={styles.bottomNavigation}>

            <BottomTab
              label="Inicio"
              icon="home"
              activeIcon="home"
              active={activeTab === 'Inicio'}
              onPress={() => handleTabPress('Inicio')}
            />

            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              active={activeTab === 'Rutina'}
              onPress={() => handleTabPress('Rutina')}
            />

            <BottomTab
              label="Pagos"
              icon="card-outline"
              activeIcon="card"
              active={activeTab === 'Pagos'}
              onPress={() => handleTabPress('Pagos')}
            />

            <BottomTab
              label="Perfil"
              icon="person-outline"
              activeIcon="person"
              active={activeTab === 'Perfil'}
              onPress={() => handleTabPress('Perfil')}
            />

          </View>

        </View>

      </SafeAreaView>
    </View>
  );
}


/* ========================================================= */
/* COMPONENTE TAB INFERIOR */
/* ========================================================= */

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
            : '#9A9A9A'
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


/* ========================================================= */
/* ESTILOS */
/* ========================================================= */

const styles = StyleSheet.create({

  // =======================================================
  // PANTALLA
  // =======================================================

  screen: {
    flex: 1,
    backgroundColor: '#090A0A',
  },

  safeArea: {
    flex: 1,
  },

  // =======================================================
  // CARD PRINCIPAL
  // =======================================================

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

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 19,
  },

  // =======================================================
  // HEADER
  // =======================================================

  header: {
    marginBottom: 22,
  },

  greeting: {
    color: '#F2F2F2',

    fontSize: 24,
    lineHeight: 30,

    fontWeight: '800',

    letterSpacing: -0.5,
  },

  wave: {
    fontSize: 21,
  },

  greetingSubtitle: {
    color: '#C4C4C4',

    fontSize: 15,

    fontWeight: '500',

    marginTop: 4,
  },

  // =======================================================
  // MEMBRESÍA
  // =======================================================

  membershipCard: {
    backgroundColor: '#F4F4F4',

    borderRadius: 15,

    minHeight: 183,

    paddingHorizontal: 18,
    paddingVertical: 15,

    marginBottom: 13,
  },

  membershipTopRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 10,
  },

  membershipLabel: {
    color: '#777777',

    fontSize: 14,

    fontWeight: '500',
  },

  membershipMainRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 17,
  },

  premiumText: {
    color: '#101010',

    fontSize: 26,

    lineHeight: 30,

    fontWeight: '900',

    letterSpacing: -0.5,
  },

  activeText: {
    color: '#59B83C',

    fontSize: 15,

    fontWeight: '700',

    marginRight: 1,
  },

  expirationText: {
    color: '#5C5C5C',

    fontSize: 14,

    fontWeight: '500',

    marginBottom: 15,
  },

  remainingRow: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  remainingIcon: {
    width: 17,
    height: 17,

    borderRadius: 9,

    borderWidth: 1.5,
    borderColor: '#59B83C',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 8,
  },

  remainingText: {
    color: '#444444',

    fontSize: 14,

    fontWeight: '600',
  },

  // =======================================================
  // SECCIONES
  // =======================================================

  sectionHeader: {
    marginBottom: 7,
    marginTop: 0,
  },

  sectionTitle: {
    color: '#D8D8D8',

    fontSize: 14,

    fontWeight: '600',
  },

  // =======================================================
  // PRÓXIMO ENTRENAMIENTO
  // =======================================================

  workoutCard: {
    minHeight: 155,

    backgroundColor: '#1B1C1C',

    borderRadius: 13,

    paddingHorizontal: 17,
    paddingVertical: 16,

    marginBottom: 13,

    borderWidth: 1,
    borderColor: '#202121',
  },

  workoutTitle: {
    color: '#F1F1F1',

    fontSize: 19,

    fontWeight: '800',

    marginBottom: 8,
  },

  workoutTime: {
    color: '#BDBDBD',

    fontSize: 14,

    fontWeight: '500',
  },

  routineButton: {
    position: 'absolute',

    right: 15,
    bottom: 11,

    height: 42,

    paddingHorizontal: 19,

    borderRadius: 9,

    backgroundColor: SportGymColors.primary,

    alignItems: 'center',
    justifyContent: 'center',
  },

  routineButtonText: {
    color: '#FFFFFF',

    fontSize: 14,

    fontWeight: '800',
  },

  // =======================================================
  // PROGRESO
  // =======================================================

  progressCard: {
    minHeight: 129,

    backgroundColor: '#1B1C1C',

    borderRadius: 13,

    paddingHorizontal: 16,
    paddingVertical: 16,

    borderWidth: 1,
    borderColor: '#202121',
  },

  progressContent: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',
  },

  progressIconContainer: {
    width: 48,
    height: 48,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 16,
  },

  weightContainer: {
    flex: 1,
  },

  weightRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 6,
  },

  weight: {
    color: '#F0F0F0',

    fontSize: 19,

    fontWeight: '800',
  },

  weightChangeRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingRight: 2,
  },

  sinceText: {
    color: '#AFAFAF',

    fontSize: 13,

    fontWeight: '500',
  },

  weightChange: {
    color: SportGymColors.primary,

    fontSize: 15,

    fontWeight: '800',
  },

  // =======================================================
  // ESPACIO FINAL
  // =======================================================

  bottomSpace: {
    height: 18,
  },

  // =======================================================
  // NAVIGATION
  // =======================================================

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
    color: '#8D8D8D',

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

  pressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  buttonPressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.97,
      },
    ],
  },
});