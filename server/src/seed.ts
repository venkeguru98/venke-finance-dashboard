import { initializeDatabase, execute } from './database';

async function seedDatabase() {
  await initializeDatabase();
  console.log('Seeding database with sample transactions...');

  const transactions = [
    { date: '2026-07-01', amount: 85000, type: 'income', category_id: 11, payment_method: 'Bank Transfer', notes: 'Monthly Salary' },
    { date: '2026-07-02', amount: 15000, type: 'expense', category_id: 4, payment_method: 'Bank Transfer', notes: 'Apartment Rent' },
    { date: '2026-07-03', amount: 800, type: 'expense', category_id: 1, payment_method: 'UPI', notes: 'Groceries' },
    { date: '2026-07-05', amount: 1200, type: 'expense', category_id: 2, payment_method: 'Credit Card', notes: 'Uber' },
    { date: '2026-07-10', amount: 4500, type: 'expense', category_id: 5, payment_method: 'Credit Card', notes: 'Amazon Shopping' },
    { date: '2026-07-12', amount: 2000, type: 'expense', category_id: 1, payment_method: 'UPI', notes: 'Dinner with friends' },
    { date: '2026-07-15', amount: 15000, type: 'savings', category_id: 14, payment_method: 'Bank Transfer', notes: 'Mutual Fund SIP' },
    { date: '2026-07-20', amount: 3500, type: 'expense', category_id: 8, payment_method: 'UPI', notes: 'Electricity & Water Bill' },
    { date: '2026-07-22', amount: 8500, type: 'income', category_id: 12, payment_method: 'Bank Transfer', notes: 'Freelance Project' },
    { date: '2026-07-25', amount: 1500, type: 'expense', category_id: 6, payment_method: 'Credit Card', notes: 'Movie Tickets' },
    { date: '2026-07-28', amount: 2500, type: 'expense', category_id: 3, payment_method: 'UPI', notes: 'Car Fuel' },
  ];

  for (const t of transactions) {
    await execute(
      `INSERT INTO transactions (user_id, date, amount, type, category_id, payment_method, notes) 
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [t.date, t.amount, t.type, t.category_id, t.payment_method, t.notes]
    );
  }

  console.log('Seeding complete! 11 sample transactions added.');
}

seedDatabase().catch(console.error);
