import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090/');

// Auto-cancellation of auth refresh if needed
pb.autoCancellation(false);
