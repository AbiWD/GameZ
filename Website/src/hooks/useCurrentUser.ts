import { useSyncExternalStore } from 'react';
import pb from '../lib/pocketbase';
import type { User } from '../types';

let cachedModel = pb.authStore.model;

function subscribe(callback: () => void) {
  // PocketBase authStore.onChange takes a callback with (token, model)
  const unsubscribe = pb.authStore.onChange((token, model) => {
    cachedModel = model;
    callback();
  });
  return unsubscribe;
}

function getSnapshot() {
  return cachedModel as User | null;
}

export function useCurrentUser() {
  const user = useSyncExternalStore(subscribe, getSnapshot);
  return {
    currentUser: user,
    isAuthenticated: !!user,
  };
}
