/// <reference path="../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const email = record.getString('email');
  // Fallback to username for phone if they registered with phone number as username
  let phone = record.getString('username') || record.getString('phone');
  if (!phone) phone = "no-phone-" + Date.now();
  const name = record.getString('name');

  console.log("HOOK DEBUG: username=", record.getString('username'), " email=", email, " name=", name);

  if (!email && !phone) return;

  // Search for an existing CRM customer record
  let customerRecord = null;
  
  if (phone) {
    try {
      customerRecord = $app.findFirstRecordByData("customers", "phone", phone);
    } catch (_) {}
  }
  
  if (!customerRecord && email) {
    try {
      customerRecord = $app.findFirstRecordByData("customers", "email", email);
    } catch (_) {}
  }

  // If we found a customer, link it. If not, create a new one.
  if (customerRecord) {
    record.set('customer_id', customerRecord.id);
    $app.save(record);
  } else {
    try {
      const customersCollection = $app.findCollectionByNameOrId("customers");
      const newCustomer = new Record(customersCollection);
      
      newCustomer.set('name', name || "Guest");
      if (email) newCustomer.set('email', email);
      if (phone) newCustomer.set('phone', phone);
      newCustomer.set('status', 'active');
      newCustomer.set('total_visits', 0);
      newCustomer.set('total_spent', 0);
      
      $app.save(newCustomer);
      
      record.set('customer_id', newCustomer.id);
      $app.save(record);
    } catch (err) {
      console.error("Failed to create customer for portal user:", err);
    }
  }

}, "portal_users");
