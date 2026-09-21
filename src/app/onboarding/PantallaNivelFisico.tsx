import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Level = {
  id: string;
  title: string;
  description: string;
};

const LEVELS: Level[] = [
  {
    id: 'principiante',
    title: 'Principiante',
    description: 'Estoy empezando o retomando el ejercicio',
  },
  {
    id: 'intermedio',
    title: 'Intermedio',
    description: 'Entreno de 2 a 4 veces por semana',
  },
  {
    id: 'avanzado',
    title: 'Avanzado',
    description: 'Entreno 5 o más veces por semana',
  },
];

// ------------------------------------------------
// TARJETA DE NIVEL
// ------------------------------------------------

type LevelCardProps = {
  level: Level;
  selected: boolean;
  onPress: () => void;
};

function LevelCard({ level, selected, onPress }: LevelCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (selected) {
      scaleAnim.setValue(0.96);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 90,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [selected]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${level.title}. ${level.description}`}
      >
        <View style={styles.cardTextBox}>
          <Text
            style={[styles.cardTitle, selected && styles.cardTitleSelected]}
          >
            {level.title}
          </Text>

          <Text
            style={[
              styles.cardDescription,
              selected && styles.cardDescriptionSelected,
            ]}
          >
            {level.description}
          </Text>
        </View>

        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && (
            <Ionicons name="checkmark" size={16} color="#4C9A3A" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ------------------------------------------------
// PANTALLA
// ------------------------------------------------

export default function PantallaNivelFisico() {
  // Meta elegida en la pantalla anterior (por si la necesitas después)
  const { meta } = useLocalSearchParams<{ meta?: string }>();

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, []);

  const handleContinue = () => {
    if (!selectedLevel) return;

    router.push('/(tabs)');
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
          <Text style={styles.title}>Nivel de actividad física</Text>

          <Text style={styles.subtitle}>
            Así ajustamos la intensidad de tus rutinas
          </Text>

          {/* NIVELES */}
          <View style={styles.list} accessibilityRole="radiogroup">
            {LEVELS.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                selected={level.id === selectedLevel}
                onPress={() => setSelectedLevel(level.id)}
              />
            ))}
          </View>

          {/* BOTÓN */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedLevel && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedLevel}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continuar</Text>

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
    marginBottom: 32,
  },

  list: {
    width: '100%',
    gap: 14,
    marginBottom: 32,
  },

  card: {
    width: '100%',
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: '#141614',
    borderWidth: 1.5,
    borderColor: '#202320',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },

  cardSelected: {
    backgroundColor: '#4C9A3A',
    borderColor: '#4C9A3A',
  },

  cardTextBox: {
    flex: 1,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
  },

  cardTitleSelected: {
    color: '#FFFFFF',
  },

  cardDescription: {
    color: '#8F938F',
    fontSize: 13,
    lineHeight: 18,
  },

  cardDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#4B4F4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
  },

  radioSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
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

  continueButtonDisabled: {
    opacity: 0.35,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
