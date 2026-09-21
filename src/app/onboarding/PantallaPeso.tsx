import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MIN_WEIGHT = 35;
const MAX_WEIGHT = 180;
const INITIAL_WEIGHT = 75;

const WEIGHTS = Array.from(
  { length: MAX_WEIGHT - MIN_WEIGHT + 1 },
  (_, i) => i + MIN_WEIGHT
);

// El contenido tiene paddingHorizontal de 24 a cada lado, así que el ancho
// REAL de la regla es (ancho de pantalla - 48). Antes se usaba el ancho total
// de la pantalla y por eso el valor quedaba corrido.
const CONTENT_PADDING = 24;
const RULER_WIDTH = width - CONTENT_PADDING * 2;

const TICK_WIDTH = 14; // separación entre cada kg
const SIDE_PADDING = (RULER_WIDTH - TICK_WIDTH) / 2;

const KG_TO_LB = 2.20462;

const indexOfWeight = (weight: number) => weight - MIN_WEIGHT;

export default function PantallaPeso() {
  const [selectedWeight, setSelectedWeight] = useState(INITIAL_WEIGHT);
  const [unit, setUnit] = useState<'KG' | 'LB'>('KG');

  const scrollRef = useRef<ScrollView>(null);
  const selectedRef = useRef(INITIAL_WEIGHT);

  // Animaciones de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ------------------------------------------------
  // ANIMACIÓN INICIAL + CENTRAR VALOR INICIAL
  // ------------------------------------------------

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      scrollToWeight(INITIAL_WEIGHT, false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ------------------------------------------------
  // CENTRAR PESO
  // ------------------------------------------------

  const scrollToWeight = (weight: number, animated = true) => {
    const index = indexOfWeight(weight);

    if (index < 0 || index >= WEIGHTS.length) return;

    scrollRef.current?.scrollTo({
      x: index * TICK_WIDTH,
      animated,
    });
  };

  // ------------------------------------------------
  // ACTUALIZAR VALOR EN VIVO MIENTRAS SE DESLIZA
  // ------------------------------------------------

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const index = Math.min(
      WEIGHTS.length - 1,
      Math.max(0, Math.round(offsetX / TICK_WIDTH))
    );

    const weight = WEIGHTS[index];

    if (weight !== selectedRef.current) {
      selectedRef.current = weight;
      setSelectedWeight(weight);
    }
  };

  // ------------------------------------------------
  // AJUSTE FINAL AL CENTRO
  // ------------------------------------------------

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const index = Math.min(
      WEIGHTS.length - 1,
      Math.max(0, Math.round(offsetX / TICK_WIDTH))
    );

    scrollRef.current?.scrollTo({
      x: index * TICK_WIDTH,
      animated: true,
    });
  };

  // ------------------------------------------------
  // SELECCIONAR TOCANDO
  // ------------------------------------------------

  const handleWeightPress = (weight: number) => {
    selectedRef.current = weight;
    setSelectedWeight(weight);
    scrollToWeight(weight, true);
  };

  // ------------------------------------------------
  // CONVERSIÓN KG / LB
  // ------------------------------------------------

  const convert = (kg: number) =>
    unit === 'KG' ? kg : Math.round(kg * KG_TO_LB);

  const displayedWeight = convert(selectedWeight);

  // ------------------------------------------------
  // CONTINUAR
  // ------------------------------------------------

  const handleContinue = () => {
    router.push('/onboarding/PantallaAltura');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* BOTÓN ATRÁS */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={25} color="#4C9A3A" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* TÍTULO */}
          <Text style={styles.title}>¿Cuál es tu peso?</Text>

          <Text style={styles.subtitle}>Selecciona tu peso actual</Text>

          {/* SELECTOR KG / LB */}
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === 'KG' && styles.unitButtonActive,
              ]}
              onPress={() => setUnit('KG')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === 'KG' && styles.unitTextActive,
                ]}
              >
                KG
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitButton,
                unit === 'LB' && styles.unitButtonActive,
              ]}
              onPress={() => setUnit('LB')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === 'LB' && styles.unitTextActive,
                ]}
              >
                LB
              </Text>
            </TouchableOpacity>
          </View>

          {/* PESO PRINCIPAL */}
          <View style={styles.weightDisplay}>
            <Text style={styles.weightNumber}>{displayedWeight}</Text>

            <Text style={styles.weightUnit}>{unit.toLowerCase()}</Text>
          </View>

          {/* REGLA HORIZONTAL */}
          <View style={styles.rulerContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={TICK_WIDTH}
              snapToAlignment="start"
              contentContainerStyle={styles.rulerContent}
              contentOffset={{
                x: indexOfWeight(INITIAL_WEIGHT) * TICK_WIDTH,
                y: 0,
              }}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
            >
              {WEIGHTS.map((weight) => {
                const isMajor = weight % 5 === 0;

                return (
                  <TouchableOpacity
                    key={weight}
                    style={styles.rulerItem}
                    onPress={() => handleWeightPress(weight)}
                    activeOpacity={0.8}
                  >
                    {isMajor && (
                      <Text
                        style={[
                          styles.rulerNumber,
                          weight === selectedWeight &&
                            styles.rulerNumberSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {convert(weight)}
                      </Text>
                    )}

                    <View
                      style={[styles.tick, isMajor && styles.tickMajor]}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* FLECHA SUPERIOR (centro exacto) */}
            <View style={styles.topIndicator} pointerEvents="none">
              <View style={styles.arrow} />
            </View>

            {/* LÍNEA CENTRAL (centro exacto) */}
            <View style={styles.centerLine} pointerEvents="none" />
          </View>

          {/* AYUDA */}
          <Text style={styles.infoText}>
            Desliza para seleccionar tu peso
          </Text>

          {/* BOTÓN */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Agregar peso</Text>

            <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0A',
  },

  safeArea: {
    flex: 1,
  },

  backButton: {
    position: 'absolute',
    top: 55,
    left: 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#151715',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CONTENT_PADDING,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 7,
  },

  subtitle: {
    color: '#8F938F',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 22,
  },

  // ---------- Selector KG / LB ----------

  unitSelector: {
    width: 160,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#171917',
    flexDirection: 'row',
    padding: 4,
    marginBottom: 22,
  },

  unitButton: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unitButtonActive: {
    backgroundColor: '#4C9A3A',
  },

  unitText: {
    color: '#777B77',
    fontSize: 13,
    fontWeight: '800',
  },

  unitTextActive: {
    color: '#FFFFFF',
  },

  // ---------- Valor principal ----------

  weightDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  weightNumber: {
    color: '#FFFFFF',
    fontSize: 82,
    lineHeight: 90,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 180, // evita saltos de layout al cambiar de 99 a 100
  },

  weightUnit: {
    color: '#4C9A3A',
    fontSize: 17,
    fontWeight: '700',
    marginTop: -2,
  },

  // ---------- Regla ----------

  rulerContainer: {
    width: RULER_WIDTH,
    height: 120,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#141614',
    marginBottom: 16,
  },

  rulerContent: {
    paddingHorizontal: SIDE_PADDING,
  },

  rulerItem: {
    width: TICK_WIDTH,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 22,
  },

  // El número es más ancho que el tick: se centra con posición absoluta
  rulerNumber: {
    position: 'absolute',
    top: 34,
    width: 56,
    left: (TICK_WIDTH - 56) / 2,
    textAlign: 'center',
    color: '#777B77',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  rulerNumberSelected: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  tick: {
    width: 1,
    height: 14,
    backgroundColor: '#4D514D',
  },

  tickMajor: {
    width: 2,
    height: 26,
    backgroundColor: '#777B77',
  },

  // Línea fija exactamente en el centro del contenedor
  centerLine: {
    position: 'absolute',
    left: (RULER_WIDTH - 3) / 2,
    bottom: 14,
    width: 3,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#4C9A3A',
  },

  topIndicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },

  infoText: {
    color: '#696D69',
    fontSize: 13,
    marginBottom: 28,
  },

  continueButton: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4C9A3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 10,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
