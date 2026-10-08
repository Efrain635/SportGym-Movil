import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    View
} from "react-native";
import { ThemedText } from "./themed-text";
import { SportGymColors } from "../constants/theme";

const GREEN = SportGymColors.primary;
const GREEN_SOFT = "#E8F3E5";
const MUTED = "#7A7A7A";

type IconName = keyof typeof Ionicons.glyphMap;

export type HeaderTab = {
  key: string;
  label: string;
  icon: IconName;
  iconOutline: IconName;
};

export const DEFAULT_TABS: HeaderTab[] = [
  { key: "inicio", label: "Inicio", icon: "home", iconOutline: "home-outline" },
  {
    key: "rutina",
    label: "Rutina",
    icon: "barbell",
    iconOutline: "barbell-outline",
  },
  {
    key: "tienda",
    label: "Tienda",
    icon: "flask",
    iconOutline: "flask-outline",
  },
  {
    key: "nutricion",
    label: "Nutrición",
    icon: "nutrition",
    iconOutline: "nutrition-outline",
  },
];

type AnimatedBottomNavProps = {
  tabs?: HeaderTab[];
  initialIndex?: number;
  onChange?: (index: number, key: string) => void;
};

export function AnimatedBottomNav({
  tabs = DEFAULT_TABS,
  initialIndex = 0,
  onChange,
}: AnimatedBottomNavProps) {
  const [index, setIndex] = useState(initialIndex);

  const select = (i: number) => {
    setIndex(i);
    onChange?.(i, tabs[i].key);
  };

  return (
    <View style={styles.bottomNav}>
      <View style={styles.row}>
        {tabs.map((tab, i) => {
          const isActive = i === index;

          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => select(i)}
              hitSlop={4}
            >
              <Ionicons
                name={isActive ? tab.icon : tab.iconOutline}
                size={26}
                color={isActive ? "#FFFFFF" : MUTED}
              />
              <ThemedText
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    backgroundColor: GREEN_SOFT,
    borderRadius: 22,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: GREEN,
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: MUTED,
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
