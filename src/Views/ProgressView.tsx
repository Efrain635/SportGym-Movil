import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SportGymColors } from '@/constants/theme';
import {
    getClientWorkoutProgress,
    recordClientMeasurements,
    recordClientWeight,
    subscribeClientProgressHistory,
    updateClientProgressGoal,
    type ClientMeasurementEntry,
    type ClientProgressHistory,
} from '../../assets/database/firebase';
import {
  calculateBMIReferenceTargetWeight,
  calculateHealthyWeightRange,
  getCompleteBMIAnalysis,
} from '../lib/bmi-calculator';
import { useAuth } from '../contexts/AuthContext';
import { useAttendance } from '../lib/attendance';

type ProgressTab = 'Resumen' | 'Gráficas' | 'Logros';
type WeightUnit = 'kg' | 'lb';
type ProgressPage =
  | 'Resumen'
  | 'Gráficas'
  | 'Logros'
  | 'Objetivo'
  | 'Proyección'
  | 'Peso'
  | 'Medidas'
  | 'Historial';
type WorkoutProgress = Awaited<ReturnType<typeof getClientWorkoutProgress>>;
type MeasurementKey = 'waist' | 'hip' | 'arms' | 'thighs';
type SaveConfirmation = { title: string; message: string };

const goals = [
  { label: 'Perder grasa', icon: 'flame-outline' as const },
  { label: 'Ganar masa muscular', icon: 'barbell-outline' as const },
  { label: 'Mantener mi forma física', icon: 'fitness-outline' as const },
  { label: 'Mejorar mi salud', icon: 'heart-outline' as const },
];
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const measurementFields: { key: MeasurementKey; label: string }[] = [
  { key: 'waist', label: 'Cintura' },
  { key: 'hip', label: 'Cadera' },
  { key: 'arms', label: 'Brazos' },
  { key: 'thighs', label: 'Muslos' },
];
const achievementList = [
  { count: 1, label: 'Primer ejercicio', icon: 'flash-outline' as const },
  { count: 10, label: 'En movimiento', icon: 'fitness-outline' as const },
  { count: 25, label: 'Constancia', icon: 'medal-outline' as const },
  { count: 50, label: 'Imparable', icon: 'trophy-outline' as const },
  { count: 100, label: 'Centenario', icon: 'ribbon-outline' as const },
];

const blankHistory: ClientProgressHistory = {
  goal: null,
  targetWeight: null,
  weights: [],
  measurements: [],
  nextWeightUpdate: null,
  nextMeasurementsUpdate: null,
};
const blankWorkouts: WorkoutProgress = {
  totalExercises: 0,
  totalWorkouts: 0,
  weeklyExercises: Array.from({ length: 7 }, () => 0),
  recentWorkouts: [],
};

const todayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const addDays = (dateKey: string, amount: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
};

const formatDate = (value: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const formatNumber = (value: number, decimals = 1) =>
  value.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const KG_PER_LB = 0.45359237;
const weightFromKg = (weightKg: number, unit: WeightUnit) =>
  unit === 'lb' ? weightKg / KG_PER_LB : weightKg;
const weightToKg = (weight: number, unit: WeightUnit) =>
  unit === 'lb' ? weight * KG_PER_LB : weight;
const formatWeight = (weightKg: number, unit: WeightUnit) =>
  `${formatNumber(weightFromKg(weightKg, unit))} ${unit}`;
const convertWeightInput = (value: string, fromUnit: WeightUnit, toUnit: WeightUnit) => {
  if (!value.trim()) return value;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed)
    ? formatNumber(weightFromKg(weightToKg(parsed, fromUnit), toUnit))
    : value;
};
const calculateProgressPercentage = (
  current: number | null,
  initial: number | null,
  target: number | null,
) =>
  current !== null && initial !== null && target !== null && initial !== target
    ? Math.max(0, Math.min(100, (1 - Math.abs(current - target) / Math.abs(initial - target)) * 100))
    : current !== null && current === target
      ? 100
      : 0;

export default function ProgressView() {
  const { user, setUser } = useAuth();
  const clientId = user?.clientId ?? null;
  const attendance = useAttendance(clientId);
  const [page, setPage] = useState<ProgressPage>('Resumen');
  const [history, setHistory] = useState(blankHistory);
  const [workouts, setWorkouts] = useState(blankWorkouts);
  const [loadedHistoryId, setLoadedHistoryId] = useState<string | null>(null);
  const [loadedWorkoutId, setLoadedWorkoutId] = useState<string | null>(null);
  const [historyErrorId, setHistoryErrorId] = useState<string | null>(null);
  const [workoutErrorId, setWorkoutErrorId] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState(user?.goal ?? '');
  const [weightInput, setWeightInput] = useState(user?.weight?.toString() ?? '');
  const [weightConfirmation, setWeightConfirmation] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState<SaveConfirmation | null>(null);
  const [measurementInput, setMeasurementInput] = useState<Record<MeasurementKey, string>>({
    waist: '',
    hip: '',
    arms: '',
    thighs: '',
  });
  const [saving, setSaving] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [loadedUnitClientId, setLoadedUnitClientId] = useState<string | null>(null);
  const weightUnitRef = useRef<WeightUnit>('kg');

  useEffect(() => {
    if (!clientId) return;
    let active = true;

    const unsubscribeProgress = subscribeClientProgressHistory(
      clientId,
      (result) => {
        if (!active) return;
        setHistory(result);
        setGoalInput(result.goal ?? user?.goal ?? '');
        setHistoryErrorId(null);
        setLoadedHistoryId(clientId);
      },
      (error) => {
        console.error('Error al consultar progreso del cliente:', error);
        if (!active) return;
        setHistoryErrorId(clientId);
        setLoadedHistoryId(clientId);
      },
    );

    getClientWorkoutProgress(clientId)
      .then((result) => {
        if (!active) return;
        setWorkouts(result);
        setWorkoutErrorId(null);
      })
      .catch((error) => {
        console.error('Error al consultar entrenamientos del cliente:', error);
        if (active) setWorkoutErrorId(clientId);
      })
      .finally(() => {
        if (active) setLoadedWorkoutId(clientId);
      });

    return () => {
      active = false;
      unsubscribeProgress();
    };
  }, [clientId, user?.goal]);

  useEffect(() => {
    let active = true;
    if (!clientId) return;

    AsyncStorage.getItem(`progress-weight-unit:${clientId}`)
      .then((savedUnit) => {
        if (active) {
          const nextUnit: WeightUnit = savedUnit === 'lb' ? 'lb' : 'kg';
          const previousUnit = weightUnitRef.current;
          if (previousUnit !== nextUnit) {
            setWeightInput((value) => convertWeightInput(value, previousUnit, nextUnit));
          }
          weightUnitRef.current = nextUnit;
          setWeightUnit(nextUnit);
        }
      })
      .catch((error) => {
        console.error('Error al cargar la unidad de peso:', error);
        if (active) {
          const previousUnit = weightUnitRef.current;
          if (previousUnit !== 'kg') {
            setWeightInput((value) => convertWeightInput(value, previousUnit, 'kg'));
          }
          weightUnitRef.current = 'kg';
          setWeightUnit('kg');
          Alert.alert(
            'No se pudo cargar la preferencia',
            'Se usará kg durante esta sesión.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadedUnitClientId(clientId);
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const isLoadingHistory = Boolean(clientId) && loadedHistoryId !== clientId;
  const isLoadingWorkouts = Boolean(clientId) && loadedWorkoutId !== clientId;
  const historyError = Boolean(clientId) && historyErrorId === clientId;
  const workoutError = Boolean(clientId) && workoutErrorId === clientId;
  const clientHistory =
    loadedHistoryId === clientId && !historyError ? history : blankHistory;
  const clientWorkouts =
    loadedWorkoutId === clientId && !workoutError ? workouts : blankWorkouts;
  const currentWeight =
    clientHistory.weights.at(-1)?.weight ?? user?.weight ?? null;
  const latestWeightDate = clientHistory.weights.at(-1)?.date ?? null;
  const weightUnitReady = Boolean(clientId) && loadedUnitClientId === clientId;
  const adultProfile =
    typeof user?.age === 'number' &&
    user.age >= 18 &&
    typeof user.height === 'number' &&
    user.height >= 100 &&
    user.height <= 250;
  const healthyWeightRange =
    adultProfile ? calculateHealthyWeightRange(user.height!) : null;
  const recommendedTargetWeight =
    adultProfile ? calculateBMIReferenceTargetWeight(user.height!) : null;
  const progressTargetWeight = recommendedTargetWeight;
  const previousWeight = clientHistory.weights.at(-1)?.weight ?? user?.weight ?? null;
  const weightComparisonSource =
    clientHistory.weights.length > 0 ? 'tu último registro' : 'el peso guardado en tu perfil';
  const parsedWeightInput = Number(weightInput.replace(',', '.'));
  const parsedWeightInputKg = Number.isFinite(parsedWeightInput)
    ? weightToKg(parsedWeightInput, weightUnit)
    : Number.NaN;
  const weightPreviewChange =
    previousWeight === null || !Number.isFinite(parsedWeightInputKg)
      ? null
      : parsedWeightInputKg - previousWeight;
  const distanceToReference =
    currentWeight !== null && recommendedTargetWeight !== null
      ? Math.abs(currentWeight - recommendedTargetWeight)
      : null;
  const expectedWeeks =
    distanceToReference !== null
      ? Math.max(1, Math.ceil(distanceToReference / 0.5))
      : null;
  const projectionWeeks =
    currentWeight !== null && progressTargetWeight !== null
      ? Math.max(1, Math.ceil(Math.abs(currentWeight - progressTargetWeight) / 0.5))
      : null;
  const measurementPreview = measurementFields.flatMap((field) => {
    const text = measurementInput[field.key].trim();
    const value = Number(text.replace(',', '.'));
    if (!text || !Number.isFinite(value) || value < 10 || value > 250) return [];
    const previous = [...clientHistory.measurements]
      .reverse()
      .find((entry) => entry[field.key] !== undefined)?.[field.key];
    return [{ label: field.label, value, previous }];
  });

  const navigate = (destination: ProgressPage) => {
    setSaveConfirmation(null);
    if (destination === 'Objetivo') {
      setGoalInput(clientHistory.goal ?? user?.goal ?? '');
    }
    if (destination === 'Peso') {
      setWeightInput(
        currentWeight === null
          ? ''
          : formatNumber(weightFromKg(currentWeight, weightUnit)),
      );
      setWeightConfirmation(false);
    }
    setPage(destination);
  };

  const changeWeightUnit = (nextUnit: WeightUnit) => {
    if (nextUnit === weightUnit || !clientId || !weightUnitReady) return;
    setWeightInput(convertWeightInput(weightInput, weightUnit, nextUnit));
    weightUnitRef.current = nextUnit;
    setWeightUnit(nextUnit);
    AsyncStorage.setItem(`progress-weight-unit:${clientId}`, nextUnit).catch((error) => {
      console.error('Error al guardar la unidad de peso:', error);
      Alert.alert(
        'No se pudo guardar la preferencia',
        'La unidad seleccionada se conservará solo durante esta sesión.',
      );
    });
  };

  const saveGoal = async () => {
    if (!clientId) {
      Alert.alert('Sesión requerida', 'Inicia sesión para guardar tus objetivos.');
      return;
    }
    if (!goalInput.trim()) {
      Alert.alert('Selecciona un objetivo', 'Elige una meta para continuar.');
      return;
    }
    setSaving(true);
    try {
      const nextTarget = recommendedTargetWeight;
      await updateClientProgressGoal(clientId, goalInput.trim(), nextTarget);
      setHistory((previous) => ({
        ...previous,
        goal: goalInput.trim(),
        targetWeight: nextTarget,
      }));
      if (user) setUser({ ...user, goal: goalInput.trim() });
      setSaveConfirmation({
        title: 'Objetivo actualizado',
        message: nextTarget === null
          ? `Tu meta ahora es: ${goalInput.trim()}.`
          : `${goalInput.trim()} · peso meta ${formatWeight(nextTarget, weightUnit)}.`,
      });
      setPage('Resumen');
    } catch (error) {
      console.error('Error al guardar el objetivo del cliente:', error);
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const saveWeight = async () => {
    if (!clientId) {
      Alert.alert('Sesión requerida', 'Inicia sesión para registrar tu peso.');
      return;
    }
    const parsedWeight = Number(weightInput.replace(',', '.'));
    const parsedWeightKg = Number.isFinite(parsedWeight)
      ? weightToKg(parsedWeight, weightUnit)
      : Number.NaN;
    if (!Number.isFinite(parsedWeightKg) || parsedWeightKg < 20 || parsedWeightKg > 400) {
      Alert.alert(
        'Peso no válido',
        `Ingresa un valor entre ${formatWeight(20, weightUnit)} y ${formatWeight(400, weightUnit)}.`,
      );
      return;
    }

    setSaving(true);
    try {
      const date = todayKey();
      const previousWeight = clientHistory.weights.at(-1)?.weight ?? user?.weight ?? null;
      const updatingToday = latestWeightDate === date;
      const weightChange = previousWeight === null ? null : parsedWeightKg - previousWeight;
      const comparisonSource =
        clientHistory.weights.length > 0 ? 'frente al registro anterior' : 'frente al peso de tu perfil';
      await recordClientWeight(clientId, parsedWeightKg, date);
      setHistory((previous) => ({
        ...previous,
        weights: [
          ...previous.weights.filter((entry) => entry.date !== date),
          { weight: parsedWeightKg, date },
        ].sort((first, second) => first.date.localeCompare(second.date)),
        nextWeightUpdate: null,
      }));
      if (user) setUser({ ...user, weight: parsedWeightKg });
      setSaveConfirmation({
        title: updatingToday ? 'Peso actualizado' : 'Peso confirmado',
        message: weightChange === null
          ? `${formatWeight(parsedWeightKg, weightUnit)} · primer registro guardado.`
          : `${formatWeight(parsedWeightKg, weightUnit)} · ${weightChange === 0 ? 'sin cambio' : `${weightChange > 0 ? '+' : ''}${formatNumber(weightFromKg(weightChange, weightUnit))} ${weightUnit} ${comparisonSource}`}.`,
      });
      setPage('Resumen');
    } catch (error) {
      const nextDate = error instanceof Error
        ? error.message.match(/^weight-update-too-soon:(\d{4}-\d{2}-\d{2})$/)?.[1]
        : undefined;
      if (nextDate) {
        setHistory((previous) => ({ ...previous, nextWeightUpdate: nextDate }));
        Alert.alert('Registro reciente', `Podrás registrar tu peso el ${formatDate(nextDate)}.`);
      } else {
        console.error('Error al guardar el peso del cliente:', error);
        Alert.alert('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveMeasurements = async () => {
    if (!clientId) {
      Alert.alert('Sesión requerida', 'Inicia sesión para registrar tus medidas.');
      return;
    }

    const values: Partial<Omit<ClientMeasurementEntry, 'date'>> = {};
    for (const field of measurementFields) {
      const text = measurementInput[field.key].trim();
      if (!text) continue;
      const value = Number(text.replace(',', '.'));
      if (!Number.isFinite(value) || value < 10 || value > 250) {
        Alert.alert('Medida no válida', `${field.label}: usa un valor de 10 a 250 cm.`);
        return;
      }
      values[field.key] = value;
    }
    if (Object.keys(values).length === 0) {
      Alert.alert('Sin medidas', 'Registra al menos una medida corporal.');
      return;
    }

    setSaving(true);
    try {
      const date = todayKey();
      const comparison = measurementFields.flatMap((field) => {
        const value = values[field.key];
        if (value === undefined) return [];
        const previous = [...clientHistory.measurements]
          .reverse()
          .find((entry) => entry[field.key] !== undefined)?.[field.key];
        return [
          `${field.label}: ${formatNumber(value)} cm${
            previous === undefined
              ? ' · primer registro'
              : ` (${value - previous > 0 ? '+' : ''}${formatNumber(value - previous)} cm)`
          }`,
        ];
      });
      await recordClientMeasurements(clientId, values, date);
      setHistory((previous) => ({
        ...previous,
        measurements: [...previous.measurements, { date, ...values }].sort(
          (first, second) => first.date.localeCompare(second.date),
        ),
        nextMeasurementsUpdate: addDays(date, 7),
      }));
      setMeasurementInput({ waist: '', hip: '', arms: '', thighs: '' });
      setSaveConfirmation({
        title: 'Medidas confirmadas',
        message: comparison.join(' · '),
      });
      setPage('Resumen');
    } catch (error) {
      const nextDate = error instanceof Error
        ? error.message.match(/^measurements-update-too-soon:(\d{4}-\d{2}-\d{2})$/)?.[1]
        : undefined;
      if (nextDate) {
        setHistory((previous) => ({ ...previous, nextMeasurementsUpdate: nextDate }));
        Alert.alert('Registro reciente', `Podrás actualizar tus medidas el ${formatDate(nextDate)}.`);
      } else {
        console.error('Error al guardar las medidas del cliente:', error);
        Alert.alert('No se pudo guardar', 'Revisa tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const pageTitle: Record<ProgressPage, string> = {
    Resumen: 'Mi progreso',
    Gráficas: 'Gráficas de evolución',
    Logros: 'Logros y métricas',
    Objetivo: 'Mis objetivos',
    Proyección: 'Proyección de progreso',
    Peso: 'Registrar peso',
    Medidas: 'Registrar medidas',
    Historial: 'Historial de progreso',
  };

  const content = (() => {
    switch (page) {
      case 'Resumen':
        return (
          <>
            <View style={styles.goalCard}>
              <View pointerEvents="none" style={styles.goalGlowOne} />
              <View pointerEvents="none" style={styles.goalGlowTwo} />
              <View style={styles.row}>
                <View style={styles.heroIcon}>
                  <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <ThemedText style={styles.eyebrow}>TU ENFOQUE ACTUAL</ThemedText>
                  <ThemedText style={styles.heroTitle}>
                    {clientHistory.goal ?? user?.goal ?? 'Define tu objetivo'}
                  </ThemedText>
                  <ThemedText style={styles.goalSubtitle}>Pequeños pasos, grandes cambios.</ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate('Objetivo')}
                  style={styles.goalEditButton}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.goalEditText}>Editar</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.weightOverview}>
              <View style={styles.weightOverviewColumn}>
                <View style={styles.overviewIcon}>
                  <Ionicons name="scale-outline" size={19} color={SportGymColors.success} />
                </View>
                <ThemedText style={styles.labelSmall}>Peso actual</ThemedText>
                <ThemedText style={styles.weightLarge}>
                  {currentWeight === null ? '—' : formatWeight(currentWeight, weightUnit)}
                </ThemedText>
                <ThemedText style={styles.overviewHint}>
                  {latestWeightDate ? `Último registro · ${formatDate(latestWeightDate)}` : 'Aún sin registro'}
                </ThemedText>
              </View>
              <View style={styles.overviewDivider} />
              <View style={styles.overviewProgress}>
                <View style={styles.progressRing}>
                  <Ionicons name="flag-outline" size={18} color={SportGymColors.success} />
                  <ThemedText style={styles.progressRingValue}>
                    {currentWeight !== null && progressTargetWeight !== null
                      ? `${Math.round(calculateProgressPercentage(
                          currentWeight,
                          clientHistory.weights[0]?.weight ?? currentWeight,
                          progressTargetWeight,
                        ))}%`
                      : '—'}
                  </ThemedText>
                  <ThemedText style={styles.progressRingCaption}>avance</ThemedText>
                </View>
              </View>
              <View style={styles.overviewDivider} />
              <View style={[styles.weightOverviewColumn, styles.weightOverviewColumnRight]}>
                <View style={[styles.overviewIcon, styles.overviewIconMuted]}>
                  <Ionicons name="flag-outline" size={19} color="#C8D7CA" />
                </View>
                <ThemedText style={styles.labelSmall}>Peso meta OMS · IMC 22</ThemedText>
                <ThemedText style={styles.weightLarge}>
                  {progressTargetWeight === null ? 'Por definir' : formatWeight(progressTargetWeight, weightUnit)}
                </ThemedText>
                <ThemedText style={styles.overviewHint}>
                  {currentWeight !== null && progressTargetWeight !== null
                    ? `${formatWeight(Math.abs(currentWeight - progressTargetWeight), weightUnit)} por alcanzar`
                    : 'Con base en tus datos'}
                </ThemedText>
              </View>
            </View>
            <View style={styles.rangeStrip}>
              <Ionicons name="heart-outline" size={17} color={SportGymColors.success} />
              <View style={styles.flex}>
                <ThemedText style={styles.rangeStripTitle}>Referencia saludable · OMS</ThemedText>
                <ThemedText style={styles.rangeStripValue}>
                  {healthyWeightRange
                    ? `${formatWeight(healthyWeightRange.minWeight, weightUnit)} – ${formatWeight(healthyWeightRange.maxWeight, weightUnit)}`
                    : 'Completa tu estatura y edad adulta'}
                </ThemedText>
              </View>
              <Ionicons name="information-circle-outline" size={18} color="#89958B" />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate('Peso')}
              style={styles.updateWeightButton}
            >
              <Ionicons name="create-outline" size={17} color="#FFFFFF" />
              <ThemedText style={styles.updateWeightButtonText}>
                {latestWeightDate === todayKey() ? 'Editar peso de hoy' : 'Actualizar peso actual'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color="#D9EAD8" />
            </Pressable>

            <Card
              title="IMC y referencia saludable"
              icon="heart-outline"
              action="Editar objetivo"
              onAction={() => navigate('Objetivo')}
            >
              {currentWeight !== null && adultProfile ? (() => {
                const bmiAnalysis = getCompleteBMIAnalysis(
                  currentWeight,
                  user.height,
                  user.age,
                  clientHistory.goal ?? user.goal,
                );
                return (
                  <>
                    <Metric label="IMC actual" value={formatNumber(bmiAnalysis.currentBMI ?? 0)} detail={bmiAnalysis.category} />
                    <Metric label="Rango de referencia OMS" value={`${formatWeight(bmiAnalysis.minWeight, weightUnit)} - ${formatWeight(bmiAnalysis.maxWeight, weightUnit)}`} detail="Para adultos, según tu estatura" />
                    {recommendedTargetWeight !== null && (
                      <Metric
                        label="Referencia de peso · IMC 22"
                        value={formatWeight(recommendedTargetWeight, weightUnit)}
                        detail="Punto orientativo dentro del rango saludable"
                      />
                    )}
                    <ThemedText style={styles.caption}>{bmiAnalysis.recommendation}</ThemedText>
                    <ThemedText style={styles.caption}>La OMS define un rango saludable, no un peso único. IMC 22 es una referencia orientativa; el IMC no sustituye una valoración profesional.</ThemedText>
                  </>
                );
              })() : (
                <ThemedText style={styles.bodyText}>
                  {typeof user?.age === 'number' && user.age < 18
                    ? 'El IMC adulto de la OMS no se aplica a menores de 18 años. Consulta las curvas de crecimiento con un profesional de salud.'
                    : 'Completa tu edad adulta, peso y estatura en tu perfil para consultar el IMC y el rango de referencia saludable.'}
                </ThemedText>
              )}
            </Card>

            <View style={styles.stats}>
              <Stat icon="barbell-outline" label="Ejercicios" value={isLoadingWorkouts ? '…' : workoutError ? '—' : String(clientWorkouts.totalExercises)} />
              <Stat icon="fitness-outline" label="Entrenos" value={isLoadingWorkouts ? '…' : workoutError ? '—' : String(clientWorkouts.totalWorkouts)} />
              <Stat icon="calendar-outline" label="Esta semana" value={String(attendance.weekTotal)} />
            </View>
            {workoutError && <Notice text="No se pudieron cargar tus entrenamientos." />}
            {attendance.attendanceError && <Notice text="No se pudieron consultar tus asistencias." />}

            <Card title="Avance de tu objetivo" icon="flag-outline" action="Ver detalle" onAction={() => navigate('Proyección')}>
              <ProgressMeter
                current={currentWeight}
                initial={clientHistory.weights[0]?.weight ?? null}
                target={progressTargetWeight}
                unit={weightUnit}
              />
              <View style={styles.actionRow}>
                <Action label={latestWeightDate === todayKey() ? 'Editar peso' : 'Actualizar peso'} icon="scale-outline" onPress={() => navigate('Peso')} />
                <Action label="Registrar medidas" icon="body-outline" onPress={() => navigate('Medidas')} />
              </View>
            </Card>

            <Card title="Tu semana de entrenamiento" icon="barbell-outline" action="Ver gráficas" onAction={() => navigate('Gráficas')}>
              <BarChart values={clientWorkouts.weeklyExercises} labels={weekdays} />
              <ThemedText style={styles.caption}>Cada barra representa los ejercicios completados por día.</ThemedText>
            </Card>

            <Card title="Último entrenamiento" action="Historial" onAction={() => navigate('Historial')}>
              {clientWorkouts.recentWorkouts.length > 0
                ? <WorkoutRow workout={clientWorkouts.recentWorkouts[0]} />
                : <ThemedText style={styles.bodyText}>{isLoadingWorkouts ? 'Cargando entrenamientos…' : 'Al completar una rutina aparecerá aquí.'}</ThemedText>}
            </Card>
            <MotivationBanner
              icon="sparkles-outline"
              title="Vas por buen camino"
              text={
                clientHistory.weights.length > 0
                  ? `Tu progreso ya cuenta con ${clientHistory.weights.length} ${clientHistory.weights.length === 1 ? 'registro' : 'registros'}. La constancia importa más que la prisa.`
                  : 'Registra tu peso para empezar a visualizar tus avances semana a semana.'
              }
            />
            {historyError && <Notice text="No se pudo cargar tu historial de progreso." />}
          </>
        );
      case 'Gráficas':
        return (
          <>
            <View style={styles.graphIntro}>
              <View pointerEvents="none" style={styles.graphIntroGlow} />
              <View style={styles.graphIntroIcon}>
                <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.flex}>
                <ThemedText style={styles.graphIntroTitle}>Tu progreso en el tiempo</ThemedText>
                <ThemedText style={styles.graphIntroText}>Compara tus entrenamientos y cambios corporales.</ThemedText>
              </View>
              <Ionicons name="analytics-outline" size={27} color="#76C85A" />
            </View>
            <Card title="Ejercicios de esta semana" icon="barbell-outline">
              <BarChart values={clientWorkouts.weeklyExercises} labels={weekdays} />
              <ThemedText style={styles.caption}>Ejercicios completados por día</ThemedText>
            </Card>
            <Card title="Evolución del peso" icon="scale-outline" action="Registrar" onAction={() => navigate('Peso')}>
              {clientHistory.weights.length
                ? <WeightChart weights={clientHistory.weights} unit={weightUnit} />
                : <Empty title="Sin registros todavía" text="Registra tu peso para crear la gráfica." icon="scale-outline" action="Registrar peso" onAction={() => navigate('Peso')} />}
            </Card>
            <Card title="Medidas corporales" icon="body-outline" action="Registrar" onAction={() => navigate('Medidas')}>
              {clientHistory.measurements.length
                ? <MeasurementTrends entries={clientHistory.measurements} />
                : <Empty title="Aún no hay medidas" text="Guarda tus medidas para comparar su evolución aquí." icon="body-outline" action="Registrar medidas" onAction={() => navigate('Medidas')} />}
            </Card>
            <MotivationBanner
              icon="bulb-outline"
              title="Cada dato te da perspectiva"
              text="Registra tus avances con regularidad y observa las tendencias, no solo un día aislado."
            />
          </>
        );
      case 'Logros':
        return (
          <>
            <View style={styles.stats}>
              <Stat icon="barbell-outline" label="Ejercicios" value={String(clientWorkouts.totalExercises)} />
              <Stat icon="fitness-outline" label="Entrenos" value={String(clientWorkouts.totalWorkouts)} />
              <Stat icon="flame-outline" label="Racha" value={`${attendance.currentStreak} d`} />
            </View>
            <Card title="Logros de ejercicios">
              <View style={styles.achievementSummary}>
                <View style={styles.achievementSummaryIcon}>
                  <Ionicons name="trophy-outline" size={20} color={SportGymColors.success} />
                </View>
                <View style={styles.flex}>
                  <ThemedText style={styles.rowTitle}>
                    {achievementList.filter((item) => clientWorkouts.totalExercises >= item.count).length} de {achievementList.length} logros desbloqueados
                  </ThemedText>
                  <ThemedText style={styles.labelSmall}>
                    {clientWorkouts.totalExercises} ejercicios completados
                  </ThemedText>
                </View>
              </View>
              {achievementList.map((item) => {
                const unlocked = clientWorkouts.totalExercises >= item.count;
                return (
                  <View key={item.count} style={styles.achievement}>
                    <View style={[styles.achievementIcon, unlocked && styles.achievementUnlocked]}>
                      <Ionicons name={item.icon} size={19} color={unlocked ? SportGymColors.success : '#8A918C'} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText style={styles.rowTitle}>{item.label}</ThemedText>
                      <ThemedText style={styles.labelSmall}>{item.count} {item.count === 1 ? 'ejercicio' : 'ejercicios'}</ThemedText>
                    </View>
                    <Ionicons name={unlocked ? 'checkmark-circle' : 'lock-closed-outline'} size={19} color={unlocked ? SportGymColors.success : '#8A918C'} />
                  </View>
                );
              })}
            </Card>
            <Card title="Asistencia y actividad">
              <Metric label="Asistencias" value={String(attendance.total)} detail="Días registrados" />
              <Metric label="Racha actual" value={`${attendance.currentStreak} días`} detail="Días consecutivos" />
            </Card>
          </>
        );
      case 'Objetivo':
        return (
          <Card title="Selecciona tu objetivo principal">
            <ThemedText style={styles.bodyText}>Tu objetivo de entrenamiento se guarda en tu perfil. El peso de referencia se calcula automáticamente según tu estatura y no tienes que ingresarlo.</ThemedText>
            {goals.map((item) => {
              const selected = goalInput === item.label;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setGoalInput(item.label)}
                  style={[styles.goalOption, selected && styles.goalOptionSelected]}
                >
                  <Ionicons name={item.icon} size={20} color={selected ? '#FFFFFF' : SportGymColors.success} />
                  <ThemedText style={[styles.goalOptionText, selected && styles.goalOptionTextSelected]}>{item.label}</ThemedText>
                  {selected && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
                </Pressable>
              );
            })}
            <View style={styles.bmiReferenceCard}>
              <View style={styles.bmiReferenceIcon}>
                <Ionicons name="heart-outline" size={20} color={SportGymColors.success} />
              </View>
              <View style={styles.flex}>
                <ThemedText style={styles.metricLabel}>Peso meta de referencia · OMS</ThemedText>
                <ThemedText style={styles.bmiReferenceValue}>
                  {recommendedTargetWeight === null
                    ? 'Disponible para adultos con estatura registrada'
                    : formatWeight(recommendedTargetWeight, weightUnit)}
                </ThemedText>
                <ThemedText style={styles.labelSmall}>
                  {healthyWeightRange
                    ? `IMC 22 · rango saludable ${formatWeight(healthyWeightRange.minWeight, weightUnit)}–${formatWeight(healthyWeightRange.maxWeight, weightUnit)}`
                    : 'Fórmula: 22 × estatura² (en metros)'}
                </ThemedText>
              </View>
            </View>
            <Notice text="La OMS define un rango de IMC saludable para adultos, no un peso único obligatorio. IMC 22 se muestra solo como referencia dentro de ese rango. En menores de 18 años se usan curvas de crecimiento." />
            {expectedWeeks !== null && (
              <Notice text={`Estás a ${formatWeight(distanceToReference ?? 0, weightUnit)} de la referencia. La estimación lineal de ${expectedWeeks} semanas a ${formatWeight(0.5, weightUnit)} por semana es orientativa y no sustituye asesoría profesional.`} />
            )}
            <PrimaryButton label="Guardar objetivo" loading={saving} onPress={saveGoal} />
          </Card>
        );
      case 'Proyección':
        return (
          <>
            <View style={styles.projectionHero}>
              <ThemedText style={styles.labelSmall}>OBJETIVO: {clientHistory.goal ?? user?.goal ?? 'Por definir'}</ThemedText>
              <View style={styles.weightPair}>
                <View>
                  <ThemedText style={styles.labelSmall}>Actual</ThemedText>
                  <ThemedText style={styles.weightLarge}>{currentWeight === null ? '—' : formatWeight(currentWeight, weightUnit)}</ThemedText>
                </View>
                <Ionicons name="arrow-forward" size={22} color={SportGymColors.success} />
                <View style={styles.alignRight}>
                  <ThemedText style={styles.labelSmall}>Meta</ThemedText>
                  <ThemedText style={styles.weightLarge}>{progressTargetWeight === null ? '—' : formatWeight(progressTargetWeight, weightUnit)}</ThemedText>
                </View>
              </View>
            </View>
            {currentWeight !== null && progressTargetWeight !== null ? (
              <Card title="Proyección estimada">
                <ThemedText style={styles.bodyText}>
                  {`La meta se calcula como referencia de IMC 22 para tu estatura, dentro del rango saludable adulto de la OMS. La proyección de ${formatWeight(0.5, weightUnit)} por semana es solo orientativa.`}
                </ThemedText>
                <ProjectionList current={currentWeight} target={progressTargetWeight} unit={weightUnit} />
                <Metric label="Tiempo orientativo" value={`${projectionWeeks ?? 1} semanas`} />
                <Notice text="Consulta con un profesional para establecer metas adecuadas para ti." />
              </Card>
            ) : (
              <Empty title="Completa tus datos" text="Registra tu peso, edad adulta y estatura para calcular una meta saludable orientativa." icon="flag-outline" action="Configurar objetivo" onAction={() => navigate('Objetivo')} />
            )}
          </>
        );
      case 'Peso':
        return (
          <Card title={weightConfirmation ? 'Confirma tu peso actual' : latestWeightDate === todayKey() ? 'Edita tu peso de hoy' : 'Actualiza tu peso actual'}>
            <ThemedText style={styles.bodyText}>
              {latestWeightDate === todayKey()
                ? 'Puedes corregir el registro de hoy. Se actualizará la misma entrada sin duplicarla.'
                : 'Puedes registrar tu peso una vez al día. Tus registros anteriores se conservan en el historial.'}
            </ThemedText>
            {clientHistory.nextWeightUpdate && latestWeightDate !== todayKey() && (
              <Notice text={`Podrás registrar peso nuevamente el ${formatDate(clientHistory.nextWeightUpdate)}.`} />
            )}
            {healthyWeightRange && (
              <View style={styles.confirmationInsight}>
                <Ionicons name="fitness-outline" size={18} color={SportGymColors.success} />
                <ThemedText style={styles.confirmationInsightText}>
                  Rango de referencia OMS: {formatWeight(healthyWeightRange.minWeight, weightUnit)} - {formatWeight(healthyWeightRange.maxWeight, weightUnit)}
                </ThemedText>
              </View>
            )}
            <View style={styles.weightInputCard}>
              {weightConfirmation ? (
                <>
                  <ThemedText style={styles.inputWeight}>{weightInput} {weightUnit}</ThemedText>
                  <ThemedText style={styles.labelSmall}>{formatDate(todayKey())}</ThemedText>
                </>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel={`Peso actual en ${weightUnit}`}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#89908C"
                    style={styles.weightInput}
                  />
                  <ThemedText style={styles.labelSmall}>{weightUnit === 'kg' ? 'kilogramos' : 'libras'}</ThemedText>
                </>
              )}
            </View>
            {weightConfirmation ? (
              <View style={styles.confirmationInsight}>
                <Ionicons name="analytics-outline" size={18} color={SportGymColors.success} />
                <ThemedText style={styles.confirmationInsightText}>
                  {weightPreviewChange === null
                    ? 'Este será tu primer peso guardado.'
                    : weightPreviewChange === 0
                      ? `Igual a ${weightComparisonSource}.`
                        : `${weightPreviewChange > 0 ? '+' : ''}${formatNumber(weightFromKg(weightPreviewChange, weightUnit))} ${weightUnit} desde ${weightComparisonSource}.`}
                </ThemedText>
              </View>
            ) : null}
            {weightConfirmation ? (
              <View style={styles.actionRow}>
                <SecondaryButton label="Editar" onPress={() => setWeightConfirmation(false)} />
                <PrimaryButton label={latestWeightDate === todayKey() ? 'Actualizar peso' : 'Confirmar y guardar'} loading={saving} onPress={saveWeight} />
              </View>
            ) : (
              <PrimaryButton
                label="Continuar"
                disabled={Boolean(clientHistory.nextWeightUpdate && latestWeightDate !== todayKey())}
                onPress={() => {
                  const value = Number(weightInput.replace(',', '.'));
                  const valueKg = Number.isFinite(value) ? weightToKg(value, weightUnit) : Number.NaN;
                  if (!Number.isFinite(valueKg) || valueKg < 20 || valueKg > 400) {
                    Alert.alert(
                      'Peso no válido',
                      `Ingresa un valor entre ${formatWeight(20, weightUnit)} y ${formatWeight(400, weightUnit)}.`,
                    );
                    return;
                  }
                  setWeightConfirmation(true);
                }}
              />
            )}
          </Card>
        );
      case 'Medidas':
        return (
          <>
            <Card title="Medidas corporales (cm)">
              <ThemedText style={styles.bodyText}>Puedes actualizar las medidas cada 7 días. Deja vacío lo que no desees registrar.</ThemedText>
              {clientHistory.nextMeasurementsUpdate && (
                <Notice text={`Podrás actualizar tus medidas nuevamente el ${formatDate(clientHistory.nextMeasurementsUpdate)}.`} />
              )}
              <View style={styles.measurementGrid}>
                {measurementFields.map((field) => (
                  <View key={field.key} style={styles.measurementCell}>
                    <Field label={field.label} />
                    <TextInput
                      accessibilityLabel={`${field.label} en centímetros`}
                      value={measurementInput[field.key]}
                      onChangeText={(value) => setMeasurementInput((previous) => ({ ...previous, [field.key]: value }))}
                      keyboardType="decimal-pad"
                      placeholder="cm"
                      placeholderTextColor="#89908C"
                      style={styles.input}
                    />
                  </View>
                ))}
              </View>
              {measurementPreview.length > 0 && (
                <View style={styles.measurementPreview}>
                  <View style={styles.measurementPreviewHeading}>
                    <Ionicons name="git-compare-outline" size={17} color={SportGymColors.success} />
                    <ThemedText style={styles.metricLabel}>Así se comparan tus avances</ThemedText>
                  </View>
                  {measurementPreview.map((item) => (
                    <View key={item.label} style={styles.measurementPreviewRow}>
                      <ThemedText style={styles.labelSmall}>{item.label}</ThemedText>
                      <ThemedText style={styles.metricValue}>
                        {formatNumber(item.value)} cm
                        {item.previous !== undefined
                          ? ` (${item.value - item.previous > 0 ? '+' : ''}${formatNumber(item.value - item.previous)})`
                          : ' · nuevo'}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
              <PrimaryButton label="Guardar medidas" loading={saving} disabled={Boolean(clientHistory.nextMeasurementsUpdate)} onPress={saveMeasurements} />
            </Card>
            <Card title="Registro más reciente">
              {clientHistory.measurements.length
                ? <MeasurementRow entry={clientHistory.measurements.at(-1)!} />
                : <ThemedText style={styles.bodyText}>Aún no hay medidas guardadas.</ThemedText>}
            </Card>
          </>
        );
      case 'Historial':
        return (
          <>
            <Card title="Entrenamientos recientes">
              {clientWorkouts.recentWorkouts.length
                ? clientWorkouts.recentWorkouts.map((workout) => <WorkoutRow key={workout.id} workout={workout} />)
                : <ThemedText style={styles.bodyText}>{isLoadingWorkouts ? 'Cargando…' : 'Aún no hay entrenamientos completados.'}</ThemedText>}
            </Card>
            <Card title="Registros de peso">
              {clientHistory.weights.length
                ? [...clientHistory.weights].reverse().map((entry, index) => <HistoryRow key={`${entry.date}-${index}`} icon="scale-outline" title={formatWeight(entry.weight, weightUnit)} date={formatDate(entry.date)} />)
                : <ThemedText style={styles.bodyText}>Aún no hay registros de peso.</ThemedText>}
            </Card>
            <Card title="Registros de medidas">
              {clientHistory.measurements.length
                ? [...clientHistory.measurements].reverse().map((entry, index) => <View key={`${entry.date}-${index}`} style={styles.measureHistory}><ThemedText style={styles.labelSmall}>{formatDate(entry.date)}</ThemedText><MeasurementRow entry={entry} /></View>)
                : <ThemedText style={styles.bodyText}>Aún no hay medidas registradas.</ThemedText>}
            </Card>
          </>
        );
    }
  })();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.frame}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => page === 'Resumen' ? router.back() : setPage('Resumen')} style={styles.back}>
              <Ionicons name="arrow-back" size={22} color="#F2F2F2" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>{page === 'Peso' && latestWeightDate === todayKey() ? 'Actualizar peso' : pageTitle[page]}</ThemedText>
            <View style={styles.unitToggle} accessibilityLabel="Unidad de peso">
              {(['kg', 'lb'] as WeightUnit[]).map((unit) => (
                <Pressable
                  key={unit}
                  accessibilityRole="button"
                  accessibilityState={{ selected: weightUnit === unit, disabled: !weightUnitReady }}
                  disabled={!weightUnitReady}
                  onPress={() => changeWeightUnit(unit)}
                  style={[
                    styles.unitOption,
                    weightUnit === unit && styles.unitOptionSelected,
                    !weightUnitReady && styles.unitOptionDisabled,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.unitOptionText,
                      weightUnit === unit && styles.unitOptionTextSelected,
                    ]}
                  >
                    {unit}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          {clientId ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {isLoadingHistory && <Loading />}
              {saveConfirmation && (
                <View accessibilityRole="alert" style={styles.saveConfirmation}>
                  <View style={styles.confirmationIcon}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText style={styles.confirmationTitle}>{saveConfirmation.title}</ThemedText>
                    <ThemedText style={styles.confirmationMessage}>{saveConfirmation.message}</ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar confirmación"
                    onPress={() => setSaveConfirmation(null)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color="#A7AEA9" />
                  </Pressable>
                </View>
              )}
              {(['Resumen', 'Gráficas', 'Logros'] as ProgressTab[]).includes(page as ProgressTab) && (
                <ProgressNavigation
                  page={page as ProgressTab}
                  onSelect={setPage}
                />
              )}
              {content}
              <View style={styles.bottomSpace} />
            </ScrollView>
          ) : (
            <View style={styles.loginRequired}>
              <Ionicons name="person-circle-outline" size={42} color={SportGymColors.success} />
              <ThemedText style={styles.cardTitle}>Inicia sesión para consultar tu progreso</ThemedText>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Card({
  title,
  icon,
  action,
  onAction,
  children,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.cardTitleGroup}>
          {icon && (
            <View style={styles.cardHeadingIcon}>
              <Ionicons name={icon} size={17} color={SportGymColors.success} />
            </View>
          )}
          <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        </View>
        {action && onAction && <Pressable onPress={onAction}><ThemedText style={styles.actionText}>{action}</ThemedText></Pressable>}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function ProgressNavigation({
  page,
  onSelect,
}: {
  page: ProgressTab;
  onSelect: (tab: ProgressTab) => void;
}) {
  const descriptions: Record<ProgressTab, string> = {
    Resumen: 'Un vistazo claro a tus entrenamientos y metas.',
    Gráficas: 'Compara tus sesiones y cambios corporales con el tiempo.',
    Logros: 'Celebra cada paso: tus hitos se desbloquean al avanzar.',
  };
  const icons: Record<ProgressTab, keyof typeof Ionicons.glyphMap> = {
    Resumen: 'stats-chart-outline',
    Gráficas: 'trending-up-outline',
    Logros: 'trophy-outline',
  };

  return (
    <>
      <View style={styles.tabs}>
        {(['Resumen', 'Gráficas', 'Logros'] as ProgressTab[]).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === page }}
            onPress={() => onSelect(tab)}
            style={[styles.tab, tab === page && styles.tabActive]}
          >
            <Ionicons
              name={icons[tab]}
              size={17}
              color={tab === page ? '#FFFFFF' : '#89958B'}
            />
            <ThemedText style={[styles.tabText, tab === page && styles.tabTextActive]}>
              {tab}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <ThemedText style={styles.sectionHintText}>{descriptions[page]}</ThemedText>
    </>
  );
}

function MotivationBanner({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.motivationBanner}>
      <View style={styles.motivationIcon}>
        <Ionicons name={icon} size={22} color="#1B6A37" />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.motivationTitle}>{title}</ThemedText>
        <ThemedText style={styles.motivationText}>{text}</ThemedText>
      </View>
      <Ionicons name="trending-up" size={24} color="#2C8B4A" />
    </View>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={17} color={SportGymColors.success} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function Field({ label }: { label: string }) {
  return <ThemedText style={styles.fieldLabel}>{label}</ThemedText>;
}

function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      onPress={onPress}
      style={[styles.primaryButton, (loading || disabled) && styles.disabledButton]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.primaryButtonText}>{label}</ThemedText>}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <ThemedText style={styles.secondaryButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton}>
      <Ionicons name={icon} size={17} color={SportGymColors.success} />
      <ThemedText style={styles.actionButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function ProgressMeter({
  current,
  initial,
  target,
  unit,
}: {
  current: number | null;
  initial: number | null;
  target: number | null;
  unit: WeightUnit;
}) {
  const percentage = calculateProgressPercentage(current, initial, target);
  const remaining = current !== null && target !== null ? Math.abs(current - target) : null;
  return (
    <View style={styles.meterGroup}>
      <View style={styles.progressMeterHeading}>
        <View style={styles.flex}>
          <ThemedText style={styles.metricLabel}>Progreso hacia tu meta</ThemedText>
          <ThemedText style={styles.labelSmall}>
            {target === null ? 'Registra tu peso y define una meta' : 'Un paso a la vez'}
          </ThemedText>
        </View>
        <ThemedText style={styles.progressMeterPercent}>{Math.round(percentage)}%</ThemedText>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${percentage}%` }]} />
      </View>
      <ThemedText style={styles.labelSmall}>
        {target === null
          ? 'Define un peso meta'
          : initial === null && current !== target
            ? 'Registra tu peso inicial para medir el avance'
            : `${Math.round(percentage)}% del objetivo${remaining === 0 ? ' · meta alcanzada' : remaining !== null ? ` · ${formatWeight(remaining, unit)} para la meta` : ''}`}
      </ThemedText>
    </View>
  );
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const bestDayIndex = values.indexOf(Math.max(...values));
  const todayIndex = (new Date().getDay() + 6) % 7;
  return (
    <View>
      <View style={styles.chartSummary}>
        <View>
          <ThemedText style={styles.chartSummaryValue}>{total}</ThemedText>
          <ThemedText style={styles.chartSummaryLabel}>{total === 1 ? 'ejercicio esta semana' : 'ejercicios esta semana'}</ThemedText>
        </View>
        {total > 0 && (
          <View style={styles.chartHighlight}>
            <Ionicons name="flash-outline" size={14} color={SportGymColors.success} />
            <ThemedText style={styles.chartHighlightText}>Más ejercicios: {labels[bestDayIndex]}</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.barChart}>
        {labels.map((label, index) => (
          <View key={label} style={styles.barColumn}>
            <ThemedText style={styles.barValue}>{values[index] || ''}</ThemedText>
            <View style={styles.barTrack}>
              {values[index] > 0 && (
                <View
                  style={[
                    styles.barFill,
                    index === todayIndex && styles.barFillToday,
                    { height: `${Math.max(12, (values[index] / max) * 100)}%` },
                  ]}
                />
              )}
            </View>
            <ThemedText style={[styles.barLabel, index === todayIndex && styles.barLabelToday]}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function WeightChart({
  weights,
  unit,
}: {
  weights: ClientProgressHistory['weights'];
  unit: WeightUnit;
}) {
  const values = weights.slice(-8);
  const [plotWidth, setPlotWidth] = useState(0);
  const min = Math.min(...values.map((entry) => entry.weight));
  const max = Math.max(...values.map((entry) => entry.weight));
  const range = Math.max(1, max - min);
  const change = values.at(-1)!.weight - values[0].weight;
  const highestEntry = weights.reduce((highest, entry) =>
    entry.weight > highest.weight ? entry : highest,
  );
  const lowestEntry = weights.reduce((lowest, entry) =>
    entry.weight < lowest.weight ? entry : lowest,
  );
  const changeLabel = values.length < 2
    ? '1 registro'
    : change === 0
      ? 'Sin cambio'
      : `${change > 0 ? '+' : ''}${formatNumber(weightFromKg(change, unit))} ${unit}`;
  const plotHeight = 124;
  const points = values.map((entry, index) => {
    const ratio = values.length > 1 ? index / (values.length - 1) : 0.5;
    const normalizedWeight = max === min ? 0.5 : (entry.weight - min) / range;
    return {
      x: 10 + ratio * Math.max(0, plotWidth - 20),
      y: 8 + (1 - normalizedWeight) * (plotHeight - 16),
    };
  });
  return (
    <View>
      <View style={styles.weightSummary}>
        <View>
          <ThemedText style={styles.chartSummaryValue}>{formatWeight(values.at(-1)!.weight, unit)}</ThemedText>
          <ThemedText style={styles.chartSummaryLabel}>último registro · {formatDate(values.at(-1)!.date)}</ThemedText>
        </View>
        <View style={styles.weightChange}>
          <Ionicons
            name={values.length < 2
              ? 'ellipse-outline'
              : change === 0
                ? 'remove-outline'
                : change < 0
                  ? 'arrow-down-outline'
                  : 'arrow-up-outline'}
            size={15}
            color={SportGymColors.success}
          />
          <ThemedText style={styles.weightChangeText}>{changeLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.weightHighlights}>
        <WeightHighlight
          icon="scale-outline"
          label="Actual"
          value={formatWeight(values.at(-1)!.weight, unit)}
          detail={formatDate(values.at(-1)!.date)}
          tone="green"
        />
        <WeightHighlight
          icon="trending-up-outline"
          label="Más alto"
          value={formatWeight(highestEntry.weight, unit)}
          detail={formatDate(highestEntry.date)}
          tone="red"
        />
        <WeightHighlight
          icon="trending-down-outline"
          label="Más bajo"
          value={formatWeight(lowestEntry.weight, unit)}
          detail={formatDate(lowestEntry.date)}
          tone="green"
        />
      </View>
      <View style={styles.chartRange}>
        <ThemedText style={styles.chartRangeLabel}>Rango: {formatWeight(min, unit)}–{formatWeight(max, unit)}</ThemedText>
        <ThemedText style={styles.chartRangeLabel}>Cada punto = un registro</ThemedText>
      </View>
      <View
        accessibilityRole="image"
        accessibilityLabel={`Evolución del peso: de ${formatWeight(values[0].weight, unit)} a ${formatWeight(values.at(-1)!.weight, unit)} en ${values.length} registros`}
        onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
        style={[styles.weightPlot, { height: plotHeight }]}
      >
        {[0, 0.5, 1].map((position) => (
          <View
            key={position}
            style={[styles.weightGridLine, { top: 8 + position * (plotHeight - 16) }]}
          />
        ))}
        {plotWidth > 0 && points.slice(1).map((point, index) => {
          const previous = points[index];
          const length = Math.hypot(point.x - previous.x, point.y - previous.y);
          const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
          return (
            <View
              key={`line-${index}`}
              style={[
                styles.weightLine,
                {
                  left: (point.x + previous.x - length) / 2,
                  top: (point.y + previous.y - 2) / 2,
                  width: length,
                  transform: [{ rotate: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {plotWidth > 0 && points.map((point, index) => (
          <View
            key={`${values[index].date}-${index}`}
            style={[
              styles.weightPoint,
              index === points.length - 1 && styles.weightPointLatest,
              { left: point.x - 5, top: point.y - 5 },
            ]}
          />
        ))}
      </View>
      <View style={styles.weightDateAxis}>
        <ThemedText style={styles.chartRangeLabel}>{formatDate(values[0].date)}</ThemedText>
        <ThemedText style={styles.chartRangeLabel}>{values.length > 1 ? formatDate(values.at(-1)!.date) : 'Registro más reciente'}</ThemedText>
      </View>
      <ThemedText style={styles.caption}>La línea conecta tus registros en orden cronológico.</ThemedText>
    </View>
  );
}

function MeasurementTrends({ entries }: { entries: ClientMeasurementEntry[] }) {
  return (
    <View style={styles.trends}>
      {measurementFields.flatMap((field) => {
        const measuredEntries = entries.filter((entry) => entry[field.key] !== undefined).slice(-6);
        const records = measuredEntries.map((entry) => entry[field.key]!);
        if (!records.length) return [];
        const min = Math.min(...records);
        const max = Math.max(...records);
        const range = Math.max(1, max - min);
        const change = records.length > 1 ? records.at(-1)! - records.at(-2)! : null;
        return (
          <View key={field.key} style={styles.trend}>
            <View style={styles.trendHeading}>
              <View>
                <ThemedText style={styles.metricLabel}>{field.label}</ThemedText>
                <ThemedText style={styles.labelSmall}>
                  {change === null
                    ? `Último registro · ${formatDate(measuredEntries.at(-1)!.date)}`
                    : `${change > 0 ? '+' : ''}${formatNumber(change)} cm desde el registro anterior`}
                </ThemedText>
              </View>
              <ThemedText style={styles.metricValue}>{formatNumber(records.at(-1)!)} cm</ThemedText>
            </View>
            <View style={styles.sparkline}>
              {records.map((value, index) => (
                <View
                  key={index}
                  style={[
                    styles.sparkBar,
                    index === records.length - 1 && styles.sparkBarLatest,
                    { height: `${Math.max(20, 30 + ((value - min) / range) * 70)}%` },
                  ]}
                />
              ))}
            </View>
            <ThemedText style={styles.chartRangeLabel}>
              {formatDate(measuredEntries[0].date)} — {formatDate(measuredEntries.at(-1)!.date)}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function ProjectionList({
  current,
  target,
  unit,
}: {
  current: number;
  target: number;
  unit: WeightUnit;
}) {
  const totalWeeks = Math.max(1, Math.ceil(Math.abs(target - current) / 0.5));
  const count = Math.min(5, totalWeeks + 1);
  return (
    <View style={styles.projectionList}>
      {Array.from({ length: count }, (_, index) => {
        const week = Math.round((index * totalWeeks) / Math.max(1, count - 1));
        const estimatedWeight = index === count - 1
          ? target
          : current + Math.sign(target - current) * Math.min(week * 0.5, Math.abs(target - current));
        return (
          <View key={`${week}-${index}`} style={styles.projectionItem}>
            <View style={styles.timelineDot} />
            <View style={styles.flex}>
              <ThemedText style={styles.rowTitle}>{week === 0 ? 'Inicio' : `Semana ${week}`}</ThemedText>
              <ThemedText style={styles.labelSmall}>Peso de referencia: {formatWeight(estimatedWeight, unit)}</ThemedText>
            </View>
            {index === count - 1 && <Ionicons name="checkmark-circle" size={19} color={SportGymColors.success} />}
          </View>
        );
      })}
    </View>
  );
}

function WorkoutRow({ workout }: { workout: WorkoutProgress['recentWorkouts'][number] }) {
  return (
    <HistoryRow
      icon="barbell-outline"
      title={`${workout.exercises} ${workout.exercises === 1 ? 'ejercicio' : 'ejercicios'}`}
      date={formatDate(workout.date)}
      detail={workout.durationMinutes ? `${workout.durationMinutes} min` : undefined}
    />
  );
}

function HistoryRow({
  icon,
  title,
  date,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  date: string;
  detail?: string;
}) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}><Ionicons name={icon} size={18} color={SportGymColors.success} /></View>
      <View style={styles.flex}>
        <ThemedText style={styles.rowTitle}>{title}</ThemedText>
        <ThemedText style={styles.labelSmall}>{date}</ThemedText>
      </View>
      {detail && <ThemedText style={styles.detailText}>{detail}</ThemedText>}
    </View>
  );
}

function MeasurementRow({ entry }: { entry: ClientMeasurementEntry }) {
  const values = measurementFields.flatMap((field) => entry[field.key] === undefined ? [] : [{ label: field.label, value: entry[field.key]! }]);
  return (
    <View style={styles.measurementValues}>
      {values.map((item) => (
        <View key={item.label} style={styles.measurementValue}>
          <ThemedText style={styles.labelSmall}>{item.label}</ThemedText>
          <ThemedText style={styles.metricValue}>{formatNumber(item.value)} cm</ThemedText>
        </View>
      ))}
    </View>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.flex}>
        <ThemedText style={styles.metricLabel}>{label}</ThemedText>
        {detail && <ThemedText style={styles.labelSmall}>{detail}</ThemedText>}
      </View>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

function WeightHighlight({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'red';
}) {
  return (
    <View style={[styles.weightHighlight, tone === 'red' && styles.weightHighlightRed]}>
      <View style={[styles.weightHighlightIcon, tone === 'red' && styles.weightHighlightIconRed]}>
        <Ionicons name={icon} size={16} color={tone === 'red' ? '#FF7485' : SportGymColors.success} />
      </View>
      <ThemedText style={styles.weightHighlightLabel}>{label}</ThemedText>
      <ThemedText style={styles.weightHighlightValue}>{value}</ThemedText>
      <ThemedText style={styles.weightHighlightDetail}>{detail}</ThemedText>
    </View>
  );
}

function Empty({ title, text, icon, action, onAction }: { title: string; text: string; icon: keyof typeof Ionicons.glyphMap; action: string; onAction: () => void }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={SportGymColors.success} />
      <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      <ThemedText style={styles.bodyText}>{text}</ThemedText>
      <PrimaryButton label={action} onPress={onAction} />
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name="information-circle-outline" size={18} color="#E1B765" />
      <ThemedText style={styles.noticeText}>{text}</ThemedText>
    </View>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={SportGymColors.success} />
      <ThemedText style={styles.labelSmall}>Consultando progreso guardado…</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#070A08' },
  safeArea: { flex: 1 },
  frame: { flex: 1, marginHorizontal: 5, marginBottom: 4, borderWidth: 1, borderColor: '#26372B', borderRadius: 24, backgroundColor: '#0A0F0B', overflow: 'hidden' },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1D2A21', backgroundColor: '#0A0F0B' },
  back: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#F2F2F2', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  unitToggle: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 10, backgroundColor: '#171D18', borderWidth: 1, borderColor: '#344137' },
  unitOption: { minWidth: 30, minHeight: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  unitOptionSelected: { backgroundColor: '#32653D' },
  unitOptionDisabled: { opacity: 0.55 },
  unitOptionText: { color: '#A8B2AA', fontSize: 11, fontWeight: '800' },
  unitOptionTextSelected: { color: '#FFFFFF' },
  content: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 18, gap: 13 },
  tabs: { flexDirection: 'row', gap: 5, padding: 5, borderRadius: 15, backgroundColor: '#101712', borderWidth: 1, borderColor: '#2A382E' },
  tab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10 },
  tabActive: { backgroundColor: '#268345', borderWidth: 1, borderColor: '#51B75E' },
  tabText: { color: '#AEB4B0', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  sectionHintText: { color: '#9CA99F', fontSize: 11, lineHeight: 16, paddingHorizontal: 5, marginTop: -7 },
  goalCard: { position: 'relative', overflow: 'hidden', minHeight: 116, justifyContent: 'center', padding: 17, borderRadius: 19, backgroundColor: '#102419', borderWidth: 1, borderColor: '#31563A' },
  goalGlowOne: { position: 'absolute', width: 180, height: 180, right: -55, top: -105, borderRadius: 90, backgroundColor: '#1C6A35', opacity: 0.26 },
  goalGlowTwo: { position: 'absolute', width: 95, height: 95, right: 48, bottom: -70, borderRadius: 48, backgroundColor: '#37A64E', opacity: 0.16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#277D3F', justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  eyebrow: { color: '#7DDD75', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 3 },
  goalSubtitle: { color: '#A9BCAF', fontSize: 11, fontWeight: '500', marginTop: 4 },
  goalEditButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#1B4D2B', borderWidth: 1, borderColor: '#43804A' },
  goalEditText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  weightOverview: { minHeight: 152, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, paddingHorizontal: 8, paddingVertical: 13, borderRadius: 18, backgroundColor: '#101813', borderWidth: 1, borderColor: '#28392D' },
  weightOverviewColumn: { flex: 1, alignItems: 'flex-start', gap: 5, paddingHorizontal: 5 },
  weightOverviewColumnRight: { alignItems: 'flex-end' },
  overviewIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 2, borderRadius: 11, backgroundColor: '#1B3624' },
  overviewIconMuted: { backgroundColor: '#202B23' },
  overviewDivider: { width: 1, height: 96, backgroundColor: '#29352D' },
  overviewProgress: { width: 82, alignItems: 'center', justifyContent: 'center' },
  progressRing: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 38, borderWidth: 4, borderColor: '#4C9A3A', backgroundColor: '#132319' },
  progressRingValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 1 },
  progressRingCaption: { color: '#AAB6AC', fontSize: 9, fontWeight: '600' },
  overviewHint: { color: '#96A398', fontSize: 9, lineHeight: 13 },
  rangeStrip: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, backgroundColor: '#121B15', borderWidth: 1, borderColor: '#29392E' },
  rangeStripTitle: { color: '#E4EBE5', fontSize: 11, fontWeight: '700' },
  rangeStripValue: { color: '#9FADA2', fontSize: 10, marginTop: 3 },
  bmiReferenceCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 13, backgroundColor: '#142219', borderWidth: 1, borderColor: '#31563A' },
  bmiReferenceIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#1C3824' },
  bmiReferenceValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 4, marginBottom: 3 },
  weightPair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  labelSmall: { color: '#A7AEA9', fontSize: 11, fontWeight: '500' },
  weightLarge: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 1 },
  alignRight: { alignItems: 'flex-end' },
  updateWeightButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 0, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#61C746', borderWidth: 1, borderColor: '#7BDF5A' },
  updateWeightButtonText: { color: '#102316', fontSize: 12, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 95, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, borderRadius: 15, backgroundColor: '#111813', borderWidth: 1, borderColor: '#2A392F' },
  statIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 2, borderRadius: 10, backgroundColor: '#1C3524' },
  statValue: { color: '#F1F3F1', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#AEB4B0', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  card: { padding: 15, borderRadius: 17, backgroundColor: '#111813', borderWidth: 1, borderColor: '#28372D' },
  cardHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 11 },
  cardTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  cardHeadingIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1C3524' },
  cardTitle: { flex: 1, color: '#F2F4F2', fontSize: 14, fontWeight: '800' },
  actionText: { color: '#7AD865', fontSize: 11, fontWeight: '800' },
  cardBody: { gap: 12 },
  bodyText: { color: '#B5BCB7', fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5, borderRadius: 11, borderWidth: 1, borderColor: '#3B6C42', backgroundColor: '#14241A' },
  actionButtonText: { color: '#E9F0EB', fontSize: 11, fontWeight: '700' },
  meterGroup: { gap: 9 },
  progressMeterHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressMeterPercent: { color: '#8EE16B', fontSize: 22, fontWeight: '900' },
  meterTrack: { height: 13, borderRadius: 8, overflow: 'hidden', backgroundColor: '#29362D' },
  meterFill: { height: '100%', borderRadius: 8, backgroundColor: '#67D34D' },
  graphIntro: { position: 'relative', overflow: 'hidden', minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 17, backgroundColor: '#10251A', borderWidth: 1, borderColor: '#2D633B' },
  graphIntroGlow: { position: 'absolute', width: 150, height: 150, right: -55, top: -80, borderRadius: 75, backgroundColor: '#2C8F43', opacity: 0.22 },
  graphIntroIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#267B3D' },
  graphIntroTitle: { color: '#F5F8F5', fontSize: 15, fontWeight: '800' },
  graphIntroText: { color: '#AEBDB1', fontSize: 11, lineHeight: 16, marginTop: 4 },
  chartSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
  chartSummaryValue: { color: '#F1F5F1', fontSize: 22, fontWeight: '900' },
  chartSummaryLabel: { color: '#A3ADA5', fontSize: 10, fontWeight: '600', marginTop: 2 },
  chartHighlight: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, backgroundColor: '#213328' },
  chartHighlightText: { color: '#D6E7D8', fontSize: 10, fontWeight: '700' },
  barChart: { height: 140, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around', gap: 5, paddingTop: 3 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: 4, paddingVertical: 6, borderRadius: 11, backgroundColor: '#141C16', borderWidth: 1, borderColor: '#28352C' },
  barValue: { height: 13, color: '#E2E7E3', fontSize: 9, fontWeight: '700' },
  barTrack: { width: '70%', height: 72, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7, backgroundColor: '#25332A' },
  barFill: { width: '100%', borderRadius: 7, backgroundColor: '#25B950' },
  barFillToday: { backgroundColor: '#89E763' },
  barLabel: { color: '#A3AAA5', fontSize: 9, fontWeight: '700' },
  barLabelToday: { color: '#A0D65E', fontWeight: '800' },
  caption: { color: '#9CA99F', fontSize: 10, textAlign: 'center', marginTop: 5, lineHeight: 15 },
  weightSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  weightChange: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, backgroundColor: '#213328' },
  weightChangeText: { color: '#D6E7D8', fontSize: 10, fontWeight: '800' },
  weightHighlights: { flexDirection: 'row', gap: 7, marginBottom: 3 },
  weightHighlight: { flex: 1, minWidth: 0, gap: 3, padding: 9, borderRadius: 12, backgroundColor: '#141D16', borderWidth: 1, borderColor: '#2A3A2D' },
  weightHighlightRed: { backgroundColor: '#211719', borderColor: '#462A2F' },
  weightHighlightIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 2, borderRadius: 9, backgroundColor: '#1C3824' },
  weightHighlightIconRed: { backgroundColor: '#3A2025' },
  weightHighlightLabel: { color: '#AEB8B0', fontSize: 9, fontWeight: '600' },
  weightHighlightValue: { color: '#F3F6F3', fontSize: 12, fontWeight: '900' },
  weightHighlightDetail: { color: '#929D94', fontSize: 8, lineHeight: 11 },
  chartRange: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  chartRangeLabel: { color: '#8F9A91', fontSize: 9 },
  motivationBanner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 17, backgroundColor: '#D9F3DF', borderWidth: 1, borderColor: '#B9E6C3' },
  motivationIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F3FFF5' },
  motivationTitle: { color: '#164D29', fontSize: 14, fontWeight: '900' },
  motivationText: { color: '#385B42', fontSize: 10, lineHeight: 15, marginTop: 3 },
  weightPlot: { position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: '#0E1510', borderWidth: 1, borderColor: '#26372B' },
  weightGridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#27362B' },
  weightLine: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: '#61D457' },
  weightPoint: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#30B84C', borderWidth: 2, borderColor: '#C6F6A2' },
  weightPointLatest: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#8EE866', borderColor: '#F2FFD9' },
  weightDateAxis: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 7 },
  trends: { gap: 16 },
  trend: { gap: 7, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: '#29332B' },
  trendHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  sparkline: { height: 38, flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingHorizontal: 2 },
  sparkBar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#4C9A3A' },
  sparkBarLatest: { backgroundColor: '#A0D65E' },
  metricLabel: { color: '#E2E6E3', fontSize: 12, fontWeight: '700' },
  metricValue: { color: '#91D174', fontSize: 13, fontWeight: '800' },
  achievement: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#2B302C' },
  achievementSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginBottom: 4, borderRadius: 12, backgroundColor: '#1C2A20', borderWidth: 1, borderColor: '#304B35' },
  achievementSummaryIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#293E2D' },
  saveConfirmation: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#182B1D', borderWidth: 1, borderColor: '#3C7045' },
  confirmationIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: SportGymColors.primary },
  confirmationTitle: { color: '#F1F7EF', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  confirmationMessage: { color: '#C3D1C5', fontSize: 11, lineHeight: 16 },
  confirmationInsight: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 10, backgroundColor: '#1B281E', borderWidth: 1, borderColor: '#304B35' },
  confirmationInsightText: { flex: 1, color: '#D5E5D7', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  measurementPreview: { gap: 8, padding: 11, borderRadius: 11, backgroundColor: '#1B281E', borderWidth: 1, borderColor: '#304B35' },
  measurementPreviewHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  measurementPreviewRow: { minHeight: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  achievementIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#2B302C' },
  achievementUnlocked: { backgroundColor: '#263A2A' },
  rowTitle: { color: '#F0F2F0', fontSize: 12, fontWeight: '700', marginBottom: 3 },
  metricRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: '#2B302C' },
  goalOption: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: '#3A403B', backgroundColor: '#111412' },
  goalOptionSelected: { borderColor: SportGymColors.primary, backgroundColor: '#174A2A' },
  goalOptionText: { flex: 1, color: '#E2E7E3', fontSize: 12, fontWeight: '700' },
  goalOptionTextSelected: { color: '#FFFFFF' },
  fieldLabel: { color: '#C1C8C3', fontSize: 11, fontWeight: '700', marginBottom: 5 },
  input: { minHeight: 43, paddingHorizontal: 11, borderWidth: 1, borderColor: '#3D443F', borderRadius: 9, backgroundColor: '#111412', color: '#F3F5F3', fontSize: 14 },
  primaryButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: SportGymColors.primary },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#303632' },
  secondaryButtonText: { color: '#E2E7E3', fontSize: 12, fontWeight: '700' },
  projectionHero: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: '#155A34' },
  projectionList: { gap: 4 },
  projectionItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11 },
  timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: SportGymColors.success },
  weightInputCard: { minHeight: 128, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 11, borderWidth: 1, borderColor: '#2D342F', backgroundColor: '#111412' },
  weightInput: { minWidth: 150, color: '#F5F7F5', fontSize: 36, fontWeight: '800', textAlign: 'center' },
  inputWeight: { color: '#F5F7F5', fontSize: 32, fontWeight: '800', marginBottom: 6 },
  measurementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  measurementCell: { flexGrow: 1, width: '47%' },
  measurementValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  measurementValue: { minWidth: '46%', gap: 4, padding: 9, borderRadius: 8, backgroundColor: '#111412' },
  measureHistory: { gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2B302C' },
  historyRow: { minHeight: 51, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2B302C' },
  historyIcon: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#27322A' },
  detailText: { color: '#B5BCB7', fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 10, padding: 14 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: 8, backgroundColor: '#2C261A' },
  noticeText: { flex: 1, color: '#E9D8B7', fontSize: 11, lineHeight: 16 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  loginRequired: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  bottomSpace: { height: 8 },
});
