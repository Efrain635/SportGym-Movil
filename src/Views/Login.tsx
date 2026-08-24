import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { SportGymColors } from '@/constants/theme';
import { auth, signInWithEmailAndPassword } from '../../FirebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    // Validaciones
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Por favor ingresa un correo válido');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

    setLoading(true);

    try {
      // Mock login for UI development
      await signInWithEmailAndPassword(auth, email, password);
      
      // Login exitoso - navegar a tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', 'Error al iniciar sesión');
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
                Inicia sesión para continuar
              </ThemedText>

              {/* FORMULARIO */}
              <View style={styles.form}>

                {/* EMAIL */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Correo o usuario"
                    placeholderTextColor="#777777"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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
                    placeholder="Contraseña"
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

                {/* RECORDAR SESIÓN */}
                <Pressable
                  style={styles.rememberContainer}
                  onPress={() =>
                    setRememberSession(!rememberSession)
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberSession &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {rememberSession && (
                      <ThemedText style={styles.checkmark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>

                  <ThemedText style={styles.rememberText}>
                    Recordar sesión
                  </ThemedText>
                </Pressable>

                {/* RECUPERAR CONTRASEÑA */}
                <Pressable
                  style={styles.forgotContainer}
                  onPress={() => {
                    console.log('Forgot password');
                  }}
                >
                  <ThemedText style={styles.forgotPassword}>
                    ¿Olvidaste tu contraseña?
                  </ThemedText>
                </Pressable>

                {/* BOTÓN LOGIN */}
                <Pressable
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <ThemedText style={styles.loginButtonText}>
                    {loading ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN'}
                  </ThemedText>
                </Pressable>

                {/* FOOTER */}
                <View style={styles.footer}>
                  <ThemedText style={styles.footerText}>
                    ¿No tienes cuenta?
                  </ThemedText>

                  <Pressable
                    style={({ pressed }) => [
                      styles.registerButtonLink,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => router.replace('/register')}
                  >
                    <ThemedText style={styles.registerLink}>
                      Crear cuenta
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
  // RECORDAR SESIÓN
  // =====================================================

  rememberContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 2,
    marginBottom: 13,
  },

  checkbox: {
    width: 24,
    height: 24,

    borderRadius: 5,

    borderWidth: 1.5,
    borderColor: '#555555',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 13,
  },

  checkboxChecked: {
    backgroundColor: SportGymColors.primary,
    borderColor: SportGymColors.primary,
  },

  checkmark: {
    color: '#FFFFFF',

    fontSize: 18,
    fontWeight: '900',

    lineHeight: 20,
  },

  rememberText: {
    color: '#C8C8C8',

    fontSize: 14,

    fontWeight: '500',
  },

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  forgotContainer: {
    alignItems: 'center',

    marginBottom: 28,
  },

  forgotPassword: {
    color: SportGymColors.primary,

    fontSize: 14,

    fontWeight: '700',

    fontStyle: 'italic',
  },

  // =====================================================
  // BOTÓN
  // =====================================================

  loginButton: {
    width: '100%',
    height: 58,

    borderRadius: 11,

    backgroundColor: SportGymColors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 27,
  },

  loginButtonText: {
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

  registerButtonLink: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SportGymColors.primary,
  },

  registerLink: {
    color: SportGymColors.primary,

    fontSize: 15,

    fontWeight: '800',

    fontStyle: 'italic',
  },
});