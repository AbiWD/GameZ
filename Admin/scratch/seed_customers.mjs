import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const mockCustomers = [
  {
    name: "Arjun Kumar",
    phone: "9876543210",
    email: "arjun.k@example.com",
    total_visits: 14,
    total_spent: 3500,
    status: "vip",
    notes: "Prefers PC 04. Plays CS:GO mostly."
  },
  {
    name: "Priya Sharma",
    phone: "8765432109",
    email: "priya.s@example.com",
    total_visits: 3,
    total_spent: 450,
    status: "regular",
    notes: ""
  },
  {
    name: "Rahul Verma",
    phone: "7654321098",
    email: "rahul.v@example.com",
    total_visits: 42,
    total_spent: 12600,
    status: "vip",
    notes: "Regular weekend player. Always buys snacks."
  },
  {
    name: "Sneha Patel",
    phone: "6543210987",
    email: "sneha.p@example.com",
    total_visits: 1,
    total_spent: 150,
    status: "regular",
    notes: "First time visit last week."
  },
  {
    name: "Toxic Player",
    phone: "5432109876",
    email: "toxic@example.com",
    total_visits: 5,
    total_spent: 1200,
    status: "banned",
    notes: "Banned for breaking headset."
  },
  {
    name: "Vikram Singh",
    phone: "4321098765",
    email: "vikram.s@example.com",
    total_visits: 8,
    total_spent: 2100,
    status: "regular",
    notes: "Plays FIFA."
  },
  {
    name: "Neha Gupta",
    phone: "3210987654",
    email: "neha.g@example.com",
    total_visits: 21,
    total_spent: 5400,
    status: "vip",
    notes: "Usually comes in a group of 3."
  }
];

async function seedCustomers() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    console.log("Authenticated successfully.");

    console.log("Deleting existing mock customers...");
    const existing = await pb.collection('customers').getFullList();
    for (const record of existing) {
      await pb.collection('customers').delete(record.id);
    }

    console.log("Adding mock customers...");
    for (const customer of mockCustomers) {
      await pb.collection('customers').create(customer);
    }
    
    console.log("Seeding complete! Added", mockCustomers.length, "customers.");
  } catch (err) {
    console.error("Error:", err.response || err);
  }
}

seedCustomers();
