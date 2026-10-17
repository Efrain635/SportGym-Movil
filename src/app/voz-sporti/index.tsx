import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { askSporti } from "../../lib/sporti-groq";

// Import condicional del módulo de reconocimiento de voz
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const speechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechModule.useSpeechRecognitionEvent;
  console.log('[VOZ SPORTI] Módulo expo-speech-recognition cargado');
} catch (error) {
  console.warn('[VOZ SPORTI] Módulo expo-speech-recognition no disponible (necesita development build)');
}

// Verifica si el reconocimiento de voz está disponible
function isVoiceRecognitionAvailable(): boolean {
  return ExpoSpeechRecognitionModule !== null;
}

// Tipo de mensaje compatible con askSporti
type Msg = { role: "user" | "assistant"; content: string };

type Estado = "inactivo" | "escuchando" | "pensando" | "hablando";

// ---------- Componente ----------
export default function VozSporti() {
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [textoUsuario, setTextoUsuario] = useState("");
  const [textoRespuesta, setTextoRespuesta] = useState("");

  const estadoRef = useRef<Estado>("inactivo");
  const conversacionActiva = useRef(false); // modo "manos libres": vuelve a escuchar solo
  const ultimoTexto = useRef("");
  const historial = useRef<Msg[]>([]);
  const pulso = useRef(new Animated.Value(1)).current;

  const cambiarEstado = (e: Estado) => {
    estadoRef.current = e;
    setEstado(e);
  };

  // Animación de pulso mientras escucha o habla
  useEffect(() => {
    if (estado === "inactivo" || estado === "pensando") {
      pulso.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1.2, duration: 650, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [estado]);

  // Limpieza al salir de la pantalla
  useEffect(() => {
    return () => {
      conversacionActiva.current = false;
      Speech.stop();
      if (ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  // ---------- Eventos del micrófono ----------
  if (useSpeechRecognitionEvent) {
    useSpeechRecognitionEvent("result", (event: any) => {
      const texto = event.results?.[0]?.transcript ?? "";
      setTextoUsuario(texto);
      if (event.isFinal) ultimoTexto.current = texto;
    });

    useSpeechRecognitionEvent("end", () => {
      if (estadoRef.current !== "escuchando") return;
      const texto = ultimoTexto.current.trim();
      if (texto) {
        procesar(texto);
      } else {
        conversacionActiva.current = false;
        cambiarEstado("inactivo");
      }
    });

    useSpeechRecognitionEvent("error", (event: any) => {
      conversacionActiva.current = false;
      cambiarEstado("inactivo");
      if (event.error !== "no-speech" && event.error !== "aborted") {
        Alert.alert("Error de voz", event.message || "No se pudo reconocer la voz");
      }
    });
  }

  // ---------- Flujo: escuchar -> Gemini -> hablar ----------
  const escuchar = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Módulo no disponible",
        "El reconocimiento de voz necesita un development build. Ejecuta: npx expo run:android"
      );
      return;
    }

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      conversacionActiva.current = false;
      Alert.alert("Permiso requerido", "Activa el micrófono para hablar con Sporti.");
      return;
    }
    ultimoTexto.current = "";
    setTextoUsuario("");
    cambiarEstado("escuchando");
    ExpoSpeechRecognitionModule.start({
      lang: "es-MX",
      interimResults: true,
      continuous: false,
    });
  };

  const procesar = async (pregunta: string) => {
    cambiarEstado("pensando");
    historial.current.push({ role: "user", content: pregunta });
    historial.current = historial.current.slice(-12); // recuerda solo lo reciente

    try {
      const respuesta = await askSporti(historial.current);
      historial.current.push({ role: "assistant", content: respuesta });
      setTextoRespuesta(respuesta);
      hablar(respuesta);
    } catch (e: any) {
      conversacionActiva.current = false;
      cambiarEstado("inactivo");
      Alert.alert("Sporti", e?.message ?? "No se pudo obtener respuesta");
    }
  };

  const hablar = (texto: string) => {
    const limpio = texto.replace(/[*#_`>~-]/g, "");
    cambiarEstado("hablando");
    Speech.speak(limpio, {
      language: "es-MX",
      rate: 1.0,
      onDone: () => {
        // Cuando termina de hablar, vuelve a escuchar si la conversación sigue activa
        if (conversacionActiva.current) escuchar();
        else cambiarEstado("inactivo");
      },
      onStopped: () => cambiarEstado("inactivo"),
      onError: () => cambiarEstado("inactivo"),
    });
  };

  const alternar = () => {
    if (estado !== "inactivo") {
      // Detener todo
      conversacionActiva.current = false;
      Speech.stop();
      ExpoSpeechRecognitionModule.abort();
      cambiarEstado("inactivo");
      return;
    }
    conversacionActiva.current = true;
    escuchar();
  };

  const etiqueta: Record<Estado, string> = {
    inactivo: "Toca para hablar con Sporti",
    escuchando: "Te escucho...",
    pensando: "Pensando...",
    hablando: "Sporti está hablando (toca para detener)",
  };

  const colorBoton = estado === "escuchando" ? "#E53935" : "#4C9A3A";
  const icono = estado === "inactivo" ? "mic" : estado === "pensando" ? "hourglass" : "stop";

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Sporti</Text>
      <Text style={styles.estado}>{etiqueta[estado]}</Text>

      <View style={styles.cajaTexto}>
        {!!textoUsuario && <Text style={styles.usuario}>Tú: {textoUsuario}</Text>}
        {!!textoRespuesta && <Text style={styles.respuesta}>{textoRespuesta}</Text>}
      </View>

      <TouchableOpacity onPress={alternar} activeOpacity={0.8} disabled={estado === "pensando"}>
        <Animated.View
          style={[styles.boton, { backgroundColor: colorBoton, transform: [{ scale: pulso }] }]}
        >
          <Ionicons name={icono as any} size={40} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  titulo: { color: "#4C9A3A", fontSize: 28, fontWeight: "bold" },
  estado: { color: "#bbb", fontSize: 15, marginTop: 6 },
  cajaTexto: { flex: 1, justifyContent: "center", width: "100%" },
  usuario: { color: "#888", fontSize: 16, textAlign: "center", marginBottom: 16 },
  respuesta: { color: "#fff", fontSize: 20, textAlign: "center", lineHeight: 28 },
  boton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
