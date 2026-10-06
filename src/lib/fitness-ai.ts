export type FitnessLevel = "principiante" | "intermedio" | "avanzado";

export type ClientProfile = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  goal?: string;
  level?: FitnessLevel;
  gymMachines?: string[];
  daysPerWeek?: number;
  restrictions?: string[];
  weight?: number | null;
  height?: number | null;
  age?: number | null;
};

const normalize = (value: string | undefined | null, fallback: string) => {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value.trim();
};

export function buildFitnessCoachPrompt(
  profile: ClientProfile | null,
  question: string,
) {
  const currentProfile = profile ?? {};
  const name = normalize(currentProfile.firstName, "usuario");
  const goal = normalize(currentProfile.goal, "ganar masa muscular");
  const level = normalize(currentProfile.level, "principiante");
  const gymMachines = currentProfile.gymMachines?.length
    ? currentProfile.gymMachines.join(", ")
    : "máquinas básicas del gimnasio";
  const days = currentProfile.daysPerWeek ?? 4;
  const weight = currentProfile.weight ?? 70;
  const height = currentProfile.height ?? 170;
  const age = currentProfile.age ?? 25;
  const restrictions = currentProfile.restrictions?.length
    ? currentProfile.restrictions.join(", ")
    : "ninguna";

  return `Eres un entrenador personal y nutricionista digital para una app de fitness llamada SportGym.

Tu objetivo es ayudar a ${name} con una rutina personalizada y segura.

Perfil del usuario:
- objetivo: ${goal}
- nivel actual: ${level}
- edad: ${age}
- peso: ${weight} kg
- altura: ${height} cm
- días de entrenamiento por semana: ${days}
- máquinas disponibles: ${gymMachines}
- restricciones: ${restrictions}

Reglas:
1. Ajusta la rutina según el nivel del usuario y su objetivo.
2. Si una máquina no existe, propone una alternativa equivalente.
3. Prioriza seguridad, técnica y progresión gradual.
4. Si el usuario es principiante, usa volumen moderado y mucha técnica.
5. Si el objetivo es ganar masa muscular, recomienda proteína y caloría suficiente.
6. Si el objetivo es perder grasa, recomienda déficit moderado y entrenamiento consistente.
7. Si el objetivo es tonificar, combina fuerza con actividad ligera.
8. Si hay dolor o fatiga, reduce la intensidad o cambia el ejercicio.
9. responde en español, claro y motivador.
10. Si el usuario pregunta por nutrición, incluye recomendaciones prácticas, no dietas extremas.

Pregunta del usuario:
${question}`;
}

export function generateCoachReply(
  profile: ClientProfile | null,
  question: string,
) {
  const normalizedQuestion = question.toLowerCase();
  const level = normalize(profile?.level, "principiante");
  const goal = normalize(profile?.goal, "ganar masa muscular");
  const machines = profile?.gymMachines?.length
    ? profile.gymMachines.join(", ")
    : "máquinas básicas";

  if (
    normalizedQuestion.includes("rutina") ||
    normalizedQuestion.includes("entrenamiento") ||
    normalizedQuestion.includes("sesion") ||
    normalizedQuestion.includes("plan")
  ) {
    return `Basado en tu perfil, tu objetivo es ${goal} y tu nivel es ${level}. Con las máquinas disponibles (${machines}), te recomiendo empezar con una rutina de 4 días con enfoque en técnica, progresión y recuperación. Mantén 3 a 4 series por ejercicio y aumenta la carga solo cuando puedas completar todas las repeticiones con buena técnica. Si tu nivel es principiante, prioriza ejercicios básicos y descanso correcto.`;
  }

  if (
    normalizedQuestion.includes("nutri") ||
    normalizedQuestion.includes("comida") ||
    normalizedQuestion.includes("dieta") ||
    normalizedQuestion.includes("prote") ||
    normalizedQuestion.includes("calor")
  ) {
    const proteinTarget = profile?.weight
      ? `${(profile.weight * 1.8).toFixed(1)} a ${(profile.weight * 2.2).toFixed(1)} g`
      : "1.8 a 2.2 g por kg de peso";

    return `Para ${goal}, tu nutrición debe apoyar el entrenamiento: consume alrededor de ${proteinTarget} de proteína diaria, carbohidratos suficientes para entrenar bien y grasas saludables para la recuperación. Haz 3 a 5 comidas con proteína en cada una y no omitas la hidratación. Si estás buscando masa, añade calorías de forma gradual; si buscas grasa, establece un déficit moderado.`;
  }

  if (
    normalizedQuestion.includes("maquina") ||
    normalizedQuestion.includes("equipo") ||
    normalizedQuestion.includes("gimnasio")
  ) {
    return `Tu gimnasio tiene estas máquinas: ${machines}. Si falta alguna herramienta clave, usa ejercicios alternativos con el mismo patrón de movimiento: press banca → press con mancuernas o smith; remo → remo con mancuernas; polea → bandas o remo; sentadilla → leg press. La clave es mantener el mismo patrón sin forzar la técnica.`;
  }

  if (
    normalizedQuestion.includes("nivel") ||
    normalizedQuestion.includes("principiante") ||
    normalizedQuestion.includes("intermedio") ||
    normalizedQuestion.includes("avanzado")
  ) {
    return `Tu nivel actual se considera ${level}. Eso significa que la intensidad, el volumen y la complejidad de los ejercicios deben adaptarse a tu experiencia. Si eres principiante, da prioridad a técnica y progresión lenta; si eres intermedio o avanzado, puedes aumentar carga, series o complejidad conforme tu recuperación lo permita.`;
  }

  if (
    normalizedQuestion.includes("dolor") ||
    normalizedQuestion.includes("lesion") ||
    normalizedQuestion.includes("recuper") ||
    normalizedQuestion.includes("fatiga")
  ) {
    return `Si sientes dolor persistente, inflamación o fatiga excesiva, reduce la intensidad y cambia el ejercicio. La recuperación es parte del progreso. Prioriza sueño, hidratación, pausas adecuadas y reducción de carga si la recuperación no está bien.`;
  }

  return `Con tu objetivo ${goal} y tu nivel ${level}, la mejor estrategia es trabajar con rutina consistente, buena técnica y progresión gradual. Si quieres, puedo ayudarte a crear una rutina semanal con tus máquinas disponibles, sugerir una nutrición básica o ajustar tu plan según tu progreso.`;
}
