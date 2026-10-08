import { useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../assets/database/firebase';

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getAttendanceSummary = (
  attendanceDates: Set<string>,
  referenceDate = new Date(),
) => {
  const today = new Date(referenceDate);
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let currentStreak = 0;
  let streakDate = attendanceDates.has(todayKey)
    ? today
    : attendanceDates.has(toDateKey(yesterday))
      ? yesterday
      : null;

  while (streakDate && attendanceDates.has(toDateKey(streakDate))) {
    currentStreak += 1;
    streakDate.setDate(streakDate.getDate() - 1);
  }

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekTotal = [...attendanceDates].filter(
    (dateKey) => dateKey >= toDateKey(weekStart) && dateKey < toDateKey(weekEnd),
  ).length;

  const attendanceDayNumbers = [...attendanceDates]
    .sort()
    .map((dateKey) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24);
    });
  let bestStreak = 0;
  let consecutiveDays = 0;
  let previousDayNumber: number | null = null;

  for (const dayNumber of attendanceDayNumbers) {
    consecutiveDays =
      previousDayNumber !== null && dayNumber === previousDayNumber + 1
        ? consecutiveDays + 1
        : 1;
    bestStreak = Math.max(bestStreak, consecutiveDays);
    previousDayNumber = dayNumber;
  }

  return { currentStreak, weekTotal, bestStreak };
};

export async function registerAttendance(
  clientId: string,
  username: string,
  date = new Date(),
) {
  if (!clientId.trim()) {
    throw new Error('missing-client-id');
  }
  if (!username.trim()) {
    throw new Error('missing-username');
  }

  const dateKey = toDateKey(date);
  const clientRef = doc(db, 'clientes', clientId);
  const attendanceRef = doc(db, 'asistencias', `${clientId}_${dateKey}`);

  return runTransaction(db, async (transaction) => {
    const clientSnapshot = await transaction.get(clientRef);
    if (!clientSnapshot.exists()) {
      throw new Error('client-not-found');
    }
    const attendanceSnapshot = await transaction.get(attendanceRef);

    const clientData = clientSnapshot.data();
    const attendanceDates = new Set(
      Array.isArray(clientData.asistencias)
        ? clientData.asistencias.filter(isDateKey)
        : [],
    );

    const wasAlreadyRegistered =
      attendanceDates.has(dateKey) || attendanceSnapshot.exists();

    attendanceDates.add(dateKey);
    const { currentStreak, bestStreak } = getAttendanceSummary(
      attendanceDates,
      date,
    );

    if (!attendanceSnapshot.exists()) {
      const firstName =
        typeof clientData.nombre === 'string' ? clientData.nombre : '';
      const lastName =
        typeof clientData.apellido === 'string' ? clientData.apellido : '';

      transaction.set(attendanceRef, {
        nombreUsuario: username.trim(),
        usuario: username.trim(),
        hora: serverTimestamp(),
        fecha: dateKey,
        cliente: clientId,
        nombreCliente: [firstName, lastName].filter(Boolean).join(' '),
        estado: 'presente',
      });
    }

    transaction.update(clientRef, {
      asistencias: [...attendanceDates].sort(),
      rachaAsistencia: currentStreak,
      mejorRachaAsistencia: bestStreak,
      totalAsistencias: attendanceDates.size,
    });

    return !wasAlreadyRegistered;
  });
}

export const useAttendance = (clientId: string | null = null) => {
  const [attendanceState, setAttendanceState] = useState<{
    clientId: string;
    dates: string[];
    error: boolean;
  } | null>(null);
  const normalizedClientId = clientId?.trim() || null;

  useEffect(() => {
    if (!normalizedClientId) {
      return;
    }

    return onSnapshot(
      doc(db, 'clientes', normalizedClientId),
      (snapshot) => {
        const dates = snapshot.data()?.asistencias;
        setAttendanceState({
          clientId: normalizedClientId,
          dates: Array.isArray(dates) ? dates.filter(isDateKey) : [],
          error: false,
        });
      },
      (error) => {
        console.error('Error al cargar las asistencias del cliente:', error);
        setAttendanceState({
          clientId: normalizedClientId,
          dates: [],
          error: true,
        });
      },
    );
  }, [normalizedClientId]);

  const isCurrentClient = attendanceState?.clientId === normalizedClientId;
  const attendanceDates = isCurrentClient ? attendanceState.dates : [];
  const attendanceError = isCurrentClient && attendanceState.error;
  const attendanceDateSet = new Set(attendanceDates);

  return {
    hasAttendance: (date: Date) => attendanceDateSet.has(toDateKey(date)),
    total: attendanceDates.length,
    attendanceError,
    ...getAttendanceSummary(attendanceDateSet),
  };
};
