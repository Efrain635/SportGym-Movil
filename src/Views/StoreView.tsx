import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { ThemedText } from "../components/themed-text";
import { SportGymColors } from "../constants/theme";

type TabName = "Inicio" | "Rutina" | "Tienda" | "Nutrición";

export default function StoreView() {
  const [bottomNavIndex, setBottomNavIndex] = useState(2);
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
            <ThemedText style={styles.headerTitle}>Tienda</ThemedText>
            <View style={styles.headerRightSpace} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText style={styles.subtitle}>
              Suplementos para acompañar tu entrenamiento
            </ThemedText>

            <View style={styles.productCard}>
              <View style={styles.productIcon}>
                <Ionicons
                  name="flask-outline"
                  size={36}
                  color={SportGymColors.primary}
                />
              </View>
              <View style={styles.productCopy}>
                <ThemedText style={styles.productTitle}>
                  Proteína Whey
                </ThemedText>
                <ThemedText style={styles.productDescription}>
                  Apoya la recuperación y el crecimiento muscular.
                </ThemedText>
              </View>
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
  subtitle: { color: "#BDBDBD", fontSize: 15, marginBottom: 18 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#1B1C1C",
    borderWidth: 1,
    borderColor: "#292A2A",
  },
  productIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101F0D",
    marginRight: 14,
  },
  productCopy: { flex: 1 },
  productTitle: {
    color: "#F2F2F2",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 5,
  },
  productDescription: { color: "#BDBDBD", fontSize: 13, lineHeight: 18 },
});
