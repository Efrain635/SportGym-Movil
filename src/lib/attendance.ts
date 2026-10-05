import { useEffect, useState } from 'react';

const attendanceByUser = new Map<string, Set<string>>();
const listenersByUser = new Map<string, Set<() => void>>();

const getUserKey = (userKey: string | null) =>
  userKey?.trim().toLowerCase() || 'guest';

const getAttendanceDates = (userKey: string) => {
  let dates = attendanceByUser.get(userKey);
  if (!dates) {
    dates = new Set<string>();
    attendanceByUser.set(userKey, dates);
  }

  return dates;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getAttendanceSummary = (attendanceDates: Set<string>) => {
  const today = new Date();
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

export const registerAttendance = (
  userKey: string | null,
  date = new Date(),
) => {
  const normalizedUserKey = getUserKey(userKey);
  const attendanceDates = getAttendanceDates(normalizedUserKey);
  const dateKey = toDateKey(date);

  if (attendanceDates.has(dateKey)) {
    return;
  }

  attendanceDates.add(dateKey);
  listenersByUser.get(normalizedUserKey)?.forEach((listener) => listener());
};

export const useAttendance = (userKey: string | null = null) => {
  const [, forceUpdate] = useState(0);
  const normalizedUserKey = getUserKey(userKey);
  const attendanceDates = getAttendanceDates(normalizedUserKey);

  useEffect(() => {
    const listener = () => forceUpdate((value) => value + 1);
    let userListeners = listenersByUser.get(normalizedUserKey);
    if (!userListeners) {
      userListeners = new Set<() => void>();
      listenersByUser.set(normalizedUserKey, userListeners);
    }
    userListeners.add(listener);

    return () => {
      userListeners?.delete(listener);
      if (userListeners?.size === 0) {
        listenersByUser.delete(normalizedUserKey);
      }
    };
  }, [normalizedUserKey]);

  return {
    hasAttendance: (date: Date) => attendanceDates.has(toDateKey(date)),
    total: attendanceDates.size,
    ...getAttendanceSummary(attendanceDates),
  };
};
