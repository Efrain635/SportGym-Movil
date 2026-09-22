import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición' | 'Perfil';

const membershipStartDate = new Date(2026, 7, 25);
const membershipEndDate = new Date(2026, 8, 25);

const formatMembershipDate = (date: Date) =>
  date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getMembershipDaysRemaining = () => {
  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    0,
    Math.ceil(
      (membershipEndDate.getTime() - todayAtMidnight.getTime()) /
        millisecondsPerDay,
    ),
  );
};

const isMembershipExpired = () => {
  const today = new Date();
  const todayAtMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return todayAtMidnight.getTime() >= membershipEndDate.getTime();
};

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<TabName>('Inicio');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const membershipDaysRemaining = getMembershipDaysRemaining();
  const membershipExpired = isMembershipExpired();

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    switch (tab) {
      case 'Inicio':
        router.navigate('/(tabs)/index' as any);
        break;
      case 'Rutina':
        router.push('/(tabs)/routine');
        break;
      case 'Tienda':
        router.push('/(tabs)/store');
        break;
      case 'Nutrición':
        router.push('/(tabs)/nutrition');
        break;
      case 'Perfil':
        router.push('/(tabs)/profile');
        break;
    }
  };

  const handleScan = ({ data }: { data: string }) => {
    setIsScannerVisible(false);
    Alert.alert('Asistencia registrada', 'Tu entrada al gimnasio fue registrada correctamente.');
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
            {/* ASISTENCIA */}
            {/* ================================================= */}

            <View style={styles.attendanceCard}>
              <View style={styles.attendanceCopy}>
                <ThemedText style={styles.attendanceTitle}>
                  REGISTRA TU ASISTENCIA
                </ThemedText>
                <ThemedText style={styles.attendanceDescription}>
                  Escanea el código QR en el gimnasio para registrar tu entrada
                </ThemedText>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.scanButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsScannerVisible(true)}
              >
                <Ionicons name="qr-code-outline" size={19} color="#FFFFFF" />
                <ThemedText style={styles.scanButtonText}>
                  ESCANEAR QR
                </ThemedText>
              </Pressable>
            </View>

            {/* ================================================= */}
            {/* MEMBRESÍA */}
            {/* ================================================= */}

            <View style={styles.membershipCard}>
              <View style={styles.membershipTopRow}>
                <ThemedText style={styles.membershipLabel}>
                  Membresía
                </ThemedText>
              </View>

              <View style={styles.membershipMainRow}>
                <ThemedText style={styles.membershipTypeText}>
                  Mensual
                </ThemedText>

                <ThemedText
                  style={[
                    styles.activeText,
                    membershipExpired && styles.expiredText,
                  ]}
                >
                  {membershipExpired ? 'Vencida' : 'Activa'}
                </ThemedText>
              </View>

              <View style={styles.membershipDatesRow}>
                <View style={styles.membershipDateRow}>
                  <ThemedText style={styles.membershipDateLabel}>
                    Inicio
                  </ThemedText>
                  <ThemedText style={styles.membershipDateText}>
                    {formatMembershipDate(membershipStartDate)}
                  </ThemedText>
                </View>

                <View style={styles.membershipDateRow}>
                  <ThemedText style={styles.membershipDateLabel}>
                    Vencimiento
                  </ThemedText>
                  <ThemedText style={styles.membershipDateText}>
                    {formatMembershipDate(membershipEndDate)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.remainingRow}>
                <View style={styles.remainingIcon}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={SportGymColors.primary}
                  />
                </View>

                <ThemedText style={styles.remainingText}>
                  {membershipDaysRemaining} días restantes
                </ThemedText>
              </View>
            </View>

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
              label="Tienda"
              icon="flask-outline"
              activeIcon="flask"
              active={activeTab === 'Tienda'}
              onPress={() => handleTabPress('Tienda')}
            />

            <BottomTab
              label="Nutrición"
              icon="nutrition-outline"
              activeIcon="nutrition"
              active={activeTab === 'Nutrición'}
              onPress={() => handleTabPress('Nutrición')}
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

      <Modal
        visible={isScannerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsScannerVisible(false)}
      >
        <View style={styles.scannerScreen}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleScan}
            />
          ) : (
            <View style={styles.permissionContent}>
              <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
              <Text style={styles.permissionTitle}>Permiso de cámara</Text>
              <Text style={styles.permissionText}>
                Necesitamos acceso a tu cámara para escanear el código QR.
              </Text>
              <Pressable
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>PERMITIR CÁMARA</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={styles.closeScannerButton}
            onPress={() => setIsScannerVisible(false)}
            accessibilityLabel="Cerrar escáner"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {permission?.granted && (
            <View style={styles.scannerHint}>
              <Text style={styles.scannerHintText}>
                Apunta al código QR de asistencia
              </Text>
            </View>
          )}
        </View>
      </Modal>
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
  // ASISTENCIA
  // =======================================================

  attendanceCard: {
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#292A2A',
  },

  attendanceCopy: {
    marginBottom: 13,
  },

  attendanceTitle: {
    color: '#F2F2F2',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },

  attendanceDescription: {
    color: '#BDBDBD',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  scanButton: {
    height: 43,
    borderRadius: 9,
    backgroundColor: '#4C9A3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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

  membershipTypeText: {
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

  membershipDatesRow: {
    marginBottom: 15,
  },

  membershipDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  membershipDateLabel: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '500',
    width: 90,
  },

  membershipDateText: {
    color: '#5C5C5C',
    fontSize: 14,
    fontWeight: '600',
  },

  expiredText: {
    color: '#C74747',
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

  scannerScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },

  permissionText: {
    color: '#C4C4C4',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },

  permissionButton: {
    backgroundColor: '#4C9A3A',
    borderRadius: 9,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  closeScannerButton: {
    position: 'absolute',
    top: 55,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },

  scannerHint: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
    paddingVertical: 13,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },

  scannerHintText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
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