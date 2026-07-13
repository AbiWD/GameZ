import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import pb from '../lib/pocketbase';
import type { AuthModel } from 'pocketbase';

interface AuthContextType {
  user: AuthModel | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Check if the auth store is valid, refresh if needed
    if (pb.authStore.isValid && pb.authStore.model?.collectionName === 'portal_users') {
      setUser(pb.authStore.model);
    } else {
      setUser(null);
      if (pb.authStore.model && pb.authStore.model.collectionName !== 'portal_users') {
         // Clear if a non-portal user is somehow logged in here
         pb.authStore.clear();
      }
    }
    setLoading(false);

    // Subscribe to auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model?.collectionName === 'portal_users') {
        setUser(model);
      } else {
        setUser(null);
        if (model) pb.authStore.clear(); // Ensure only portal_users can log in here
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
