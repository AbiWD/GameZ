import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth';

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
  });
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: authApi.loginWithGoogle,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => authApi.logout(),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: authApi.updateProfile,
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: ({ token, password, passwordConfirm }: { token: string; password: string; passwordConfirm: string }) =>
      authApi.confirmPasswordReset(token, password, passwordConfirm),
  });
}
