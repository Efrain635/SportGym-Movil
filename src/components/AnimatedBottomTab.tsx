import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
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
const ROUTE_BY_TAB_KEY: Record<string, string> = {
  inicio: "/",
  rutina: "/routine",
  tienda: "/store",
  nutricion: "/nutrition",
};

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
    icon: "storefront",
    iconOutline: "storefront-outline",
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
  dark?: boolean;
};

export function AnimatedBottomNav({
  tabs = DEFAULT_TABS,
  initialIndex = 0,
  onChange,
  dark = false,
}: AnimatedBottomNavProps) {
  const pathname = usePathname();
  const routeIndex = tabs.findIndex(
    (tab) => ROUTE_BY_TAB_KEY[tab.key] === pathname,
  );
  const activeIndex = routeIndex === -1 ? initialIndex : routeIndex;
  const inactiveColor = dark ? "#A6B1AA" : MUTED;

  const select = (i: number) => {
    onChange?.(i, tabs[i].key);
  };

  return (
    <View style={[styles.bottomNav, dark && styles.bottomNavDark]}>
      <View style={[styles.row, dark && styles.rowDark]}>
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;

          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                dark && styles.tabDark,
                isActive && styles.tabActive,
                isActive && dark && styles.tabActiveDark,
              ]}
              onPress={() => select(i)}
              hitSlop={4}
            >
              {tab.key === "tienda" ? (
                <ProteinTubIcon color={isActive ? "#FFFFFF" : inactiveColor} />
              ) : (
                <Ionicons
                  name={isActive ? tab.icon : tab.iconOutline}
                  size={26}
                  color={isActive ? "#FFFFFF" : inactiveColor}
                />
              )}
              <ThemedText
                style={[
                  styles.label,
                  dark && styles.labelDark,
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

function ProteinTubIcon({ color }: { color: string }) {
  return (
    <View style={styles.proteinIcon}>
      <View style={[styles.proteinTubLid, { backgroundColor: color }]} />
      <View style={[styles.proteinTubBody, { borderColor: color }]}>
        <View style={[styles.proteinTubLabel, { backgroundColor: color }]} />
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
  bottomNavDark: {
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: "#26312B",
    borderRadius: 28,
    backgroundColor: "#101614",
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: "row",
    backgroundColor: GREEN_SOFT,
    borderRadius: 22,
    padding: 4,
  },
  rowDark: {
    backgroundColor: "transparent",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 18,
  },
  tabDark: {
    paddingVertical: 7,
  },
  tabActive: {
    backgroundColor: GREEN,
  },
  tabActiveDark: {
    backgroundColor: "#16B848",
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
  labelDark: {
    color: "#A6B1AA",
  },
  proteinIcon: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  proteinTubLid: {
    position: "absolute",
    top: 2,
    width: 15,
    height: 4,
    borderRadius: 2,
  },
  proteinTubBody: {
    width: 17,
    height: 18,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 4,
  },
  proteinTubLabel: {
    width: 9,
    height: 2,
    borderRadius: 1,
  },
});
