import { SportGymColors } from "@/constants/theme";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View, type ColorValue } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { user, isRestoringSession } = useAuth();

  if (isRestoringSession) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#090A0A",
        }}
      >
        <ActivityIndicator color={SportGymColors.primary} />
      </View>
    );
  }

  if (!user?.clientId) {
    return <Redirect href="/login" />;
  }

  return (
      <Tabs
        id="client-tabs"
        screenOptions={{
          tabBarActiveTintColor: SportGymColors.primary,
          tabBarInactiveTintColor: "#888888",
          tabBarStyle: {
            display: "none",
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="routine"
          options={{
            title: "Mi rutina",
            tabBarIcon: ({ color }) => <Icon name="fitness" color={color} />,
          }}
        />
        <Tabs.Screen
          name="payments"
          options={{
            title: "Mis pagos",
            href: null,
            tabBarIcon: ({ color }) => <Icon name="payment" color={color} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notificaciones",
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: "Tienda",
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: "Nutrición",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) => <Icon name="person" color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Mi progreso",
          }}
        />
      </Tabs>
  );
}

// Simple icon component (you can replace with proper icons later)
function Icon({ name, color }: { name: string; color: ColorValue }) {
  const icons: Record<string, string> = {
    home: "🏠",
    fitness: "💪",
    payment: "💳",
    person: "👤",
  };

  return <Text style={{ fontSize: 24, color }}>{icons[name] || "❓"}</Text>;
}
