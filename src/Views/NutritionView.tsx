import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { ThemedText } from "../components/themed-text";
import { SportGymColors } from "../constants/theme";

type TabName = "Inicio" | "Rutina" | "Tienda" | "Nutrición";

export default function NutritionView() {
  const [bottomNavIndex, setBottomNavIndex] = useState(3);
  const pathname = usePathname();

  const handleBottomNavChange = (index: number, key: string) => {
    const tabMap: Record<string, string> = {
      inicio: "/(tabs)",
      rutina: "/(tabs)/routine",
      tienda: "/(tabs)/store",
      nutricion: "/(tabs)/nutrition",
    };
    router.push(tabMap[key] as never);
  };
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={25} color="#D8D8D8" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Nutrición</ThemedText>
            <View style={styles.headerRightSpace} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
              <Ionicons
                name="nutrition-outline"
                size={42}
                color={SportGymColors.primary}
              />
              <ThemedText style={styles.heroTitle}>
                Alimenta tu progreso
              </ThemedText>
              <ThemedText style={styles.heroText}>
                Encuentra recomendaciones para mejorar tu rendimiento y
                recuperación.
              </ThemedText>
            </View>

            <View style={styles.infoCard}>
              <ThemedText style={styles.infoTitle}>
                Recomendación del día
              </ThemedText>
              <ThemedText style={styles.infoText}>
                Mantente hidratado y procura incluir una fuente de proteína en
                cada comida.
              </ThemedText>
            </View>
          </ScrollView>

          <AnimatedBottomNav
            initialIndex={bottomNavIndex}
            onChange={handleBottomNavChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#090A0A" },
  safeArea: { flex: 1 },
  card: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#4A4A4A",
    borderRadius: 24,
    backgroundColor: "#0B0C0C",
    overflow: "hidden",
  },
  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#292A2A",
  },
  backButton: { width: 40 },
  headerTitle: { color: "#F2F2F2", fontSize: 20, fontWeight: "800" },
  headerRightSpace: { width: 40 },
  content: { padding: 18 },
  heroCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#1B1C1C",
    borderWidth: 1,
    borderColor: "#292A2A",
  },
  heroTitle: {
    color: "#F2F2F2",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 8,
  },
  heroText: {
    color: "#BDBDBD",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  infoCard: {
    marginTop: 14,
    padding: 17,
    borderRadius: 14,
    backgroundColor: "#1B1C1C",
  },
  infoTitle: {
    color: "#F2F2F2",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  infoText: { color: "#BDBDBD", fontSize: 14, lineHeight: 20 },
});
