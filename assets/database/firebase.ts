import { initializeApp } from "firebase/app";

import {
    createUserWithEmailAndPassword,
    deleteUser,
    getAuth,
    initializeAuth,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
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
    initializeFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
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
export const db = initializeFirestore(
  app,
  Platform.OS === "web" ? { experimentalForceLongPolling: true } : {},
);

export async function sendClientPasswordResetEmail(email: string) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

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

export async function getAuthenticatedClientProfile(
  uid: string,
  authEmail: string | null,
): Promise<(DocumentData & { documentId: string }) | null> {
  const userReference = doc(db, "users", uid);
  const clientReference = doc(db, "clientes", uid);
  const [userSnapshot, clientSnapshot] = await Promise.all([
    getDoc(userReference),
    getDoc(clientReference),
  ]);

  let clientDocumentId = uid;
  let matchedClientSnapshot = clientSnapshot;

  if (!clientSnapshot.exists() && authEmail?.trim()) {
    const normalizedEmail = authEmail.trim().toLowerCase();
    const [emailFieldSnapshot, correoFieldSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, "clientes"),
          where("email", "==", normalizedEmail),
          limit(1),
        ),
      ),
      getDocs(
        query(
          collection(db, "clientes"),
          where("correo", "==", normalizedEmail),
          limit(1),
        ),
      ),
    ]);
    const matchingDocument =
      emailFieldSnapshot.docs[0] ?? correoFieldSnapshot.docs[0];

    if (matchingDocument) {
      clientDocumentId = matchingDocument.id;
      matchedClientSnapshot = matchingDocument;
    }
  }

  if (!userSnapshot.exists() && !matchedClientSnapshot.exists()) {
    return null;
  }

  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
  let clientData = matchedClientSnapshot.exists()
    ? matchedClientSnapshot.data()
    : {};

  if (userSnapshot.exists() && !matchedClientSnapshot.exists()) {
    const username =
      typeof userData.username === "string" ? userData.username : "";
    const email =
      typeof userData.email === "string" ? userData.email : authEmail ?? "";
    const firstName =
      typeof userData.firstName === "string" ? userData.firstName : "";
    const lastName =
      typeof userData.lastName === "string" ? userData.lastName : "";
    const phone = typeof userData.phone === "string" ? userData.phone : "";

    clientData = {
      uid,
      usuario: username,
      nombre: firstName,
      apellido: lastName,
      correo: email,
      telefono: phone,
      asistencias: [],
    };
    await setDoc(clientReference, clientData);
  }

  return {
    ...clientData,
    ...userData,
    documentId: clientDocumentId,
    username:
      typeof clientData.usuario === "string"
        ? clientData.usuario
        : typeof userData.username === "string"
          ? userData.username
          : authEmail ?? "",
    email:
      typeof userData.email === "string"
        ? userData.email
        : typeof clientData.correo === "string"
          ? clientData.correo
          : authEmail,
  };
}

export async function verifyClientCredentials(
  username: string,
  password: string,
): Promise<DocumentData & { documentId: string }> {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername || !password) {
    throw new Error("missing-credentials");
  }

  const signInRegisteredUser = async (email: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userData = await getAuthenticatedClientProfile(
      credential.user.uid,
      credential.user.email,
    );
    if (!userData) {
      throw new Error("client-profile-not-found");
    }
    return userData;
  };

  if (normalizedUsername.includes("@")) {
    return signInRegisteredUser(normalizedUsername);
  }

  let usernameDocument;
  try {
    usernameDocument = await getDoc(doc(db, "usernames", normalizedUsername));
  } catch (error) {
    if ((error as { code?: string }).code !== "permission-denied") {
      throw error;
    }
  }

  if (usernameDocument?.exists()) {
    const usernameData = usernameDocument.data();
    const email = usernameData.email;

    if (typeof email !== "string" || !email.trim()) {
      throw new Error("invalid-username-record");
    }

    return signInRegisteredUser(email.trim());
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

export type GeneratedRoutineExercise = Omit<SavedRoutineExercise, "id">;

export type ChatConversationMessage = {
  id: string;
  from: "bot" | "user";
  text: string;
};

export type ChatConversation = {
  id: string;
  title: string;
  updatedAt?: unknown;
  messages?: ChatConversationMessage[];
  goal?: string | null;
  responses?: Record<string, string>;
  step?: "initial" | "goal" | "details" | "complete" | "summary";
  showSummary?: boolean;
};

const chatConversationsCollection = collection(db, "conversaciones_chatbot");
const chatMessagesCollection = (conversationId: string) =>
  collection(db, "conversaciones_chatbot", conversationId, "mensajes");

export async function getClientChatConversations(clientId: string) {
  const conversationsQuery = query(
    chatConversationsCollection,
    where("clienteId", "==", clientId),
  );
  const snapshot = await getDocs(conversationsQuery);

  return snapshot.docs
    .map((conversation) => {
      const data = conversation.data();
      return {
        id: conversation.id,
        title:
          typeof data.titulo === "string" && data.titulo.trim()
            ? data.titulo
            : "Conversación",
        updatedAt: data.fechaActualizacion,
        goal: typeof data.objetivo === "string" ? data.objetivo : null,
        responses:
          data.respuestas && typeof data.respuestas === "object"
            ? (data.respuestas as Record<string, string>)
            : {},
        step:
          typeof data.paso === "string"
            ? (data.paso as ChatConversation["step"])
            : "initial",
        showSummary: data.resumenVisible === true,
      };
    })
    .sort((left, right) => {
      const leftTime =
        typeof left.updatedAt === "object" &&
        left.updatedAt !== null &&
        "toMillis" in left.updatedAt &&
        typeof left.updatedAt.toMillis === "function"
          ? left.updatedAt.toMillis()
          : 0;
      const rightTime =
        typeof right.updatedAt === "object" &&
        right.updatedAt !== null &&
        "toMillis" in right.updatedAt &&
        typeof right.updatedAt.toMillis === "function"
          ? right.updatedAt.toMillis()
          : 0;
      return rightTime - leftTime;
    });
}

export async function createClientChatConversation(
  clientId: string,
  title: string,
) {
  const reference = await addDoc(chatConversationsCollection, {
    clienteId: clientId,
    titulo: title,
    objetivo: null,
    respuestas: {},
    paso: "initial",
    resumenVisible: false,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });

  return reference.id;
}

export async function getChatConversationMessages(conversationId: string) {
  const messagesQuery = query(
    chatMessagesCollection(conversationId),
    orderBy("fechaCreacion", "asc"),
  );
  const snapshot = await getDocs(messagesQuery);

  return snapshot.docs.map((message) => ({
    id: message.id,
    from: message.data().from,
    text: message.data().text,
  })) as ChatConversationMessage[];
}

export async function deleteClientChatConversation(
  clientId: string,
  conversationId: string,
) {
  const conversationReference = doc(
    db,
    "conversaciones_chatbot",
    conversationId,
  );
  const conversationSnapshot = await getDoc(conversationReference);

  if (
    !conversationSnapshot.exists() ||
    conversationSnapshot.data().clienteId !== clientId
  ) {
    throw new Error("La conversación no existe o no pertenece a este usuario.");
  }

  const messagesSnapshot = await getDocs(chatMessagesCollection(conversationId));
  for (let start = 0; start < messagesSnapshot.docs.length; start += 500) {
    const batch = writeBatch(db);
    messagesSnapshot.docs
      .slice(start, start + 500)
      .forEach((message) => batch.delete(message.ref));
    await batch.commit();
  }

  await deleteDoc(conversationReference);
}

export async function saveChatConversationMessage(
  conversationId: string,
  message: Omit<ChatConversationMessage, "id">,
) {
  const conversationReference = doc(
    db,
    "conversaciones_chatbot",
    conversationId,
  );
  const conversationSnapshot = await getDoc(conversationReference);
  const batch = writeBatch(db);
  const messageReference = doc(chatMessagesCollection(conversationId));

  batch.set(messageReference, {
    ...message,
    fechaCreacion: serverTimestamp(),
  });
  const conversationUpdate: Record<string, unknown> = {
    fechaActualizacion: serverTimestamp(),
  };
  if (
    message.from === "user" &&
    conversationSnapshot.data()?.titulo === "Nueva conversación"
  ) {
    conversationUpdate.titulo = message.text.slice(0, 60);
  }
  batch.update(conversationReference, conversationUpdate);
  await batch.commit();
}

export async function updateChatConversation(
  conversationId: string,
  state: {
    goal: string | null;
    responses: Record<string, string>;
    step: "initial" | "goal" | "details" | "complete" | "summary";
    showSummary: boolean;
  },
) {
  await updateDoc(doc(db, "conversaciones_chatbot", conversationId), {
    objetivo: state.goal,
    respuestas: state.responses,
    paso: state.step,
    resumenVisible: state.showSummary,
    fechaActualizacion: serverTimestamp(),
  });
}

export async function saveGeneratedRoutine(
  clientId: string,
  clientUsername: string,
  clientName: string,
  exercises: GeneratedRoutineExercise[],
) {
  const batch = writeBatch(db);

  for (const exercise of exercises) {
    const routineId = getRoutineDocumentId(
      clientId,
      exercise.ejercicioId,
      exercise.dia,
    );
    batch.set(
      doc(db, "rutinas", routineId),
      {
        clienteId: clientId,
        clienteUsuario: clientUsername,
        clienteNombre: clientName,
        ejercicioId: exercise.ejercicioId,
        ejercicioNombre: exercise.ejercicioNombre,
        dia: exercise.dia,
        equipo: exercise.equipo,
        grupoMuscular: exercise.grupoMuscular,
        categoria: exercise.categoria,
        seriesAsignadas: exercise.seriesAsignadas,
        repeticionesAsignadas: exercise.repeticionesAsignadas,
        fechaActualizacion: serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

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
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weeklyWorkouts = Array.from({ length: 7 }, () => 0);
  const recentWorkouts = completedWorkouts
    .map((workout) => {
      const data = workout.data();
      const rawDate = data.fechaInicio ?? data.fechaFinalizacion;
      const date =
        rawDate &&
        typeof rawDate === "object" &&
        "toDate" in rawDate &&
        typeof rawDate.toDate === "function"
          ? rawDate.toDate()
          : typeof rawDate === "string"
            ? new Date(rawDate)
            : null;
      const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
      if (validDate && validDate >= weekStart && validDate < weekEnd) {
        weeklyWorkouts[(validDate.getDay() + 6) % 7] += 1;
      }

      return {
        id: workout.id,
        date: validDate?.toISOString() ?? null,
        exercises: Array.isArray(data.ejercicios)
          ? data.ejercicios.length
          : typeof data.totalEjercicios === "number"
            ? data.totalEjercicios
            : 0,
        durationMinutes:
          typeof data.duracionMinutos === "number" ? data.duracionMinutos : null,
        sortDate: validDate?.getTime() ?? 0,
      };
    })
    .sort((first, second) => second.sortDate - first.sortDate)
    .slice(0, 15)
    .map(({ sortDate: _sortDate, ...workout }) => workout);

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
    weeklyWorkouts,
    recentWorkouts,
  };
}

export type ClientWeightEntry = {
  weight: number;
  date: string;
};

export type ClientMeasurementEntry = {
  date: string;
  waist?: number;
  hip?: number;
  arms?: number;
  thighs?: number;
};

export type ClientProgressHistory = {
  goal: string | null;
  targetWeight: number | null;
  weights: ClientWeightEntry[];
  measurements: ClientMeasurementEntry[];
  nextWeightUpdate: string | null;
  nextMeasurementsUpdate: string | null;
};

const localProgressDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getNextProgressDate = (lastDate: string | null, intervalDays: number) => {
  if (!lastDate) return null;
  const parts = lastDate.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const nextDate = new Date(
    Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]) + intervalDays),
  )
    .toISOString()
    .slice(0, 10);
  return localProgressDate() >= nextDate ? null : nextDate;
};

const progressRecord = (value: unknown): ClientRecord =>
  isRecord(value) ? value : {};

const progressNumber = (record: ClientRecord, ...keys: string[]) => {
  for (const key of keys) {
    if (typeof record[key] === "number") return record[key] as number;
  }
  return null;
};

const progressString = (record: ClientRecord, ...keys: string[]) => {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return null;
};

const getProgressArrays = (data: ClientRecord) => {
  const progress = progressRecord(data.progreso);
  const uniqueBy = (entries: unknown[], keyFor: (entry: unknown) => string) =>
    [...new Map(entries.map((entry) => [keyFor(entry), entry])).values()];
  const weights = uniqueBy([
    ...(Array.isArray(data.historialPeso) ? data.historialPeso : []),
    ...(Array.isArray(progress.pesos) ? progress.pesos : []),
  ], (value) => {
    const entry = progressRecord(value);
    const weight = progressNumber(entry, "peso", "weight");
    const date = progressString(entry, "fecha", "date");
    return weight !== null && date ? `${date}:${weight}` : JSON.stringify(value);
  });
  const measurements = uniqueBy([
    ...(Array.isArray(data.historialMedidas) ? data.historialMedidas : []),
    ...(Array.isArray(progress.medidas) ? progress.medidas : []),
  ], (value) => {
    const entry = progressRecord(value);
    const date = progressString(entry, "fecha", "date");
    if (!date) return JSON.stringify(value);
    const waist = progressNumber(entry, "cintura", "waist");
    const hip = progressNumber(entry, "cadera", "hip");
    const arms = progressNumber(entry, "brazos", "arms");
    const thighs = progressNumber(entry, "muslos", "thighs");
    return `${date}:${waist ?? ""}:${hip ?? ""}:${arms ?? ""}:${thighs ?? ""}`;
  });
  return { progress, weights, measurements };
};

const parseClientProgressHistory = (data: ClientRecord): ClientProgressHistory => {
  const { progress, weights: storedWeights, measurements: storedMeasurements } =
    getProgressArrays(data);
  const weights = storedWeights.flatMap((value) => {
    const entry = progressRecord(value);
    const weight = progressNumber(entry, "peso", "weight");
    const date = progressString(entry, "fecha", "date");
    return weight !== null && date ? [{ weight, date }] : [];
  }).sort((first, second) => first.date.localeCompare(second.date));
  const measurements = storedMeasurements.flatMap((value) => {
    const entry = progressRecord(value);
    const date = progressString(entry, "fecha", "date");
    if (!date) return [];
    const waist = progressNumber(entry, "cintura", "waist");
    const hip = progressNumber(entry, "cadera", "hip");
    const arms = progressNumber(entry, "brazos", "arms");
    const thighs = progressNumber(entry, "muslos", "thighs");
    return [{
      date,
      ...(waist !== null ? { waist } : {}),
      ...(hip !== null ? { hip } : {}),
      ...(arms !== null ? { arms } : {}),
      ...(thighs !== null ? { thighs } : {}),
    }];
  }).sort((first, second) => first.date.localeCompare(second.date));

  return {
    goal:
      progressString(progress, "objetivo") ??
      progressString(data, "objetivo", "goal"),
    targetWeight:
      progressNumber(progress, "pesoObjetivo") ??
      progressNumber(data, "pesoObjetivo"),
    weights,
    measurements,
    nextWeightUpdate:
      weights.at(-1)?.date === localProgressDate()
        ? null
        : getNextProgressDate(weights.at(-1)?.date ?? null, 1),
    nextMeasurementsUpdate: getNextProgressDate(measurements.at(-1)?.date ?? null, 7),
  };
};

export async function getClientProgressHistory(
  clientId: string,
): Promise<ClientProgressHistory> {
  if (!clientId.trim()) throw new Error("missing-client-id");
  const snapshot = await getDoc(doc(db, "clientes", clientId));
  if (!snapshot.exists()) throw new Error("client-not-found");
  return parseClientProgressHistory(snapshot.data());
}

export function subscribeClientProgressHistory(
  clientId: string,
  onUpdate: (history: ClientProgressHistory) => void,
  onError: (error: Error) => void,
) {
  if (!clientId.trim()) throw new Error("missing-client-id");
  return onSnapshot(
    doc(db, "clientes", clientId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error("client-not-found"));
        return;
      }
      onUpdate(parseClientProgressHistory(snapshot.data()));
    },
    onError,
  );
}

export async function updateClientProgressGoal(
  clientId: string,
  goal: string,
  targetWeight: number | null,
) {
  if (!clientId.trim()) throw new Error("missing-client-id");
  if (!goal.trim()) throw new Error("missing-progress-goal");
  if (
    targetWeight !== null &&
    (!Number.isFinite(targetWeight) || targetWeight < 20 || targetWeight > 400)
  ) {
    throw new Error("invalid-progress-target");
  }

  const clientRef = doc(db, "clientes", clientId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(clientRef);
    if (!snapshot.exists()) throw new Error("client-not-found");
    const data = snapshot.data();
    const { progress } = getProgressArrays(data);
    transaction.update(clientRef, {
      progreso: {
        ...progress,
        objetivo: goal.trim(),
        pesoObjetivo: targetWeight,
        fechaActualizacion: serverTimestamp(),
      },
      objetivo: goal.trim(),
      pesoObjetivo: targetWeight,
      fechaUltimoCambio: serverTimestamp(),
    });
  });
}

export async function recordClientWeight(
  clientId: string,
  weight: number,
  date: string,
) {
  if (!clientId.trim()) throw new Error("missing-client-id");
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    throw new Error("invalid-progress-weight");
  }
  if (date !== localProgressDate()) throw new Error("invalid-progress-date");

  const clientRef = doc(db, "clientes", clientId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(clientRef);
    if (!snapshot.exists()) throw new Error("client-not-found");
    const data = snapshot.data();
    const { progress, weights } = getProgressArrays(data);
    const latestDate = weights
      .map((value) => progressString(progressRecord(value), "fecha", "date"))
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null;
    if (latestDate !== date) {
      const nextAllowedDate = getNextProgressDate(latestDate, 1);
      if (nextAllowedDate) {
        throw new Error(`weight-update-too-soon:${nextAllowedDate}`);
      }
    }
    const todayIndexes = weights.flatMap((value, index) =>
      progressString(progressRecord(value), "fecha", "date") === date ? [index] : [],
    );
    const lastTodayIndex = todayIndexes.at(-1);
    const nextWeights =
      lastTodayIndex === undefined
        ? [...weights, { peso: weight, fecha: date }]
        : [
            ...weights.filter(
              (value, index) =>
                progressString(progressRecord(value), "fecha", "date") !== date ||
                index === lastTodayIndex,
            ),
          ].map((value) =>
            progressString(progressRecord(value), "fecha", "date") === date
              ? { peso: weight, fecha: date }
              : value,
          );

    transaction.update(clientRef, {
      progreso: {
        ...progress,
        pesos: nextWeights,
        fechaActualizacion: serverTimestamp(),
      },
      peso: weight,
      fechaUltimoCambio: serverTimestamp(),
    });
  });
}

export async function recordClientMeasurements(
  clientId: string,
  measurements: Omit<ClientMeasurementEntry, "date">,
  date: string,
) {
  if (!clientId.trim()) throw new Error("missing-client-id");
  if (date !== localProgressDate()) throw new Error("invalid-progress-date");
  const values = Object.values(measurements).filter(
    (value): value is number => value !== undefined,
  );
  if (
    values.length === 0 ||
    values.some((value) => !Number.isFinite(value) || value < 10 || value > 250)
  ) {
    throw new Error("invalid-progress-measurements");
  }

  const clientRef = doc(db, "clientes", clientId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(clientRef);
    if (!snapshot.exists()) throw new Error("client-not-found");
    const data = snapshot.data();
    const { progress, measurements: storedMeasurements } = getProgressArrays(data);
    const latestDate = storedMeasurements
      .map((value) => progressString(progressRecord(value), "fecha", "date"))
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null;
    const nextAllowedDate = getNextProgressDate(latestDate, 7);
    if (nextAllowedDate) {
      throw new Error(`measurements-update-too-soon:${nextAllowedDate}`);
    }

    transaction.update(clientRef, {
      progreso: {
        ...progress,
        medidas: [
          ...storedMeasurements,
          {
            fecha: date,
            ...(measurements.waist !== undefined ? { cintura: measurements.waist } : {}),
            ...(measurements.hip !== undefined ? { cadera: measurements.hip } : {}),
            ...(measurements.arms !== undefined ? { brazos: measurements.arms } : {}),
            ...(measurements.thighs !== undefined ? { muslos: measurements.thighs } : {}),
          },
        ],
        fechaActualizacion: serverTimestamp(),
      },
      fechaUltimoCambio: serverTimestamp(),
    });
  });
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
      transaction.set(doc(db, "clientes", credential.user.uid), {
        uid: credential.user.uid,
        usuario: normalizedUsername,
        nombre: firstName.trim(),
        apellido: lastName.trim(),
        correo: normalizedEmail,
        telefono: phone.trim(),
        asistencias: [],
      });
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }

  await signOut(auth);
  return credential;
}

export default app;
