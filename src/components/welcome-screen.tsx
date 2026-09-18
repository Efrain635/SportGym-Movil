import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [showGhost, setShowGhost] = useState(false);
  const ghostOpacity = useSharedValue(0);
  const ghostScale = useSharedValue(1);
  const ghostY = useSharedValue(0);

  useEffect(() => {
    // Mostrar animación fantasma después de 1.5 segundos
    const ghostTimer = setTimeout(() => {
      setShowGhost(true);
      
      // Animación de aparición del fantasma
      ghostOpacity.value = withDelay(0, withTiming(1, { duration: 1000 }));
      
      // Animación de pulsación
      ghostScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut }),
          withTiming(1, { duration: 800, easing: Easing.inOut })
        ),
        -1,
        false
      );
      
      // Animación de flotación
      ghostY.value = withRepeat(
        withSequence(
          withTiming(-20, { duration: 1500, easing: Easing.inOut }),
          withTiming(20, { duration: 1500, easing: Easing.inOut })
        ),
        -1,
        false
      );
    }, 1500);

    // Completar y navegar después de 4 segundos
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(ghostTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const ghostAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ghostOpacity.value,
    transform: [
      { scale: ghostScale.value },
      { translateY: ghostY.value }
    ]
  }));

  return (
    <View style={styles.container}>
      <Animated.View 
        entering={FadeIn.duration(800).easing(Easing.ease)}
        exiting={FadeOut.duration(500).easing(Easing.ease)}
        style={styles.content}
      >
        <Text style={styles.welcomeText}>BIENVENIDO A</Text>
        
        <View style={styles.logoContainer}>
          <Text style={styles.sportGymText}>SPORT GYM</Text>
        </View>
        
        <Text style={styles.appText}>APP</Text>

        {showGhost && (
          <Animated.View 
            style={[styles.ghostEffect, ghostAnimatedStyle]}
          >
            {/* Fantasma principal */}
            <View style={styles.ghostBody}>
              <View style={styles.ghostHead}>
                <View style={styles.ghostEye} />
                <View style={styles.ghostEye} />
              </View>
              <View style={styles.ghostBottom}>
                <View style={[styles.ghostWave, { left: 0 }]} />
                <View style={[styles.ghostWave, { left: 20 }]} />
                <View style={[styles.ghostWave, { left: 40 }]} />
                <View style={[styles.ghostWave, { left: 60 }]} />
                <View style={[styles.ghostWave, { left: 80 }]} />
              </View>
            </View>
            
            {/* Efecto de brillo */}
            <View style={styles.ghostGlow} />
            <View style={styles.ghostGlow2} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 2,
  },
  logoContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  sportGymText: {
    fontSize: 48,
    color: '#4CAF50',
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: '#2E7D32',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  appText: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 2,
  },
  ghostEffect: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostBody: {
    width: 120,
    height: 140,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ghostHead: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 60,
    marginTop: -30,
  },
  ghostEye: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#090A0A',
  },
  ghostBottom: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    width: 100,
    justifyContent: 'center',
  },
  ghostWave: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 10,
    position: 'absolute',
  },
  ghostGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  ghostGlow2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
});
