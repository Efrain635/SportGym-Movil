import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { ThemedText } from "../components/themed-text";
import { SportGymColors } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import {
  getClientFavoriteRecipes,
  getRecipes,
  removeFavoriteRecipe,
  saveFavoriteRecipe,
  type Recipe,
} from "../lib/recipes";

type MealFilter = "Todos" | "Desayuno" | "Almuerzo" | "Cena";
type NutritionScreen = "catalog" | "favorites" | "detail";
type RecipeCategory = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const mealFilters: MealFilter[] = ["Todos", "Desayuno", "Almuerzo", "Cena"];
const recipeCategories: RecipeCategory[] = [
  { name: "Desayunos", icon: "sunny-outline" },
  { name: "Platos principales", icon: "restaurant-outline" },
  { name: "Ensaladas", icon: "leaf-outline" },
  { name: "Snacks", icon: "nutrition-outline" },
  { name: "Bebidas", icon: "wine-outline" },
  { name: "Sopas", icon: "cafe-outline" },
];
const nutritionGoals = [
  { name: "Ganancia muscular", icon: "barbell-outline" },
  { name: "Definición", icon: "body-outline" },
  { name: "Pérdida de peso", icon: "trending-down-outline" },
  { name: "Mantenimiento", icon: "fitness-outline" },
] as const;

const normalizeText = (value: string) =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const recipeMatchesMeal = (recipe: Recipe, meal: MealFilter) => {
  if (meal === "Todos") return true;
  const value = normalizeText(`${recipe.meal ?? ""} ${recipe.category}`);
  const terms: Record<Exclude<MealFilter, "Todos">, string[]> = {
    Desayuno: ["desayuno", "breakfast"],
    Almuerzo: ["almuerzo", "comida", "lunch"],
    Cena: ["cena", "dinner"],
  };
  return terms[meal].some((term) => value.includes(term));
};

const recipeMatchesCategory = (recipe: Recipe, category: string) => {
  const value = normalizeText(`${recipe.category} ${recipe.meal ?? ""}`);
  const target = normalizeText(category.replace(/s$/, ""));
  if (target === "platos principale") {
    return value.includes("principal") || value.includes("plato fuerte");
  }
  return value.includes(target);
};

const recipeMatchesGoal = (recipe: Recipe, goal: string) =>
  recipe.objectives.some((objective) =>
    normalizeText(objective).includes(normalizeText(goal)),
  );

export default function NutritionView() {
  const [screen, setScreen] = useState<NutritionScreen>("catalog");
  const [returnScreen, setReturnScreen] = useState<NutritionScreen>("catalog");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealFilter, setMealFilter] = useState<MealFilter>("Todos");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [recipesLoadError, setRecipesLoadError] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let isCurrent = true;
    getRecipes()
      .then((loadedRecipes) => {
        if (isCurrent) setRecipes(loadedRecipes);
      })
      .catch(() => {
        if (isCurrent) {
          setRecipesLoadError(true);
          Alert.alert(
            "No se pudieron cargar las recetas",
            "Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingRecipes(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.clientId) return;

    let isCurrent = true;
    getClientFavoriteRecipes(user.clientId)
      .then((favorites) => {
        if (isCurrent) setFavoriteRecipes(favorites);
      })
      .catch(() => {
        if (isCurrent) {
          Alert.alert(
            "No se pudieron cargar tus favoritos",
            "Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [user?.clientId]);

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());
    return recipes.filter((recipe) => {
      if (!recipeMatchesMeal(recipe, mealFilter)) return false;
      if (categoryFilter && !recipeMatchesCategory(recipe, categoryFilter)) {
        return false;
      }
      if (goalFilter && !recipeMatchesGoal(recipe, goalFilter)) return false;
      if (!normalizedSearch) return true;

      const recipeText = normalizeText(
        [
          recipe.name,
          recipe.description ?? "",
          recipe.category,
          recipe.meal ?? "",
          ...recipe.ingredients,
        ].join(" "),
      );
      return recipeText.includes(normalizedSearch);
    });
  }, [categoryFilter, goalFilter, mealFilter, recipes, search]);

  const handleBottomNavChange = (_index: number, key: string) => {
    const tabMap: Record<string, string> = {
      inicio: "/(tabs)",
      rutina: "/(tabs)/routine",
      tienda: "/(tabs)/store",
      nutricion: "/(tabs)/nutrition",
    };
    const route = tabMap[key];
    if (route) router.push(route as never);
  };

  const openRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setReturnScreen(screen);
    setScreen("detail");
  };

  const goBack = () => {
    if (screen === "detail") {
      setScreen(returnScreen);
      setSelectedRecipe(null);
      return;
    }
    setScreen("catalog");
  };

  const isRecipeFavorite = (recipe: Recipe) =>
    favoriteRecipes.some((favorite) => favorite.id === recipe.id);

  const toggleFavorite = async (recipe: Recipe) => {
    if (!user?.clientId) {
      Alert.alert(
        "Inicia sesión para guardar",
        "Necesitas una cuenta de cliente para guardar recetas en tus favoritos.",
      );
      return;
    }

    setIsSavingFavorite(true);
    try {
      if (isRecipeFavorite(recipe)) {
        await removeFavoriteRecipe(user.clientId, recipe.id);
        setFavoriteRecipes((current) =>
          current.filter((favorite) => favorite.id !== recipe.id),
        );
      } else {
        await saveFavoriteRecipe(user.clientId, recipe);
        setFavoriteRecipes((current) => [recipe, ...current]);
      }
    } catch {
      Alert.alert(
        "No se pudo actualizar el favorito",
        "Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const clearFilters = () => {
    setMealFilter("Todos");
    setCategoryFilter(null);
    setGoalFilter(null);
    setSearch("");
  };

  const openFavorites = () => {
    setScreen("favorites");
    if (!user?.clientId) {
      setFavoriteRecipes([]);
      return;
    }

    setIsLoadingFavorites(true);
    getClientFavoriteRecipes(user.clientId)
      .then(setFavoriteRecipes)
      .catch(() => {
        Alert.alert(
          "No se pudieron cargar tus favoritos",
          "Revisa tu conexión e inténtalo de nuevo.",
        );
      })
      .finally(() => setIsLoadingFavorites(false));
  };

  const headerTitle =
    screen === "favorites"
      ? "Mis favoritos"
      : screen === "detail"
        ? "Detalle de receta"
        : "Nutrición";

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerButton}
              onPress={screen === "catalog" ? () => router.back() : goBack}
              accessibilityLabel={
                screen === "catalog" ? "Volver" : "Volver a recetas"
              }
            >
              <Ionicons name="arrow-back" size={23} color="#F2F2F2" />
            </Pressable>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.headerTitle}>{headerTitle}</ThemedText>
              {screen === "favorites" && (
                <ThemedText style={styles.headerSubtitle}>
                  Tus recetas guardadas
                </ThemedText>
              )}
            </View>
            {screen === "catalog" ? (
              <Pressable
                style={styles.headerButton}
                onPress={openFavorites}
                accessibilityLabel="Abrir mis favoritos"
              >
                <Ionicons name="heart-outline" size={23} color="#F2F2F2" />
              </Pressable>
            ) : (
              <View style={styles.headerButton} />
            )}
          </View>

          {screen === "catalog" ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={19} color="#9AA09A" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar recetas..."
                  placeholderTextColor="#8A908A"
                  style={styles.searchInput}
                  returnKeyType="search"
                  accessibilityLabel="Buscar recetas"
                />
                {!!search && (
                  <Pressable onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={19} color="#9AA09A" />
                  </Pressable>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mealFilters}
              >
                {mealFilters.map((filter) => (
                  <FilterChip
                    key={filter}
                    label={filter}
                    active={mealFilter === filter}
                    onPress={() => setMealFilter(filter)}
                  />
                ))}
              </ScrollView>

              {isLoadingRecipes ? (
                <LoadingState label="Cargando recetas..." />
              ) : recipesLoadError ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title="No se pudieron cargar las recetas"
                  description="Comprueba tu conexión y vuelve a intentarlo."
                  actionLabel="Reintentar"
                  onAction={() => {
                    setRecipesLoadError(false);
                    setIsLoadingRecipes(true);
                    getRecipes()
                      .then(setRecipes)
                      .catch(() => {
                        setRecipesLoadError(true);
                        Alert.alert(
                          "No se pudieron cargar las recetas",
                          "Revisa tu conexión e inténtalo de nuevo.",
                        );
                      })
                      .finally(() => setIsLoadingRecipes(false));
                  }}
                />
              ) : (
                <>
                  <SectionTitle
                    title="Recetas destacadas"
                    actionLabel="Ver todas"
                    onAction={() => setShowAllRecipes(true)}
                  />
                  {filteredRecipes.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredList}
                    >
                      {filteredRecipes.slice(0, 4).map((recipe) => (
                        <FeaturedRecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          onPress={() => openRecipe(recipe)}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <EmptyState
                      icon="search-outline"
                      title="No encontramos recetas"
                      description="Prueba con otra búsqueda o cambia los filtros."
                      actionLabel="Limpiar filtros"
                      onAction={clearFilters}
                    />
                  )}

                  <SectionTitle title="Explorar por categoría" />
                  <View style={styles.categoryGrid}>
                    {recipeCategories.map((category) => (
                      <CategoryCard
                        key={category.name}
                        category={category}
                        image={recipes.find((recipe) =>
                          recipeMatchesCategory(recipe, category.name),
                        )?.imageUrl}
                        active={categoryFilter === category.name}
                        onPress={() =>
                          setCategoryFilter((current) =>
                            current === category.name ? null : category.name,
                          )
                        }
                      />
                    ))}
                  </View>

                  <SectionTitle title="Según tu objetivo" />
                  <View style={styles.goalList}>
                    {nutritionGoals.map((goal) => (
                      <GoalCard
                        key={goal.name}
                        title={goal.name}
                        icon={goal.icon}
                        active={goalFilter === goal.name}
                        onPress={() =>
                          setGoalFilter((current) =>
                            current === goal.name ? null : goal.name,
                          )
                        }
                      />
                    ))}
                  </View>

                  <SectionTitle
                    title={
                      categoryFilter || goalFilter || search
                        ? "Resultados"
                        : "Todas las recetas"
                    }
                    actionLabel={
                      showAllRecipes ||
                      categoryFilter ||
                      goalFilter ||
                      search ||
                      filteredRecipes.length <= 4
                        ? undefined
                        : "Ver todas"
                    }
                    onAction={() => setShowAllRecipes(true)}
                  />
                  {filteredRecipes.length > 0 ? (
                    <View style={styles.recipeList}>
                      {filteredRecipes
                        .slice(
                          0,
                          showAllRecipes ||
                            categoryFilter ||
                            goalFilter ||
                            search
                            ? undefined
                            : 4,
                        )
                        .map((recipe) => (
                          <RecipeRow
                            key={recipe.id}
                            recipe={recipe}
                            onPress={() => openRecipe(recipe)}
                          />
                        ))}
                    </View>
                  ) : (
                    <EmptyState
                      icon="nutrition-outline"
                      title="No hay recetas para estos filtros"
                      description="Quita algún filtro para ver más opciones."
                      actionLabel="Limpiar filtros"
                      onAction={clearFilters}
                    />
                  )}
                  <View style={styles.bottomSpace} />
                </>
              )}
            </ScrollView>
          ) : screen === "favorites" ? (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingFavorites ? (
                <LoadingState label="Cargando tus favoritos..." />
              ) : favoriteRecipes.length > 0 ? (
                <View style={styles.recipeList}>
                  {favoriteRecipes.map((recipe) => (
                    <RecipeRow
                      key={recipe.id}
                      recipe={recipe}
                      onPress={() => openRecipe(recipe)}
                      onFavoritePress={() => toggleFavorite(recipe)}
                      isFavorite
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="heart-outline"
                  title={
                    user?.clientId
                      ? "Aún no guardas recetas"
                      : "Inicia sesión como cliente"
                  }
                  description={
                    user?.clientId
                      ? "Explora las recetas y guarda aquí tus favoritas."
                      : "Inicia sesión para guardar recetas en tu lista de favoritos."
                  }
                  actionLabel="Explorar recetas"
                  onAction={() => setScreen("catalog")}
                />
              )}
              <View style={styles.bottomSpace} />
            </ScrollView>
          ) : selectedRecipe ? (
            <RecipeDetails
              recipe={selectedRecipe}
              isFavorite={isRecipeFavorite(selectedRecipe)}
              isSaving={isSavingFavorite}
              onToggleFavorite={() => toggleFavorite(selectedRecipe)}
            />
          ) : null}

          <AnimatedBottomNav
            initialIndex={3}
            onChange={handleBottomNavChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <ThemedText style={[styles.filterChipText, active && styles.activeText]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button">
          <ThemedText style={styles.sectionAction}>{actionLabel}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function FeaturedRecipeCard({
  recipe,
  onPress,
}: {
  recipe: Recipe;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featuredCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <RecipeImage
        uri={recipe.imageUrl}
        style={styles.featuredImage}
        iconSize={38}
      />
      <View style={styles.featuredCopy}>
        <ThemedText style={styles.recipeName} numberOfLines={1}>
          {recipe.name}
        </ThemedText>
        <View style={styles.recipeTags}>
          <ThemedText style={styles.recipeTag}>
            {recipe.meal ?? recipe.category}
          </ThemedText>
        </View>
        <RecipeMeta recipe={recipe} />
      </View>
    </Pressable>
  );
}

function CategoryCard({
  category,
  image,
  active,
  onPress,
}: {
  category: RecipeCategory;
  image: string | null | undefined;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.categoryCard,
        active && styles.categoryCardActive,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.categoryImage}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={styles.categoryIcon}>
          <Ionicons
            name={category.icon}
            size={26}
            color={SportGymColors.success}
          />
        </View>
      )}
      <ThemedText
        style={[styles.categoryName, active && styles.categoryNameActive]}
        numberOfLines={1}
      >
        {category.name}
      </ThemedText>
    </Pressable>
  );
}

function GoalCard({
  title,
  icon,
  active,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.goalCard, active && styles.goalCardActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.goalIcon, active && styles.goalIconActive]}>
        <Ionicons
          name={icon}
          size={21}
          color={active ? "#FFFFFF" : SportGymColors.success}
        />
      </View>
      <ThemedText style={styles.goalTitle}>{title}</ThemedText>
      <Ionicons name="chevron-forward" size={19} color="#A6AAA5" />
    </Pressable>
  );
}

function RecipeRow({
  recipe,
  onPress,
  onFavoritePress,
  isFavorite = false,
}: {
  recipe: Recipe;
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.recipeRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <RecipeImage
        uri={recipe.imageUrl}
        style={styles.rowImage}
        iconSize={26}
      />
      <View style={styles.rowCopy}>
        <ThemedText style={styles.rowTitle} numberOfLines={1}>
          {recipe.name}
        </ThemedText>
        <ThemedText style={styles.rowCategory} numberOfLines={1}>
          {recipe.meal ?? recipe.category}
        </ThemedText>
        <RecipeMeta recipe={recipe} />
      </View>
      {onFavoritePress ? (
        <Pressable
          style={styles.rowFavorite}
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${recipe.name} de favoritos`}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={21}
            color={isFavorite ? SportGymColors.error : "#9AA09A"}
          />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={19} color="#909790" />
      )}
    </Pressable>
  );
}

function RecipeImage({
  uri,
  style,
  iconSize,
}: {
  uri: string | null;
  style: object;
  iconSize: number;
}) {
  return uri ? (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={180}
    />
  ) : (
    <View style={[style, styles.imageFallback]}>
      <Ionicons
        name="restaurant-outline"
        size={iconSize}
        color={SportGymColors.success}
      />
    </View>
  );
}

function RecipeMeta({ recipe }: { recipe: Recipe }) {
  return (
    <View style={styles.metaRow}>
      {recipe.preparationMinutes !== null && (
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#AAB0AA" />
          <ThemedText style={styles.metaText}>
            {recipe.preparationMinutes} min
          </ThemedText>
        </View>
      )}
      {recipe.calories !== null && (
        <View style={styles.metaItem}>
          <Ionicons name="flame-outline" size={14} color="#AAB0AA" />
          <ThemedText style={styles.metaText}>{recipe.calories} kcal</ThemedText>
        </View>
      )}
      {recipe.preparationMinutes === null && recipe.calories === null && (
        <ThemedText style={styles.metaText}>Ver receta</ThemedText>
      )}
    </View>
  );
}

function RecipeDetails({
  recipe,
  isFavorite,
  isSaving,
  onToggleFavorite,
}: {
  recipe: Recipe;
  isFavorite: boolean;
  isSaving: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
    >
      <RecipeImage
        uri={recipe.imageUrl}
        style={styles.detailImage}
        iconSize={56}
      />
      <View style={styles.detailHeading}>
        <View style={styles.detailTitleCopy}>
          <ThemedText style={styles.detailTitle}>{recipe.name}</ThemedText>
          <ThemedText style={styles.detailCategory}>
            {[recipe.meal, recipe.category].filter(Boolean).join(" · ")}
          </ThemedText>
        </View>
        <Pressable
          style={styles.detailHeart}
          onPress={onToggleFavorite}
          disabled={isSaving}
          accessibilityLabel={
            isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
          }
        >
          {isSaving ? (
            <ActivityIndicator color={SportGymColors.error} />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={25}
              color={isFavorite ? SportGymColors.error : "#F2F2F2"}
            />
          )}
        </Pressable>
      </View>

      {(recipe.preparationMinutes !== null || recipe.calories !== null) && (
        <View style={styles.detailMeta}>
          {recipe.preparationMinutes !== null && (
            <DetailMetric
              icon="time-outline"
              value={`${recipe.preparationMinutes} min`}
              label="Preparación"
            />
          )}
          {recipe.calories !== null && (
            <DetailMetric
              icon="flame-outline"
              value={`${recipe.calories} kcal`}
              label="Por porción"
            />
          )}
        </View>
      )}

      {recipe.description && (
        <View style={styles.detailSection}>
          <ThemedText style={styles.detailSectionTitle}>Sobre la receta</ThemedText>
          <ThemedText style={styles.detailDescription}>
            {recipe.description}
          </ThemedText>
        </View>
      )}

      {(recipe.protein !== null ||
        recipe.carbohydrates !== null ||
        recipe.fats !== null) && (
        <View style={styles.detailSection}>
          <ThemedText style={styles.detailSectionTitle}>
            Información nutricional
          </ThemedText>
          <View style={styles.nutritionFacts}>
            {recipe.protein !== null && (
              <NutritionFact label="Proteína" value={`${recipe.protein} g`} />
            )}
            {recipe.carbohydrates !== null && (
              <NutritionFact
                label="Carbohidratos"
                value={`${recipe.carbohydrates} g`}
              />
            )}
            {recipe.fats !== null && (
              <NutritionFact label="Grasas" value={`${recipe.fats} g`} />
            )}
          </View>
        </View>
      )}

      {recipe.ingredients.length > 0 && (
        <View style={styles.detailSection}>
          <ThemedText style={styles.detailSectionTitle}>Ingredientes</ThemedText>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={`${ingredient}-${index}`} style={styles.listLine}>
              <View style={styles.bullet} />
              <ThemedText style={styles.detailListText}>{ingredient}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {recipe.steps.length > 0 && (
        <View style={styles.detailSection}>
          <ThemedText style={styles.detailSectionTitle}>Preparación</ThemedText>
          {recipe.steps.map((step, index) => (
            <View key={`${step}-${index}`} style={styles.stepLine}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
              </View>
              <ThemedText style={styles.detailListText}>{step}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {recipe.ingredients.length === 0 &&
        recipe.steps.length === 0 &&
        !recipe.description && (
          <View style={styles.detailSection}>
            <ThemedText style={styles.detailDescription}>
              Aún no hay ingredientes ni preparación disponibles para esta receta.
            </ThemedText>
          </View>
        )}

      <Pressable
        style={[
          styles.favoriteButton,
          isFavorite && styles.favoriteButtonSaved,
        ]}
        onPress={onToggleFavorite}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color="#FFFFFF"
            />
            <ThemedText style={styles.favoriteButtonText}>
              {isFavorite ? "Guardada en mis favoritos" : "Guardar en favoritos"}
            </ThemedText>
          </>
        )}
      </Pressable>
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function DetailMetric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.detailMetric}>
      <Ionicons name={icon} size={18} color={SportGymColors.success} />
      <View>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
        <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      </View>
    </View>
  );
}

function NutritionFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionFact}>
      <ThemedText style={styles.nutritionFactValue}>{value}</ThemedText>
      <ThemedText style={styles.nutritionFactLabel}>{label}</ThemedText>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={SportGymColors.success} />
      <ThemedText style={styles.stateDescription}>{label}</ThemedText>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name={icon} size={32} color={SportGymColors.success} />
      <ThemedText style={styles.stateTitle}>{title}</ThemedText>
      <ThemedText style={styles.stateDescription}>{description}</ThemedText>
      {actionLabel && onAction && (
        <Pressable style={styles.stateAction} onPress={onAction}>
          <ThemedText style={styles.stateActionText}>{actionLabel}</ThemedText>
        </Pressable>
      )}
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
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#202321",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#F2F2F2", fontSize: 18, fontWeight: "800" },
  headerSubtitle: { color: "#9AA09A", fontSize: 11, marginTop: 2 },
  content: { paddingHorizontal: 14, paddingTop: 10 },
  searchBox: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#1B1E1D",
    borderWidth: 1,
    borderColor: "#292D2B",
  },
  searchInput: { flex: 1, color: "#F2F2F2", fontSize: 13, paddingVertical: 0 },
  mealFilters: { gap: 7, paddingVertical: 11 },
  filterChip: {
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#202423",
    alignItems: "center",
  },
  filterChipActive: { backgroundColor: SportGymColors.primary },
  filterChipText: { color: "#D1D5D1", fontSize: 12, fontWeight: "700" },
  activeText: { color: "#FFFFFF" },
  sectionHeading: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  sectionTitle: { color: "#F1F2F1", fontSize: 15, fontWeight: "800" },
  sectionAction: {
    color: SportGymColors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  featuredList: { gap: 10, paddingBottom: 3 },
  featuredCard: {
    width: 208,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#303431",
    backgroundColor: "#181B19",
  },
  featuredImage: { width: "100%", height: 116 },
  featuredCopy: { paddingHorizontal: 10, paddingVertical: 9, gap: 6 },
  recipeName: { color: "#F2F2F2", fontSize: 14, fontWeight: "800" },
  recipeTags: { flexDirection: "row" },
  recipeTag: {
    overflow: "hidden",
    color: "#DDEBD8",
    backgroundColor: "#345333",
    borderRadius: 5,
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#AAB0AA", fontSize: 10, fontWeight: "600" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 9,
    marginTop: 3,
  },
  categoryCard: {
    width: "31.8%",
    minHeight: 93,
    overflow: "hidden",
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#333734",
    backgroundColor: "#191C1A",
  },
  categoryCardActive: { borderColor: SportGymColors.success },
  categoryImage: { width: "100%", height: 61 },
  categoryIcon: {
    width: "100%",
    height: 61,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222924",
  },
  categoryName: {
    color: "#E9ECE9",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  categoryNameActive: { color: SportGymColors.success },
  goalList: { gap: 7, marginTop: 3 },
  goalCard: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: "#343835",
    borderRadius: 11,
    backgroundColor: "#191C1A",
  },
  goalCardActive: { borderColor: SportGymColors.success },
  goalIcon: {
    width: 33,
    height: 33,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "#263326",
  },
  goalIconActive: { backgroundColor: SportGymColors.primary },
  goalTitle: { flex: 1, color: "#F0F2F0", fontSize: 12, fontWeight: "700" },
  recipeList: { gap: 8, marginTop: 3 },
  recipeRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#303431",
    backgroundColor: "#181B19",
  },
  rowImage: { width: 68, height: 64, borderRadius: 9 },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: "#F2F2F2", fontSize: 13, fontWeight: "800" },
  rowCategory: { color: SportGymColors.success, fontSize: 10, fontWeight: "700" },
  rowFavorite: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.78 },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222924",
  },
  stateCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#303431",
    backgroundColor: "#181B19",
  },
  stateTitle: { color: "#F2F2F2", fontSize: 15, fontWeight: "800", textAlign: "center" },
  stateDescription: {
    color: "#AEB4AE",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  stateAction: {
    marginTop: 3,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: SportGymColors.primary,
  },
  stateActionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  detailScroll: { flex: 1 },
  detailContent: { padding: 14 },
  detailImage: { width: "100%", height: 218, borderRadius: 15 },
  detailHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
  },
  detailTitleCopy: { flex: 1, gap: 4 },
  detailTitle: { color: "#F2F2F2", fontSize: 21, fontWeight: "800" },
  detailCategory: { color: SportGymColors.success, fontSize: 12, fontWeight: "700" },
  detailHeart: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#202421",
  },
  detailMeta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  detailMetric: {
    flex: 1,
    minHeight: 59,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "#191C1A",
    borderWidth: 1,
    borderColor: "#303431",
  },
  metricValue: { color: "#F2F2F2", fontSize: 13, fontWeight: "800" },
  metricLabel: { color: "#9DA49D", fontSize: 10, marginTop: 2 },
  detailSection: { marginTop: 19 },
  detailSectionTitle: { color: "#F2F2F2", fontSize: 16, fontWeight: "800", marginBottom: 9 },
  detailDescription: { color: "#B8BDB8", fontSize: 13, lineHeight: 20 },
  nutritionFacts: {
    flexDirection: "row",
    gap: 8,
  },
  nutritionFact: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#191C1A",
  },
  nutritionFactValue: { color: SportGymColors.success, fontSize: 14, fontWeight: "800" },
  nutritionFactLabel: { color: "#AEB4AE", fontSize: 10, marginTop: 3 },
  listLine: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 8 },
  bullet: {
    width: 7,
    height: 7,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: SportGymColors.success,
  },
  detailListText: { flex: 1, color: "#C2C7C2", fontSize: 13, lineHeight: 20 },
  stepLine: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 11 },
  stepNumber: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#263326",
  },
  stepNumberText: { color: SportGymColors.success, fontSize: 12, fontWeight: "800" },
  favoriteButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 22,
    borderRadius: 12,
    backgroundColor: SportGymColors.primary,
  },
  favoriteButtonSaved: { backgroundColor: "#414A40" },
  favoriteButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  bottomSpace: { height: 16 },
});
