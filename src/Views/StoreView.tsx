import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../components/themed-text';
import { SportGymColors } from '../constants/theme';

type TabName = 'Inicio' | 'Rutina' | 'Tienda' | 'Nutrición';

export default function StoreView() {
  const [activeTab, setActiveTab] = useState<TabName>('Tienda');

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
    }
  };
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={25} color="#D8D8D8" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Tienda</ThemedText>
            <View style={styles.headerRightSpace} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText style={styles.subtitle}>
              Suplementos para acompañar tu entrenamiento
            </ThemedText>

            <View style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons name="flask-outline" size={36} color={SportGymColors.primary} />
              </View>
              <View style={styles.productCopy}>
                <ThemedText style={styles.productTitle}>Proteína Whey</ThemedText>
                <ThemedText style={styles.productDescription}>
                  Apoya la recuperación y el crecimiento muscular.
                </ThemedText>
              </View>
            </View>
          </ScrollView>

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
  content: { padding: 18 },
  subtitle: { color: '#BDBDBD', fontSize: 15, marginBottom: 18 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#1B1C1C',
    borderWidth: 1,
    borderColor: '#292A2A',
  },
  productIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101F0D',
    marginRight: 14,
  },
  productCopy: { flex: 1 },
  productTitle: { color: '#F2F2F2', fontSize: 18, fontWeight: '800', marginBottom: 5 },
  productDescription: { color: '#BDBDBD', fontSize: 13, lineHeight: 18 },
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
