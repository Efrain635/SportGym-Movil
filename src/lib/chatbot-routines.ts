import exerciseCatalog from "../../assets/exercises/exercises.json";
import type { GeneratedRoutineExercise } from "../../assets/database/firebase";

type CatalogExercise = {
  id: string;
  name_es: string;
  category: string;
  body_part: string;
  equipment?: string;
  difficulty?: string;
};

type DayPlan = {
  day: string;
  bodyParts: string[];
};

const exercises = (exerciseCatalog as { exercises: CatalogExercise[] }).exercises;
const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const bodyPartForFocus: Record<string, string> = {
  Pecho: "chest",
  Espalda: "back",
  Piernas: "upper_legs",
  Brazos: "upper_arms",
  Hombros: "shoulders",
};

function getSchedule(days: number): DayPlan[] {
  if (days <= 3) {
    return weekdays.slice(0, days).map((day) => ({
      day,
      bodyParts: ["chest", "back", "shoulders", "upper_legs", "upper_arms", "core"],
    }));
  }

  const splits: string[][] =
    days === 4
      ? [
          ["chest", "back", "shoulders", "upper_arms"],
          ["upper_legs", "lower_legs", "core"],
        ]
      : days === 5
        ? [
            ["chest", "shoulders", "upper_arms"],
            ["back", "upper_arms"],
            ["upper_legs", "lower_legs", "core"],
            ["chest", "back"],
            ["upper_legs", "shoulders", "core"],
          ]
        : [
            ["chest", "shoulders", "upper_arms"],
            ["back", "upper_arms"],
            ["upper_legs", "lower_legs", "core"],
          ];

  return weekdays.slice(0, days).map((day, index) => ({
    day,
    bodyParts: splits[index % splits.length],
  }));
}

function isSuitableForRestrictions(
  exercise: CatalogExercise,
  restrictions: string,
) {
  const name = exercise.name_es.toLowerCase();
  if (restrictions.includes("espalda")) {
    return !/(peso muerto|hiperextensi|good morning)/i.test(name);
  }
  if (restrictions.includes("rodilla")) {
    return !/(salto|jump|sprint|zancada|lunge)/i.test(name);
  }
  if (restrictions.includes("hombro")) {
    return !/(press militar|press por encima|elevaci[oó]n frontal)/i.test(name);
  }
  return true;
}

export function createChatbotRoutine(input: {
  goal: string;
  daysAnswer: string;
  durationAnswer: string;
  focus?: string;
  restriction?: string;
  level?: string;
}): GeneratedRoutineExercise[] {
  const parsedDays = Number(input.daysAnswer.match(/\d+/)?.[0] ?? 4);
  const days = Math.min(6, Math.max(2, parsedDays));
  const exerciseLimit =
    input.durationAnswer.startsWith("30") ? 4 :
    input.durationAnswer.startsWith("45") ? 5 :
    input.durationAnswer.startsWith("60") ? 6 : 7;
  const isBeginner = input.level === "principiante";
  const sets = input.goal === "Ganar masa muscular" && !isBeginner ? 4 : 3;
  const repetitions =
    input.goal === "Ganar masa muscular" ? 10 :
    input.goal === "Perder grasa" || input.goal === "Mejorar condición física"
      ? 14
      : 12;
  const focusBodyPart = input.focus ? bodyPartForFocus[input.focus] : undefined;
  const restrictions = (input.restriction ?? "").toLowerCase();
  const schedule = getSchedule(days);
  const selected: GeneratedRoutineExercise[] = [];

  for (const plan of schedule) {
    const dayUsed = new Set<string>();
    const prioritizedBodyParts = focusBodyPart
      ? [
          ...plan.bodyParts.filter((part) => part === focusBodyPart),
          ...plan.bodyParts.filter((part) => part !== focusBodyPart),
        ]
      : plan.bodyParts;
    let remaining = exerciseLimit;

    for (const bodyPart of prioritizedBodyParts) {
      if (remaining <= 0) break;
      const candidates = exercises.filter(
        (exercise) =>
          exercise.category === "strength" &&
          exercise.body_part === bodyPart &&
          exercise.difficulty !== "advanced" &&
          isSuitableForRestrictions(exercise, restrictions),
      );
      const exercise = candidates.find((candidate) => !dayUsed.has(candidate.id));
      if (!exercise) continue;

      dayUsed.add(exercise.id);
      selected.push({
        ejercicioId: exercise.id,
        ejercicioNombre: exercise.name_es,
        dia: plan.day,
        equipo: exercise.equipment || "Peso corporal",
        grupoMuscular: bodyPart,
        categoria: exercise.category,
        seriesAsignadas: sets,
        repeticionesAsignadas: repetitions,
      });
      remaining -= 1;
    }

    while (remaining > 0) {
      const fallback = exercises.find(
        (exercise) =>
          exercise.category === "strength" &&
          plan.bodyParts.includes(exercise.body_part) &&
          exercise.difficulty !== "advanced" &&
          !dayUsed.has(exercise.id) &&
          isSuitableForRestrictions(exercise, restrictions),
      );
      if (!fallback) break;

      dayUsed.add(fallback.id);
      selected.push({
        ejercicioId: fallback.id,
        ejercicioNombre: fallback.name_es,
        dia: plan.day,
        equipo: fallback.equipment || "Peso corporal",
        grupoMuscular: fallback.body_part,
        categoria: fallback.category,
        seriesAsignadas: sets,
        repeticionesAsignadas: repetitions,
      });
      remaining -= 1;
    }
  }

  return selected;
}

export function getCardioRecommendation(
  goal: string,
  responses: Record<string, string>,
  level?: string,
) {
  if (goal === "Perder grasa") {
    const activity = responses.cardio;
    if (activity === "No me gusta el cardio") {
      return "Como indicaste que no te gusta el cardio, empieza con caminatas cómodas de 10–15 minutos y aumenta gradualmente si te sientes bien.";
    }
    return `Complemento cardiovascular: ${activity || "caminata"} a intensidad moderada durante 20–30 minutos, 2–3 veces por semana.`;
  }

  if (goal === "Mejorar condición física") {
    const preference = responses.cardio_preference;
    const startingActivity = responses.current_activity === "Ninguna";
    if (preference === "Alta intensidad" && !startingActivity && level !== "principiante") {
      return "Complemento cardiovascular: intervalos de alta intensidad breves, 10–15 minutos, hasta 2 veces por semana; detente ante dolor o mareo.";
    }
    if (preference === "Baja intensidad") {
      return "Complemento cardiovascular: actividad continua de baja intensidad durante 20–30 minutos, 2–3 veces por semana.";
    }
    return "Complemento cardiovascular: alterna intervalos moderados con actividad continua durante 20–25 minutos, 2–3 veces por semana.";
  }

  if (responses.lifestyle === "Trabajo físico") {
    return "Como tu trabajo ya es físicamente demandante, prioriza la recuperación y reduce la sesión si llegas fatigado.";
  }
  return undefined;
}

export function formatChatbotRoutine(
  routine: GeneratedRoutineExercise[],
  restSeconds: number,
  additionalGuidance?: string,
  savedToProfile = false,
) {
  const days = [...new Set(routine.map((exercise) => exercise.dia))];
  return [
    savedToProfile
      ? "¡Rutina lista! La guardé en Mi rutina. Puedes ajustar series y repeticiones al iniciar cada sesión."
      : "¡Rutina lista! No pude guardarla en Mi rutina; puedes consultar este plan en el historial del chat.",
    "",
    ...days.flatMap((day) => [
      `${day}:`,
      ...routine
        .filter((exercise) => exercise.dia === day)
        .map(
          (exercise, index) =>
            `${index + 1}. ${exercise.ejercicioNombre} — ${exercise.seriesAsignadas} series × ${exercise.repeticionesAsignadas} repeticiones; descanso ${restSeconds} s.`,
        ),
      "",
    ]),
    ...(additionalGuidance ? [additionalGuidance, ""] : []),
    "Usa una carga que puedas controlar con buena técnica. Si una molestia aumenta, detén ese ejercicio y consulta a un profesional.",
  ].join("\n");
}
