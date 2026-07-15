require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function init() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not set. Skipping PostgreSQL schema initialization.');
    return;
  }

  console.log('📡 Connecting to PostgreSQL to initialize schema...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Schema initialized successfully!');

    // Check if players are already seeded
    const { rows } = await pool.query('SELECT COUNT(*) FROM ipl_players');
    if (parseInt(rows[0].count, 10) === 0) {
      console.log('📊 ipl_players table is empty. Seeding players...');
      const { seed } = require('./seed');
      await seed();
    } else {
      console.log('ℹ️ Players already seeded.');
    }
  } catch (err) {
    console.error('❌ Error during DB initialization:', err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  init();
}

module.exports = { init };
