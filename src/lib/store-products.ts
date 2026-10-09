import { collection, getDocs } from "firebase/firestore";

import { db } from "../../assets/database/firebase";

export type StoreProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  stock: number | null;
  isAvailable: boolean | null;
};

type ProductData = Record<string, unknown>;

const getString = (
  data: ProductData,
  fieldNames: readonly string[],
): string | null => {
  for (const fieldName of fieldNames) {
    const value = data[fieldName];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getImageUrl = (data: ProductData): string | null => {
  for (const fieldName of [
    "imagen",
    "image",
    "foto",
    "urlImagen",
    "imageUrl",
    "photo",
    "images",
  ]) {
    const value = data[fieldName];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const image = value.find(
        (item): item is string => typeof item === "string" && !!item.trim(),
      );
      if (image) {
        return image.trim();
      }
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const image = getString(value as ProductData, [
        "url",
        "src",
        "downloadURL",
        "downloadUrl",
      ]);
      if (image) {
        return image;
      }
    }
  }

  return null;
};

const parsePrice = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[^\d,.-]/g, "");
  if (!normalized) {
    return null;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastPeriod = normalized.lastIndexOf(".");
  let numericValue = normalized;

  if (lastComma !== -1 && lastPeriod !== -1) {
    const decimalSeparator = lastComma > lastPeriod ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    numericValue = normalized
      .split(thousandsSeparator)
      .join("")
      .replace(decimalSeparator, ".");
  } else if (lastComma !== -1) {
    const decimalDigits = normalized.length - lastComma - 1;
    numericValue =
      decimalDigits > 0 && decimalDigits <= 2
        ? normalized.replace(",", ".")
        : normalized.replaceAll(",", "");
  } else if (lastPeriod !== -1) {
    const decimalDigits = normalized.length - lastPeriod - 1;
    if (decimalDigits > 2) {
      numericValue = normalized.replaceAll(".", "");
    }
  }

  const price = Number(numericValue);
  return Number.isFinite(price) ? price : null;
};

const getNumber = (
  data: ProductData,
  fieldNames: readonly string[],
): number | null => {
  for (const fieldName of fieldNames) {
    const value = data[fieldName];
    const number =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
};

const normalizeProduct = (
  id: string,
  data: ProductData,
): StoreProduct | null => {
  const name = getString(data, ["nombre", "name", "producto", "title", "titulo"]);
  if (!name) {
    console.warn(`Se omitió el producto ${id}: no tiene un nombre válido.`);
    return null;
  }

  const stock = getNumber(data, [
    "stock",
    "existencia",
    "existencias",
    "inventario",
    "cantidadDisponible",
    "cantidad",
    "cantidadStock",
  ]);
  const explicitAvailability = data.disponible ?? data.available;

  return {
    id,
    name,
    brand: getString(data, ["marca", "brand", "fabricante", "manufacturer"]),
    category:
      getString(data, ["categoria", "categoría", "category", "tipo"]) ??
      "Otros",
    description: getString(data, [
      "descripcion",
      "descripción",
      "description",
      "detalle",
    ]),
    price: parsePrice(
      data.salePrice ??
        data.precio ??
        data.precioVenta ??
        data.price ??
        data.costo ??
        data.amount,
    ),
    imageUrl: getImageUrl(data),
    stock,
    isAvailable:
      typeof explicitAvailability === "boolean"
        ? explicitAvailability
        : stock === null
          ? null
          : stock > 0,
  };
};

export async function getStoreProducts(): Promise<StoreProduct[]> {
  const snapshot = await getDocs(collection(db, "productos"));

  return snapshot.docs
    .map((productDocument) =>
      normalizeProduct(
        productDocument.id,
        productDocument.data() as ProductData,
      ),
    )
    .filter((product): product is StoreProduct => product !== null);
}
