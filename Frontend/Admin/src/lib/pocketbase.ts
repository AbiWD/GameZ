import PocketBase, { LocalAuthStore } from 'pocketbase';

// Connect to the PocketBase backend using the environment variable,
// falling back to localhost for local development.
// Uses a dedicated LocalAuthStore key ('gamez_admin_auth') to prevent auth collisions with Customer Website.
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || '/';
const pb = new PocketBase(pbUrl, new LocalAuthStore('gamez_admin_auth'));

export default pb;
