/**
 * seed.js — Seeds the ipl_players table with ~100 real IPL players.
 * Run: node seed.js
 */
require('dotenv').config();
const { db, usingMemory } = require('./db');

const players = [
  // ── Batsmen ──────────────────────────────────────────────────────────────
  { name: 'Virat Kohli',        role: 'Batsman',      ipl_team: 'RCB',  nationality: 'Indian',       base_price: 2.00 },
  { name: 'Rohit Sharma',       role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00 },
  { name: 'Shubman Gill',       role: 'Batsman',      ipl_team: 'GT',   nationality: 'Indian',       base_price: 1.75 },
  { name: 'KL Rahul',           role: 'Batsman',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 1.75 },
  { name: 'Yashasvi Jaiswal',   role: 'Batsman',      ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.50 },
  { name: 'Ruturaj Gaikwad',    role: 'Batsman',      ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.50 },
  { name: 'Faf du Plessis',     role: 'Batsman',      ipl_team: 'RCB',  nationality: 'South African',base_price: 1.25 },
  { name: 'David Warner',       role: 'Batsman',      ipl_team: 'DC',   nationality: 'Australian',   base_price: 1.25 },
  { name: 'Jos Buttler',        role: 'Batsman',      ipl_team: 'RR',   nationality: 'English',      base_price: 1.75 },
  { name: 'Ishan Kishan',       role: 'Wicketkeeper', ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.25 },
  { name: 'Sanju Samson',       role: 'Wicketkeeper', ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.50 },
  { name: 'Rishabh Pant',       role: 'Wicketkeeper', ipl_team: 'DC',   nationality: 'Indian',       base_price: 1.75 },
  { name: 'Suryakumar Yadav',   role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.75 },
  { name: 'Shreyas Iyer',       role: 'Batsman',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.50 },
  { name: 'Tilak Varma',        role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.00 },
  { name: 'Devdutt Padikkal',   role: 'Batsman',      ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.75 },
  { name: 'Rajat Patidar',      role: 'Batsman',      ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Kane Williamson',    role: 'Batsman',      ipl_team: 'GT',   nationality: 'New Zealander',base_price: 1.25 },
  { name: 'Travis Head',        role: 'Batsman',      ipl_team: 'SRH',  nationality: 'Australian',   base_price: 1.50 },
  { name: 'Heinrich Klaasen',   role: 'Wicketkeeper', ipl_team: 'SRH',  nationality: 'South African',base_price: 1.25 },

  // ── All-Rounders ─────────────────────────────────────────────────────────
  { name: 'Hardik Pandya',      role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00 },
  { name: 'Ravindra Jadeja',    role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.75 },
  { name: 'Axar Patel',         role: 'All-Rounder',  ipl_team: 'DC',   nationality: 'Indian',       base_price: 1.25 },
  { name: 'Washington Sundar',  role: 'All-Rounder',  ipl_team: 'SRH',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Venkatesh Iyer',     role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Shivam Dube',        role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Liam Livingstone',   role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'English',      base_price: 1.25 },
  { name: 'Marcus Stoinis',     role: 'All-Rounder',  ipl_team: 'LSG',  nationality: 'Australian',   base_price: 1.00 },
  { name: 'Glenn Maxwell',      role: 'All-Rounder',  ipl_team: 'RCB',  nationality: 'Australian',   base_price: 1.75 },
  { name: 'Andre Russell',      role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'West Indian',  base_price: 1.75 },
  { name: 'Sunil Narine',       role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'West Indian',  base_price: 1.50 },
  { name: 'Sam Curran',         role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'English',      base_price: 1.25 },
  { name: 'Shahbaz Ahmed',      role: 'All-Rounder',  ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Deepak Hooda',       role: 'All-Rounder',  ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Krunal Pandya',      role: 'All-Rounder',  ipl_team: 'LSG',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Ravichandran Ashwin',role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'Indian',       base_price: 1.00 },
  { name: 'Moeen Ali',          role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'English',      base_price: 1.00 },
  { name: 'Romario Shepherd',   role: 'All-Rounder',  ipl_team: 'LSG',  nationality: 'West Indian',  base_price: 0.75 },
  { name: 'David Miller',       role: 'All-Rounder',  ipl_team: 'GT',   nationality: 'South African',base_price: 1.00 },
  { name: 'Nitish Kumar Reddy', role: 'All-Rounder',  ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.75 },

  // ── Pacers ───────────────────────────────────────────────────────────────
  { name: 'Jasprit Bumrah',     role: 'Pacer',        ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00 },
  { name: 'Mohammed Shami',     role: 'Pacer',        ipl_team: 'GT',   nationality: 'Indian',       base_price: 1.75 },
  { name: 'Pat Cummins',        role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Australian',   base_price: 1.75 },
  { name: 'Trent Boult',        role: 'Pacer',        ipl_team: 'RR',   nationality: 'New Zealander',base_price: 1.50 },
  { name: 'Kagiso Rabada',      role: 'Pacer',        ipl_team: 'PBKS', nationality: 'South African',base_price: 1.50 },
  { name: 'Bhuvneshwar Kumar',  role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Deepak Chahar',      role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Shardul Thakur',     role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Avesh Khan',         role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.75 },
  { name: 'Akash Deep',         role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Arshdeep Singh',     role: 'Pacer',        ipl_team: 'PBKS', nationality: 'Indian',       base_price: 1.25 },
  { name: 'T Natarajan',        role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Harshal Patel',      role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Jaydev Unadkat',     role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Prasidh Krishna',    role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.75 },
  { name: 'Lockie Ferguson',    role: 'Pacer',        ipl_team: 'GT',   nationality: 'New Zealander',base_price: 1.00 },
  { name: 'Josh Hazlewood',     role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Australian',   base_price: 1.25 },
  { name: 'Mitchell Starc',     role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Australian',   base_price: 1.50 },
  { name: 'Gerald Coetzee',     role: 'Pacer',        ipl_team: 'MI',   nationality: 'South African',base_price: 0.75 },
  { name: 'Umran Malik',        role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.50 },

  // ── Spinners ─────────────────────────────────────────────────────────────
  { name: 'Yuzvendra Chahal',   role: 'Spinner',      ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.25 },
  { name: 'Kuldeep Yadav',      role: 'Spinner',      ipl_team: 'DC',   nationality: 'Indian',       base_price: 1.25 },
  { name: 'Varun Chakravarthy', role: 'Spinner',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Ravi Bishnoi',       role: 'Spinner',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Piyush Chawla',      role: 'Spinner',      ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Adam Zampa',         role: 'Spinner',      ipl_team: 'RCB',  nationality: 'Australian',   base_price: 1.00 },
  { name: 'Imran Tahir',        role: 'Spinner',      ipl_team: 'CSK',  nationality: 'South African',base_price: 0.50 },
  { name: 'Shreyas Gopal',      role: 'Spinner',      ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Mayank Markande',    role: 'Spinner',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Sai Kishore',        role: 'Spinner',      ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Karn Sharma',        role: 'Spinner',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Harpreet Brar',      role: 'Spinner',      ipl_team: 'PBKS', nationality: 'Indian',       base_price: 0.50 },
  { name: 'Amit Mishra',        role: 'Spinner',      ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Rahul Chahar',       role: 'Spinner',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.75 },
  { name: 'Shahbaz Nadeem',     role: 'Spinner',      ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.50 },

  // ── Wicketkeepers ────────────────────────────────────────────────────────
  { name: 'MS Dhoni',           role: 'Wicketkeeper', ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.50 },
  { name: 'Dinesh Karthik',     role: 'Wicketkeeper', ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Wriddhiman Saha',    role: 'Wicketkeeper', ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Nicholas Pooran',    role: 'Wicketkeeper', ipl_team: 'LSG',  nationality: 'West Indian',  base_price: 1.00 },
  { name: 'Phil Salt',          role: 'Wicketkeeper', ipl_team: 'DC',   nationality: 'English',      base_price: 1.00 },
  { name: 'Quinton de Kock',    role: 'Wicketkeeper', ipl_team: 'LSG',  nationality: 'South African',base_price: 1.25 },
  { name: 'Matthew Wade',       role: 'Wicketkeeper', ipl_team: 'GT',   nationality: 'Australian',   base_price: 0.75 },

  // ── More All-Rounders ────────────────────────────────────────────────────
  { name: 'Abhishek Sharma',    role: 'All-Rounder',  ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.75 },
  { name: 'Rinku Singh',        role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.00 },
  { name: 'Shahrukh Khan',      role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'Indian',       base_price: 0.50 },
  { name: 'Rahul Tewatia',      role: 'All-Rounder',  ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.75 },
  { name: 'Tristan Stubbs',     role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'South African',base_price: 0.75 },
  { name: 'Wanindu Hasaranga',  role: 'All-Rounder',  ipl_team: 'RCB',  nationality: 'Sri Lankan',   base_price: 1.25 },
  { name: 'Azmatullah Omarzai', role: 'All-Rounder',  ipl_team: 'DC',   nationality: 'Afghan',       base_price: 0.75 },
  { name: 'Shashank Singh',     role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'Indian',       base_price: 0.50 },
  { name: 'Anukul Roy',         role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Ramandeep Singh',    role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Naman Dhir',         role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50 },

  // ── More Pacers ──────────────────────────────────────────────────────────
  { name: 'Naveen-ul-Haq',      role: 'Pacer',        ipl_team: 'LSG',  nationality: 'Afghan',       base_price: 0.75 },
  { name: 'Alzarri Joseph',     role: 'Pacer',        ipl_team: 'MI',   nationality: 'West Indian',  base_price: 1.00 },
  { name: 'Spencer Johnson',    role: 'Pacer',        ipl_team: 'GT',   nationality: 'Australian',   base_price: 0.75 },
  { name: 'Mukesh Kumar',       role: 'Pacer',        ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Simarjeet Singh',    role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Tushar Deshpande',   role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.50 },
  { name: 'Khaleel Ahmed',      role: 'Pacer',        ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Yash Dayal',         role: 'Pacer',        ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Mohit Sharma',       role: 'Pacer',        ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.50 },
  { name: 'Sandeep Sharma',     role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.50 },
];

async function seed() {
  if (usingMemory) {
    // Directly populate in-memory store
    const { db: store } = require('./db');
    store.players = players.map((p, i) => ({ player_id: i + 1, ...p }));
    console.log(`✅ Seeded ${players.length} players into in-memory store`);
    return;
  }

  // PostgreSQL seeding
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE ipl_players RESTART IDENTITY CASCADE');
    for (const p of players) {
      await client.query(
        `INSERT INTO ipl_players (name, role, ipl_team, nationality, base_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [p.name, p.role, p.ipl_team, p.nationality, p.base_price]
      );
    }
    await client.query('COMMIT');
    console.log(`✅ Seeded ${players.length} players into PostgreSQL`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', e.message);
  } finally {
    client.release();
  }
  process.exit(0);
}

// Export for use in server.js
module.exports = { players };

// Run directly: node seed.js
if (require.main === module) seed();
