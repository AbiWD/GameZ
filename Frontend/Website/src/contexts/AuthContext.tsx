import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import pb from '../lib/pocketbase';
import type { AuthModel } from 'pocketbase';
import { PhonePromptModal } from '../components/PhonePromptModal';

interface AuthContextType {
  user: AuthModel | null;
  loading: boolean;
  logout: () => void;
  promptPhoneModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  promptPhoneModal: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
  const [loading, setLoading] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const checkPhoneNeeded = async (u: AuthModel | null) => {
    if (!u || u.collectionName !== 'portal_users') return;

    try {
      // Fetch latest user record to verify phone number status
      const latestUser = await pb.collection('portal_users').getOne(u.id);
      if (!latestUser.phone || latestUser.phone.trim() === '') {
        setTimeout(() => setShowPhoneModal(true), 300);
      }
    } catch {
      if (!u.phone || u.phone.trim() === '') {
        setTimeout(() => setShowPhoneModal(true), 300);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    
    // Check if the auth store is valid, refresh if needed
    if (pb.authStore.isValid && pb.authStore.model?.collectionName === 'portal_users') {
      setUser(pb.authStore.model);
      checkPhoneNeeded(pb.authStore.model);
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
        checkPhoneNeeded(model);
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
    setShowPhoneModal(false);
  };

  const handlePhoneSuccess = async (newPhone: string) => {
    if (user?.id) {
      try {
        const updatedRecord = await pb.collection('portal_users').getOne(user.id);
        setUser(updatedRecord);
      } catch {
        setUser({ ...user, phone: newPhone });
      }
    }
    setShowPhoneModal(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, promptPhoneModal: () => setShowPhoneModal(true) }}>
      {children}
      <PhonePromptModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneSuccess}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
