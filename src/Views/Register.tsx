import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SportGymColors } from '@/constants/theme';
import { auth, createUserWithEmailAndPassword } from '../../FirebaseConfig';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateCelular = (celular: string) => {
    const celularRegex = /^[0-9]{10}$/;
    return celularRegex.test(celular);
  };

  const handleRegister = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre');
      return;
    }

    if (!apellido.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu apellido');
      return;
    }

    if (!correo.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo');
      return;
    }

    if (!validateEmail(correo)) {
      Alert.alert('Error', 'Por favor ingresa un correo válido');
      return;
    }

    if (!celular.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu celular');
      return;
    }

    if (!validateCelular(celular)) {
      Alert.alert('Error', 'El celular debe tener 10 dígitos');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Mock registration for UI development
      await createUserWithEmailAndPassword(auth, correo, password);
      
      Alert.alert(
        '¡Cuenta creada!',
        'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: unknown) {
      Alert.alert('Error', 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* CONTENEDOR PRINCIPAL */}
          <View style={styles.card}>
            <View style={styles.content}>

              {/* LOGO */}
              <View style={styles.logoContainer}>
                <ThemedText style={styles.logoSport}>
                  SPORT
                </ThemedText>

                <ThemedText style={styles.logoGym}>
                  GYM
                </ThemedText>
              </View>

              {/* BARRA */}
              <View style={styles.barbellContainer}>
                {/* Disco izquierdo */}
                <View style={styles.plateOuterLeft} />
                <View style={styles.plateInnerLeft} />

                {/* Barra */}
                <View style={styles.bar} />

                {/* Disco derecho */}
                <View style={styles.plateInnerRight} />
                <View style={styles.plateOuterRight} />
              </View>

              {/* SUBTÍTULO */}
              <ThemedText style={styles.subtitle}>
                Crea tu cuenta nueva
              </ThemedText>

              {/* FORMULARIO */}
              <View style={styles.form}>

                {/* NOMBRE */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    placeholderTextColor="#777777"
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                {/* APELLIDO */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Apellido"
                    placeholderTextColor="#777777"
                    value={apellido}
                    onChangeText={setApellido}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                {/* CORREO */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#777777"
                    value={correo}
                    onChangeText={setCorreo}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* CELULAR */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Celular (10 dígitos)"
                    placeholderTextColor="#777777"
                    value={celular}
                    onChangeText={setCelular}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoCorrect={false}
                  />
                </View>

                {/* PASSWORD */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                    ]}
                    placeholder="Contraseña (mínimo 6 caracteres)"
                    placeholderTextColor="#777777"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Pressable
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <View style={styles.eyeIcon}>
                      <View style={styles.eyeShape} />

                      {!showPassword && (
                        <View style={styles.eyeSlash} />
                      )}
                    </View>
                  </Pressable>
                </View>

                {/* BOTÓN REGISTRAR */}
                <Pressable
                  style={({ pressed }) => [
                    styles.registerButton,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <ThemedText style={styles.registerButtonText}>
                    {loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
                  </ThemedText>
                </Pressable>

                {/* FOOTER */}
                <View style={styles.footer}>
                  <ThemedText style={styles.footerText}>
                    ¿Ya tienes cuenta?
                  </ThemedText>

                  <Pressable
                    onPress={() => router.replace('/login')}
                  >
                    <ThemedText style={styles.loginLink}>
                      Inicia sesión
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // =====================================================
  // PANTALLA
  // =====================================================

  screen: {
    flex: 1,
    backgroundColor: '#090A0A',
  },

  safeArea: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  // =====================================================
  // CARD PRINCIPAL
  // =====================================================

  card: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 7,
    marginTop: 7,

    borderWidth: 2,
    borderColor: '#4A4A4A',
    borderRadius: 24,

    backgroundColor: '#0B0C0C',

    overflow: 'hidden',
  },

  content: {
    flex: 1,

    paddingHorizontal: 23,
    paddingTop: 25,
    paddingBottom: 28,

    alignItems: 'stretch',
  },

  // =====================================================
  // LOGO
  // =====================================================

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 20,
    marginBottom: 14,
  },

  logoSport: {
    color: '#F4F4F4',

    fontSize: 72,
    lineHeight: 73,

    fontWeight: '900',
    fontStyle: 'italic',

    letterSpacing: -1.5,
  },

  logoGym: {
    color: SportGymColors.primary,

    fontSize: 72,
    lineHeight: 72,

    fontWeight: '900',
    fontStyle: 'italic',

    letterSpacing: -1.5,

    marginTop: -3,
  },

  // =====================================================
  // BARRA
  // =====================================================

  barbellContainer: {
    height: 42,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 18,
  },

  bar: {
    width: 132,
    height: 6,

    backgroundColor: '#D8D8D8',

    borderRadius: 3,
  },

  plateOuterLeft: {
    width: 7,
    height: 34,

    backgroundColor: '#D8D8D8',

    borderRadius: 2,

    marginRight: 4,
  },

  plateInnerLeft: {
    width: 7,
    height: 24,

    backgroundColor: '#D8D8D8',

    borderRadius: 2,

    marginRight: -1,
  },

  plateInnerRight: {
    width: 7,
    height: 24,

    backgroundColor: '#D8D8D8',

    borderRadius: 2,

    marginLeft: -1,
  },

  plateOuterRight: {
    width: 7,
    height: 34,

    backgroundColor: '#D8D8D8',

    borderRadius: 2,

    marginLeft: 4,
  },

  // =====================================================
  // SUBTÍTULO
  // =====================================================

  subtitle: {
    color: '#C7C7C7',

    fontSize: 16,
    fontWeight: '400',

    textAlign: 'center',

    marginBottom: 24,
  },

  // =====================================================
  // FORMULARIO
  // =====================================================

  form: {
    width: '100%',
  },

  inputContainer: {
    position: 'relative',

    width: '100%',
    height: 57,

    marginBottom: 15,

    borderRadius: 10,

    backgroundColor: '#202121',

    borderWidth: 1,
    borderColor: '#242525',
  },

  input: {
    flex: 1,

    color: '#EEEEEE',

    fontSize: 15,

    paddingHorizontal: 16,

    fontWeight: '400',
  },

  passwordInput: {
    paddingRight: 52,
  },

  // =====================================================
  // OJO PASSWORD
  // =====================================================

  eyeButton: {
    position: 'absolute',

    right: 12,
    top: 0,

    width: 40,
    height: 56,

    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeIcon: {
    width: 22,
    height: 16,

    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeShape: {
    width: 20,
    height: 12,

    borderWidth: 1.5,
    borderColor: '#BDBDBD',

    borderRadius: 12,
  },

  eyeSlash: {
    position: 'absolute',

    width: 24,
    height: 1.5,

    backgroundColor: '#BDBDBD',

    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  // =====================================================
  // BOTÓN
  // =====================================================

  registerButton: {
    width: '100%',
    height: 58,

    borderRadius: 11,

    backgroundColor: SportGymColors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 27,
  },

  registerButtonText: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '800',

    letterSpacing: 0.3,
  },

  buttonPressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  // =====================================================
  // FOOTER
  // =====================================================

  footer: {
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 5,
  },

  footerText: {
    color: '#D0D0D0',

    fontSize: 14,

    fontWeight: '500',

    marginBottom: 11,
  },

  loginLink: {
    color: SportGymColors.primary,

    fontSize: 15,

    fontWeight: '800',

    fontStyle: 'italic',
  },
});