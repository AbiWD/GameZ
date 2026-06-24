import PocketBase from 'pocketbase';

// Connect to the PocketBase backend using the environment variable,
// falling back to localhost for local development.
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090/';
const pb = new PocketBase(pbUrl);

export default pb;
