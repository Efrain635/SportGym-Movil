import { SportGymColors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: SportGymColors.primary,
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          display: 'none',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Icon name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Mi rutina',
          tabBarIcon: ({ color }) => (
            <Icon name="fitness" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Mis pagos',
          tabBarIcon: ({ color }) => (
            <Icon name="payment" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Icon name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple icon component (you can replace with proper icons later)
function Icon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    home: '🏠',
    fitness: '💪',
    payment: '💳',
    person: '👤',
  };
  
  return (
    <Text style={{ fontSize: 24, color }}>
      {icons[name] || '❓'}
    </Text>
  );
}