import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = keyof typeof Ionicons.glyphMap;

type Goal = {
  id: string;
  label: string;
  icon: IconName;
};

const GOALS: Goal[] = [
  { id: 'perder-peso', label: 'Perder peso', icon: 'trending-down' },
  { id: 'aumentar-peso', label: 'Aumentar de peso', icon: 'trending-up' },
  { id: 'masa-muscular', label: 'Ganancia de masa muscular', icon: 'barbell' },
  { id: 'moldear', label: 'Moldear el cuerpo', icon: 'body' },
  { id: 'otro', label: 'Otro', icon: 'ellipsis-horizontal-circle' },
];

// ------------------------------------------------
// OPCIÓN INDIVIDUAL
// ------------------------------------------------

type GoalOptionProps = {
  goal: Goal;
  selected: boolean;
  onPress: () => void;
};

function GoalOption({ goal, selected, onPress }: GoalOptionProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  // Pequeño rebote solo cuando la opción pasa a estar seleccionada
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
        style={[styles.option, selected && styles.optionSelected]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={goal.label}
      >
        <View
          style={[styles.iconBox, selected && styles.iconBoxSelected]}
        >
          <Ionicons
            name={goal.icon}
            size={20}
            color={selected ? '#FFFFFF' : '#4C9A3A'}
          />
        </View>

        <Text
          style={[styles.optionText, selected && styles.optionTextSelected]}
          numberOfLines={2}
        >
          {goal.label}
        </Text>

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

export default function PantallaObjetivos() {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

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
    if (!selectedGoal) return;

    router.push({
      pathname: '/onboarding/PantallaNivelFisico',
      params: { meta: selectedGoal },
    });
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
          <Text style={styles.title}>¿Cuál es tu meta?</Text>

          <Text style={styles.subtitle}>
            Elegiremos tu plan según lo que quieres lograr
          </Text>

          {/* OPCIONES */}
          <View style={styles.list} accessibilityRole="radiogroup">
            {GOALS.map((goal) => (
              <GoalOption
                key={goal.id}
                goal={goal}
                selected={goal.id === selectedGoal}
                onPress={() => setSelectedGoal(goal.id)}
              />
            ))}
          </View>

          {/* BOTÓN */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedGoal && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedGoal}
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
    marginBottom: 28,
  },

  list: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },

  option: {
    width: '100%',
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#141614',
    borderWidth: 1.5,
    borderColor: '#202320',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
  },

  optionSelected: {
    backgroundColor: '#4C9A3A',
    borderColor: '#4C9A3A',
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1D231C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  iconBoxSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  optionText: {
    flex: 1,
    color: '#D6D9D6',
    fontSize: 16,
    fontWeight: '600',
  },

  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#4B4F4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
