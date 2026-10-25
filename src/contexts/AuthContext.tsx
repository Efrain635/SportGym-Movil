import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";

import {
  auth,
  getAuthenticatedClientProfile,
  getClientMembership,
  getClientPersonalData,
} from "../../assets/database/firebase";

export type FitnessLevel = "principiante" | "intermedio" | "avanzado";

export type User = {
  clientId?: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string | null;
  membership: MembershipInfo | null;
  goal?: string;
  level?: FitnessLevel;
  gymMachines?: string[];
  daysPerWeek?: number;
  restrictions?: string[];
  weight?: number | null;
  height?: number | null;
  age?: number | null;
  birthDate?: string | null;
  gender?: string | null;
};

export type MembershipInfo = {
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  isRestoringSession: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const parentContext = useContext(AuthContext);
  if (parentContext) {
    return children;
  }

  return <AuthStateProvider>{children}</AuthStateProvider>;
}

function AuthStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const authChangeVersion = useRef(0);

  useEffect(() => {
    let isActive = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const version = ++authChangeVersion.current;

      if (!firebaseUser) {
        setUser(null);
        setIsRestoringSession(false);
        return;
      }

      setIsRestoringSession(true);
      setUser(null);
      void getAuthenticatedClientProfile(
        firebaseUser.uid,
        firebaseUser.email,
      )
        .then((profile) => {
          if (
            !isActive ||
            authChangeVersion.current !== version ||
            !profile
          ) {
            return;
          }

          const personalData = getClientPersonalData(profile);
          setUser({
            clientId: profile.documentId,
            firstName:
              (typeof profile.nombre === "string" && profile.nombre) ||
              (typeof profile.firstName === "string" && profile.firstName) ||
              "",
            lastName:
              (typeof profile.apellido === "string" && profile.apellido) ||
              (typeof profile.lastName === "string" && profile.lastName) ||
              "",
            username:
              (typeof profile.usuario === "string" && profile.usuario) ||
              (typeof profile.username === "string" && profile.username) ||
              "",
            email:
              (typeof profile.email === "string" && profile.email) ||
              (typeof profile.correo === "string" && profile.correo) ||
              firebaseUser.email ||
              "",
            phone:
              (typeof profile.telefono === "string" && profile.telefono) ||
              (typeof profile.phone === "string" && profile.phone) ||
              null,
            membership: getClientMembership(profile),
            ...personalData,
          });
        })
        .catch((error: unknown) => {
          console.error("Error al restaurar la sesión del usuario:", error);
          if (isActive && authChangeVersion.current === version) {
            setUser(null);
          }
        })
        .finally(() => {
          if (isActive && authChangeVersion.current === version) {
            setIsRestoringSession(false);
          }
        });
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isRestoringSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
