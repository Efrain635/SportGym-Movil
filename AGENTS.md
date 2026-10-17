# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Reconocimiento de Voz

## Chatbot de voz - VozSporti.tsx

Hay una pantalla dedicada para conversaciones por voz en `src/app/VozSporti.tsx`:

**Características:**
- Toca el micrófono para hablar con Sporti
- Sporti responde en voz alta
- Modo manos libres: vuelve a escuchar automáticamente después de responder
- Usa la misma función `askSporti` de `sporti-groq.ts` (misma API key de Gemini)
- Mantiene historial de las últimas 12 preguntas

**Para usarlo:**
1. Ejecutar: `npx expo run:android` (para Android) o `npx expo run:ios` (para iOS)
2. El reconocimiento de voz NO funciona con Expo Go, necesita development build
3. La app ya tiene configurados los permisos necesarios en app.json:
   - Android: RECORD_AUDIO, MODIFY_AUDIO_SETTINGS
   - iOS: NSSpeechRecognitionUsageDescription, NSMicrophoneUsageDescription
   - Plugin expo-speech-recognition configurado con permisos de micrófono

**Dependencias ya instaladas:**
- expo-speech: ^58.0.3
- expo-speech-recognition: ^57.1.1
- @expo/vector-icons: ^15.1.1

## Chatbot de texto - chatbot.tsx

El chatbot de texto en `src/app/chatbot.tsx` tiene la funcionalidad de voz DESACTIVADA por ahora. Todo el código de voz está comentado pero no eliminado, por si se necesita reactivar en el futuro.
