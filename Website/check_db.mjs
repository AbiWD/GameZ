import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function clean() {
    await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
    
    try {
        const customers = await pb.collection('customers').getFullList();
        for(const c of customers) {
            // Delete seeded customers (they all use @example.com)
            if(c.email.includes('@example.com')) {
                console.log("Deleting seeded customer:", c.email);
                await pb.collection('customers').delete(c.id);
            }
        }
    } catch(e) {
        console.error(e);
    }

    console.log("Cleanup finished.");
}
clean();
