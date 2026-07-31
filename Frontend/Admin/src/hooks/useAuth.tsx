import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { AuthModel } from 'pocketbase';

export const useAuth = () => {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
  const [session, setSession] = useState<AuthModel | null>(pb.authStore.model);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    // Initial state setup
    const initialUser = pb.authStore.model;
    setUser(initialUser);
    setSession(initialUser);

    if (initialUser) {
      checkAdminStatus(initialUser);
      // Silently refresh the token with the server using the user's collectionName
      const colName = initialUser.collectionName || 'staff_accounts';
      pb.collection(colName).authRefresh({ requestKey: null }).catch((err: any) => {
        // If the server actually rejects the token (invalidated/expired) not just an SDK cancellation, physically log them out
        if (!err.isAbort && err.status !== 0) {
          pb.authStore.clear();
          setIsAdmin(false);
          setUserRole(null);
          setUser(null);
          setSession(null);
        }
      });
    } else {
      setIsAdmin(false);
      setUserRole(null);
      setLoading(false);
    }

    checkSetupStatus();

    // Subscribe to PocketBase auth state changes
    pb.authStore.onChange((token, model) => {
      setSession(model);
      setUser(model);

      if (model) {
        checkAdminStatus(model);
      } else {
        setIsAdmin(false);
        setUserRole(null);
        setLoading(false);
      }
    });

    // Cleanup isn't strictly necessary for onChange in standard use but good practice to clear if component unmounts
    return () => {
      pb.authStore.onChange(() => {});
    };
  }, []);

  const checkSetupStatus = async () => {
    try {
      const data = await pb.send('/api/gamez/setup-status', { 
        method: 'GET',
        requestKey: null // Disable auto-cancellation during strict mode double-renders
      });
      setIsSetupRequired(data.isSetupRequired);
    } catch (error) {
      console.error("Failed to check setup status:", error);
    }
  };

  const checkAdminStatus = (model: AuthModel) => {
    try {
      if (model) {
        if (model.email === 'sysadmin@gamez.in' || model.email === 'admin@gamez.in' || model.email === 'abhilashbangera97@gmail.com' || model.role === 'admin' || model.email === 'test@admin.com') {
          setIsAdmin(true);
          setUserRole('admin');
        } else {
          setIsAdmin(true);
          setUserRole('staff');
        }
      } else {
        setIsAdmin(false);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Try signing in via staff_accounts first
      const authData = await pb.collection('staff_accounts').authWithPassword(email, password);
      return { data: authData, error: null };
    } catch (staffErr: any) {
      try {
        // Fallback to _superusers for dev superusers
        const superData = await pb.collection('_superusers').authWithPassword(email, password);
        return { data: superData, error: null };
      } catch (superErr: any) {
        return { data: null, error: staffErr || superErr };
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('staff_accounts').create({
        email,
        password,
        passwordConfirm: password,
        role: 'admin'
      });

      const loginData = await pb.collection('staff_accounts').authWithPassword(email, password);
      return { data: loginData, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      pb.authStore.clear();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const updateUserPassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!user) throw new Error('No active user session');
      
      const updateData = {
        oldPassword: oldPassword,
        password: newPassword,
        passwordConfirm: newPassword,
        force_password_reset: false
      };

      const collectionName = user.collectionName || 'staff_accounts';
      const record = await pb.collection(collectionName).update(user.id, updateData);
      setUser(record);
      setSession(record);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('staff_accounts').requestPasswordReset(email);
      return { error: null };
    } catch (error: any) {
      try {
        await pb.collection('_superusers').requestPasswordReset(email);
        return { error: null };
      } catch (err: any) {
        try {
          await pb.collection('portal_users').requestPasswordReset(email);
          return { error: null };
        } catch (finalErr: any) {
          return { error: finalErr || err || error };
        }
      }
    }
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    userRole,
    isSetupRequired,
    checkSetupStatus,
    signIn,
    signUp,
    signOut,
    updateUserPassword,
    requestPasswordReset,
  };
};
