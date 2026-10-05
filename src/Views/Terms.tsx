import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SportGymColors } from '@/constants/theme';

const terms = [
  {
    title: '1. Aceptación de los términos',
    body: 'Al acceder y utilizar la plataforma de SportGYM, aceptas cumplir con los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, no debes utilizar el servicio.',
  },
  {
    title: '2. Uso de la plataforma',
    body: 'La plataforma está diseñada para el uso exclusivo del personal administrativo y clientes del gimnasio. El acceso es personal e intransferible. No se permite el uso indebido, la suplantación de identidad ni la distribución de información sin autorización.',
  },
  {
    title: '3. Responsabilidad del usuario',
    body: 'El usuario se compromete a proporcionar información veraz y actualizada. SportGYM no se hace responsable por datos falsos o incompletos que puedan afectar el uso de los servicios.',
  },
  {
    title: '4. Privacidad y datos personales',
    body: 'La información personal será tratada de acuerdo con nuestra Política de Privacidad. SportGYM se compromete a proteger tus datos y utilizarlos únicamente para fines relacionados con la gestión del gimnasio.',
  },
  {
    title: '5. Modificaciones',
    body: 'SportGYM se reserva el derecho de actualizar estos términos en cualquier momento. Las modificaciones serán notificadas a través de la plataforma.',
  },
  {
    title: '6. Contacto',
    body: 'Si tienes dudas o consultas sobre estos términos, puedes comunicarte con el equipo administrativo del gimnasio.',
  },
];

export default function TermsScreen() {
  const [accepted, setAccepted] = useState(false);
  const { width, height } = useWindowDimensions();
  const horizontalPadding = Math.max(16, Math.min(24, width * 0.055));
  const compactLayout = height < 700;
  const bannerHeight = Math.min(Math.min(width - 8, 640) / 2.5, height * 0.28);
  const bodyFontSize = width <= 360 ? 12 : 13;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Image
            source={require('@/Imagen/terminos.png')}
            style={[styles.banner, { height: bannerHeight }]}
            resizeMode="cover"
            accessibilityLabel="Términos y Condiciones de SportGYM"
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: compactLayout ? 12 : 18,
                paddingBottom: compactLayout ? 10 : 16,
              },
            ]}
            showsVerticalScrollIndicator
          >
            {terms.map(({ title, body }) => (
              <View key={title} style={styles.term}>
                <Text
                  style={[
                    styles.termTitle,
                    { fontSize: width <= 360 ? 13 : 14 },
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.termBody,
                    { fontSize: bodyFontSize, lineHeight: bodyFontSize * 1.5 },
                  ]}
                >
                  {body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: horizontalPadding,
                paddingTop: compactLayout ? 8 : 12,
                paddingBottom: compactLayout ? 6 : 10,
              },
            ]}
          >
            <Pressable
              style={styles.acceptRow}
              onPress={() => setAccepted(!accepted)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
              accessibilityLabel="He leído y acepto los Términos y Condiciones de SportGYM"
            >
              <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                {accepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.acceptText,
                  { fontSize: width < 380 ? 12 : 13 },
                ]}
              >
                He leído y acepto los Términos y Condiciones de SportGYM.
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                accepted
                  ? styles.continueButtonEnabled
                  : styles.continueButtonDisabled,
                pressed && accepted && styles.buttonPressed,
              ]}
              onPress={() => router.replace('/(tabs)')}
              disabled={!accepted}
              accessibilityRole="button"
              accessibilityState={{ disabled: !accepted }}
            >
              <Text style={styles.continueButtonText}>Continuar →</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090A0A',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 4,
  },
  card: {
    flex: 1,
    marginVertical: 7,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4A4A4A',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  banner: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  term: {
    marginBottom: 12,
  },
  termTitle: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  termBody: {
    color: '#111111',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D6D6D6',
  },
  acceptRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B8B8B',
    borderRadius: 3,
  },
  checkboxChecked: {
    borderColor: SportGymColors.primary,
    backgroundColor: SportGymColors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  acceptText: {
    flex: 1,
    color: '#222222',
    fontSize: 12,
    lineHeight: 17,
  },
  continueButton: {
    minWidth: 118,
    minHeight: 42,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  continueButtonDisabled: {
    backgroundColor: '#929B9B',
  },
  continueButtonEnabled: {
    backgroundColor: SportGymColors.primary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
