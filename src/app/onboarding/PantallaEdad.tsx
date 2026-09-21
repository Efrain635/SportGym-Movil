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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MIN_AGE = 16;
const MAX_AGE = 55;
const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => i + MIN_AGE);

const ITEM_WIDTH = 72;
const SIDE_PADDING = (width - 48 - ITEM_WIDTH) / 2;

export default function PantallaEdad() {
  const [selectedAge, setSelectedAge] = useState(28);
  const [inputValue, setInputValue] = useState('28');
  const [isFocused, setIsFocused] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const previousAge = useRef(28);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ageMoveAnim = useRef(new Animated.Value(0)).current;

  /*
   * Animación inicial
   */
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

    // Centrar edad inicial
    setTimeout(() => {
      scrollToAge(28, false);
    }, 300);
  }, []);

  /*
   * Animación cuando cambia la edad
   */
  useEffect(() => {
    if (previousAge.current === selectedAge) {
      return;
    }

    const direction =
      selectedAge > previousAge.current ? -1 : 1;

    previousAge.current = selectedAge;

    ageMoveAnim.setValue(direction * 18);
    scaleAnim.setValue(0.9);

    Animated.parallel([
      Animated.spring(ageMoveAnim, {
        toValue: 0,
        tension: 70,
        friction: 8,
        useNativeDriver: true,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 70,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedAge]);

  /*
   * Centrar una edad
   */
  const scrollToAge = (
    age: number,
    animated = true
  ) => {
    const index = AGES.indexOf(age);

    if (index === -1) return;

    const x = index * ITEM_WIDTH;

    scrollViewRef.current?.scrollTo({
      x,
      animated,
    });
  };

  /*
   * Cuando termina el desplazamiento
   */
  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const index = Math.round(offsetX / ITEM_WIDTH);

    if (index < 0 || index >= AGES.length) {
      return;
    }

    const age = AGES[index];

    setSelectedAge(age);
    setInputValue(age.toString()); // Actualizar el campo de texto también

    // Ajustar exactamente al centro
    scrollViewRef.current?.scrollTo({
      x: index * ITEM_WIDTH,
      animated: true,
    });
  };

  /*
   * Seleccionar edad tocando
   */
  const handleAgeSelect = (age: number) => {
    setSelectedAge(age);
    scrollToAge(age, true);
  };

  /*
   * Continuar
   */
  const handleContinue = () => {
    router.push('/onboarding/PantallaPeso');
  };

  /*
   * Manejar foco del input
   */
  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(''); // Borrar el valor al enfocar
  };

  /*
   * Manejar desenfoque del input
   */
  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue === '') {
      setInputValue(selectedAge.toString()); // Restaurar valor si está vacío
    }
  };

  /*
   * Manejar cambio de edad escrita
   */
  const handleAgeChange = (text: string) => {
    setInputValue(text);
    
    const age = parseInt(text);
    
    if (!isNaN(age) && age >= MIN_AGE && age <= MAX_AGE) {
      setSelectedAge(age);
      scrollToAge(age, true);
    }
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
          <Ionicons
            name="arrow-back"
            size={25}
            color="#4C9A3A"
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}
        >

          {/* TÍTULO */}
          <Text style={styles.title}>
            ¿Cuántos años tienes?
          </Text>

          <Text style={styles.subtitle}>
            Selecciona tu edad
          </Text>

          {/* EDAD GRANDE */}
          <Animated.View
            style={[
              styles.ageDisplay,
              {
                transform: [
                  {
                    translateY: ageMoveAnim,
                  },
                  {
                    scale: scaleAnim,
                  },
                ],
              },
            ]}
          >
            <TextInput
              style={[
                styles.ageDisplayText,
                isFocused && styles.ageDisplayTextFocused,
              ]}
              value={inputValue}
              onChangeText={handleAgeChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              keyboardType="number-pad"
              maxLength={2}
              textAlign="center"
              placeholder="Tu edad"
              placeholderTextColor="#555555"
              selectTextOnFocus={true}
            />

            <Text style={styles.yearsText}>
              años
            </Text>
          </Animated.View>

          {/* SELECTOR */}
          <View style={styles.sliderContainer}>

            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              decelerationRate="fast"
              snapToInterval={ITEM_WIDTH}
              snapToAlignment="start"
              contentContainerStyle={styles.sliderContent}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEventThrottle={16}
            >
              {AGES.map((age) => {
                const isSelected = age === selectedAge;

                return (
                  <TouchableOpacity
                    key={age}
                    style={[
                      styles.ageItem,
                      isSelected &&
                        styles.ageItemSelected,
                    ]}
                    onPress={() =>
                      handleAgeSelect(age)
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.ageText,
                        isSelected &&
                          styles.ageTextSelected,
                      ]}
                    >
                      {age}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* INDICADOR CENTRAL */}
            <View style={styles.indicatorContainer}>
              <View style={styles.indicator} />
            </View>

          </View>

          {/* TEXTO INFORMATIVO */}
          <Text style={styles.infoText}>
            Desliza para seleccionar tu edad
          </Text>

          {/* BOTÓN CONTINUAR */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Agregar edad
            </Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color="#FFFFFF"
            />
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
    zIndex: 20,
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
    marginBottom: 32,
  },

  ageDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  ageDisplayText: {
    color: '#FFFFFF',
    fontSize: 105,
    lineHeight: 115,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
    textAlignVertical: 'center',
  },

  ageDisplayTextFocused: {
    color: '#4C9A3A',
  },

  yearsText: {
    color: '#4C9A3A',
    fontSize: 17,
    fontWeight: '600',
    marginTop: -5,
  },

  sliderContainer: {
    width: '100%',
    height: 76,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 13,
  },

  sliderContent: {
    paddingHorizontal: SIDE_PADDING,
    alignItems: 'center',
  },

  ageItem: {
    width: ITEM_WIDTH,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },

  ageItemSelected: {
    backgroundColor: '#4C9A3A',
    transform: [
      {
        scale: 1.08,
      },
    ],
  },

  ageText: {
    color: '#777B77',
    fontSize: 19,
    fontWeight: '600',
  },

  ageTextSelected: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
  },

  indicatorContainer: {
    position: 'absolute',
    top: -7,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },

  indicator: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,

    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',

    // Flecha blanca
    borderTopColor: '#FFFFFF',
  },

  infoText: {
    color: '#696D69',
    fontSize: 13,
    marginBottom: 35,
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

  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
