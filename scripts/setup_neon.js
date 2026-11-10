require('dotenv').config();
const { db, isPostgres, initDatabase } = require('../db.js');

async function main() {
  console.log('=======================================================');
  console.log('      ExamPulse - Neon PostgreSQL Setup & Verification ');
  console.log('=======================================================');

  const connectionString = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();

  if (!connectionString) {
    console.error('\n❌ ERROR: No database connection URL found!');
    console.error('Please set DATABASE_URL in your .env file or environment variables.');
    console.error('Example: DATABASE_URL=postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require\n');
    process.exit(1);
  }

  if (!isPostgres) {
    console.warn('\n⚠️ WARNING: DATABASE_URL does not appear to be a PostgreSQL connection string.');
  }

  console.log('Connecting to Neon PostgreSQL and initializing schema...');
  try {
    await initDatabase();
    console.log('✓ Database schema created and verified.');

    // Query stats
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const examCount = await db.get('SELECT COUNT(*) as count FROM exams');
    const qCount = await db.get('SELECT COUNT(*) as count FROM questions');
    const subCount = await db.get('SELECT COUNT(*) as count FROM submissions');

    console.log('\nDatabase Status:');
    console.log(`- Registered Users:     ${userCount ? userCount.count : 0}`);
    console.log(`- Published Exams:      ${examCount ? examCount.count : 0}`);
    console.log(`- Questions in Bank:    ${qCount ? qCount.count : 0}`);
    console.log(`- Submissions Recorded: ${subCount ? subCount.count : 0}`);

    console.log('\n✓ Neon PostgreSQL setup is complete and ready for Vercel deployment!\n');
  } catch (err) {
    console.error('\n❌ Initialization failed:', err.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();

