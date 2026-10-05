import React, { createContext, useContext, useState, ReactNode } from 'react';

type User = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  membership: MembershipInfo | null;
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
