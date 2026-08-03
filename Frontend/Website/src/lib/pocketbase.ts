import PocketBase, { LocalAuthStore } from 'pocketbase';

// Dedicated LocalAuthStore key ('gamez_customer_auth') isolates customer auth session from Admin Panel
const pb = new PocketBase('/', new LocalAuthStore('gamez_customer_auth'));

// Optionally, disable auto-cancellation to prevent multiple rapid requests from cancelling each other
pb.autoCancellation(false);

export default pb;
