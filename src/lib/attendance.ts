import { useEffect, useState } from 'react';

const attendanceDates = new Set<string>();
const listeners = new Set<() => void>();

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const registerAttendance = (date = new Date()) => {
  const dateKey = toDateKey(date);

  if (attendanceDates.has(dateKey)) {
    return;
  }

  attendanceDates.add(dateKey);
  listeners.forEach((listener) => listener());
};

export const hasAttendance = (date: Date) => attendanceDates.has(toDateKey(date));

export const useAttendance = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((value) => value + 1);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    hasAttendance,
    total: attendanceDates.size,
  };
};
