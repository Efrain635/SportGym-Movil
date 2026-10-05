import { initializeApp } from "firebase/app";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  initializeAuth,
} from "firebase/auth";
// @ts-expect-error Firebase's React Native runtime exports this, but its web-facing types do not.
import { getReactNativePersistence } from "firebase/auth";

import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

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
  password: string
) {
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

  return clientsSnapshot.docs[0].data();
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