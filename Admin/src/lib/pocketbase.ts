import PocketBase from 'pocketbase';

// Connect to the PocketBase backend using the environment variable,
// falling back to localhost for local development.
const pbUrl = import.meta.env.VITE_POCKETBASE_URL || '/';
const pb = new PocketBase(pbUrl);

export default pb;
