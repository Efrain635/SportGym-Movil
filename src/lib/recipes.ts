import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "../../assets/database/firebase";

type RecipeData = Record<string, unknown>;

export type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  meal: string | null;
  imageUrl: string | null;
  preparationMinutes: number | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fats: number | null;
  ingredients: string[];
  steps: string[];
  objectives: string[];
  isFeatured: boolean;
};

const isRecord = (value: unknown): value is RecipeData =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (
  data: RecipeData,
  fields: readonly string[],
): string | null => {
  for (const field of fields) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const getImageUrl = (data: RecipeData): string | null => {
  for (const field of [
    "imagen",
    "image",
    "foto",
    "urlImagen",
    "imageUrl",
    "photo",
    "portada",
  ]) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const image = value.find(
        (item): item is string => typeof item === "string" && !!item.trim(),
      );
      if (image) return image.trim();
    }
    if (isRecord(value)) {
      const image = getString(value, ["url", "src", "downloadURL", "downloadUrl"]);
      if (image) return image;
    }
  }
  return null;
};

const getNumber = (
  data: RecipeData,
  fields: readonly string[],
): number | null => {
  for (const field of fields) {
    const value = data[field];
    const number =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replace(/[^\d.-]/g, ""))
          : Number.NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
};

const getStringList = (
  data: RecipeData,
  fields: readonly string[],
): string[] => {
  for (const field of fields) {
    const value = data[field];
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/\r?\n/)
        .map((item) => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (!isRecord(item)) return "";
          const name = getString(item, [
            "nombre",
            "name",
            "ingrediente",
            "descripcion",
            "description",
            "paso",
            "instruccion",
          ]);
          const quantity = getString(item, [
            "cantidad",
            "quantity",
            "medida",
            "porcion",
          ]);
          return name && quantity ? `${quantity} ${name}` : name ?? "";
        })
        .filter(Boolean);
    }
  }
  return [];
};

const normalizeRecipe = (
  id: string,
  data: RecipeData,
): Recipe | null => {
  const name = getString(data, [
    "nombre",
    "name",
    "titulo",
    "title",
    "receta",
    "platillo",
  ]);
  if (!name) {
    console.warn(`Se omitió la receta ${id}: no tiene un nombre válido.`);
    return null;
  }

  return {
    id,
    name,
    description: getString(data, [
      "descripcion",
      "descripción",
      "description",
      "detalle",
      "resumen",
    ]),
    category:
      getString(data, ["categoria", "categoría", "category", "tipo", "tipoReceta"]) ??
      "Recetas",
    meal: getString(data, [
      "tipoComida",
      "tiempoComida",
      "comida",
      "meal",
      "mealType",
      "momento",
    ]),
    imageUrl: getImageUrl(data),
    preparationMinutes: getNumber(data, [
      "tiempoPreparacion",
      "tiempoPreparación",
      "tiempo",
      "duracion",
      "minutos",
      "preparationTime",
      "cookTime",
    ]),
    calories: getNumber(data, [
      "calorias",
      "calorías",
      "kcal",
      "calories",
      "energia",
    ]),
    protein: getNumber(data, ["proteina", "proteína", "protein"]),
    carbohydrates: getNumber(data, [
      "carbohidratos",
      "carbohidrato",
      "carbs",
      "carbohydrates",
    ]),
    fats: getNumber(data, ["grasas", "grasa", "fat", "fats"]),
    ingredients: getStringList(data, [
      "ingredientes",
      "ingredients",
      "ingredientList",
    ]),
    steps: getStringList(data, [
      "pasos",
      "preparacion",
      "preparación",
      "instrucciones",
      "preparacionPasos",
      "instructions",
      "directions",
    ]),
    objectives: getStringList(data, [
      "objetivos",
      "objetivo",
      "goals",
      "goal",
      "etiquetas",
      "tags",
    ]),
    isFeatured:
      data.destacada === true ||
      data.esDestacada === true ||
      data.featured === true ||
      data.isFeatured === true,
  };
};

export async function getRecipes(): Promise<Recipe[]> {
  const snapshot = await getDocs(collection(db, "recetas"));
  return snapshot.docs
    .map((recipeDocument) =>
      normalizeRecipe(recipeDocument.id, recipeDocument.data()),
    )
    .filter((recipe): recipe is Recipe => recipe !== null)
    .sort((first, second) => Number(second.isFeatured) - Number(first.isFeatured));
}

export async function getClientFavoriteRecipes(
  clientId: string,
): Promise<Recipe[]> {
  const favoritesQuery = query(
    collection(db, "favoritos_recetas"),
    where("clienteId", "==", clientId),
  );
  const snapshot = await getDocs(favoritesQuery);
  return snapshot.docs
    .map((favoriteDocument) =>
      normalizeRecipe(
        String(favoriteDocument.data().recetaId ?? favoriteDocument.id),
        favoriteDocument.data(),
      ),
    )
    .filter((recipe): recipe is Recipe => recipe !== null);
}

export async function saveFavoriteRecipe(clientId: string, recipe: Recipe) {
  await setDoc(doc(db, "favoritos_recetas", `${clientId}_${recipe.id}`), {
    clienteId: clientId,
    recetaId: recipe.id,
    nombre: recipe.name,
    descripcion: recipe.description,
    categoria: recipe.category,
    tipoComida: recipe.meal,
    imagen: recipe.imageUrl,
    tiempoPreparacion: recipe.preparationMinutes,
    calorias: recipe.calories,
    proteina: recipe.protein,
    carbohidratos: recipe.carbohydrates,
    grasas: recipe.fats,
    ingredientes: recipe.ingredients,
    pasos: recipe.steps,
    objetivos: recipe.objectives,
    destacada: recipe.isFeatured,
    fechaCreacion: serverTimestamp(),
  });
}

export async function removeFavoriteRecipe(
  clientId: string,
  recipeId: string,
) {
  await deleteDoc(doc(db, "favoritos_recetas", `${clientId}_${recipeId}`));
}
