import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { useAuth } from '../contexts/AuthContext';
import { registerAttendance, useAttendance } from '../lib/attendance';

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición';

const parseMembershipDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);

  if (
    dateOnly &&
    (date.getFullYear() !== Number(dateOnly[1]) ||
      date.getMonth() !== Number(dateOnly[2]) - 1 ||
      date.getDate() !== Number(dateOnly[3]))
  ) {
    return null;
  }

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatMembershipDate = (date: Date | null) =>
  date?.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) ?? '—';

const getCalendarDayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const millisecondsPerDay = 1000 * 60 * 60 * 24;
const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const getCurrentWeekDates = () => {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
};

export default function HomeView() {
  const [activeTab, setActiveTab] = useState<TabName>('Inicio');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { user } = useAuth();
  const { hasAttendance, currentStreak, weekTotal, bestStreak } = useAttendance(
    user?.username ?? null,
  );
  const weekDates = getCurrentWeekDates();
  const membership = user?.membership ?? null;
  const membershipStartDate = parseMembershipDate(membership?.startDate ?? null);
  const membershipEndDate = parseMembershipDate(membership?.endDate ?? null);
  const today = new Date();
  const daysUntilExpiration = membershipEndDate
    ? Math.floor(
        (getCalendarDayNumber(membershipEndDate) -
          getCalendarDayNumber(today)) /
          millisecondsPerDay,
      )
    : null;
  const membershipExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const membershipActive =
    membershipEndDate !== null &&
    !membershipExpired &&
    (!membershipStartDate ||
      getCalendarDayNumber(today) >= getCalendarDayNumber(membershipStartDate));
  const membershipStatus = !membership
    ? 'Sin membresía'
    : !membershipEndDate
      ? 'Sin vigencia'
      : membershipExpired
        ? 'Vencida'
        : membershipActive
          ? 'Activa'
          : 'Por iniciar';
  const membershipDaysRemaining =
    daysUntilExpiration === null ? null : Math.max(0, daysUntilExpiration);

  const handleTabPress = (tab: TabName) => {
    setActiveTab(tab);

    switch (tab) {
      case 'Inicio':
        router.push('/(tabs)');
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
    }
  };

  const handleScan = ({ data }: { data: string }) => {
    registerAttendance(user?.username ?? null);
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
              <View style={styles.greetingContainer}>
                <ThemedText style={styles.greeting}>
                  ¡Hola,
                  {'\n'}
                  {user?.firstName || 'Usuario'}!{' '}
                  <ThemedText style={styles.wave}>👋</ThemedText>
                </ThemedText>
                <ThemedText style={styles.greetingSubtitle}>
                  ¿Listo para entrenar hoy?
                </ThemedText>
              </View>
              <View style={styles.headerActions}>
                <View
                  style={styles.notificationButton}
                  accessible
                  accessibilityLabel="Notificaciones"
                >
                  <Ionicons
                    name="notifications"
                    size={19}
                    color={SportGymColors.primary}
                  />
                </View>
                <Pressable
                  style={styles.profileButton}
                  onPress={() => router.push('/(tabs)/profile')}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir perfil"
                >
                  <Ionicons
                    name="person"
                    size={17}
                    color={SportGymColors.primary}
                  />
                  <ThemedText style={styles.profileButtonLabel}>
                    Perfil
                  </ThemedText>
                </Pressable>
              </View>
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
                  {membership?.plan || (membership ? 'Membresía' : 'Sin membresía')}
                </ThemedText>

                <ThemedText
                  style={[
                    styles.activeText,
                    membershipExpired && styles.expiredText,
                    !membershipActive &&
                      !membershipExpired &&
                      styles.inactiveMembershipText,
                  ]}
                >
                  {membershipStatus}
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
                  {membershipDaysRemaining === null
                    ? 'Sin días restantes'
                    : `${membershipDaysRemaining} días restantes`}
                </ThemedText>
              </View>
            </View>

            {/* ================================================= */}
            {/* RACHA DE ASISTENCIAS */}
            {/* ================================================= */}

            <View style={styles.streakCard}>
              <View style={styles.streakHeader}>
                <Ionicons name="flame" size={28} color="#E45A32" />
                <View style={styles.streakCopy}>
                  <ThemedText style={styles.streakTitle}>
                    Tu racha de asistencia
                  </ThemedText>
                  <ThemedText style={styles.streakCount}>
                    {currentStreak} {currentStreak === 1 ? 'día' : 'días'} seguidos
                  </ThemedText>
                </View>
              </View>

              <View style={styles.weekDays}>
                {weekDates.map((date, index) => {
                  const attended = hasAttendance(date);
                  const isToday =
                    getCalendarDayNumber(date) === getCalendarDayNumber(today);

                  return (
                    <View key={weekdayLabels[index]} style={styles.weekDay}>
                      <ThemedText style={styles.weekDayLabel}>
                        {weekdayLabels[index]}
                      </ThemedText>
                      <View
                        style={[
                          styles.weekDayIndicator,
                          attended && styles.attendedDay,
                          isToday && !attended && styles.todayDay,
                        ]}
                        accessibilityLabel={
                          attended
                            ? `${weekdayLabels[index]}: asistencia registrada`
                            : isToday
                              ? `${weekdayLabels[index]}: hoy`
                              : `${weekdayLabels[index]}: sin asistencia`
                        }
                      >
                        {attended && (
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        )}
                        {isToday && !attended && <View style={styles.todayDot} />}
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.streakEncouragement}>
                <ThemedText style={styles.streakEncouragementTitle}>
                  ¡Sigue así!
                </ThemedText>
                <ThemedText style={styles.streakEncouragementText}>
                  Cada visita te acerca a tus metas.
                </ThemedText>
              </View>

              <View style={styles.streakStats}>
                <View style={styles.streakStat}>
                  <Ionicons
                    name="calendar"
                    size={21}
                    color={SportGymColors.primary}
                  />
                  <View>
                    <ThemedText style={styles.streakStatLabel}>
                      Esta semana
                    </ThemedText>
                    <ThemedText style={styles.streakStatValue}>
                      {weekTotal} {weekTotal === 1 ? 'día' : 'días'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.streakStat}>
                  <Ionicons name="trophy" size={21} color="#D69B23" />
                  <View>
                    <ThemedText style={styles.streakStatLabel}>
                      Mejor racha
                    </ThemedText>
                    <ThemedText style={styles.streakStatValue}>
                      {bestStreak} {bestStreak === 1 ? 'día' : 'días'}
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

          </View>

          <Pressable
            style={({ pressed }) => [
              styles.chatbotButton,
              pressed && styles.chatbotButtonPressed,
            ]}
            onPress={() => router.push('/chatbot')}
            accessibilityRole="button"
            accessibilityLabel="Abrir chat con Sporti"
          >
            <MaterialCommunityIcons
              name="robot-happy-outline"
              size={32}
              color="#FFFFFF"
            />
          </Pressable>

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  greetingContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexShrink: 0,
  },

  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileButton: {
    minWidth: 68,
    height: 36,
    paddingHorizontal: 9,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: SportGymColors.primary,
  },

  profileButtonLabel: {
    color: '#F2F2F2',
    fontSize: 12,
    fontWeight: '700',
  },

  greeting: {
    color: '#F2F2F2',
    fontSize: 22,
    lineHeight: 27,
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

  inactiveMembershipText: {
    color: '#777777',
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

  streakCard: {
    backgroundColor: '#F4F4F4',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },

  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  streakCopy: {
    marginLeft: 9,
  },

  streakTitle: {
    color: '#151515',
    fontSize: 15,
    fontWeight: '800',
  },

  streakCount: {
    color: SportGymColors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  weekDays: {
    flexDirection: 'row',
    marginBottom: 13,
  },

  weekDay: {
    flex: 1,
    alignItems: 'center',
  },

  weekDayLabel: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },

  weekDayIndicator: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8D8D8',
  },

  attendedDay: {
    backgroundColor: SportGymColors.primary,
  },

  todayDay: {
    backgroundColor: '#D92D55',
  },

  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  streakEncouragement: {
    alignItems: 'center',
    marginBottom: 14,
  },

  streakEncouragementTitle: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
  },

  streakEncouragementText: {
    color: '#555555',
    fontSize: 12,
    marginTop: 3,
  },

  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DEDEDE',
  },

  streakStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  streakStatLabel: {
    color: '#555555',
    fontSize: 11,
  },

  streakStatValue: {
    color: '#171717',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
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

  chatbotButton: {
    position: 'absolute',
    right: 18,
    bottom: 88,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D92D55',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },

  chatbotButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
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