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

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición';
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
  const {
    hasAttendance,
    total: totalAttendances,
    weekTotal,
    attendanceError,
  } = useAttendance(user?.clientId ?? null);
  const [activeTab, setActiveTab] = useState<TabName | null>(null);
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
  const initials = (fullName || user?.username || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
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
        router.navigate('/(tabs)');
        break;
      case 'Rutina':
        router.navigate('/(tabs)/routine');
        break;
      case 'Tienda':
        router.navigate('/(tabs)/store');
        break;
      case 'Nutrición':
        router.navigate('/(tabs)/nutrition');
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
              <View pointerEvents="none" style={styles.profileGlow} />
              <View style={styles.profileEyebrow}>
                <Ionicons name="sparkles-outline" size={14} color="#A0D65E" />
                <ThemedText style={styles.profileEyebrowText}>TU ESPACIO SPORTGYM</ThemedText>
              </View>
              <View style={styles.avatarContainer}>
                <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
                <View style={styles.avatarStatus}>
                  <Ionicons name="barbell-outline" size={11} color="#FFFFFF" />
                </View>
              </View>

              <ThemedText style={styles.profileName}>
                {displayName}
              </ThemedText>

              <View style={styles.profileIdentity}>
                <Ionicons name="at-outline" size={14} color="#A5B0A7" />
                <ThemedText style={styles.profileUsername}>{user?.username || 'usuario'}</ThemedText>
              </View>

              <ThemedText style={styles.profileEmail}>
                {user?.email || 'Correo no registrado'}
              </ThemedText>
              <View
                style={[
                  styles.membershipBadge,
                  membershipStatus !== 'Activa' && styles.membershipBadgeInactive,
                ]}
              >
                <View
                  style={[
                    styles.membershipStatusDot,
                    membershipStatus !== 'Activa' && styles.membershipStatusDotInactive,
                  ]}
                />
                <ThemedText
                  style={[
                    styles.membershipBadgeText,
                    membershipStatus !== 'Activa' && styles.membershipBadgeTextInactive,
                  ]}
                >
                  {membershipStatus === 'Sin membresía'
                    ? 'Sin membresía activa'
                    : `Membresía ${membershipStatus.toLowerCase()}`}
                </ThemedText>
              </View>
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
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.navigate('/(tabs)/progress')}
                    style={styles.fullProgressButton}
                  >
                    <ThemedText style={styles.fullProgressButtonText}>
                      Ver progreso completo
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </View>

            {expandedSection === 'progress' && (
              <AttendanceCalendar
                hasAttendance={hasAttendance}
                totalAttendances={totalAttendances}
                error={attendanceError}
              />
            )}

            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFB9B9" />
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
        expanded && styles.menuItemExpanded,
        pressed && styles.menuItemPressed,
      ]}
    >
      <View style={[styles.menuIconWrap, expanded && styles.menuIconWrapExpanded]}>
        <Ionicons name={icon} size={18} color={SportGymColors.success} />
      </View>
      <ThemedText style={[styles.menuItemLabel, expanded && styles.menuItemLabelExpanded]}>{label}</ThemedText>
      <Ionicons
        name={expanded ? 'chevron-down' : 'chevron-forward'}
        size={18}
        color={expanded ? SportGymColors.success : '#879087'}
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
  error: boolean;
};

function AttendanceCalendar({
  hasAttendance,
  totalAttendances,
  error,
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

      {error ? (
        <ThemedText style={styles.progressText}>
          No se pudo cargar el calendario de asistencias.
        </ThemedText>
      ) : (
        <>
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
        </>
      )}
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
    backgroundColor: '#080A08',
  },

  safeArea: {
    flex: 1,
  },

  card: {
    flex: 1,

    marginHorizontal: 5,
    marginBottom: 4,

    borderWidth: 1,
    borderColor: '#303B32',

    borderRadius: 24,

    backgroundColor: '#0B0E0B',

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
    borderBottomWidth: 1,
    borderBottomColor: '#1E261F',
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#151A16',
    borderWidth: 1,
    borderColor: '#29332B',
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
    paddingTop: 12,
    paddingBottom: 15,
    gap: 2,
  },

  // ===================================================
  // TARJETA DE PERFIL
  // ===================================================

  profileCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#14291A',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,

    marginBottom: 13,

    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#355C3B',
  },

  profileGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    top: -112,
    right: -54,
    borderRadius: 95,
    backgroundColor: '#285C37',
    opacity: 0.45,
  },

  profileEyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 17,
  },

  profileEyebrowText: {
    color: '#A9C9A9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  avatarContainer: {
    position: 'relative',
    width: 88,
    height: 88,

    borderRadius: 44,

    backgroundColor: '#1C3A25',
    borderWidth: 2,
    borderColor: '#82C83F',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 13,
  },

  avatarInitials: {
    color: '#D7F5B4',
    fontSize: 32,
    fontWeight: '900',
  },

  avatarStatus: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: SportGymColors.primary,
    borderWidth: 2,
    borderColor: '#14291A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileName: {
    color: '#F2F2F2',

    fontSize: 23,

    fontWeight: '800',

    marginBottom: 6,
  },

  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 5,
  },

  profileUsername: {
    color: '#B9D8B9',
    fontSize: 14,
    fontWeight: '700',
  },

  profileEmail: {
    color: '#AEB9B0',
    fontSize: 12,

    fontWeight: '500',

    marginBottom: 14,
  },

  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#203B27',
    borderWidth: 1,
    borderColor: '#426C3D',
  },

  membershipBadgeInactive: {
    backgroundColor: '#252A26',
    borderColor: '#3C443E',
  },

  membershipStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A0D65E',
  },

  membershipStatusDotInactive: {
    backgroundColor: '#A3AAA5',
  },

  membershipBadgeText: {
    color: '#D4EACB',
    fontSize: 10,
    fontWeight: '700',
  },

  membershipBadgeTextInactive: {
    color: '#B4BBB6',
  },

  menuCard: {
    marginBottom: 13,
    gap: 9,
  },

  menuItem: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#151A16',
    borderWidth: 1,
    borderColor: '#29332B',
    paddingHorizontal: 12,
  },

  menuItemExpanded: {
    borderColor: '#426C3D',
    backgroundColor: '#18231A',
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },

  menuIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#213328',
  },

  menuIconWrapExpanded: {
    backgroundColor: '#2B4930',
  },

  menuItemPressed: {
    opacity: 0.82,
  },

  menuItemLabel: {
    flex: 1,
    color: '#E8EEE9',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 11,
  },

  menuItemLabelExpanded: {
    color: '#F4F8F4',
  },

  progressSummary: {
    backgroundColor: '#151A16',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#29332B',
    marginTop: -5,
  },

  exerciseProgressHero: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#303B32',
  },

  exerciseProgressNumber: {
    color: SportGymColors.primary,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },

  exerciseProgressLabel: {
    color: '#F2F7F2',
    fontSize: 14,
    fontWeight: '700',
  },

  workoutCount: {
    color: '#AEB9B0',
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
    backgroundColor: '#111612',
  },

  achievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#242C26',
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
    backgroundColor: '#303B32',
    marginVertical: 8,
  },

  progressText: {
    color: '#AEB9B0',
    fontSize: 13,
  },

  fullProgressButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 9,
    backgroundColor: SportGymColors.primary,
    marginTop: 12,
  },

  fullProgressButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ===================================================
  // TARJETA DE INFORMACIÓN
  // ===================================================

  infoCard: {
    backgroundColor: '#151A16',

    borderRadius: 15,

    paddingHorizontal: 17,
    paddingVertical: 18,

    marginBottom: 0,

    borderWidth: 1,
    borderColor: '#29332B',
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
    color: '#AEB9B0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },

  profileInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#354037',
    borderRadius: 8,
    backgroundColor: '#101410',
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
    borderColor: '#354037',
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
    color: '#AEB9B0',

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
    color: '#A0D65E',
  },

  attendanceCard: {
    backgroundColor: '#151A16',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#29332B',
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
    color: '#AEB9B0',
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
    color: '#8F9A91',
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
    backgroundColor: '#303A32',
  },

  dayCellRegistered: {
    backgroundColor: '#82C83F',
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
    height: 48,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 13,
    backgroundColor: '#281819',
    borderWidth: 1,
    borderColor: '#583031',

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
  },

  logoutButtonText: {
    color: '#FFB9B9',
    fontSize: 14,
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

    backgroundColor: '#0C100D',

    borderTopWidth: 1,
    borderTopColor: '#29332B',

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