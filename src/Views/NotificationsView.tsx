import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

type NotificationFilter = 'Todos' | 'Recordatorios' | 'Pagos';
type NotificationCategory = Exclude<NotificationFilter, 'Todos'>;

type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timeLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  sortTime: number;
};

const parseDate = (value: string | null) => {
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

const getCalendarDayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

const formatDate = (date: Date) =>
  date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getTimeSince = (date: Date, now: Date) => {
  const elapsedMilliseconds = Math.max(0, now.getTime() - date.getTime());
  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);
  const elapsedHours = Math.floor(elapsedMilliseconds / 3_600_000);
  const elapsedDays = Math.floor(elapsedMilliseconds / 86_400_000);

  if (elapsedMinutes < 1) {
    return 'Ahora';
  }

  if (elapsedHours < 1) {
    return `Hace ${elapsedMinutes} min`;
  }

  if (elapsedHours < 24) {
    return `Hace ${elapsedHours} h`;
  }

  return `Hace ${elapsedDays} ${elapsedDays === 1 ? 'día' : 'días'}`;
};

export default function NotificationsView() {
  const [activeFilter, setActiveFilter] =
    useState<NotificationFilter>('Todos');
  const { user } = useAuth();

  const notifications = useMemo(() => {
    const now = new Date();
    const membership = user?.membership;
    if (!membership) {
      return [];
    }

    const items: NotificationItem[] = [];
    const endDate = parseDate(membership.endDate);
    const startDate = parseDate(membership.startDate);

    if (endDate) {
      const daysUntilExpiration = Math.floor(
        (getCalendarDayNumber(endDate) - getCalendarDayNumber(now)) /
          86_400_000,
      );

      if (daysUntilExpiration < 0) {
        items.push({
          id: 'membership-expired',
          category: 'Recordatorios',
          title: 'Tu membresía está vencida',
          description: `Venció el ${formatDate(endDate)}. Realiza tu pago para renovarla.`,
          timeLabel: 'Requiere atención',
          icon: 'alert',
          iconColor: '#7B1830',
          iconBackground: '#F4A0B2',
          sortTime: now.getTime(),
        });
      } else if (daysUntilExpiration <= 5) {
        items.push({
          id: 'membership-expiring',
          category: 'Recordatorios',
          title:
            daysUntilExpiration === 0
              ? 'Tu próxima mensualidad vence hoy'
              : `Tu próxima mensualidad vence en ${daysUntilExpiration} ${
                  daysUntilExpiration === 1 ? 'día' : 'días'
                }`,
          description: `Fecha de vencimiento: ${formatDate(endDate)}`,
          timeLabel: 'Recordatorio de pago',
          icon: 'alert',
          iconColor: '#7B1830',
          iconBackground: '#F4A0B2',
          sortTime: now.getTime(),
        });
      }
    }

    if (
      startDate &&
      getCalendarDayNumber(startDate) <= getCalendarDayNumber(now)
    ) {
      items.push({
        id: `membership-payment-${startDate.toISOString()}`,
        category: 'Pagos',
        title: 'Pago de membresía registrado',
        description: `Pago registrado el ${formatDate(startDate)}`,
        timeLabel: getTimeSince(startDate, now),
        icon: 'shield-checkmark',
        iconColor: '#456F38',
        iconBackground: '#C7E8A5',
        sortTime: startDate.getTime(),
      });
    }

    return items.sort((first, second) => second.sortTime - first.sortTime);
  }, [user?.membership]);

  const filteredNotifications =
    activeFilter === 'Todos'
      ? notifications
      : notifications.filter(
          (notification) => notification.category === activeFilter,
        );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={SportGymColors.primary}
              />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Notificaciones</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.filters}>
            {(['Todos', 'Recordatorios', 'Pagos'] as const).map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilter === filter }}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.notificationList}
            showsVerticalScrollIndicator={false}
          >
            {filteredNotifications.map((notification) => (
              <View key={notification.id} style={styles.notificationRow}>
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: notification.iconBackground },
                  ]}
                >
                  <Ionicons
                    name={notification.icon}
                    size={21}
                    color={notification.iconColor}
                  />
                </View>

                <View style={styles.notificationCopy}>
                  <ThemedText style={styles.notificationTitle}>
                    {notification.title}
                  </ThemedText>
                  <ThemedText style={styles.notificationDescription}>
                    {notification.description}
                  </ThemedText>
                  <ThemedText style={styles.notificationTime}>
                    {notification.timeLabel}
                  </ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={21} color="#777777" />
              </View>
            ))}

            {filteredNotifications.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-outline"
                  size={36}
                  color="#A0A0A0"
                />
                <ThemedText style={styles.emptyText}>
                  {notifications.length === 0
                    ? 'No tienes notificaciones por el momento'
                    : 'No hay notificaciones en esta categoría'}
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#D7D7D7',
  },
  safeArea: {
    flex: 1,
  },
  card: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  backButton: {
    width: 34,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    color: SportGymColors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 34,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 17,
    paddingBottom: 17,
  },
  filterButton: {
    minWidth: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 9,
    backgroundColor: '#E1E1E1',
  },
  filterButtonActive: {
    backgroundColor: SportGymColors.primary,
  },
  filterText: {
    color: '#292929',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  notificationList: {
    paddingHorizontal: 17,
    paddingTop: 1,
    paddingBottom: 24,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 9,
  },
  notificationIcon: {
    width: 35,
    height: 35,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCopy: {
    flex: 1,
  },
  notificationTitle: {
    color: '#171717',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  notificationDescription: {
    color: '#606060',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  notificationTime: {
    color: '#777777',
    fontSize: 10,
    marginTop: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 62,
    gap: 12,
  },
  emptyText: {
    color: '#777777',
    fontSize: 13,
    textAlign: 'center',
  },
});
