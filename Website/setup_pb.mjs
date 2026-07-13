import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function setup() {
  try {
    await pb.admins.authWithPassword('temp@admin.com', 'Temp1234567890');
    console.log('Logged in as admin.');

    // 1. Create portal_users auth collection
    const collection = {
      name: 'portal_users',
      type: 'auth',
      schema: [
        {
          name: 'name',
          type: 'text',
          required: false,
          options: {
            min: null,
            max: null,
            pattern: ''
          }
        },
        {
          name: 'phone',
          type: 'text',
          required: false,
          options: {
            min: null,
            max: null,
            pattern: ''
          }
        },
        {
          name: 'customer_id',
          type: 'relation',
          required: false,
          options: {
            collectionId: (await pb.collections.getOne('customers')).id,
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1,
            displayFields: null
          }
        }
      ],
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: '', // Public registration
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id',
      options: {
        allowEmailAuth: true,
        allowOAuth2Auth: true,
        allowUsernameAuth: true, // Used for phone
        exceptEmailDomains: null,
        manageRule: null,
        minPasswordLength: 8,
        onlyEmailDomains: null,
        requireEmail: false
      }
    };

    // Check if it exists
    try {
      await pb.collections.getOne('portal_users');
      console.log('Collection portal_users already exists.');
    } catch (e) {
      await pb.collections.create(collection);
      console.log('Created portal_users collection.');
    }

  } catch (err) {
    console.error('Setup failed:', err.response || err);
  }
}

setup();
