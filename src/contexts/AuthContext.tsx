import { createContext, ReactNode, useContext, useState } from "react";

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
};

export type MembershipInfo = {
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
};

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
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
