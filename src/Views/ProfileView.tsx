import { ThemedText } from '@/components/themed-text';
import { SportGymColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, signOut } from '../../FirebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAttendance } from '../lib/attendance';

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición' | 'Perfil';
type ProfileSection = 'data' | 'membership' | 'attendance';

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const heatmapWeeks = 16;

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

const getMembershipStatus = (
  startDate: Date | null,
  endDate: Date | null,
  hasMembership: boolean,
) => {
  if (!hasMembership) {
    return 'Sin membresía';
  }
  if (!endDate) {
    return 'Sin vigencia';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (endDate < today) {
    return 'Vencida';
  }
  if (startDate && startDate > today) {
    return 'Por iniciar';
  }

  return 'Activa';
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const sundayBasedDay = result.getDay();
  const daysSinceMonday = (sundayBasedDay + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);
  return result;
};

const createHeatmapWeeks = () => {
  const currentWeek = startOfWeek(new Date());
  const firstDay = new Date(currentWeek);
  firstDay.setDate(firstDay.getDate() - (heatmapWeeks - 1) * 7);

  return Array.from({ length: heatmapWeeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, weekdayIndex) => {
      const date = new Date(firstDay.getTime());
      date.setDate(firstDay.getDate() + weekIndex * 7 + weekdayIndex);
      return date;
    }),
  );
};

export default function ProfileView() {
  const { user, setUser } = useAuth();
  const { hasAttendance, total: totalAttendances, weekTotal } = useAttendance(
    user?.username ?? null,
  );
  const [activeTab, setActiveTab] = useState<TabName>('Perfil');
  const [expandedSection, setExpandedSection] =
    useState<ProfileSection | null>('attendance');
  const fullName = [user?.firstName, user?.lastName]
    .filter((name) => name?.trim())
    .join(' ');
  const displayName = fullName || user?.username || 'Usuario';
  const membership = user?.membership;
  const membershipStartDate = parseMembershipDate(membership?.startDate ?? null);
  const membershipEndDate = parseMembershipDate(membership?.endDate ?? null);
  const membershipStatus = getMembershipStatus(
    membershipStartDate,
    membershipEndDate,
    Boolean(membership),
  );

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
      case 'Perfil':
        router.push('/(tabs)/profile');
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>

          {/* ========================================= */}
          {/* HEADER */}
          {/* ========================================= */}

          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color="#D8D8D8"
              />
            </Pressable>

            <ThemedText style={styles.headerTitle}>
              Perfil
            </ThemedText>

            {/* Espacio para centrar el título */}
            <View style={styles.headerRightSpace} />
          </View>

          {/* ========================================= */}
          {/* CONTENIDO DEL PERFIL */}
          {/* ========================================= */}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.profileContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <ThemedText style={styles.avatarInitials}>
                  {displayName.slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>

              <ThemedText style={styles.profileName}>
                {displayName}
              </ThemedText>

              <ThemedText style={styles.profileUsername}>
                @{user?.username || 'usuario'}
              </ThemedText>

              <ThemedText style={styles.profileEmail}>
                {user?.email || 'Correo no registrado'}
              </ThemedText>
            </View>

            <View style={styles.menuCard}>
              <ProfileMenuItem
                icon="person-outline"
                label="Mis datos"
                expanded={expandedSection === 'data'}
                onPress={() =>
                  setExpandedSection(expandedSection === 'data' ? null : 'data')
                }
              />
              {expandedSection === 'data' && (
                <View style={styles.infoCard}>
                  <InfoRow label="Nombre" value={displayName} />
                  <InfoRow label="Usuario" value={user?.username || '—'} />
                  <InfoRow label="Correo" value={user?.email || '—'} />
                  <InfoRow label="Teléfono" value={user?.phone || '—'} />
                </View>
              )}

              <ProfileMenuItem
                icon="card-outline"
                label="Mi membresía"
                expanded={expandedSection === 'membership'}
                onPress={() =>
                  setExpandedSection(
                    expandedSection === 'membership' ? null : 'membership',
                  )
                }
              />
              {expandedSection === 'membership' && (
                <View style={styles.infoCard}>
                  <InfoRow label="Plan" value={membership?.plan || 'Sin membresía'} />
                  <InfoRow
                    label="Estado"
                    value={membershipStatus}
                    accent={membershipStatus === 'Activa'}
                  />
                  <InfoRow
                    label="Inicio"
                    value={formatMembershipDate(membershipStartDate)}
                  />
                  <InfoRow
                    label="Vence"
                    value={formatMembershipDate(membershipEndDate)}
                  />
                </View>
              )}

              <ProfileMenuItem
                icon="stats-chart-outline"
                label="Mi progreso"
                expanded={expandedSection === 'attendance'}
                onPress={() =>
                  setExpandedSection(
                    expandedSection === 'attendance' ? null : 'attendance',
                  )
                }
              />
              {expandedSection === 'attendance' && (
                <View style={styles.progressSummary}>
                  <ThemedText style={styles.progressText}>
                    {weekTotal} {weekTotal === 1 ? 'asistencia esta semana' : 'asistencias esta semana'}
                  </ThemedText>
                </View>
              )}
            </View>

            {expandedSection === 'attendance' && (
              <AttendanceCalendar
                hasAttendance={hasAttendance}
                totalAttendances={totalAttendances}
              />
            )}

            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <ThemedText style={styles.logoutButtonText}>
                Cerrar Sesión
              </ThemedText>
            </Pressable>

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
    </View>
  );
}

type ProfileMenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  expanded: boolean;
  onPress: () => void;
};

function ProfileMenuItem({
  icon,
  label,
  expanded,
  onPress,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
    >
      <Ionicons name={icon} size={19} color="#252525" />
      <ThemedText style={styles.menuItemLabel}>{label}</ThemedText>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={18}
        color="#555555"
      />
    </Pressable>
  );
}

function InfoRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={[styles.infoValue, accent && styles.activeValue]}>
        {value}
      </ThemedText>
    </View>
  );
}

type AttendanceCalendarProps = {
  hasAttendance: (date: Date) => boolean;
  totalAttendances: number;
};

function AttendanceCalendar({
  hasAttendance,
  totalAttendances,
}: AttendanceCalendarProps) {
  const weeks = createHeatmapWeeks();

  return (
    <View style={styles.attendanceCard}>
      <View style={styles.attendanceHeader}>
        <View>
          <ThemedText style={styles.attendanceTitle}>
            Calendario de asistencias
          </ThemedText>
          <ThemedText style={styles.attendanceSubtitle}>
            {totalAttendances} {totalAttendances === 1 ? 'día registrado' : 'días registrados'}
          </ThemedText>
        </View>
        <Ionicons name="calendar-outline" size={22} color={SportGymColors.primary} />
      </View>

      <View style={styles.heatmap}>
        <View style={styles.weekdayLabels}>
          {weekdayLabels.map((label) => (
            <ThemedText key={label} style={styles.weekdayLabel}>
              {label}
            </ThemedText>
          ))}
        </View>

        <View style={styles.weekColumns}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekColumn}>
              {week.map((date) => {
                const registered = hasAttendance(date);

                return (
                  <View
                    key={date.toISOString()}
                    style={[
                      styles.dayCell,
                      registered ? styles.dayCellRegistered : styles.dayCellEmpty,
                    ]}
                    accessibilityLabel={`${date.toLocaleDateString('es-MX')}: ${
                      registered ? 'asistencia registrada' : 'sin asistencia'
                    }`}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.calendarLegend}>
        <ThemedText style={styles.legendText}>Sin asistencia</ThemedText>
        <View style={[styles.legendCell, styles.dayCellEmpty]} />
        <ThemedText style={styles.legendText}>Registrada</ThemedText>
        <View style={[styles.legendCell, styles.dayCellRegistered]} />
      </View>
    </View>
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

  // ===================================================
  // CONTENIDO
  // ===================================================

  scroll: {
    flex: 1,
  },

  profileContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 15,
  },

  // ===================================================
  // TARJETA DE PERFIL
  // ===================================================

  profileCard: {
    backgroundColor: '#1B1C1C',

    borderRadius: 15,

    paddingHorizontal: 20,
    paddingVertical: 25,

    marginBottom: 13,

    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#202121',
  },

  avatarContainer: {
    width: 100,
    height: 100,

    borderRadius: 50,

    backgroundColor: '#151616',
    borderWidth: 2,
    borderColor: SportGymColors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 15,
  },

  avatarInitials: {
    color: SportGymColors.primary,
    fontSize: 38,
    fontWeight: '800',
  },

  profileName: {
    color: '#F2F2F2',

    fontSize: 22,

    fontWeight: '800',

    marginBottom: 5,
  },

  profileUsername: {
    color: SportGymColors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },

  profileEmail: {
    color: '#AFAFAF',

    fontSize: 14,

    fontWeight: '500',

    marginBottom: 0,
  },

  menuCard: {
    marginBottom: 13,
    gap: 8,
  },

  menuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 13,
  },

  menuItemPressed: {
    opacity: 0.82,
  },

  menuItemLabel: {
    flex: 1,
    color: '#222222',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },

  progressSummary: {
    backgroundColor: '#1B1C1C',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  progressText: {
    color: '#AFAFAF',
    fontSize: 13,
  },

  // ===================================================
  // TARJETA DE INFORMACIÓN
  // ===================================================

  infoCard: {
    backgroundColor: '#1B1C1C',

    borderRadius: 15,

    paddingHorizontal: 20,
    paddingVertical: 20,

    marginBottom: 13,

    borderWidth: 1,
    borderColor: '#202121',
  },

  infoRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 12,
  },

  infoLabel: {
    color: '#AFAFAF',

    fontSize: 14,

    fontWeight: '500',
  },

  infoValue: {
    color: '#F2F2F2',

    fontSize: 15,

    fontWeight: '700',
  },

  activeValue: {
    color: '#59B83C',
  },

  attendanceCard: {
    backgroundColor: '#1B1C1C',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#202121',
  },

  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },

  attendanceTitle: {
    color: '#F2F2F2',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  attendanceSubtitle: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '500',
  },

  heatmap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  weekdayLabels: {
    width: 17,
    gap: 5,
    marginRight: 7,
  },

  weekdayLabel: {
    height: 13,
    color: '#858585',
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
  },

  weekColumns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  weekColumn: {
    gap: 5,
  },

  dayCell: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },

  dayCellEmpty: {
    backgroundColor: '#4A4D4B',
  },

  dayCellRegistered: {
    backgroundColor: '#59B83C',
  },

  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 15,
  },

  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 3,
  },

  legendText: {
    color: '#858585',
    fontSize: 10,
    fontWeight: '500',
  },

  // ===================================================
  // BOTÓN DE CERRAR SESIÓN
  // ===================================================

  logoutButton: {
    height: 45,

    borderRadius: 12,

    backgroundColor: '#FF4444',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
  },

  logoutButtonText: {
    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '700',
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