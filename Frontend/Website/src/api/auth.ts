import pb from '../lib/pocketbase';
import type { User } from '../types';

export const authApi = {
  login: async ({ email, password }: { email: string; password: string }) => {
    let authData: any;
    try {
      authData = await pb.collection('portal_users').authWithPassword(email, password);
    } catch (err: any) {
      if (err?.status === 500 || err?.status === 404) {
        try {
          authData = await pb.collection('users').authWithPassword(email, password);
        } catch (_) {
          throw err;
        }
      } else {
        throw err;
      }
    }
    if (authData.record?.status === 'banned') {
      pb.authStore.clear();
      throw new Error("Your account has been restricted. Please contact store management.");
    }
    return authData;
  },

  loginWithGoogle: async () => {
    let authData: any;
    try {
      authData = await pb.collection('portal_users').authWithOAuth2({ provider: 'google' });
    } catch (err: any) {
      authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
    }
    if (authData.record?.status === 'banned') {
      pb.authStore.clear();
      throw new Error("Your account has been restricted. Please contact store management.");
    }
    const updates: any = {};
    if (!authData.record.status) updates.status = 'regular';
    if ((!authData.record.name || authData.record.name === 'N/A') && authData.meta?.name) {
      updates.name = authData.meta.name;
    }
    if (Object.keys(updates).length > 0) {
      const colName = authData.record.collectionName || 'portal_users';
      const updated = await pb.collection(colName).update(authData.record.id, updates);
      pb.authStore.save(pb.authStore.token, updated);
    }
    return authData;
  },

  updateProfile: async (data: { name?: string; phone?: string }) => {
    if (!pb.authStore.record) throw new Error("Not authenticated");
    const colName = pb.authStore.record.collectionName || 'portal_users';
    const record = await pb.collection(colName).update(pb.authStore.record.id, data);
    return record;
  },

  register: async ({ name, email, phone, password }: any) => {
    if (!name || !email || !password || !phone) {
      throw new Error("All fields are required.");
    }
    
    let colName = 'portal_users';
    try {
      const existing = await pb.collection('portal_users').getList(1, 1, {
        filter: `email = "${email}" || phone = "${phone}"`,
      });
      if (existing.totalItems > 0) {
        throw new Error("Account with this email or phone number already exists.");
      }
    } catch (err: any) {
      if (err?.status === 500 || err?.status === 404) {
        colName = 'users';
      } else {
        throw err;
      }
    }

    const data = {
      email,
      emailVisibility: true,
      password,
      passwordConfirm: password,
      name,
      phone,
    };

    const record = await pb.collection(colName).create(data);
    await pb.collection(colName).authWithPassword(email, password);
    return record;
  },

  logout: () => {
    pb.authStore.clear();
  },

  resetPassword: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Trigger reset password for both portal_users and users collections
    let sent = false;
    try {
      await pb.collection('portal_users').requestPasswordReset(cleanEmail);
      sent = true;
    } catch (err: any) {
      console.warn("portal_users reset error:", err);
    }

    try {
      await pb.collection('users').requestPasswordReset(cleanEmail);
      sent = true;
    } catch (err: any) {
      console.warn("users reset error:", err);
    }

    if (!sent) {
      throw new Error("Unable to dispatch password recovery email. Please check your email address.");
    }
  },

  confirmPasswordReset: async (token: string, password: string, passwordConfirm: string) => {
    try {
      await pb.collection('portal_users').confirmPasswordReset(token, password, passwordConfirm);
    } catch (err: any) {
      try {
        await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
      } catch (_) {
        throw err;
      }
    }
  }
};
