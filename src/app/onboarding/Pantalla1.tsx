import { router } from 'expo-router';
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function Pantalla1() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Imagen de fondo */}
      <Image
        source={require('../../Imagen/Imagen 1.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Botón Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.skipText}>Skip</Text>
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
        {/* Rectángulo delgado centrado */}
        <View style={styles.rectangleContainer}>
          {/* Icono verde - Pesas */}
          <View style={styles.iconContainer}>
            <View style={styles.iconSvg}>
              <View style={styles.dumbbell}>
                <View style={styles.dumbbellBar} />
                <View style={[styles.dumbbellWeight, styles.dumbbellWeightLeft]} />
                <View style={[styles.dumbbellWeight, styles.dumbbellWeightRight]} />
              </View>
            </View>
          </View>

          {/* Texto centrado y negrita */}
          <Text style={styles.title}>
            Entrena. Progresa. Supera tus límites.
          </Text>
        </View>

        {/* Puntos de progreso fuera del cuadro - primero activo */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.activeDot]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Botón Siguiente */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => router.push('/onboarding/Pantalla2')}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rectangleContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#4C9A3A',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconSvg: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dumbbell: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dumbbellBar: {
    width: 25,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  dumbbellWeight: {
    width: 8,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    position: 'absolute',
  },
  dumbbellWeightLeft: {
    left: 0,
  },
  dumbbellWeightRight: {
    right: 0,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#4C9A3A',
  },
  nextButton: {
    height: 60,
    width: '100%',
    backgroundColor: '#4C9A3A',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#4C9A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
