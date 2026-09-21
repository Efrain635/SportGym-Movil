import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");

export default function PantallaGenero() {
  const [selectedGender, setSelectedGender] = useState<'femenino' | 'masculino' | null>(null);
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

  const handleContinue = () => {
    if (!selectedGender) {
      Alert.alert('Error', 'Por favor selecciona tu género');
      return;
    }
    // Navegar a la pantalla de edad después de seleccionar género
    router.push('/onboarding/PantallaEdad');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Título */}
          <Text style={styles.title}>
            ¿Cuál es tu género?
          </Text>

          {/* Opciones de género */}
          <View style={styles.genderOptions}>
            {/* Mujer */}
            <TouchableOpacity
              style={[
                styles.genderButton,
                selectedGender === 'femenino' && styles.genderButtonSelectedFemale,
              ]}
              onPress={() => setSelectedGender('femenino')}
            >
              <View style={styles.genderIconContainer}>
                <View style={styles.genderIcon}>
                  <View style={styles.femaleSymbol}>
                    <View style={styles.femaleCircle} />
                    <View style={styles.femaleCrossVertical} />
                    <View style={styles.femaleCrossHorizontal} />
                  </View>
                </View>
              </View>
              <Text style={[
                styles.genderText,
                selectedGender === 'femenino' && styles.genderTextSelected,
              ]}>
                Mujer
              </Text>
            </TouchableOpacity>

            {/* Hombre */}
            <TouchableOpacity
              style={[
                styles.genderButton,
                selectedGender === 'masculino' && styles.genderButtonSelectedMale,
              ]}
              onPress={() => setSelectedGender('masculino')}
            >
              <View style={styles.genderIconContainer}>
                <View style={styles.genderIcon}>
                  <View style={styles.maleSymbol}>
                    <View style={styles.maleCircle} />
                    <View style={styles.maleArrowVertical} />
                    <View style={styles.maleArrowHorizontal} />
                    <View style={styles.maleArrowHead} />
                  </View>
                </View>
              </View>
              <Text style={[
                styles.genderText,
                selectedGender === 'masculino' && styles.genderTextSelected,
              ]}>
                Hombre
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón Continuar */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: 'bold',
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginBottom: 60,
  },
  genderButton: {
    width: 120,
    height: 120,
    backgroundColor: '#2A2A2A',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3A3A3A',
  },
  genderButtonSelectedFemale: {
    backgroundColor: '#4C9A3A',
    borderColor: '#4C9A3A',
  },
  genderButtonSelectedMale: {
    backgroundColor: '#2A2A2A',
    borderColor: '#4C9A3A',
  },
  genderIconContainer: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  genderIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  femaleSymbol: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  femaleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  femaleCrossVertical: {
    position: 'absolute',
    width: 3,
    height: 18,
    backgroundColor: '#FFFFFF',
    bottom: 2,
  },
  femaleCrossHorizontal: {
    position: 'absolute',
    width: 12,
    height: 3,
    backgroundColor: '#FFFFFF',
    bottom: 8,
  },
  maleSymbol: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  maleArrowVertical: {
    position: 'absolute',
    width: 3,
    height: 14,
    backgroundColor: '#FFFFFF',
    top: 2,
    right: 8,
  },
  maleArrowHorizontal: {
    position: 'absolute',
    width: 14,
    height: 3,
    backgroundColor: '#FFFFFF',
    top: 8,
    right: 2,
  },
  maleArrowHead: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    top: 4,
    right: 0,
    transform: [{ rotate: '45deg' }],
  },
  genderText: {
    fontSize: 18,
    color: '#C7C7C7',
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#FFFFFF',
  },
  continueButton: {
    height: 60,
    width: '100%',
    backgroundColor: '#4C9A3A',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C9A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
