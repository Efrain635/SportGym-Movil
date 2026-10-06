import { initializeApp } from "firebase/app";

import {
    createUserWithEmailAndPassword,
    deleteUser,
    getAuth,
    initializeAuth,
} from "firebase/auth";
// @ts-expect-error Firebase's React Native runtime exports this, but its web-facing types do not.
import { getReactNativePersistence } from "firebase/auth";

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    limit,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    type DocumentData,
    type QueryDocumentSnapshot,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7dcJDrGRTH743AoyYnMvTODAMPVRt5Yg",
  authDomain: "sportgym-2b2f8.firebaseapp.com",
  projectId: "sportgym-2b2f8",
  storageBucket: "sportgym-2b2f8.firebasestorage.app",
  messagingSenderId: "51187930142",
  appId: "1:51187930142:web:aed0e8f35bcfe5e8d44a0f",
};

const app = initializeApp(firebaseConfig);

const createAuth = () => {
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/already-initialized") {
      throw error;
    }

    return getAuth(app);
  }
};

export const auth = createAuth();
export const db = getFirestore(app);

type ClientRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ClientRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getFirstString = (
  record: ClientRecord,
  keys: string[],
): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const isFirestoreTimestamp = (
  value: unknown,
): value is { toDate: () => Date } =>
  isRecord(value) && typeof value.toDate === "function";

const normalizeClientDate = (value: unknown): string | null => {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" && value.trim()) {
    const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      date = new Date(Number(year), Number(month) - 1, Number(day));
      if (
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
      ) {
        return null;
      }
    } else {
      date = new Date(value);
    }
  } else if (isFirestoreTimestamp(value)) {
    date = value.toDate();
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return date.toISOString();
};

export function getClientMembership(client: ClientRecord) {
  const nestedMembership =
    (isRecord(client.membresia) && client.membresia) ||
    (isRecord(client.membership) && client.membership) ||
    {};

  const getDate = (keys: string[]) => {
    for (const key of keys) {
      const value =
        nestedMembership[key] !== undefined
          ? nestedMembership[key]
          : client[key];
      const date = normalizeClientDate(value);
      if (date) {
        return date;
      }
    }

    return null;
  };

  const plan =
    getFirstString(nestedMembership, ["plan", "tipo", "nombre"]) ??
    getFirstString(client, [
      "plan",
      "tipoMembresia",
      "tipo_membresia",
      "nombreMembresia",
      "membershipType",
    ]) ??
    (typeof client.membresia === "string" ? client.membresia.trim() : null);
  const startDate = getDate([
    "fechaInicio",
    "fecha_inicio",
    "fechaInicioMembresia",
    "fecha_inicio_membresia",
    "startDate",
    "start_date",
  ]);
  const endDate = getDate([
    "fechaVencimiento",
    "fecha_vencimiento",
    "fechaFin",
    "fecha_fin",
    "fechaFinMembresia",
    "fecha_vencimiento_membresia",
    "endDate",
    "end_date",
    "expirationDate",
    "expiration_date",
  ]);

  if (!plan && !startDate && !endDate) {
    return null;
  }

  return { plan, startDate, endDate };
}

export async function verifyClientCredentials(
  username: string,
  password: string,
): Promise<DocumentData & { documentId: string }> {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || !password) {
    throw new Error("missing-credentials");
  }

  const clientsQuery = query(
    collection(db, "clientes"),
    where("usuario", "==", normalizedUsername),
    where("contrasena", "==", password),
    limit(1),
  );
  const clientsSnapshot = await getDocs(clientsQuery);

  if (clientsSnapshot.empty) {
    throw new Error("invalid-credentials");
  }

  const clientDocument = clientsSnapshot.docs[0];
  return { ...clientDocument.data(), documentId: clientDocument.id };
}

type RoutineExerciseInput = {
  clientId: string;
  clientUsername: string;
  clientName: string;
  exercise: {
    id: string;
    name: string;
    bodyPart: string;
    equipment: string;
    category: string;
  };
  day: string;
};

type FavoriteExerciseInput = Omit<RoutineExerciseInput, "day">;

export type SavedRoutineExercise = {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  dia: string;
  equipo: string;
  grupoMuscular: string;
  categoria: string;
  seriesAsignadas?: number;
  repeticionesAsignadas?: number;
};

export type SavedFavoriteExercise = {
  id: string;
  ejercicioId: string;
  ejercicioNombre: string;
  equipo: string;
  grupoMuscular: string;
  categoria: string;
};

const getRoutineDocumentId = (
  clientId: string,
  exerciseId: string,
  day: string,
) =>
  `${clientId}_${exerciseId}_${day
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")}`;

export async function saveExerciseToRoutine(input: RoutineExerciseInput) {
  const routineId = getRoutineDocumentId(
    input.clientId,
    input.exercise.id,
    input.day,
  );
  await setDoc(
    doc(db, "rutinas", routineId),
    {
      clienteId: input.clientId,
      clienteUsuario: input.clientUsername,
      clienteNombre: input.clientName,
      ejercicioId: input.exercise.id,
      ejercicioNombre: input.exercise.name,
      dia: input.day,
      equipo: input.exercise.equipment,
      grupoMuscular: input.exercise.bodyPart,
      categoria: input.exercise.category,
      seriesAsignadas: 3,
      repeticionesAsignadas: 12,
      fechaActualizacion: serverTimestamp(),
    },
    { merge: true },
  );

  return routineId;
}

export async function getClientRoutineExercises(clientId: string) {
  const routineQuery = query(
    collection(db, "rutinas"),
    where("clienteId", "==", clientId),
  );
  const snapshot = await getDocs(routineQuery);

  return snapshot.docs.map((routineDocument) => ({
    id: routineDocument.id,
    ...routineDocument.data(),
  })) as SavedRoutineExercise[];
}

export async function updateRoutineExerciseTargets(
  routineId: string,
  series: number,
  repetitions: number,
) {
  await setDoc(
    doc(db, "rutinas", routineId),
    {
      seriesAsignadas: series,
      repeticionesAsignadas: repetitions,
      fechaActualizacion: serverTimestamp(),
    },
    { merge: true },
  );
}

const getFavoriteDocument = (clientId: string, exerciseId: string) =>
  doc(db, "favoritos", `${clientId}_${exerciseId}`);

export async function hasFavoriteExercise(
  clientId: string,
  exerciseId: string,
) {
  const favoriteDocument = await getDoc(
    getFavoriteDocument(clientId, exerciseId),
  );
  return favoriteDocument.exists();
}

export async function saveFavoriteExercise(input: FavoriteExerciseInput) {
  await setDoc(getFavoriteDocument(input.clientId, input.exercise.id), {
    clienteId: input.clientId,
    clienteUsuario: input.clientUsername,
    clienteNombre: input.clientName,
    ejercicioId: input.exercise.id,
    ejercicioNombre: input.exercise.name,
    equipo: input.exercise.equipment,
    grupoMuscular: input.exercise.bodyPart,
    categoria: input.exercise.category,
    fechaCreacion: serverTimestamp(),
  });
}

export async function removeFavoriteExercise(
  clientId: string,
  exerciseId: string,
) {
  await deleteDoc(getFavoriteDocument(clientId, exerciseId));
}

export async function getClientFavoriteExercises(clientId: string) {
  const favoritesQuery = query(
    collection(db, "favoritos"),
    where("clienteId", "==", clientId),
  );
  const snapshot = await getDocs(favoritesQuery);

  return snapshot.docs.map((favoriteDocument) => ({
    id: favoriteDocument.id,
    ...favoriteDocument.data(),
  })) as SavedFavoriteExercise[];
}

export type CompletedWorkoutExercise = {
  ejercicioId: string;
  ejercicioNombre: string;
  seriesAsignadas: number;
  repeticionesAsignadas: number;
  seriesRealizadas: number;
  repeticionesRealizadas: number;
};

export async function saveCompletedWorkout(input: {
  clientId: string;
  clientUsername: string;
  clientName: string;
  day: string;
  startedAt: Date;
  durationSeconds: number;
  exercises: CompletedWorkoutExercise[];
}) {
  const workoutDocument = await addDoc(collection(db, "entrenamientos"), {
    clienteId: input.clientId,
    clienteUsuario: input.clientUsername,
    clienteNombre: input.clientName,
    dia: input.day,
    estado: "completado",
    fechaInicio: input.startedAt,
    fechaFinalizacion: serverTimestamp(),
    duracionSegundos: input.durationSeconds,
    duracionMinutos: Math.max(1, Math.ceil(input.durationSeconds / 60)),
    totalEjercicios: input.exercises.length,
    ejercicios: input.exercises,
  });

  return workoutDocument.id;
}

export async function getClientWorkoutProgress(clientId: string) {
  if (!clientId.trim()) {
    throw new Error("missing-client-id");
  }

  const workoutsQuery = query(
    collection(db, "entrenamientos"),
    where("clienteId", "==", clientId),
  );
  const snapshot = await getDocs(workoutsQuery);
  const completedWorkouts = snapshot.docs.filter(
    (workout) => workout.data().estado === "completado",
  );

  const totalExercises = completedWorkouts.reduce((total, workout) => {
    const data = workout.data();
    if (Array.isArray(data.ejercicios)) {
      return total + data.ejercicios.length;
    }
    return total + (typeof data.totalEjercicios === "number" ? data.totalEjercicios : 0);
  }, 0);

  return {
    totalExercises,
    totalWorkouts: completedWorkouts.length,
  };
}

export async function updateClientProfile(
  username: string,
  profile: {
    goal?: string;
    level?: "principiante" | "intermedio" | "avanzado";
    daysPerWeek?: number;
    gymMachines?: string[];
    restrictions?: string[];
  },
) {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername) {
    throw new Error("missing-username");
  }

  const identifierCandidates = Array.from(
    new Set([
      normalizedUsername,
      normalizedUsername.replace(/@.*$/, ""),
      normalizedUsername.replace(/\.[^/.]+$/, ""),
    ]),
  ).filter(Boolean);

  let clientDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  for (const candidate of identifierCandidates) {
    const queryOptions = [
      query(
        collection(db, "clientes"),
        where("usuario", "==", candidate),
        limit(1),
      ),
      query(
        collection(db, "clientes"),
        where("username", "==", candidate),
        limit(1),
      ),
      query(
        collection(db, "clientes"),
        where("email", "==", candidate),
        limit(1),
      ),
      query(
        collection(db, "clientes"),
        where("correo", "==", candidate),
        limit(1),
      ),
    ];

    for (const queryDefinition of queryOptions) {
      const snapshot = await getDocs(queryDefinition);
      if (!snapshot.empty) {
        clientDoc = snapshot.docs[0];
        break;
      }
    }

    if (clientDoc) {
      break;
    }
  }

  if (!clientDoc) {
    throw new Error("client-not-found");
  }

  const clientData = clientDoc.data();
  const nextMachines =
    profile.gymMachines ??
    (Array.isArray(clientData.maquinasDisponibles)
      ? clientData.maquinasDisponibles
      : []);
  const nextRestrictions =
    profile.restrictions ??
    (Array.isArray(clientData.restricciones) ? clientData.restricciones : []);

  await updateDoc(clientDoc.ref, {
    objetivo:
      profile.goal ??
      (typeof clientData.objetivo === "string"
        ? clientData.objetivo
        : "ganar masa muscular"),
    nivel:
      profile.level ??
      (typeof clientData.nivel === "string"
        ? clientData.nivel
        : "principiante"),
    diasEntrenamiento:
      profile.daysPerWeek ??
      (typeof clientData.diasEntrenamiento === "number"
        ? clientData.diasEntrenamiento
        : 4),
    maquinasDisponibles: nextMachines,
    maquinas: nextMachines,
    restricciones: nextRestrictions,
    fechaUltimoCambio: serverTimestamp(),
  });
}

export async function updateClientPersonalData(
  clientId: string,
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string | null;
    gender: string | null;
    weight: number | null;
    height: number | null;
    level: "principiante" | "intermedio" | "avanzado" | undefined;
  },
) {
  if (!clientId.trim()) {
    throw new Error("missing-client-id");
  }

  await updateDoc(doc(db, "clientes", clientId), {
    nombre: profile.firstName.trim(),
    apellido: profile.lastName.trim(),
    telefono: profile.phone.trim() || null,
    fechaNacimiento: profile.birthDate,
    genero: profile.gender,
    peso: profile.weight,
    estatura: profile.height,
    ...(profile.level ? { nivel: profile.level } : {}),
    fechaUltimoCambio: serverTimestamp(),
  });
}

export function getClientPersonalData(client: ClientRecord) {
  const getNumber = (keys: string[]) => {
    for (const key of keys) {
      const value = client[key];
      const number = typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replace(",", "."))
          : Number.NaN;
      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
    return null;
  };
  const birthDate = normalizeClientDate(
    client.fechaNacimiento ?? client.fecha_nacimiento ?? client.birthDate ?? client.dateOfBirth,
  );
  const directAge = getNumber(["edad", "age"]);
  const age = directAge ?? (birthDate ? (() => {
    const today = new Date();
    const birthday = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
    let years = today.getFullYear() - birthday.getFullYear();
    if (
      today.getMonth() < birthday.getMonth() ||
      (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())
    ) {
      years -= 1;
    }
    return years > 0 ? years : null;
  })() : null);
  const gender = getFirstString(client, ["genero", "género", "gender", "sexo"]);
  const level = getFirstString(client, ["nivel", "nivelActividad", "activityLevel"]);
  const validLevels = ["principiante", "intermedio", "avanzado"] as const;
  const machines = client.maquinasDisponibles ?? client.maquinas ?? client.gymMachines;
  const restrictions = client.restricciones ?? client.restrictions;
  const daysPerWeek = getNumber(["diasEntrenamiento", "daysPerWeek"]);

  return {
    birthDate,
    gender,
    weight: getNumber(["peso", "weight"]),
    height: getNumber(["estatura", "altura", "height"]),
    age,
    level: validLevels.find((value) => value === level) as
      | "principiante"
      | "intermedio"
      | "avanzado"
      | undefined,
    goal: getFirstString(client, ["objetivo", "goal"]) ?? undefined,
    daysPerWeek: daysPerWeek ?? undefined,
    gymMachines: Array.isArray(machines)
      ? machines.filter((value): value is string => typeof value === "string")
      : undefined,
    restrictions: Array.isArray(restrictions)
      ? restrictions.filter((value): value is string => typeof value === "string")
      : undefined,
  };
}

type RegisterUserInput = {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export async function registerWithUsername({
  username,
  email,
  password,
  firstName,
  lastName,
  phone,
}: RegisterUserInput) {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password,
  );

  try {
    await runTransaction(db, async (transaction) => {
      const usernameRef = doc(db, "usernames", normalizedUsername);
      const usernameSnapshot = await transaction.get(usernameRef);

      if (usernameSnapshot.exists()) {
        throw new Error("username-already-in-use");
      }

      transaction.set(usernameRef, {
        uid: credential.user.uid,
        email: normalizedEmail,
      });
      transaction.set(doc(db, "users", credential.user.uid), {
        username: normalizedUsername,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }

  return credential;
}

export default app;
