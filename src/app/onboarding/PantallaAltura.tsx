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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_HEIGHT = 140;
const MAX_HEIGHT = 220;
const INITIAL_HEIGHT = 165;

// Descendente: los números grandes arriba y los chicos abajo (como en el diseño)
const HEIGHTS = Array.from(
  { length: MAX_HEIGHT - MIN_HEIGHT + 1 },
  (_, i) => MAX_HEIGHT - i
);

const ITEM_HEIGHT = 32;

// Filas visibles IMPARES => siempre hay una fila exactamente en el centro.
// En pantallas pequeñas se muestran menos filas para que todo quepa.
const VISIBLE_ROWS = SCREEN_HEIGHT >= 780 ? 9 : 7;
const RULER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const RULER_WIDTH = 190;

// Espacio arriba y abajo para que la primera y última fila puedan llegar al centro
const VERTICAL_PADDING = (RULER_HEIGHT - ITEM_HEIGHT) / 2;

const indexOfHeight = (value: number) => MAX_HEIGHT - value;

export default function PantallaAltura() {
  const [selectedHeight, setSelectedHeight] = useState(INITIAL_HEIGHT);

  const scrollRef = useRef<ScrollView>(null);
  const selectedRef = useRef(INITIAL_HEIGHT);

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
      scrollToHeight(INITIAL_HEIGHT, false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // ------------------------------------------------
  // CENTRAR ALTURA
  // ------------------------------------------------

  const scrollToHeight = (value: number, animated = true) => {
    const index = indexOfHeight(value);

    if (index < 0 || index >= HEIGHTS.length) return;

    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated,
    });
  };

  // ------------------------------------------------
  // ACTUALIZAR VALOR EN VIVO MIENTRAS SE DESLIZA
  // ------------------------------------------------

  const handleScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    const index = Math.min(
      HEIGHTS.length - 1,
      Math.max(0, Math.round(offsetY / ITEM_HEIGHT))
    );

    const value = HEIGHTS[index];

    if (value !== selectedRef.current) {
      selectedRef.current = value;
      setSelectedHeight(value);
    }
  };

  // ------------------------------------------------
  // AJUSTE FINAL AL CENTRO
  // ------------------------------------------------

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    const index = Math.min(
      HEIGHTS.length - 1,
      Math.max(0, Math.round(offsetY / ITEM_HEIGHT))
    );

    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  // ------------------------------------------------
  // SELECCIONAR TOCANDO
  // ------------------------------------------------

  const handleHeightPress = (value: number) => {
    selectedRef.current = value;
    setSelectedHeight(value);
    scrollToHeight(value, true);
  };

  // ------------------------------------------------
  // CONTINUAR
  // ------------------------------------------------

  const handleContinue = () => {
    router.push('/onboarding/PantallaObjetivos');
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
          <Text style={styles.title}>¿Cuál es tu altura?</Text>

          <Text style={styles.subtitle}>Selecciona tu altura</Text>

          {/* VALOR PRINCIPAL */}
          <View style={styles.heightDisplay}>
            {/* Espaciador invisible del mismo ancho que "cm" para que
                el número quede centrado ópticamente */}
            <Text style={[styles.heightUnit, styles.heightUnitGhost]}>
              cm
            </Text>

            <Text style={styles.heightNumber}>{selectedHeight}</Text>

            <Text style={styles.heightUnit}>cm</Text>
          </View>

          {/* REGLA VERTICAL */}
          <View style={styles.rulerWrapper}>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              contentContainerStyle={styles.rulerContent}
              contentOffset={{
                x: 0,
                y: indexOfHeight(INITIAL_HEIGHT) * ITEM_HEIGHT,
              }}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
            >
              {HEIGHTS.map((value) => {
                const isSelected = value === selectedHeight;
                const isMajor = value % 5 === 0;

                return (
                  <TouchableOpacity
                    key={value}
                    style={styles.rulerRow}
                    onPress={() => handleHeightPress(value)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.numberColumn}>
                      <Text
                        style={[
                          styles.rulerNumber,
                          isMajor && styles.rulerNumberMajor,
                          isSelected && styles.rulerNumberSelected,
                        ]}
                      >
                        {isMajor || isSelected ? value : ''}
                      </Text>
                    </View>

                    <View style={styles.tickColumn}>
                      <View
                        style={[
                          styles.tick,
                          isMajor && styles.tickMajor,
                          isSelected && styles.tickSelected,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* BANDA + FLECHA EN EL CENTRO EXACTO */}
            <View style={styles.selectionBand} pointerEvents="none">
              <View style={styles.indicatorTriangle} />
            </View>
          </View>

          {/* AYUDA */}
          <Text style={styles.infoText}>
            Desliza para seleccionar tu altura
          </Text>

          {/* BOTÓN */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Agregar altura</Text>

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
    paddingHorizontal: 24,
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

  // ---------- Valor principal ----------

  heightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 24,
  },

  heightNumber: {
    color: '#FFFFFF',
    fontSize: 68,
    lineHeight: 76,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 128, // evita que el layout "salte" al cambiar de 99 a 100
  },

  heightUnit: {
    color: '#4C9A3A',
    fontSize: 17,
    fontWeight: '600',
    width: 28,
  },

  heightUnitGhost: {
    opacity: 0,
  },

  // ---------- Regla ----------

  rulerWrapper: {
    width: RULER_WIDTH,
    height: RULER_HEIGHT,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#141614',
    marginBottom: 16,
  },

  rulerContent: {
    paddingVertical: VERTICAL_PADDING,
  },

  rulerRow: {
    width: RULER_WIDTH,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberColumn: {
    width: 62,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  tickColumn: {
    width: 56,
    marginLeft: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  rulerNumber: {
    color: '#555955',
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '600',
  },

  rulerNumberMajor: {
    color: '#777B77',
    fontSize: 15,
  },

  rulerNumberSelected: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  tick: {
    width: 18,
    height: 1,
    backgroundColor: '#4B4F4B',
  },

  tickMajor: {
    width: 30,
    height: 2,
    backgroundColor: '#777B77',
  },

  tickSelected: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#4C9A3A',
  },

  // Banda del mismo alto que una fila, colocada exactamente en el centro
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: VERTICAL_PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(76, 154, 58, 0.10)',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  indicatorTriangle: {
    width: 0,
    height: 0,
    marginRight: 10,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#4C9A3A',
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
