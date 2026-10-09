import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedBottomNav } from "../components/AnimatedBottomTab";
import { SportGymColors } from "../constants/theme";
import { getStoreProducts, type StoreProduct } from "../lib/store-products";

type StoreScreen = "home" | "categories" | "products" | "detail";
type IconName = keyof typeof Ionicons.glyphMap;

const ACCENT = SportGymColors.primary;
const TEXT = "#171717";
const MUTED = "#777777";
const normalizeCategory = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();

const formatPrice = (price: number | null) =>
  price === null
    ? "Precio no disponible"
    : `C$ ${price.toLocaleString("es-NI", {
        maximumFractionDigits: 2,
      })}`;

const getCategoryIcon = (category: string): IconName => {
  const value = normalizeCategory(category);
  if (value.includes("prote")) return "barbell-outline";
  if (value.includes("pre")) return "flash-outline";
  if (value.includes("snack") || value.includes("comida")) {
    return "nutrition-outline";
  }
  if (value.includes("bebida")) return "water-outline";
  if (value.includes("ropa")) return "shirt-outline";
  if (value.includes("accesorio")) return "fitness-outline";
  return "grid-outline";
};

export default function StoreView() {
  const [screen, setScreen] = useState<StoreScreen>("home");
  const [returnScreen, setReturnScreen] = useState<"home" | "categories">(
    "home",
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(
    null,
  );
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      setProducts(await getStoreProducts());
    } catch (error) {
      console.error("No se pudieron cargar los productos de Firestore:", error);
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialProducts = async () => {
      try {
        const loadedProducts = await getStoreProducts();
        if (isMounted) {
          setProducts(loadedProducts);
        }
      } catch (error) {
        console.error("No se pudieron cargar los productos de Firestore:", error);
        if (isMounted) {
          setHasLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return products
      .map((product) => product.category)
      .filter((category) => {
        const normalized = normalizeCategory(category);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
  }, [products]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          selectedCategory === null ||
          normalizeCategory(product.category) ===
            normalizeCategory(selectedCategory),
      ),
    [products, selectedCategory],
  );

  const openProducts = (category: string | null, from: "home" | "categories") => {
    setSelectedCategory(category);
    setReturnScreen(from);
    setScreen("products");
  };

  const handleBottomNavChange = (_index: number, key: string) => {
    const tabMap: Record<string, string> = {
      inicio: "/(tabs)",
      rutina: "/(tabs)/routine",
      tienda: "/(tabs)/store",
      nutricion: "/(tabs)/nutrition",
    };
    router.push(tabMap[key] as never);
  };

  const title =
    screen === "home"
      ? "Tienda"
      : screen === "categories"
        ? `Resultados (${products.length})`
        : screen === "products"
          ? selectedCategory ?? "Todos los productos"
          : "Detalle de producto";

  const featuredProduct = products.find((product) => product.imageUrl);
  const isInternalScreen = screen !== "home";

  const goBack = () => {
    if (screen === "detail") {
      setScreen("products");
    } else if (screen === "products") {
      setScreen(returnScreen);
    } else if (screen === "categories") {
      setScreen("home");
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={isInternalScreen ? "Volver" : "Regresar"}
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={styles.headerButton}
            >
              <Ionicons
                name={isInternalScreen ? "arrow-back" : "storefront-outline"}
                size={24}
                color={ACCENT}
              />
            </Pressable>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerButton} />
          </View>

          {hasLoadError ? (
            <View style={styles.stateContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color={MUTED} />
              <Text style={styles.stateTitle}>No pudimos cargar la tienda</Text>
              <Text style={styles.stateMessage}>
                Revisa tu conexión e inténtalo de nuevo.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadProducts()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={ACCENT} />
              <Text style={styles.stateMessage}>Cargando productos...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.content,
                screen === "detail" && styles.detailContent,
              ]}
              showsVerticalScrollIndicator={false}
            >
              {screen === "home" && (
                <>
                  <View style={styles.hero}>
                    <View style={styles.heroCopy}>
                      <Text style={styles.heroEyebrow}>SPORTGYM</Text>
                      <Text style={styles.heroTitle}>
                        Potencia tu rendimiento
                      </Text>
                      <Text style={styles.heroDescription}>
                        Encuentra lo que necesitas para alcanzar tus objetivos.
                      </Text>
                    </View>
                    {featuredProduct?.imageUrl ? (
                      <Image
                        source={{ uri: featuredProduct.imageUrl }}
                        contentFit="contain"
                        style={styles.heroImage}
                      />
                    ) : (
                      <Ionicons
                        name="barbell-outline"
                        size={82}
                        color="#FFFFFF"
                        style={styles.heroIcon}
                      />
                    )}
                  </View>

                  <Text style={styles.sectionTitle}>Explora la tienda</Text>
                  <HomeAction
                    icon="grid-outline"
                    title="Todos los productos"
                    subtitle="Explora nuestro catálogo"
                    onPress={() => setScreen("categories")}
                  />
                  {products.length === 0 && (
                    <EmptyMessage message="Todavía no hay productos disponibles en la tienda." />
                  )}
                </>
              )}

              {screen === "categories" && (
                <>
                  {categories.length > 0 ? (
                    <View style={styles.categoryGrid}>
                      {categories.map((category) => {
                        const categoryProduct = products.find(
                          (product) =>
                            normalizeCategory(product.category) ===
                              normalizeCategory(category) &&
                            product.imageUrl,
                        );
                        return (
                          <Pressable
                            key={category}
                            accessibilityRole="button"
                            onPress={() =>
                              openProducts(category, "categories")
                            }
                            style={styles.categoryCard}
                          >
                            {categoryProduct?.imageUrl ? (
                              <Image
                                source={{ uri: categoryProduct.imageUrl }}
                                contentFit="contain"
                                style={styles.categoryImage}
                              />
                            ) : (
                              <Ionicons
                                name={getCategoryIcon(category)}
                                size={54}
                                color={ACCENT}
                                style={styles.categoryFallback}
                              />
                            )}
                            <Text style={styles.categoryName} numberOfLines={1}>
                              {category}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <EmptyMessage message="No hay categorías para mostrar." />
                  )}
                </>
              )}

              {screen === "products" && (
                <>
                  {visibleProducts.length > 0 ? (
                    <View style={styles.productList}>
                      {visibleProducts.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          onPress={() => {
                            setSelectedProduct(product);
                            setScreen("detail");
                          }}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyMessage message="No hay productos en esta categoría." />
                  )}
                </>
              )}

              {screen === "detail" &&
                (selectedProduct ? (
                  <ProductDetail product={selectedProduct} />
                ) : (
                  <EmptyMessage message="Selecciona un producto para ver sus detalles." />
                ))}
            </ScrollView>
          )}

          <AnimatedBottomNav
            initialIndex={2}
            onChange={handleBottomNavChange}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function HomeAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.homeAction}
    >
      <View style={styles.homeActionIcon}>
        <Ionicons name={icon} size={26} color={ACCENT} />
      </View>
      <View style={styles.homeActionCopy}>
        <Text style={styles.homeActionTitle}>{title}</Text>
        <Text style={styles.homeActionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={MUTED} />
    </Pressable>
  );
}

function ProductRow({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.productRow}
    >
      <View style={styles.productImageContainer}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            contentFit="contain"
            style={styles.productImage}
          />
        ) : (
          <Ionicons
            name={getCategoryIcon(product.category)}
            size={40}
            color={ACCENT}
          />
        )}
      </View>
      <View style={styles.productCopy}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productBrand} numberOfLines={1}>
          {product.brand ?? product.category}
        </Text>
        <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
        <Text style={styles.productStock}>
          {product.stock === null
            ? "Stock no disponible"
            : `Stock: ${product.stock}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={MUTED} />
    </Pressable>
  );
}

function ProductDetail({ product }: { product: StoreProduct }) {
  const isOutOfStock =
    product.stock !== null
      ? product.stock <= 0
      : product.isAvailable === false;
  const availabilityText =
    product.stock !== null
      ? product.stock > 0
        ? `Disponible para comprar en caja. Existencias: ${product.stock}.`
        : "Agotado por el momento. Consulta en caja."
      : product.isAvailable === true
        ? "Disponible para comprar en caja. Consulta existencias antes de realizar la compra."
        : product.isAvailable === false
          ? "No hay existencias disponibles en este momento. Consulta en caja."
          : "Consulta su disponibilidad en caja antes de realizar la compra.";
  const availabilityColor = isOutOfStock ? "#FCE8E8" : "#E6F5E5";
  const availabilityTextColor = isOutOfStock ? "#A32929" : "#346B32";

  return (
    <>
      <View style={styles.detailImageContainer}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            contentFit="contain"
            style={styles.detailImage}
          />
        ) : (
          <Ionicons
            name={getCategoryIcon(product.category)}
            size={112}
            color={ACCENT}
          />
        )}
      </View>

      <View style={styles.detailCard}>
        <Text style={styles.detailName}>{product.name}</Text>
        <Text style={styles.detailBrand}>
          {product.brand ?? product.category}
        </Text>
        <Text style={styles.detailPrice}>{formatPrice(product.price)}</Text>
        <Text style={styles.detailStock}>
          {product.stock === null
            ? "Stock: no disponible"
            : `Stock: ${product.stock} unidades`}
        </Text>
        <Text style={styles.descriptionHeading}>Descripción</Text>
        <Text style={styles.detailDescription}>
          {product.description ?? "No hay una descripción disponible."}
        </Text>
      </View>

      <View
        style={[
          styles.availabilityCard,
          { backgroundColor: availabilityColor },
        ]}
      >
        <Ionicons
          name={isOutOfStock ? "alert-circle" : "cart"}
          size={34}
          color={availabilityTextColor}
        />
        <Text
          style={[
            styles.availabilityText,
            { color: availabilityTextColor },
          ]}
        >
          {availabilityText}
        </Text>
      </View>
    </>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <View style={styles.emptyMessage}>
      <Ionicons name="file-tray-outline" size={38} color={MUTED} />
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E7E7E7" },
  safeArea: { flex: 1 },
  card: {
    flex: 1,
    marginHorizontal: 5,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E8E8",
  },
  headerButton: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: ACCENT,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
  },
  content: { padding: 18, paddingBottom: 24 },
  detailContent: { paddingHorizontal: 16, paddingTop: 4 },
  hero: {
    minHeight: 182,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#202220",
    padding: 20,
    marginBottom: 24,
  },
  heroCopy: { flex: 1, paddingRight: 4 },
  heroEyebrow: {
    color: "#B8E5AB",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 27,
  },
  heroDescription: {
    color: "#D0D0D0",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  heroImage: { width: 105, height: 136 },
  heroIcon: { marginLeft: 8 },
  sectionTitle: {
    color: TEXT,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },
  homeAction: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 9,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  homeActionIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#EDF5EA",
    marginRight: 12,
  },
  homeActionCopy: { flex: 1 },
  homeActionTitle: { color: TEXT, fontSize: 14, fontWeight: "800" },
  homeActionSubtitle: { color: MUTED, fontSize: 12, marginTop: 3 },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 15,
  },
  categoryCard: {
    width: "48%",
    minHeight: 166,
    alignItems: "center",
    justifyContent: "space-between",
    padding: 11,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  categoryImage: { width: "100%", height: 126 },
  categoryFallback: {
    flex: 1,
    textAlignVertical: "center",
  },
  categoryName: {
    alignSelf: "stretch",
    overflow: "hidden",
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#EFEFEF",
    color: TEXT,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  productList: { gap: 14 },
  productRow: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
  },
  productImageContainer: {
    width: 78,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productImage: { width: "100%", height: "100%" },
  productCopy: { flex: 1 },
  productName: { color: TEXT, fontSize: 15, fontWeight: "800" },
  productBrand: { color: MUTED, fontSize: 12, marginTop: 3 },
  productPrice: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  productStock: { color: MUTED, fontSize: 12, marginTop: 3 },
  detailImageContainer: {
    height: 212,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  detailImage: { width: "70%", height: "100%" },
  detailCard: {
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
  },
  detailName: { color: "#111111", fontSize: 19, fontWeight: "900" },
  detailBrand: { color: MUTED, fontSize: 12, textAlign: "center", marginTop: 8 },
  detailPrice: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 5,
  },
  detailStock: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  descriptionHeading: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },
  detailDescription: { color: MUTED, fontSize: 12, lineHeight: 17 },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  availabilityText: { flex: 1, fontSize: 12, lineHeight: 17, marginLeft: 10 },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 14,
  },
  stateMessage: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: ACCENT,
    marginTop: 18,
  },
  retryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  emptyMessage: { alignItems: "center", padding: 24 },
});
