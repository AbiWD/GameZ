import PocketBase from 'pocketbase';

const pb = new PocketBase('/');

// Optionally, disable auto-cancellation to prevent multiple rapid requests from cancelling each other
pb.autoCancellation(false);

export default pb;
