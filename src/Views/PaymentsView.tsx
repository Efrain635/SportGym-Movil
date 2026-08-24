import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type Filter = 'Todos' | 'Pagados' | 'Pendientes';

type Payment = {
  id: number;
  date: string;
  description: string;
  amount: string;
  status: 'Pagado' | 'Pendiente';
};

const payments: Payment[] = [
  {
    id: 1,
    date: '25 Jun 2026',
    description: 'Membresía Premium',
    amount: 'C$ 1,500.00',
    status: 'Pagado',
  },
  {
    id: 2,
    date: '25 May 2026',
    description: 'Membresía Premium',
    amount: 'C$ 1,500.00',
    status: 'Pagado',
  },
  {
    id: 3,
    date: '25 Abr 2026',
    description: 'Membresía Premium',
    amount: 'C$ 1,500.00',
    status: 'Pagado',
  },
  {
    id: 4,
    date: '15 Jul 2026',
    description: 'Membresía Premium',
    amount: 'C$ 1,500.00',
    status: 'Pendiente',
  },
];

export default function PaymentsView() {
  const [activeFilter, setActiveFilter] =
    useState<Filter>('Todos');

  const filteredPayments = payments.filter((payment) => {
    if (activeFilter === 'Todos') {
      return true;
    }

    return payment.status ===
      (activeFilter === 'Pagados'
        ? 'Pagado'
        : 'Pendiente');
  });

  return (
    <View style={styles.screen}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <View style={styles.card}>

          {/* ========================================= */}
          {/* HEADER */}
          {/* ========================================= */}

          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                console.log('Volver');
              }}
            >
              <Ionicons
                name="arrow-back"
                size={25}
                color="#D8D8D8"
              />
            </Pressable>

            <ThemedText style={styles.headerTitle}>
              Mis pagos
            </ThemedText>

            {/* Espacio para centrar el título */}
            <View style={styles.headerRightSpace} />
          </View>

          {/* ========================================= */}
          {/* FILTROS */}
          {/* ========================================= */}

          <View style={styles.filtersContainer}>

            <FilterButton
              title="Todos"
              active={activeFilter === 'Todos'}
              onPress={() => setActiveFilter('Todos')}
            />

            <FilterButton
              title="Pagados"
              active={activeFilter === 'Pagados'}
              onPress={() => setActiveFilter('Pagados')}
            />

            <FilterButton
              title="Pendientes"
              active={activeFilter === 'Pendientes'}
              onPress={() =>
                setActiveFilter('Pendientes')
              }
            />

          </View>

          {/* ========================================= */}
          {/* RESUMEN DE PAGOS */}
          {/* ========================================= */}

          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons
                  name="wallet-outline"
                  size={28}
                  color={SportGymColors.primary}
                />
              </View>

              <View style={styles.summaryContent}>
                <ThemedText style={styles.summaryLabel}>
                  Total pagado este año
                </ThemedText>

                <ThemedText style={styles.summaryAmount}>
                  C$ 4,500.00
                </ThemedText>
              </View>
            </View>
          </View>

          {/* ========================================= */}
          {/* LISTA DE PAGOS */}
          {/* ========================================= */}

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Historial de pagos
            </ThemedText>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.paymentList}
            showsVerticalScrollIndicator={false}
          >
            {filteredPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
              />
            ))}

            {filteredPayments.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={40}
                  color="#555555"
                />

                <ThemedText style={styles.emptyText}>
                  No hay pagos para mostrar
                </ThemedText>
              </View>
            )}

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
              active={false}
              onPress={() => {
                router.push('/(tabs)');
              }}
            />

            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              active={false}
              onPress={() => {
                router.push('/(tabs)/routine');
              }}
            />

            <BottomTab
              label="Pagos"
              icon="card-outline"
              activeIcon="card"
              active={true}
              onPress={() => {
                router.push('/(tabs)/payments');
              }}
            />

            <BottomTab
              label="Perfil"
              icon="person-outline"
              activeIcon="person"
              active={false}
              onPress={() => {
                router.push('/(tabs)/profile');
              }}
            />

          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}


/* ===================================================== */
/* FILTRO */
/* ===================================================== */

type FilterButtonProps = {
  title: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({
  title,
  active,
  onPress,
}: FilterButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.filterButtonActive,
        pressed && styles.filterPressed,
      ]}
      onPress={onPress}
    >
      <ThemedText
        style={[
          styles.filterText,
          active && styles.filterTextActive,
        ]}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}


/* ===================================================== */
/* TARJETA DE PAGO */
/* ===================================================== */

type PaymentCardProps = {
  payment: Payment;
};

function PaymentCard({
  payment,
}: PaymentCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.paymentCard,
        pressed && styles.paymentPressed,
      ]}
      onPress={() => {
        console.log('Pago seleccionado:', payment.id);
      }}
    >
      {/* ICONO Y FECHA */}
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIconContainer}>
          <Ionicons
            name="card-outline"
            size={22}
            color={
              payment.status === 'Pagado'
                ? '#59B83C'
                : '#D99A2B'
            }
          />
        </View>

        <ThemedText style={styles.paymentDate}>
          {payment.date}
        </ThemedText>
      </View>

      {/* DESCRIPCIÓN */}
      <ThemedText style={styles.paymentDescription}>
        {payment.description}
      </ThemedText>

      {/* MONTO Y ESTADO */}
      <View style={styles.paymentBottomRow}>
        <ThemedText style={styles.amount}>
          {payment.amount}
        </ThemedText>

        <View style={[
          styles.statusBadge,
          payment.status === 'Pagado'
            ? styles.statusPaid
            : styles.statusPending
        ]}>
          <ThemedText style={[
            styles.statusText,
            payment.status === 'Pagado'
              ? styles.statusTextPaid
              : styles.statusTextPending
          ]}>
            {payment.status}
          </ThemedText>
        </View>
      </View>
    </Pressable>
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
  // FILTROS
  // ===================================================

  filtersContainer: {
    height: 54,

    flexDirection: 'row',

    alignItems: 'center',

    marginHorizontal: 16,
    marginBottom: 12,

    padding: 4,

    borderRadius: 12,

    backgroundColor: '#151616',
  },

  filterButton: {
    flex: 1,

    height: 43,

    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    marginHorizontal: 2,
  },

  filterButtonActive: {
    backgroundColor: SportGymColors.primary,
  },

  filterText: {
    color: '#B7B7B7',

    fontSize: 13,

    fontWeight: '600',
  },

  filterTextActive: {
    color: '#FFFFFF',

    fontWeight: '800',
  },

  filterPressed: {
    opacity: 0.75,
  },

  // ===================================================
  // SECCIONES
  // ===================================================

  sectionHeader: {
    marginBottom: 7,
    marginTop: 12,
  },

  sectionTitle: {
    color: '#D8D8D8',

    fontSize: 14,

    fontWeight: '600',
  },

  // ===================================================
  // RESUMEN
  // ===================================================

  summarySection: {
    paddingHorizontal: 18,
    marginBottom: 13,
  },

  summaryCard: {
    backgroundColor: '#1B1C1C',

    borderRadius: 13,

    paddingHorizontal: 16,
    paddingVertical: 18,

    flexDirection: 'row',

    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#202121',
  },

  summaryIconContainer: {
    width: 52,
    height: 52,

    borderRadius: 12,

    backgroundColor: '#151616',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 16,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    color: '#AFAFAF',

    fontSize: 13,

    fontWeight: '500',

    marginBottom: 4,
  },

  summaryAmount: {
    color: '#F0F0F0',

    fontSize: 20,

    fontWeight: '800',
  },

  // ===================================================
  // LISTA
  // ===================================================

  scroll: {
    flex: 1,
  },

  paymentList: {
    paddingHorizontal: 18,
    paddingTop: 3,
  },

  // ===================================================
  // TARJETA
  // ===================================================

  paymentCard: {
    minHeight: 115,

    backgroundColor: '#1B1C1C',

    borderRadius: 13,

    paddingHorizontal: 16,
    paddingVertical: 15,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: '#202121',
  },

  paymentHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 10,
  },

  paymentIconContainer: {
    width: 36,
    height: 36,

    borderRadius: 10,

    backgroundColor: '#151616',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,
  },

  paymentDate: {
    color: '#AFAFAF',

    fontSize: 13,

    fontWeight: '500',
  },

  paymentDescription: {
    color: '#F1F1F1',

    fontSize: 16,

    fontWeight: '800',

    marginBottom: 12,
  },

  paymentBottomRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  amount: {
    color: '#F0F0F0',

    fontSize: 17,

    fontWeight: '800',
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,

    borderRadius: 8,
  },

  statusPaid: {
    backgroundColor: '#59B83C',
  },

  statusPending: {
    backgroundColor: '#D99A2B',
  },

  statusText: {
    fontSize: 12,

    fontWeight: '700',
  },

  statusTextPaid: {
    color: '#FFFFFF',
  },

  statusTextPending: {
    color: '#FFFFFF',
  },

  paymentPressed: {
    opacity: 0.85,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  // ===================================================
  // SIN RESULTADOS
  // ===================================================

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    paddingTop: 80,
  },

  emptyText: {
    color: '#777777',

    fontSize: 14,

    marginTop: 12,
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