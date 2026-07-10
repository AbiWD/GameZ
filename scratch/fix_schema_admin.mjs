/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
  
  const bookings = await pb.collections.getOne('bookings');
  
  // Find the web_user_id field
  const fieldIndex = bookings.fields.findIndex(f => f.name === 'web_user_id');
  
  if (fieldIndex !== -1) {
    // Remove the old field
    bookings.fields.splice(fieldIndex, 1);
    
    // Add a new one with the correct collection
    bookings.fields.push({
      "cascadeDelete": false,
      "collectionId": "pbc_784419869",
      "hidden": false,
      "maxSelect": 1,
      "minSelect": 0,
      "name": "web_user_id",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "relation"
    });
    
    console.log("Replacing web_user_id to point to portal_users");
    await pb.collections.update('bookings', bookings);
    console.log("Schema updated successfully!");
  }
}
fixSchema();

*/
