import { ThemedText } from '@/components/themed-text';
import { SportGymColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, signOut } from '../../FirebaseConfig';
import {
  getClientWorkoutProgress,
  updateClientPersonalData,
} from '../../assets/database/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAttendance } from '../lib/attendance';

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición' | 'Perfil';
type ProfileSection = 'data' | 'membership' | 'progress';
type ProfileDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender: string;
  weight: string;
  height: string;
  level: 'principiante' | 'intermedio' | 'avanzado' | undefined;
};
type ProfileFieldErrors = Partial<Record<keyof ProfileDraft, string>>;

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const heatmapWeeks = 16;
const exerciseAchievements = [
  { threshold: 1, title: 'Primer ejercicio', icon: 'flash-outline' as const },
  { threshold: 10, title: 'En movimiento', icon: 'fitness-outline' as const },
  { threshold: 25, title: 'Constancia', icon: 'medal-outline' as const },
  { threshold: 50, title: 'Imparable', icon: 'trophy-outline' as const },
  { threshold: 100, title: 'Centenario', icon: 'ribbon-outline' as const },
];

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

const getAge = (birthDate: string) => {
  const date = parseMembershipDate(birthDate);
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) {
    age -= 1;
  }
  return age > 0 ? age : null;
};

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
    useState<ProfileSection | null>('progress');
  const [workoutProgress, setWorkoutProgress] = useState({
    totalExercises: 0,
    totalWorkouts: 0,
  });
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ProfileFieldErrors>({});
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    birthDate: user?.birthDate?.slice(0, 10) ?? '',
    gender: user?.gender ?? '',
    weight: user?.weight?.toString() ?? '',
    height: user?.height?.toString() ?? '',
    level: user?.level,
  }));
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
  const bodyMassIndex = user?.weight && user.height
    ? user.weight / ((user.height / 100) ** 2)
    : null;

  useEffect(() => {
    let isActive = true;
    const clientId = user?.clientId;
    if (!clientId) {
      setWorkoutProgress({ totalExercises: 0, totalWorkouts: 0 });
      setIsLoadingProgress(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingProgress(true);
    setProgressError(false);
    getClientWorkoutProgress(clientId)
      .then((progress) => {
        if (isActive) setWorkoutProgress(progress);
      })
      .catch((error) => {
        console.error('Error al cargar progreso de ejercicios:', error);
        if (isActive) setProgressError(true);
      })
      .finally(() => {
        if (isActive) setIsLoadingProgress(false);
      });

    return () => {
      isActive = false;
    };
  }, [user?.clientId]);

  const updateDraft = <K extends keyof ProfileDraft>(
    field: K,
    value: ProfileDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSavePersonalData = async () => {
    const activeUser = user;
    if (!activeUser?.clientId) {
      Alert.alert('No se pudo guardar', 'Vuelve a iniciar sesión para editar tus datos.');
      return;
    }

    const weightText = draft.weight.trim();
    const heightText = draft.height.trim();
    const weight = weightText ? Number(weightText.replace(',', '.')) : null;
    const height = heightText ? Number(heightText.replace(',', '.')) : null;
    const birthDate = draft.birthDate.trim() || null;
    const errors: ProfileFieldErrors = {};

    if (draft.firstName.trim().length < 2) {
      errors.firstName = 'Escribe al menos 2 caracteres.';
    }
    const phoneDigits = draft.phone.replace(/\D/g, '');
    if (phoneDigits.length > 0 && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      errors.phone = 'Usa un teléfono de 7 a 15 dígitos.';
    }
    if (weightText && (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(weightText) || weight === null || weight < 20 || weight > 400)) {
      errors.weight = 'Ingresa un valor entre 20 y 400 kg.';
    }
    if (heightText && (!/^\d{3}(?:[.,]\d)?$/.test(heightText) || height === null || height < 100 || height > 250)) {
      errors.height = 'Ingresa una estatura entre 100 y 250 cm.';
    }
    if (birthDate) {
      const parsedBirthDate = parseMembershipDate(birthDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !parsedBirthDate) {
        errors.birthDate = 'Usa el formato AAAA-MM-DD y una fecha válida.';
      } else if (parsedBirthDate > today) {
        errors.birthDate = 'La fecha no puede ser posterior a hoy.';
      }
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingData(true);
    try {
      await updateClientPersonalData(activeUser.clientId, {
        ...draft,
        phone: draft.phone,
        birthDate,
        weight,
        height,
      });
      setUser({
        ...activeUser,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim() || null,
        birthDate,
        gender: draft.gender.trim() || null,
        weight,
        height,
        age: birthDate ? getAge(birthDate) : null,
        level: draft.level,
      });
      setIsEditingData(false);
      Alert.alert('Datos actualizados', 'Tus cambios se guardaron correctamente.');
    } catch (error) {
      console.error('Error al actualizar datos del perfil:', error);
      Alert.alert('No se pudo guardar', 'Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSavingData(false);
    }
  };

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
                  <View style={styles.editHeader}>
                    <ThemedText style={styles.editTitle}>Datos personales</ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (isEditingData) {
                          setValidationErrors({});
                          setDraft({
                            firstName: user?.firstName ?? '',
                            lastName: user?.lastName ?? '',
                            phone: user?.phone ?? '',
                            birthDate: user?.birthDate?.slice(0, 10) ?? '',
                            gender: user?.gender ?? '',
                            weight: user?.weight?.toString() ?? '',
                            height: user?.height?.toString() ?? '',
                            level: user?.level,
                          });
                        }
                        setIsEditingData(!isEditingData);
                      }}
                      style={styles.editButton}
                    >
                      <Ionicons name={isEditingData ? 'close' : 'create-outline'} size={17} color={SportGymColors.primary} />
                      <ThemedText style={styles.editButtonText}>{isEditingData ? 'Cancelar' : 'Editar'}</ThemedText>
                    </Pressable>
                  </View>

                  {isEditingData ? (
                    <>
                      <ProfileInput label="Nombre" value={draft.firstName} onChangeText={(value) => updateDraft('firstName', value)} maxLength={40} error={validationErrors.firstName} />
                      <ProfileInput label="Apellido" value={draft.lastName} onChangeText={(value) => updateDraft('lastName', value)} maxLength={50} />
                      <InfoRow label="Usuario" value={user?.username || '—'} />
                      <InfoRow label="Correo" value={user?.email || '—'} />
                      <ProfileInput label="Teléfono" value={draft.phone} onChangeText={(value) => updateDraft('phone', value)} keyboardType="phone-pad" maxLength={18} error={validationErrors.phone} />
                      <ProfileInput label="Fecha de nacimiento" value={draft.birthDate} onChangeText={(value) => updateDraft('birthDate', value)} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} error={validationErrors.birthDate} />
                      <ProfileInput label="Género" value={draft.gender} onChangeText={(value) => updateDraft('gender', value)} maxLength={30} />
                      <ProfileInput label="Peso (kg)" value={draft.weight} onChangeText={(value) => updateDraft('weight', value)} keyboardType="decimal-pad" maxLength={6} error={validationErrors.weight} />
                      <ProfileInput label="Estatura (cm)" value={draft.height} onChangeText={(value) => updateDraft('height', value)} keyboardType="decimal-pad" maxLength={6} error={validationErrors.height} />
                      <ThemedText style={styles.inputLabel}>Nivel de actividad</ThemedText>
                      <View style={styles.levelOptions}>
                        {(['principiante', 'intermedio', 'avanzado'] as const).map((level) => (
                          <Pressable
                            key={level}
                            accessibilityRole="button"
                            accessibilityState={{ selected: draft.level === level }}
                            onPress={() => updateDraft('level', level)}
                            style={[styles.levelOption, draft.level === level && styles.levelOptionSelected]}
                          >
                            <ThemedText style={[styles.levelOptionText, draft.level === level && styles.levelOptionTextSelected]}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isSavingData}
                        onPress={handleSavePersonalData}
                        style={[styles.saveButton, isSavingData && styles.disabledButton]}
                      >
                        <ThemedText style={styles.saveButtonText}>{isSavingData ? 'Guardando...' : 'Guardar cambios'}</ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <InfoRow label="Nombre" value={displayName} />
                      <InfoRow label="Usuario" value={user?.username || '—'} />
                      <InfoRow label="Correo" value={user?.email || '—'} />
                      <InfoRow label="Teléfono" value={user?.phone || '—'} />
                      <InfoRow label="Fecha de nacimiento" value={formatMembershipDate(parseMembershipDate(user?.birthDate ?? null))} />
                      <InfoRow label="Edad" value={user?.age ? `${user.age} años` : '—'} />
                      <InfoRow label="Género" value={user?.gender || '—'} />
                      <InfoRow label="Peso" value={user?.weight ? `${user.weight} kg` : '—'} />
                      <InfoRow label="Estatura" value={user?.height ? `${user.height} cm` : '—'} />
                      <InfoRow label="Nivel de actividad" value={user?.level || '—'} />
                    </>
                  )}
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
                expanded={expandedSection === 'progress'}
                onPress={() =>
                  setExpandedSection(
                    expandedSection === 'progress' ? null : 'progress',
                  )
                }
              />
              {expandedSection === 'progress' && (
                <View style={styles.progressSummary}>
                  <View style={styles.exerciseProgressHero}>
                    <ThemedText style={styles.exerciseProgressNumber}>
                      {isLoadingProgress || progressError ? '—' : workoutProgress.totalExercises}
                    </ThemedText>
                    <ThemedText style={styles.exerciseProgressLabel}>
                      ejercicios completados
                    </ThemedText>
                    <ThemedText style={styles.workoutCount}>
                      {isLoadingProgress ? 'Consultando entrenamientos...' : `${workoutProgress.totalWorkouts} ${workoutProgress.totalWorkouts === 1 ? 'entrenamiento' : 'entrenamientos'}`}
                    </ThemedText>
                  </View>
                  {progressError && (
                    <ThemedText style={styles.progressText}>
                      No se pudo cargar tu progreso. Inténtalo de nuevo más tarde.
                    </ThemedText>
                  )}
                  <ThemedText style={styles.achievementHeading}>Logros</ThemedText>
                  {!isLoadingProgress && !progressError && (
                    <View style={styles.achievementList}>
                      {exerciseAchievements.map((achievement) => {
                      const unlocked = workoutProgress.totalExercises >= achievement.threshold;
                      return (
                        <View key={achievement.threshold} style={styles.achievementRow}>
                          <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}>
                            <Ionicons
                              name={achievement.icon}
                              size={19}
                              color={unlocked ? SportGymColors.primary : '#777777'}
                            />
                          </View>
                          <View style={styles.achievementCopy}>
                            <ThemedText style={styles.achievementTitle}>{achievement.title}</ThemedText>
                            <ThemedText style={styles.achievementDescription}>
                              {achievement.threshold} {achievement.threshold === 1 ? 'ejercicio' : 'ejercicios'}
                            </ThemedText>
                          </View>
                          <Ionicons
                            name={unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
                            size={18}
                            color={unlocked ? SportGymColors.primary : '#777777'}
                          />
                        </View>
                      );
                      })}
                    </View>
                  )}
                  <View style={styles.progressDivider} />
                  <InfoRow label="Peso actual" value={user?.weight ? `${user.weight} kg` : 'Sin registro'} />
                  <InfoRow label="IMC" value={bodyMassIndex ? bodyMassIndex.toFixed(1) : 'Sin datos'} />
                  <ThemedText style={styles.progressText}>
                    {weekTotal} {weekTotal === 1 ? 'asistencia esta semana' : 'asistencias esta semana'}
                  </ThemedText>
                </View>
              )}
            </View>

            {expandedSection === 'progress' && (
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

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'decimal-pad' | 'numbers-and-punctuation';
  maxLength?: number;
  error?: string;
}) {
  return (
    <View style={styles.profileInputGroup}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777777"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
        maxLength={maxLength}
        style={styles.profileInput}
        selectionColor={SportGymColors.primary}
      />
      {error ? <ThemedText style={styles.inputError}>{error}</ThemedText> : null}
    </View>
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

  exerciseProgressHero: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#343636',
  },

  exerciseProgressNumber: {
    color: SportGymColors.primary,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },

  exerciseProgressLabel: {
    color: '#F2F2F2',
    fontSize: 14,
    fontWeight: '700',
  },

  workoutCount: {
    color: '#AFAFAF',
    fontSize: 12,
    marginTop: 4,
  },

  achievementHeading: {
    color: '#F2F2F2',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  achievementList: {
    gap: 6,
    marginBottom: 12,
  },

  achievementRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: '#141616',
  },

  achievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#242626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  achievementIconUnlocked: {
    backgroundColor: '#253522',
  },

  achievementCopy: {
    flex: 1,
  },

  achievementTitle: {
    color: '#EDEDED',
    fontSize: 13,
    fontWeight: '700',
  },

  achievementDescription: {
    color: '#AFAFAF',
    fontSize: 11,
    marginTop: 2,
  },

  progressDivider: {
    height: 1,
    backgroundColor: '#343636',
    marginVertical: 8,
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

    paddingHorizontal: 17,
    paddingVertical: 18,

    marginBottom: 13,

    borderWidth: 1,
    borderColor: '#202121',
  },

  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  editTitle: {
    color: '#F2F2F2',
    fontSize: 15,
    fontWeight: '700',
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
  },

  editButtonText: {
    color: SportGymColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  profileInputGroup: {
    marginBottom: 15,
  },

  inputLabel: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },

  profileInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#414343',
    borderRadius: 8,
    backgroundColor: '#111313',
    color: '#F2F2F2',
    fontSize: 14,
    paddingHorizontal: 11,
  },

  inputError: {
    color: '#FF8A8A',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },

  levelOptions: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 15,
  },

  levelOption: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#414343',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  levelOptionSelected: {
    backgroundColor: SportGymColors.primary,
    borderColor: SportGymColors.primary,
  },

  levelOptionText: {
    color: '#C6C6C6',
    fontSize: 11,
    fontWeight: '600',
  },

  levelOptionTextSelected: {
    color: '#FFFFFF',
  },

  saveButton: {
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: SportGymColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  infoRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    gap: 10,
    marginBottom: 13,
  },

  infoLabel: {
    flex: 1,
    flexShrink: 1,
    color: '#AFAFAF',

    fontSize: 14,

    fontWeight: '500',
  },

  infoValue: {
    maxWidth: '58%',
    flexShrink: 1,
    color: '#F2F2F2',

    fontSize: 15,

    fontWeight: '700',
    textAlign: 'right',
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