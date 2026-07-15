/**
 * seed.js — Seeds the ipl_players table with IPL 2025/2026 Mega Auction players and stats.
 * Run: node seed.js
 */
require('dotenv').config();
const { db, usingMemory } = require('./db');

const players = [
  // ── Batsmen ──────────────────────────────────────────────────────────────
  { name: 'Virat Kohli',        role: 'Batsman',      ipl_team: 'RCB',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 8004, strike_rate: 137.5, average: 38.7 } },
  { name: 'Rohit Sharma',       role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 6628, strike_rate: 131.1, average: 29.7 } },
  { name: 'Shubman Gill',       role: 'Batsman',      ipl_team: 'GT',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 3218, strike_rate: 135.7, average: 37.8 } },
  { name: 'KL Rahul',           role: 'Batsman',      ipl_team: 'DC',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 4683, strike_rate: 134.6, average: 45.4 } },
  { name: 'Yashasvi Jaiswal',   role: 'Batsman',      ipl_team: 'RR',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 1607, strike_rate: 150.9, average: 32.1 } },
  { name: 'Ruturaj Gaikwad',    role: 'Batsman',      ipl_team: 'CSK',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 2380, strike_rate: 136.9, average: 41.7 } },
  { name: 'Suryakumar Yadav',   role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 3594, strike_rate: 145.3, average: 32.4 } },
  { name: 'Shreyas Iyer',       role: 'Batsman',      ipl_team: 'PBKS', nationality: 'Indian',       base_price: 2.00, stats: { runs: 3127, strike_rate: 127.4, average: 31.5 } },
  { name: 'Faf du Plessis',     role: 'Batsman',      ipl_team: 'DC',   nationality: 'South African',base_price: 2.00, stats: { runs: 4571, strike_rate: 136.3, average: 35.7 } },
  { name: 'Jos Buttler',        role: 'Batsman',      ipl_team: 'GT',   nationality: 'English',      base_price: 2.00, stats: { runs: 3582, strike_rate: 147.5, average: 38.1 } },
  { name: 'Travis Head',        role: 'Batsman',      ipl_team: 'SRH',  nationality: 'Australian',   base_price: 2.00, stats: { runs: 1250, strike_rate: 162.8, average: 34.6 } },
  { name: 'Rinku Singh',        role: 'Batsman',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 890,  strike_rate: 148.6, average: 35.8 } },
  { name: 'David Miller',       role: 'Batsman',      ipl_team: 'GT',   nationality: 'South African',base_price: 1.50, stats: { runs: 2920, strike_rate: 139.2, average: 33.1 } },
  { name: 'Shimron Hetmyer',    role: 'Batsman',      ipl_team: 'RR',   nationality: 'West Indian',  base_price: 1.50, stats: { runs: 1340, strike_rate: 144.1, average: 30.5 } },
  { name: 'Harry Brook',        role: 'Batsman',      ipl_team: 'DC',   nationality: 'English',      base_price: 1.50, stats: { runs: 450,  strike_rate: 155.4, average: 32.1 } },
  { name: 'Devon Conway',       role: 'Batsman',      ipl_team: 'RCB',  nationality: 'New Zealander',base_price: 2.00, stats: { runs: 1512, strike_rate: 138.4, average: 46.1 } },
  { name: 'Jake Fraser-McGurk', role: 'Batsman',      ipl_team: 'DC',   nationality: 'Australian',   base_price: 2.00, stats: { runs: 355,  strike_rate: 195.2, average: 35.5 } },
  { name: 'Sai Sudharsan',      role: 'Batsman',      ipl_team: 'GT',   nationality: 'Indian',       base_price: 1.50, stats: { runs: 1034, strike_rate: 139.1, average: 47.0 } },
  { name: 'Rajat Patidar',      role: 'Batsman',      ipl_team: 'RCB',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 795,  strike_rate: 149.2, average: 34.6 } },
  { name: 'Tilak Varma',        role: 'Batsman',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.50, stats: { runs: 1156, strike_rate: 142.3, average: 39.9 } },
  { name: 'Prithvi Shaw',       role: 'Batsman',      ipl_team: 'PBKS', nationality: 'Indian',       base_price: 0.75, stats: { runs: 1694, strike_rate: 147.2, average: 23.8 } },
  { name: 'Devdutt Padikkal',   role: 'Batsman',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75, stats: { runs: 1560, strike_rate: 122.3, average: 25.1 } },
  { name: 'Rahul Tripathi',     role: 'Batsman',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.75, stats: { runs: 2200, strike_rate: 136.5, average: 26.8 } },
  { name: 'Nehal Wadhera',      role: 'Batsman',      ipl_team: 'PBKS', nationality: 'Indian',       base_price: 0.75, stats: { runs: 350,  strike_rate: 140.2, average: 26.9 } },
  { name: 'Sameer Rizvi',       role: 'Batsman',      ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.50, stats: { runs: 120,  strike_rate: 138.8, average: 18.0 } },
  { name: 'Abhinav Manohar',    role: 'Batsman',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.50, stats: { runs: 280,  strike_rate: 144.5, average: 21.0 } },
  { name: 'Ayush Badoni',       role: 'Batsman',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75, stats: { runs: 690,  strike_rate: 134.1, average: 24.5 } },
  { name: 'Sarfaraz Khan',      role: 'Batsman',      ipl_team: 'Unsold',nationality: 'Indian',       base_price: 0.75, stats: { runs: 650,  strike_rate: 135.0, average: 25.5 } },
  { name: 'Ayush Mhatre',       role: 'Batsman',      ipl_team: 'CSK',  nationality: 'Indian',       base_price: 0.30, stats: { runs: 120,  strike_rate: 142.5, average: 24.0 } },
  { name: 'Dewald Brevis',      role: 'Batsman',      ipl_team: 'CSK',  nationality: 'South African',base_price: 0.75, stats: { runs: 450,  strike_rate: 139.2, average: 28.1 } },
  { name: 'Vaibhav Suryavanshi',role: 'Batsman',      ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.30, stats: { runs: 60,   strike_rate: 125.0, average: 15.0 } },

  // ── All-Rounders ─────────────────────────────────────────────────────────
  { name: 'Hardik Pandya',      role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 2525, strike_rate: 145.8, average: 28.5, wickets: 64, economy: 8.12 } },
  { name: 'Ravindra Jadeja',    role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 2950, strike_rate: 129.2, average: 27.4, wickets: 160, economy: 7.62 } },
  { name: 'Axar Patel',         role: 'All-Rounder',  ipl_team: 'DC',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 1650, strike_rate: 131.8, average: 21.0, wickets: 123, economy: 7.24 } },
  { name: 'Sunil Narine',       role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'West Indian',  base_price: 2.00, stats: { runs: 1540, strike_rate: 164.5, average: 17.5, wickets: 180, economy: 6.74 } },
  { name: 'Andre Russell',      role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'West Indian',  base_price: 2.00, stats: { runs: 2484, strike_rate: 174.0, average: 24.5, wickets: 115, economy: 9.25 } },
  { name: 'Marcus Stoinis',     role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Australian',   base_price: 2.00, stats: { runs: 1850, strike_rate: 142.1, average: 27.5, wickets: 42, economy: 9.15 } },
  { name: 'Liam Livingstone',   role: 'All-Rounder',  ipl_team: 'RCB',  nationality: 'English',      base_price: 2.00, stats: { runs: 950,  strike_rate: 162.8, average: 28.7, wickets: 12, economy: 8.42 } },
  { name: 'Sam Curran',         role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'English',      base_price: 2.00, stats: { runs: 920,  strike_rate: 139.5, average: 22.5, wickets: 58, economy: 9.54 } },
  { name: 'Krunal Pandya',      role: 'All-Rounder',  ipl_team: 'RCB',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 1640, strike_rate: 132.8, average: 22.0, wickets: 76, economy: 7.35 } },
  { name: 'Venkatesh Iyer',     role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 1280, strike_rate: 137.4, average: 32.5, wickets: 5,  economy: 8.50 } },
  { name: 'Washington Sundar',  role: 'All-Rounder',  ipl_team: 'GT',   nationality: 'Indian',       base_price: 1.50, stats: { runs: 580,  strike_rate: 120.4, average: 18.5, wickets: 40, economy: 7.42 } },
  { name: 'Shivam Dube',        role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 1420, strike_rate: 141.9, average: 29.5, wickets: 5,  economy: 9.10 } },
  { name: 'Nitish Kumar Reddy', role: 'All-Rounder',  ipl_team: 'SRH',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 380,  strike_rate: 142.8, average: 31.7, wickets: 6,  economy: 8.85 } },
  { name: 'Ramandeep Singh',    role: 'All-Rounder',  ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.75, stats: { runs: 250,  strike_rate: 165.2, average: 25.0, wickets: 8,  economy: 8.90 } },
  { name: 'Shahrukh Khan',      role: 'All-Rounder',  ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.75, stats: { runs: 490,  strike_rate: 134.8, average: 19.5, wickets: 2,  economy: 9.20 } },
  { name: 'Rahul Tewatia',      role: 'All-Rounder',  ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.75, stats: { runs: 960,  strike_rate: 138.5, average: 26.5, wickets: 32, economy: 8.15 } },
  { name: 'Ravichandran Ashwin',role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 790,  strike_rate: 119.8, average: 15.8, wickets: 180, economy: 7.15 } },
  { name: 'Glenn Maxwell',      role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'Australian',   base_price: 2.00, stats: { runs: 2840, strike_rate: 156.4, average: 25.0, wickets: 38, economy: 8.35 } },
  { name: 'Romario Shepherd',   role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'West Indian',  base_price: 0.75, stats: { runs: 180,  strike_rate: 160.8, average: 18.0, wickets: 10, economy: 9.80 } },
  { name: 'Azmatullah Omarzai', role: 'All-Rounder',  ipl_team: 'PBKS', nationality: 'Afghan',       base_price: 0.75, stats: { runs: 220,  strike_rate: 134.5, average: 22.0, wickets: 12, economy: 8.75 } },
  { name: 'Rachin Ravindra',    role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'New Zealander',base_price: 1.50, stats: { runs: 480,  strike_rate: 145.5, average: 28.5, wickets: 8,  economy: 8.24 } },
  { name: 'Nitish Rana',        role: 'All-Rounder',  ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.00, stats: { runs: 2320, strike_rate: 135.2, average: 28.0, wickets: 10, economy: 8.40 } },
  { name: 'Naman Dhir',         role: 'All-Rounder',  ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50, stats: { runs: 160,  strike_rate: 140.2, average: 20.0, wickets: 2,  economy: 9.30 } },
  { name: 'Mitchell Santner',   role: 'All-Rounder',  ipl_team: 'CSK',  nationality: 'New Zealander',base_price: 1.00, stats: { runs: 150,  strike_rate: 118.5, average: 16.5, wickets: 18, economy: 6.90 } },
  { name: 'Tanush Kotian',      role: 'All-Rounder',  ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.50, stats: { runs: 120,  strike_rate: 125.0, average: 20.0, wickets: 8,  economy: 7.20 } },

  // ── Pacers ───────────────────────────────────────────────────────────────
  { name: 'Jasprit Bumrah',     role: 'Pacer',        ipl_team: 'MI',   nationality: 'Indian',       base_price: 2.00, stats: { wickets: 165, economy: 7.30, bowling_strike_rate: 18.2 } },
  { name: 'Mohammed Siraj',     role: 'Pacer',        ipl_team: 'GT',   nationality: 'Indian',       base_price: 2.00, stats: { wickets: 98,  economy: 8.44, bowling_strike_rate: 20.5 } },
  { name: 'Pat Cummins',        role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Australian',   base_price: 2.00, stats: { wickets: 65,  economy: 8.65, bowling_strike_rate: 21.0 } },
  { name: 'Mitchell Starc',     role: 'Pacer',        ipl_team: 'DC',   nationality: 'Australian',   base_price: 2.00, stats: { wickets: 102, economy: 8.21, bowling_strike_rate: 18.9 } },
  { name: 'Mohammed Shami',     role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Indian',       base_price: 2.00, stats: { wickets: 127, economy: 8.28, bowling_strike_rate: 19.8 } },
  { name: 'Trent Boult',        role: 'Pacer',        ipl_team: 'MI',   nationality: 'New Zealander',base_price: 2.00, stats: { wickets: 121, economy: 7.98, bowling_strike_rate: 20.2 } },
  { name: 'Kagiso Rabada',      role: 'Pacer',        ipl_team: 'GT',   nationality: 'South African',base_price: 2.00, stats: { wickets: 117, economy: 8.35, bowling_strike_rate: 18.0 } },
  { name: 'Arshdeep Singh',     role: 'Pacer',        ipl_team: 'PBKS', nationality: 'Indian',       base_price: 2.00, stats: { wickets: 76,  economy: 8.52, bowling_strike_rate: 18.5 } },
  { name: 'Harshal Patel',      role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Indian',       base_price: 2.00, stats: { wickets: 135, economy: 8.58, bowling_strike_rate: 17.5 } },
  { name: 'Anrich Nortje',      role: 'Pacer',        ipl_team: 'MI',   nationality: 'South African',base_price: 1.50, stats: { wickets: 63,  economy: 8.92, bowling_strike_rate: 17.8 } },
  { name: 'Matheesha Pathirana', role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Sri Lankan',   base_price: 1.50, stats: { wickets: 42,  economy: 7.82, bowling_strike_rate: 15.4 } },
  { name: 'Jofra Archer',        role: 'Pacer',        ipl_team: 'RR',   nationality: 'English',      base_price: 2.00, stats: { wickets: 48,  economy: 7.35, bowling_strike_rate: 19.2 } },
  { name: 'Bhuvneshwar Kumar',  role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Indian',       base_price: 1.50, stats: { wickets: 181, economy: 7.56, bowling_strike_rate: 21.4 } },
  { name: 'Deepak Chahar',      role: 'Pacer',        ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.50, stats: { wickets: 77,  economy: 7.92, bowling_strike_rate: 20.8 } },
  { name: 'T Natarajan',        role: 'Pacer',        ipl_team: 'DC',   nationality: 'Indian',       base_price: 1.00, stats: { wickets: 64,  economy: 8.58, bowling_strike_rate: 18.2 } },
  { name: 'Avesh Khan',         role: 'Pacer',        ipl_team: 'LSG',  nationality: 'Indian',       base_price: 1.50, stats: { wickets: 70,  economy: 8.62, bowling_strike_rate: 19.5 } },
  { name: 'Khaleel Ahmed',      role: 'Pacer',        ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.00, stats: { wickets: 74,  economy: 8.42, bowling_strike_rate: 19.1 } },
  { name: 'Mukesh Kumar',       role: 'Pacer',        ipl_team: 'PBKS', nationality: 'Indian',       base_price: 1.00, stats: { wickets: 25,  economy: 9.15, bowling_strike_rate: 18.0 } },
  { name: 'Tushar Deshpande',   role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.00, stats: { wickets: 45,  economy: 8.85, bowling_strike_rate: 19.6 } },
  { name: 'Harshit Rana',       role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.50, stats: { wickets: 25,  economy: 8.60, bowling_strike_rate: 16.5 } },
  { name: 'Akash Deep',         role: 'Pacer',        ipl_team: 'LSG',  nationality: 'Indian',       base_price: 1.00, stats: { wickets: 12,  economy: 8.92, bowling_strike_rate: 22.0 } },
  { name: 'Prasidh Krishna',    role: 'Pacer',        ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.75, stats: { wickets: 49,  economy: 8.85, bowling_strike_rate: 20.1 } },
  { name: 'Yash Dayal',         role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Indian',       base_price: 1.00, stats: { wickets: 28,  economy: 8.78, bowling_strike_rate: 19.4 } },
  { name: 'Sandeep Sharma',     role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.00, stats: { wickets: 137, economy: 7.82, bowling_strike_rate: 20.5 } },
  { name: 'Vaibhav Arora',      role: 'Pacer',        ipl_team: 'RR',   nationality: 'Indian',       base_price: 0.75, stats: { wickets: 22,  economy: 8.68, bowling_strike_rate: 18.4 } },
  { name: 'Gerald Coetzee',     role: 'Pacer',        ipl_team: 'GT',   nationality: 'South African',base_price: 1.00, stats: { wickets: 18,  economy: 9.35, bowling_strike_rate: 17.5 } },
  { name: 'Umran Malik',        role: 'Pacer',        ipl_team: 'SRH',  nationality: 'Indian',       base_price: 0.75, stats: { wickets: 29,  economy: 9.12, bowling_strike_rate: 18.6 } },
  { name: 'Nuwan Thushara',      role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Sri Lankan',   base_price: 0.75, stats: { wickets: 17,  economy: 8.25, bowling_strike_rate: 16.8 } },
  { name: 'Simarjeet Singh',    role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.50, stats: { wickets: 10,  economy: 8.54, bowling_strike_rate: 20.0 } },
  { name: 'Anshul Kamboj',      role: 'Pacer',        ipl_team: 'MI',   nationality: 'Indian',       base_price: 0.50, stats: { wickets: 8,   economy: 8.32, bowling_strike_rate: 21.2 } },
  { name: 'Yash Thakur',         role: 'Pacer',        ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75, stats: { wickets: 20,  economy: 9.10, bowling_strike_rate: 20.5 } },
  { name: 'Mayank Yadav',        role: 'Pacer',        ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75, stats: { wickets: 7,   economy: 6.98, bowling_strike_rate: 12.5 } },
  { name: 'Vijaykumar Vyshak',   role: 'Pacer',        ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.50, stats: { wickets: 15,  economy: 8.82, bowling_strike_rate: 19.8 } },
  { name: 'Rasikh Salam',        role: 'Pacer',        ipl_team: 'RCB',  nationality: 'Indian',       base_price: 0.50, stats: { wickets: 12,  economy: 8.65, bowling_strike_rate: 17.2 } },

  // ── Spinners ─────────────────────────────────────────────────────────────
  { name: 'Rashid Khan',         role: 'Spinner',      ipl_team: 'GT',   nationality: 'Afghan',       base_price: 2.00, stats: { wickets: 149, economy: 6.82, bowling_strike_rate: 19.2 } },
  { name: 'Yuzvendra Chahal',   role: 'Spinner',      ipl_team: 'PBKS', nationality: 'Indian',       base_price: 2.00, stats: { wickets: 205, economy: 7.84, bowling_strike_rate: 17.4 } },
  { name: 'Kuldeep Yadav',      role: 'Spinner',      ipl_team: 'DC',   nationality: 'Indian',       base_price: 2.00, stats: { wickets: 87,  economy: 7.78, bowling_strike_rate: 18.5 } },
  { name: 'Varun Chakravarthy', role: 'Spinner',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 2.00, stats: { wickets: 82,  economy: 7.54, bowling_strike_rate: 18.0 } },
  { name: 'Ravi Bishnoi',       role: 'Spinner',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 1.50, stats: { wickets: 63,  economy: 7.72, bowling_strike_rate: 21.0 } },
  { name: 'Adam Zampa',         role: 'Spinner',      ipl_team: 'RR',   nationality: 'Australian',   base_price: 1.50, stats: { wickets: 31,  economy: 7.95, bowling_strike_rate: 19.8 } },
  { name: 'Noor Ahmad',          role: 'Spinner',      ipl_team: 'CSK',  nationality: 'Afghan',       base_price: 1.50, stats: { wickets: 24,  economy: 7.35, bowling_strike_rate: 18.5 } },
  { name: 'Piyush Chawla',      role: 'Spinner',      ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.00, stats: { wickets: 192, economy: 7.94, bowling_strike_rate: 20.4 } },
  { name: 'Harpreet Brar',      role: 'Spinner',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 1.00, stats: { wickets: 30,  economy: 7.15, bowling_strike_rate: 24.2 } },
  { name: 'Rahul Chahar',       role: 'Spinner',      ipl_team: 'SRH',  nationality: 'Indian',       base_price: 1.00, stats: { wickets: 70,  economy: 7.82, bowling_strike_rate: 21.8 } },
  { name: 'Sai Kishore',        role: 'Spinner',      ipl_team: 'LSG',  nationality: 'Indian',       base_price: 0.75, stats: { wickets: 13,  economy: 7.45, bowling_strike_rate: 18.5 } },
  { name: 'Shreyas Gopal',      role: 'Spinner',      ipl_team: 'KKR',  nationality: 'Indian',       base_price: 0.50, stats: { wickets: 49,  economy: 8.12, bowling_strike_rate: 19.8 } },
  { name: 'Maheesh Theekshana',  role: 'Spinner',      ipl_team: 'CSK',  nationality: 'Sri Lankan',   base_price: 1.25, stats: { wickets: 68,  economy: 7.42, bowling_strike_rate: 20.5 } },
  { name: 'Allah Ghazanfar',     role: 'Spinner',      ipl_team: 'MI',   nationality: 'Afghan',       base_price: 0.75, stats: { wickets: 18,  economy: 6.95, bowling_strike_rate: 17.4 } },
  { name: 'Manav Suthar',        role: 'Spinner',      ipl_team: 'Unsold',nationality: 'Indian',       base_price: 0.30, stats: { wickets: 12,  economy: 7.12, bowling_strike_rate: 21.0 } },
  { name: 'Suyash Sharma',       role: 'Spinner',      ipl_team: 'Unsold',nationality: 'Indian',       base_price: 0.50, stats: { wickets: 24,  economy: 7.85, bowling_strike_rate: 19.5 } },
  { name: 'Waqar Salamkheil',    role: 'Spinner',      ipl_team: 'Unsold',nationality: 'Afghan',       base_price: 0.75, stats: { wickets: 32,  economy: 7.25, bowling_strike_rate: 18.6 } },

  // ── Wicketkeepers ────────────────────────────────────────────────────────
  { name: 'MS Dhoni',           role: 'Wicketkeeper', ipl_team: 'CSK',  nationality: 'Indian',       base_price: 1.50, stats: { runs: 5243, strike_rate: 137.5, average: 39.1, catches: 150, stumpings: 42 } },
  { name: 'Rishabh Pant',       role: 'Wicketkeeper', ipl_team: 'LSG',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 3284, strike_rate: 148.9, average: 35.2, catches: 75,  stumpings: 18 } },
  { name: 'Ishan Kishan',       role: 'Wicketkeeper', ipl_team: 'SRH',  nationality: 'Indian',       base_price: 2.00, stats: { runs: 2644, strike_rate: 135.8, average: 28.4, catches: 48,  stumpings: 6 } },
  { name: 'Heinrich Klaasen',   role: 'Wicketkeeper', ipl_team: 'SRH',  nationality: 'South African',base_price: 2.00, stats: { runs: 992,  strike_rate: 168.3, average: 38.2, catches: 15,  stumpings: 3 } },
  { name: 'Sanju Samson',       role: 'Wicketkeeper', ipl_team: 'RR',   nationality: 'Indian',       base_price: 2.00, stats: { runs: 4419, strike_rate: 139.0, average: 31.8, catches: 68,  stumpings: 15 } },
  { name: 'Nicholas Pooran',    role: 'Wicketkeeper', ipl_team: 'LSG',  nationality: 'West Indian',  base_price: 2.00, stats: { runs: 1769, strike_rate: 162.3, average: 30.5, catches: 29,  stumpings: 4 } },
  { name: 'Phil Salt',          role: 'Wicketkeeper', ipl_team: 'KKR',  nationality: 'English',      base_price: 2.00, stats: { runs: 654,  strike_rate: 175.8, average: 34.4, catches: 12,  stumpings: 2 } },
  { name: 'Quinton de Kock',    role: 'Wicketkeeper', ipl_team: 'KKR',  nationality: 'South African',base_price: 2.00, stats: { runs: 3156, strike_rate: 134.2, average: 31.2, catches: 72,  stumpings: 12 } },
  { name: 'Jitesh Sharma',       role: 'Wicketkeeper', ipl_team: 'MI',   nationality: 'Indian',       base_price: 1.00, stats: { runs: 730,  strike_rate: 145.2, average: 21.5, catches: 22,  stumpings: 4 } },
  { name: 'Rahmanullah Gurbaz',  role: 'Wicketkeeper', ipl_team: 'KKR',  nationality: 'Afghan',       base_price: 1.50, stats: { runs: 280,  strike_rate: 133.8, average: 20.0, catches: 10,  stumpings: 2 } },
  { name: 'Dhruv Jurel',         role: 'Wicketkeeper', ipl_team: 'RR',   nationality: 'Indian',       base_price: 1.50, stats: { runs: 340,  strike_rate: 136.4, average: 28.3, catches: 14,  stumpings: 2 } },
  { name: 'Prabhsimran Singh',   role: 'Wicketkeeper', ipl_team: 'PBKS', nationality: 'Indian',       base_price: 1.50, stats: { runs: 750,  strike_rate: 142.5, average: 22.0, catches: 18,  stumpings: 1 } },
  { name: 'Abhishek Porel',      role: 'Wicketkeeper', ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.75, stats: { runs: 360,  strike_rate: 148.2, average: 32.7, catches: 12,  stumpings: 3 } },
  { name: 'Robin Minz',          role: 'Wicketkeeper', ipl_team: 'GT',   nationality: 'Indian',       base_price: 0.50, stats: { runs: 80,   strike_rate: 135.0, average: 20.0, catches: 5,   stumpings: 1 } },
  { name: 'Kumar Kushagra',      role: 'Wicketkeeper', ipl_team: 'DC',   nationality: 'Indian',       base_price: 0.50, stats: { runs: 280,  strike_rate: 132.4, average: 21.5, catches: 12,  stumpings: 3 } },
  { name: 'Anuj Rawat',          role: 'Wicketkeeper', ipl_team: 'Unsold',nationality: 'Indian',       base_price: 0.50, stats: { runs: 420,  strike_rate: 128.5, average: 22.1, catches: 15,  stumpings: 4 } },
  { name: 'Donovan Ferreira',    role: 'Wicketkeeper', ipl_team: 'Unsold',nationality: 'South African',base_price: 0.50, stats: { runs: 580,  strike_rate: 155.0, average: 29.5, catches: 18,  stumpings: 2 } },
  { name: 'Ryan Rickelton',      role: 'Wicketkeeper', ipl_team: 'Unsold',nationality: 'South African',base_price: 1.00, stats: { runs: 950,  strike_rate: 145.4, average: 32.1, catches: 22,  stumpings: 1 } }
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
    await client.query('ALTER TABLE ipl_players ADD COLUMN IF NOT EXISTS stats JSONB');
    await client.query('TRUNCATE ipl_players RESTART IDENTITY CASCADE');
    for (const p of players) {
      await client.query(
        `INSERT INTO ipl_players (name, role, ipl_team, nationality, base_price, stats)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.name, p.role, p.ipl_team, p.nationality, p.base_price, JSON.stringify(p.stats)]
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
  if (require.main === module) {
    process.exit(0);
  }
}

// Export for use in server.js
module.exports = { players, seed };

// Run directly: node seed.js
if (require.main === module) seed();
