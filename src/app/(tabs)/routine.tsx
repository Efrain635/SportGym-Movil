import { useLocalSearchParams } from "expo-router";

import RoutineView from '../../Views/RoutineView';

export default function RoutineScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return (
    <RoutineView
      key={view === "routine" ? "routine" : "hub"}
      initialScreen={view === "routine" ? "routine" : "hub"}
    />
  );
}