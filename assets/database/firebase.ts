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
  getDoc,
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