import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

export default function NutritionView() {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={25} color="#D8D8D8" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Nutrición</ThemedText>
            <Pressable
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityLabel="Abrir perfil"
            >
              <Ionicons name="person" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
              <Ionicons name="nutrition-outline" size={42} color={SportGymColors.primary} />
              <ThemedText style={styles.heroTitle}>Alimenta tu progreso</ThemedText>
              <ThemedText style={styles.heroText}>
                Encuentra recomendaciones para mejorar tu rendimiento y recuperación.
              </ThemedText>
            </View>

            <View style={styles.infoCard}>
              <ThemedText style={styles.infoTitle}>Recomendación del día</ThemedText>
              <ThemedText style={styles.infoText}>
                Mantente hidratado y procura incluir una fuente de proteína en cada comida.
              </ThemedText>
            </View>
          </ScrollView>

          <View style={styles.bottomNavigation}>
            <BottomTab
              label="Inicio"
              icon="home-outline"
              activeIcon="home"
              onPress={() => router.navigate('/(tabs)/index' as any)}
            />
            <BottomTab
              label="Rutina"
              icon="barbell-outline"
              activeIcon="barbell"
              onPress={() => router.push('/(tabs)/routine')}
            />
            <BottomTab
              label="Tienda"
              icon="flask-outline"
              activeIcon="flask"
              onPress={() => router.push('/(tabs)/store')}
            />
            <BottomTab
              label="Nutrición"
              icon="nutrition-outline"
              activeIcon="nutrition"
              active
              onPress={() => router.push('/(tabs)/nutrition')}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090A0A' },
  safeArea: { flex: 1 },
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
  header: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#292A2A',
  },
  backButton: { width: 40 },
  headerTitle: { color: '#F2F2F2', fontSize: 20, fontWeight: '800' },
  headerRightSpace: { width: 40 },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#3A3B3B',
  },
  content: { padding: 18 },
  heroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#292A2A',
  },
  heroTitle: { color: '#F2F2F2', fontSize: 21, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  heroText: { color: '#BDBDBD', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  infoCard: { marginTop: 14, padding: 17, borderRadius: 14, backgroundColor: '#1B1C1C' },
  infoTitle: { color: '#F2F2F2', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  infoText: { color: '#BDBDBD', fontSize: 14, lineHeight: 20 },
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
  tabPressed: { opacity: 0.65 },
  bottomTabLabel: { color: '#929292', fontSize: 11, fontWeight: '500' },
  bottomTabLabelActive: { color: SportGymColors.primary, fontWeight: '800' },
});

type BottomTabProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
};

function BottomTab({
  label,
  icon,
  activeIcon,
  active = false,
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
        color={active ? SportGymColors.primary : '#929292'}
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
