import { useLocalSearchParams } from "expo-router";

import NutritionView from '../../Views/NutritionView';

export default function NutritionScreen() {
  const { view, recipeId } = useLocalSearchParams<{ view?: string; recipeId?: string }>();
  return (
    <NutritionView
      key={view === "favorites" ? "favorites" : "catalog"}
      initialScreen={view === "favorites" ? "favorites" : "catalog"}
      initialRecipeId={recipeId}
    />
  );
}
