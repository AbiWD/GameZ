import pb from '../lib/pocketbase';
import type { User } from '../types';

export const authApi = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const authData = await pb.collection('portal_users').authWithPassword(email, password);
    return authData;
  },

  register: async ({ name, email, phone, password }: any) => {
    // Basic validation
    if (!name || !email || !password || !phone) {
      throw new Error("All fields are required.");
    }
    
    // Check if phone or email exists
    const existing = await pb.collection('portal_users').getList(1, 1, {
      filter: `email = "${email}" || phone = "${phone}"`,
    });
    
    if (existing.totalItems > 0) {
      throw new Error("Account with this email or phone number already exists.");
    }

    const data = {
      email,
      emailVisibility: true,
      password,
      passwordConfirm: password,
      name,
      phone,
    };

    const record = await pb.collection('portal_users').create(data);
    await pb.collection('portal_users').authWithPassword(email, password);
    return record;
  },

  logout: () => {
    pb.authStore.clear();
  },

  resetPassword: async (email: string) => {
    await pb.collection('portal_users').requestPasswordReset(email);
  }
};
