import * as Speech from 'expo-speech';

// Import condicional del módulo de reconocimiento de voz
let ExpoSpeechRecognitionModule: any = null;
let ExpoSpeechRecognitionOptions: any = null;

try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  ExpoSpeechRecognitionOptions = speechModule.ExpoSpeechRecognitionOptions;
  console.log('[VOZ] Módulo expo-speech-recognition cargado');
} catch (error) {
  console.warn('[VOZ] Módulo expo-speech-recognition no disponible (necesita regenerar build con npx expo run:android)');
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

let recognitionAbortController: AbortController | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastTranscript = '';
let silenceTimeout: ReturnType<typeof setTimeout> | null = null;
const SILENCE_TIMEOUT = 3000; // 3 segundos de silencio para enviar

/**
 * Verifica si el reconocimiento de voz está disponible
 */
export function isVoiceRecognitionAvailable(): boolean {
  return ExpoSpeechRecognitionModule !== null;
}

/**
 * Configura el reconocimiento de voz
 */
export async function setupVoiceRecognition(): Promise<boolean> {
  if (!ExpoSpeechRecognitionModule) {
    console.warn('[VOZ] Módulo de reconocimiento no disponible');
    return false;
  }

  try {
    console.log('[VOZ] Verificando permisos de reconocimiento de voz...');
    const hasPermission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    console.log('[VOZ] Permisos:', hasPermission.granted);
    return hasPermission.granted;
  } catch (error) {
    console.error('[VOZ] Error al verificar permisos:', error);
    return false;
  }
}

/**
 * Inicia el reconocimiento de voz
 */
export async function startVoiceRecognition(
  callbacks: VoiceCallbacks,
  language: string = 'es-ES'
): Promise<void> {
  if (!ExpoSpeechRecognitionModule) {
    console.warn('[VOZ] Módulo de reconocimiento no disponible');
    callbacks.onError('El reconocimiento de voz no está disponible. Ejecuta npx expo run:android para regenerar el build.');
    return;
  }

  try {
    console.log('[VOZ] Iniciando reconocimiento de voz con lenguaje:', language);

    // Detener cualquier reconocimiento anterior
    stopVoiceRecognition();

    recognitionAbortController = new AbortController();

    const options: any = {
      lang: language,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
    };

    console.log('[VOZ] Opciones:', options);

    ExpoSpeechRecognitionModule.start(options);

    console.log('[VOZ] Listeners configurados, esperando eventos...');

    // Evento: reconocimiento iniciado
    ExpoSpeechRecognitionModule.addListener('audiostart', () => {
      console.log('[VOZ] Evento: audiostart - Reconocimiento iniciado');
      callbacks.onStart();
    });

    // Evento: resultados parciales o finales
    ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      const isFinal = event.results[0]?.isFinal || false;

      console.log('[VOZ] Evento: result - Transcript:', transcript, 'isFinal:', isFinal);

      if (transcript) {
        lastTranscript = transcript;
        callbacks.onTranscript(transcript, isFinal);

        // Reiniciar timeout de silencio cada vez que recibimos texto
        clearTimeout(silenceTimeout!);

        // Si es final, enviar inmediatamente
        if (isFinal) {
          console.log('[VOZ] Resultado final, enviando:', transcript);
          clearTimeout(debounceTimer!);
          stopVoiceRecognition();
        } else {
          // Si no es final, usar timeout de silencio más largo
          silenceTimeout = setTimeout(() => {
            console.log('[VOZ] Timeout de silencio, enviando último transcript:', lastTranscript);
            if (lastTranscript) {
              callbacks.onTranscript(lastTranscript, true);
              stopVoiceRecognition();
            }
          }, SILENCE_TIMEOUT);
        }
      }
    });

    // Evento: error
    ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      console.error('[VOZ] Evento: error -', event.error, event.message);
      clearTimeout(debounceTimer!);
      callbacks.onError(event.error || event.message || 'Error de reconocimiento');
      stopVoiceRecognition();
    });

    // Evento: reconocimiento terminado
    ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('[VOZ] Evento: end - Reconocimiento terminado');

      // Si hay texto pendiente sin isFinal, enviarlo
      if (lastTranscript && debounceTimer) {
        clearTimeout(debounceTimer);
        console.log('[VOZ] Enviando texto pendiente al terminar:', lastTranscript);
        callbacks.onTranscript(lastTranscript, true);
      }

      callbacks.onEnd();
      stopVoiceRecognition();
    });

  } catch (error) {
    console.error('[VOZ] Error al iniciar reconocimiento:', error);
    callbacks.onError('No se pudo iniciar el reconocimiento de voz');
  }
}

/**
 * Detiene el reconocimiento de voz
 */
export function stopVoiceRecognition(): void {
  console.log('[VOZ] Deteniendo reconocimiento de voz...');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }

  if (recognitionAbortController) {
    recognitionAbortController.abort();
    recognitionAbortController = null;
  }

  if (ExpoSpeechRecognitionModule) {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('[VOZ] Error al detener reconocimiento:', error);
    }
  }

  lastTranscript = '';
}

/**
 * Reproduce texto con síntesis de voz
 */
export async function speakText(
  text: string,
  language: string = 'es-MX',
  onDone?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  try {
    // Limpiar el texto de caracteres especiales que pueden causar problemas
    const cleanText = text.replace(/[^\w\s\u00C0-\u017F\u1E00-\u1EFF¿?¡!.,]/g, '');
    const textToSpeak = cleanText || text;

    console.log('[VOZ] Hablando:', textToSpeak.substring(0, 50) + '...', 'con idioma:', language);

    await Speech.speak(textToSpeak, {
      language,
      pitch: 1.0,
      rate: 0.9,
      volume: 1.0,
      onStart: () => {
        console.log('[VOZ] Speech.speak: onStart');
      },
      onDone: () => {
        console.log('[VOZ] Speech.speak: onDone');
        if (onDone) onDone();
      },
      onError: (error) => {
        console.error('[VOZ] Speech.speak: onError', error);
        if (onError) onError('Error al reproducir voz');
      },
    });
  } catch (error) {
    console.error('[VOZ] Error al hablar:', error);
    if (onError) onError('No se pudo reproducir la voz');
  }
}

/**
 * Obtiene las voces disponibles
 */
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    console.log('[VOZ] Voces disponibles:', voices.length);
    return voices;
  } catch (error) {
    console.error('[VOZ] Error al obtener voces:', error);
    return [];
  }
}

/**
 * Busca una voz en español
 */
export async function findSpanishVoice(): Promise<string> {
  try {
    const voices = await getAvailableVoices();
    // Priorizar español de España para mejor precisión en fitness/gimnasio
    const preferredLanguages = ['es-ES', 'es-419', 'es-MX', 'es-US'];
    for (const lang of preferredLanguages) {
      const voice = voices.find(v => v.language === lang);
      if (voice) {
        console.log('[VOZ] Voz encontrada:', lang);
        return lang;
      }
    }
    // Fallback a cualquier español
    const spanishVoice = voices.find(voice =>
      voice.language.startsWith('es-')
    );
    return spanishVoice?.language || 'es-ES';
  } catch (error) {
    console.error('[VOZ] Error al buscar voz en español:', error);
    return 'es-ES';
  }
}
