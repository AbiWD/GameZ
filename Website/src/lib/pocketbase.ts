import PocketBase from 'pocketbase';

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090');

// Optionally, disable auto-cancellation to prevent multiple rapid requests from cancelling each other
pb.autoCancellation(false);

export default pb;
