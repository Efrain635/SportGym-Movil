import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = keyof typeof Ionicons.glyphMap;

// ------------------------------------------------
// CAMPO DE TEXTO REUTILIZABLE
// ------------------------------------------------

type FieldProps = {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
  maxLength?: number;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
};

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.label, focused && styles.labelFocused]}>
        {label}
      </Text>

      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <Ionicons
          name={icon}
          size={19}
          color={focused ? '#4C9A3A' : '#6B6F6B'}
        />

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#555955"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor="#4C9A3A"
        />
      </View>
    </View>
  );
}

// ------------------------------------------------
// PANTALLA
// ------------------------------------------------

export default function PantallaPerfil() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const usernameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

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

  // El usuario no lleva espacios y va en minúsculas
  const handleUsernameChange = (text: string) => {
    setUsername(text.replace(/\s/g, '').toLowerCase());
  };

  // El celular solo acepta números, +, espacios y guiones
  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/[^0-9+\s-]/g, ''));
  };

  const phoneDigits = phone.replace(/\D/g, '');

  const isValid =
    fullName.trim().length >= 3 &&
    username.length >= 3 &&
    phoneDigits.length >= 7;

  const handleStart = () => {
    if (!isValid) return;

    // Cambia esta ruta por la pantalla principal de tu app
    router.replace('/(tabs)/index' as any);
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

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              <Text style={styles.title}>Completa tu perfil</Text>

              <Text style={styles.subtitle}>
                Así te verán tus amigos en la app
              </Text>

              {/* CAMPOS */}
              <View style={styles.form}>
                <Field
                  label="Nombre completo"
                  icon="person-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Madison Smith"
                  autoCapitalize="words"
                  maxLength={40}
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />

                <Field
                  inputRef={usernameRef}
                  label="Usuario"
                  icon="at-outline"
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="madison"
                  maxLength={20}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />

                <Field
                  inputRef={phoneRef}
                  label="Número celular"
                  icon="call-outline"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="+123 567 89000"
                  keyboardType="phone-pad"
                  maxLength={18}
                  returnKeyType="done"
                />
              </View>

              {/* BOTÓN */}
              <TouchableOpacity
                style={[
                  styles.startButton,
                  !isValid && styles.startButtonDisabled,
                ]}
                onPress={handleStart}
                disabled={!isValid}
                activeOpacity={0.8}
              >
                <Text style={styles.startText}>Empezar</Text>

                <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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

  flex: {
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

  // flexGrow + justifyContent center = centrado vertical cuando cabe,
  // y scroll normal cuando aparece el teclado
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },

  content: {
    alignItems: 'center',
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
    marginBottom: 26,
  },

  // ---------- Formulario ----------

  form: {
    width: '100%',
    gap: 16,
    marginBottom: 30,
  },

  fieldWrapper: {
    width: '100%',
  },

  label: {
    color: '#8F938F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    marginLeft: 4,
  },

  labelFocused: {
    color: '#4C9A3A',
  },

  inputBox: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#141614',
    borderWidth: 1.5,
    borderColor: '#202320',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },

  inputBoxFocused: {
    borderColor: '#4C9A3A',
  },

  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // ---------- Botón ----------

  startButton: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4C9A3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  startButtonDisabled: {
    opacity: 0.35,
  },

  startText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
