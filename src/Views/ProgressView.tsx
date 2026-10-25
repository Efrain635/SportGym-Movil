import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { useAttendance } from '../lib/attendance';

type ProgressTab = 'Resumen' | 'Gráficas' | 'Logros';
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
  weeklyWorkouts: Array.from({ length: 7 }, () => 0),
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
  const [targetInput, setTargetInput] = useState('');
  const [weightInput, setWeightInput] = useState(user?.weight?.toString() ?? '');
  const [weightConfirmation, setWeightConfirmation] = useState(false);
  const [measurementInput, setMeasurementInput] = useState<Record<MeasurementKey, string>>({
    waist: '',
    hip: '',
    arms: '',
    thighs: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let active = true;

    const unsubscribeProgress = subscribeClientProgressHistory(
      clientId,
      (result) => {
        if (!active) return;
        setHistory(result);
        setGoalInput(result.goal ?? user?.goal ?? '');
        setTargetInput(result.targetWeight?.toString() ?? '');
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
  const targetNumber = Number(targetInput.replace(',', '.'));
  const targetValid =
    targetInput.trim() !== '' &&
    Number.isFinite(targetNumber) &&
    targetNumber >= 20 &&
    targetNumber <= 400;
  const expectedWeeks =
    currentWeight !== null && targetValid
      ? Math.max(1, Math.ceil(Math.abs(currentWeight - targetNumber) / 0.5))
      : null;

  const navigate = (destination: ProgressPage) => {
    if (destination === 'Objetivo') {
      setGoalInput(clientHistory.goal ?? user?.goal ?? '');
      setTargetInput(clientHistory.targetWeight?.toString() ?? '');
    }
    if (destination === 'Peso') {
      setWeightInput(currentWeight?.toString() ?? '');
      setWeightConfirmation(false);
    }
    setPage(destination);
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
    if (targetInput.trim() && !targetValid) {
      Alert.alert('Peso no válido', 'Ingresa una meta entre 20 y 400 kg.');
      return;
    }

    setSaving(true);
    try {
      const nextTarget = targetInput.trim() ? targetNumber : null;
      await updateClientProgressGoal(clientId, goalInput.trim(), nextTarget);
      setHistory((previous) => ({
        ...previous,
        goal: goalInput.trim(),
        targetWeight: nextTarget,
      }));
      if (user) setUser({ ...user, goal: goalInput.trim() });
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
    if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) {
      Alert.alert('Peso no válido', 'Ingresa un valor entre 20 y 400 kg.');
      return;
    }

    setSaving(true);
    try {
      const date = todayKey();
      await recordClientWeight(clientId, parsedWeight, date);
      setHistory((previous) => ({
        ...previous,
        weights: [
          ...previous.weights.filter(
            (entry) => entry.date !== date || entry.weight !== parsedWeight,
          ),
          { weight: parsedWeight, date },
        ].sort((first, second) => first.date.localeCompare(second.date)),
        nextWeightUpdate: addDays(date, 1),
      }));
      if (user) setUser({ ...user, weight: parsedWeight });
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
      await recordClientMeasurements(clientId, values, date);
      setHistory((previous) => ({
        ...previous,
        measurements: [...previous.measurements, { date, ...values }].sort(
          (first, second) => first.date.localeCompare(second.date),
        ),
        nextMeasurementsUpdate: addDays(date, 7),
      }));
      setMeasurementInput({ waist: '', hip: '', arms: '', thighs: '' });
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
              <View style={styles.row}>
                <View style={styles.heroIcon}>
                  <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <ThemedText style={styles.eyebrow}>TU OBJETIVO</ThemedText>
                  <ThemedText style={styles.heroTitle}>
                    {clientHistory.goal ?? user?.goal ?? 'Define tu objetivo'}
                  </ThemedText>
                </View>
                <Pressable onPress={() => navigate('Objetivo')} accessibilityRole="button">
                  <Ionicons name="create-outline" size={21} color={SportGymColors.success} />
                </Pressable>
              </View>
              <View style={styles.divider} />
              <View style={styles.weightPair}>
                <View>
                  <ThemedText style={styles.labelSmall}>Peso actual</ThemedText>
                  <ThemedText style={styles.weightLarge}>
                    {currentWeight === null ? 'Sin registro' : `${formatNumber(currentWeight)} kg`}
                  </ThemedText>
                </View>
                <Ionicons name="arrow-forward" size={22} color={SportGymColors.success} />
                <View style={styles.alignRight}>
                  <ThemedText style={styles.labelSmall}>Peso meta</ThemedText>
                  <ThemedText style={styles.weightLarge}>
                    {clientHistory.targetWeight === null
                      ? 'Por definir'
                      : `${formatNumber(clientHistory.targetWeight)} kg`}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.stats}>
              <Stat icon="barbell-outline" label="Ejercicios" value={isLoadingWorkouts ? '…' : workoutError ? '—' : String(clientWorkouts.totalExercises)} />
              <Stat icon="fitness-outline" label="Entrenos" value={isLoadingWorkouts ? '…' : workoutError ? '—' : String(clientWorkouts.totalWorkouts)} />
              <Stat icon="calendar-outline" label="Esta semana" value={String(attendance.weekTotal)} />
            </View>
            {workoutError && <Notice text="No se pudieron cargar tus entrenamientos." />}
            {attendance.attendanceError && <Notice text="No se pudieron consultar tus asistencias." />}

            <Card title="Avance de tu objetivo" action="Ver detalle" onAction={() => navigate('Proyección')}>
              <ProgressMeter
                current={currentWeight}
                initial={clientHistory.weights[0]?.weight ?? null}
                target={clientHistory.targetWeight}
              />
              <View style={styles.actionRow}>
                <Action label="Registrar peso" icon="scale-outline" onPress={() => navigate('Peso')} />
                <Action label="Registrar medidas" icon="body-outline" onPress={() => navigate('Medidas')} />
              </View>
            </Card>

            <Card title="Esta semana" action="Ver gráficas" onAction={() => navigate('Gráficas')}>
              <BarChart values={clientWorkouts.weeklyWorkouts} labels={weekdays} />
              <ThemedText style={styles.caption}>Entrenamientos completados por día</ThemedText>
            </Card>

            <Card title="Último entrenamiento" action="Historial" onAction={() => navigate('Historial')}>
              {clientWorkouts.recentWorkouts.length > 0
                ? <WorkoutRow workout={clientWorkouts.recentWorkouts[0]} />
                : <ThemedText style={styles.bodyText}>{isLoadingWorkouts ? 'Cargando entrenamientos…' : 'Al completar una rutina aparecerá aquí.'}</ThemedText>}
            </Card>
            {historyError && <Notice text="No se pudo cargar tu historial de progreso." />}
          </>
        );
      case 'Gráficas':
        return (
          <>
            <Card title="Entrenamientos de esta semana">
              <BarChart values={clientWorkouts.weeklyWorkouts} labels={weekdays} />
              <ThemedText style={styles.caption}>Sesiones completadas por día</ThemedText>
            </Card>
            <Card title="Evolución del peso" action="Registrar" onAction={() => navigate('Peso')}>
              {clientHistory.weights.length
                ? <WeightChart weights={clientHistory.weights} />
                : <Empty title="Sin registros todavía" text="Registra tu peso para crear la gráfica." icon="scale-outline" action="Registrar peso" onAction={() => navigate('Peso')} />}
            </Card>
            <Card title="Medidas corporales" action="Registrar" onAction={() => navigate('Medidas')}>
              {clientHistory.measurements.length
                ? <MeasurementTrends entries={clientHistory.measurements} />
                : <Empty title="Aún no hay medidas" text="Guarda tus medidas para comparar su evolución aquí." icon="body-outline" action="Registrar medidas" onAction={() => navigate('Medidas')} />}
            </Card>
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
            <Card title="Métricas corporales" action="Actualizar" onAction={() => navigate('Medidas')}>
              {currentWeight && user?.height
                ? <Metric label="IMC aproximado" value={formatNumber(currentWeight / ((user.height / 100) ** 2))} detail="Índice basado en peso y estatura" />
                : <ThemedText style={styles.bodyText}>Completa peso y estatura en tu perfil para consultar el IMC.</ThemedText>}
              <Metric label="Asistencias" value={String(attendance.total)} detail="Días registrados" />
              <Metric label="Racha actual" value={`${attendance.currentStreak} días`} detail="Días consecutivos" />
            </Card>
          </>
        );
      case 'Objetivo':
        return (
          <Card title="Selecciona tu objetivo principal">
            <ThemedText style={styles.bodyText}>Tu objetivo se guarda en el perfil de tu cuenta y puedes cambiarlo en cualquier momento.</ThemedText>
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
            <Field label="Peso meta (kg), opcional" />
            <TextInput
              accessibilityLabel="Peso meta en kilogramos"
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="decimal-pad"
              placeholder="Ej. 65"
              placeholderTextColor="#89908C"
              style={styles.input}
            />
            {expectedWeeks !== null && (
              <Notice text={`Estimación orientativa: ${expectedWeeks} semanas a 0.5 kg por semana. No sustituye asesoría profesional.`} />
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
                  <ThemedText style={styles.weightLarge}>{currentWeight === null ? '—' : `${formatNumber(currentWeight)} kg`}</ThemedText>
                </View>
                <Ionicons name="arrow-forward" size={22} color={SportGymColors.success} />
                <View style={styles.alignRight}>
                  <ThemedText style={styles.labelSmall}>Meta</ThemedText>
                  <ThemedText style={styles.weightLarge}>{clientHistory.targetWeight === null ? '—' : `${formatNumber(clientHistory.targetWeight)} kg`}</ThemedText>
                </View>
              </View>
            </View>
            {currentWeight !== null && clientHistory.targetWeight !== null ? (
              <Card title="Proyección estimada">
                <ThemedText style={styles.bodyText}>Referencia visual calculada a 0.5 kg por semana. El resultado real depende de tu entrenamiento y seguimiento.</ThemedText>
                <ProjectionList current={currentWeight} target={clientHistory.targetWeight} />
                <Metric label="Tiempo orientativo" value={`${expectedWeeks ?? 1} semanas`} />
                <Notice text="Consulta con un profesional para establecer metas adecuadas para ti." />
              </Card>
            ) : (
              <Empty title="Define tu peso meta" text="Registra tu peso y un objetivo para ver una proyección." icon="flag-outline" action="Configurar objetivo" onAction={() => navigate('Objetivo')} />
            )}
          </>
        );
      case 'Peso':
        return (
          <Card title={weightConfirmation ? 'Confirma tu peso actual' : 'Registra tu peso'}>
            <ThemedText style={styles.bodyText}>Se permite un registro por día. Tus actualizaciones anteriores se conservan en el historial.</ThemedText>
            {clientHistory.nextWeightUpdate && (
              <Notice text={`Podrás registrar peso nuevamente el ${formatDate(clientHistory.nextWeightUpdate)}.`} />
            )}
            <View style={styles.weightInputCard}>
              {weightConfirmation ? (
                <>
                  <ThemedText style={styles.inputWeight}>{weightInput} kg</ThemedText>
                  <ThemedText style={styles.labelSmall}>{formatDate(todayKey())}</ThemedText>
                </>
              ) : (
                <>
                  <TextInput
                    accessibilityLabel="Peso actual en kilogramos"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#89908C"
                    style={styles.weightInput}
                  />
                  <ThemedText style={styles.labelSmall}>kilogramos</ThemedText>
                </>
              )}
            </View>
            {weightConfirmation ? (
              <View style={styles.actionRow}>
                <SecondaryButton label="Editar" onPress={() => setWeightConfirmation(false)} />
                <PrimaryButton label="Confirmar peso" loading={saving} onPress={saveWeight} />
              </View>
            ) : (
              <PrimaryButton
                label="Continuar"
                disabled={Boolean(clientHistory.nextWeightUpdate)}
                onPress={() => {
                  const value = Number(weightInput.replace(',', '.'));
                  if (!Number.isFinite(value) || value < 20 || value > 400) {
                    Alert.alert('Peso no válido', 'Ingresa un valor entre 20 y 400 kg.');
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
                ? [...clientHistory.weights].reverse().map((entry, index) => <HistoryRow key={`${entry.date}-${index}`} icon="scale-outline" title={`${formatNumber(entry.weight)} kg`} date={formatDate(entry.date)} />)
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
            <ThemedText style={styles.headerTitle}>{pageTitle[page]}</ThemedText>
            <View style={styles.back} />
          </View>
          {clientId ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {isLoadingHistory && <Loading />}
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
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
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
            <ThemedText style={[styles.tabText, tab === page && styles.tabTextActive]}>
              {tab}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionHint}>
        <Ionicons name="sparkles-outline" size={16} color={SportGymColors.success} />
        <ThemedText style={styles.sectionHintText}>{descriptions[page]}</ThemedText>
      </View>
    </>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={SportGymColors.success} />
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

function ProgressMeter({ current, initial, target }: { current: number | null; initial: number | null; target: number | null }) {
  const percentage =
    current !== null && initial !== null && target !== null && initial !== target
      ? Math.max(0, Math.min(100, (1 - Math.abs(current - target) / Math.abs(initial - target)) * 100))
      : current !== null && current === target
        ? 100
        : 0;
  return (
    <View style={styles.meterGroup}>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${percentage}%` }]} />
      </View>
      <ThemedText style={styles.labelSmall}>
        {target === null ? 'Define un peso meta' : initial === null ? 'Registra tu peso inicial para medir el avance' : `${Math.round(percentage)}% del objetivo`}
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
          <ThemedText style={styles.chartSummaryLabel}>{total === 1 ? 'sesión esta semana' : 'sesiones esta semana'}</ThemedText>
        </View>
        {total > 0 && (
          <View style={styles.chartHighlight}>
            <Ionicons name="flash-outline" size={14} color={SportGymColors.success} />
            <ThemedText style={styles.chartHighlightText}>Más activo: {labels[bestDayIndex]}</ThemedText>
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

function WeightChart({ weights }: { weights: ClientProgressHistory['weights'] }) {
  const values = weights.slice(-8);
  const min = Math.min(...values.map((entry) => entry.weight));
  const max = Math.max(...values.map((entry) => entry.weight));
  const range = Math.max(1, max - min);
  const change = values.at(-1)!.weight - values[0].weight;
  return (
    <View>
      <View style={styles.weightSummary}>
        <View>
          <ThemedText style={styles.chartSummaryValue}>{formatNumber(values.at(-1)!.weight)} kg</ThemedText>
          <ThemedText style={styles.chartSummaryLabel}>último registro · {formatDate(values.at(-1)!.date)}</ThemedText>
        </View>
        <View style={styles.weightChange}>
          <Ionicons
            name={change === 0 ? 'remove-outline' : change < 0 ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={15}
            color={SportGymColors.success}
          />
          <ThemedText style={styles.weightChangeText}>
            {change === 0 ? 'Sin cambio' : `${change > 0 ? '+' : ''}${formatNumber(change)} kg`}
          </ThemedText>
        </View>
      </View>
      <View style={styles.chartRange}>
        <ThemedText style={styles.chartRangeLabel}>Rango: {formatNumber(min)}–{formatNumber(max)} kg</ThemedText>
        <ThemedText style={styles.chartRangeLabel}>Más reciente →</ThemedText>
      </View>
      <View style={styles.weightChart}>
        {values.map((entry, index) => (
          <View key={`${entry.date}-${index}`} style={styles.weightColumn}>
            <ThemedText style={styles.barValue}>{formatNumber(entry.weight)}</ThemedText>
            <View style={styles.weightTrack}>
              <View
                style={[
                  styles.weightBar,
                  index === values.length - 1 && styles.weightBarLatest,
                  { height: `${Math.max(16, 25 + ((entry.weight - min) / range) * 75)}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.weightDate}>{formatDate(entry.date).slice(0, 6)}</ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={styles.caption}>Cada barra es un registro de peso en kilogramos.</ThemedText>
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

function ProjectionList({ current, target }: { current: number; target: number }) {
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
              <ThemedText style={styles.labelSmall}>Peso de referencia: {formatNumber(estimatedWeight)} kg</ThemedText>
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
  screen: { flex: 1, backgroundColor: '#080A08' },
  safeArea: { flex: 1 },
  frame: { flex: 1, marginHorizontal: 5, marginBottom: 4, borderWidth: 1, borderColor: '#303B32', borderRadius: 24, backgroundColor: '#0B0E0B', overflow: 'hidden' },
  header: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E261F' },
  back: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#F2F2F2', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  content: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 16, gap: 13 },
  tabs: { flexDirection: 'row', gap: 5, padding: 5, borderRadius: 13, backgroundColor: '#151A16', borderWidth: 1, borderColor: '#29322B' },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: '#285C37', borderWidth: 1, borderColor: '#4C9A3A' },
  tabText: { color: '#AEB4B0', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  sectionHint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 1 },
  sectionHintText: { flex: 1, color: '#AEB9B0', fontSize: 11, lineHeight: 16 },
  goalCard: { padding: 17, borderRadius: 17, backgroundColor: '#14291A', borderWidth: 1, borderColor: '#355C3B' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: SportGymColors.primary, justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  eyebrow: { color: '#A7C9AE', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#35513D', marginVertical: 14 },
  weightPair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelSmall: { color: '#A7AEA9', fontSize: 11, fontWeight: '500' },
  weightLarge: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 4 },
  alignRight: { alignItems: 'flex-end' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, borderRadius: 14, backgroundColor: '#151A16', borderWidth: 1, borderColor: '#29332B' },
  statValue: { color: '#F1F3F1', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#AEB4B0', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  card: { padding: 15, borderRadius: 16, backgroundColor: '#151A16', borderWidth: 1, borderColor: '#29332B' },
  cardHeading: { minHeight: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  cardTitle: { flex: 1, color: '#F2F4F2', fontSize: 15, fontWeight: '800' },
  actionText: { color: '#91D174', fontSize: 12, fontWeight: '700' },
  cardBody: { gap: 12 },
  bodyText: { color: '#B5BCB7', fontSize: 12, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5, borderRadius: 9, borderWidth: 1, borderColor: '#3B5B40', backgroundColor: '#142119' },
  actionButtonText: { color: '#E9F0EB', fontSize: 11, fontWeight: '700' },
  meterGroup: { gap: 7 },
  meterTrack: { height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: '#303A32' },
  meterFill: { height: '100%', borderRadius: 6, backgroundColor: SportGymColors.success },
  chartSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
  chartSummaryValue: { color: '#F1F5F1', fontSize: 22, fontWeight: '900' },
  chartSummaryLabel: { color: '#A3ADA5', fontSize: 10, fontWeight: '600', marginTop: 2 },
  chartHighlight: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, backgroundColor: '#213328' },
  chartHighlightText: { color: '#D6E7D8', fontSize: 10, fontWeight: '700' },
  barChart: { height: 124, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 7, paddingTop: 4 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { height: 14, color: '#E2E7E3', fontSize: 9, fontWeight: '700' },
  barTrack: { width: '72%', height: 78, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 7, backgroundColor: '#27302A' },
  barFill: { width: '100%', borderRadius: 7, backgroundColor: '#4C9A3A' },
  barFillToday: { backgroundColor: '#A0D65E' },
  barLabel: { color: '#A3AAA5', fontSize: 10, fontWeight: '600' },
  barLabelToday: { color: '#A0D65E', fontWeight: '800' },
  caption: { color: '#949C96', fontSize: 10, textAlign: 'center', marginTop: 7 },
  weightSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  weightChange: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20, backgroundColor: '#213328' },
  weightChangeText: { color: '#D6E7D8', fontSize: 10, fontWeight: '800' },
  chartRange: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 7 },
  chartRangeLabel: { color: '#8F9A91', fontSize: 9 },
  weightChart: { height: 145, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  weightColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  weightTrack: { width: '75%', height: 98, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 6, backgroundColor: '#27302A' },
  weightBar: { width: '100%', borderRadius: 6, backgroundColor: '#4C9A3A' },
  weightBarLatest: { backgroundColor: '#A0D65E' },
  weightDate: { color: '#A3AAA5', fontSize: 8, textAlign: 'center' },
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
