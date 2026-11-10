require('dotenv').config();
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Pool } = require('@neondatabase/serverless');

async function migrate() {
  console.log('=======================================================');
  console.log('   ExamPulse - Migrate SQLite Data to Neon PostgreSQL   ');
  console.log('=======================================================');

  const connectionString = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();

  if (!connectionString) {
    console.error('\n❌ ERROR: DATABASE_URL is not set.');
    console.error('Please configure DATABASE_URL in your .env file before running migration.\n');
    process.exit(1);
  }

  const sqlitePath = path.join(__dirname, '..', 'exam_portal.db');
  console.log(`1. Reading source SQLite database: ${sqlitePath}`);
  let sqliteDb;
  try {
    sqliteDb = new DatabaseSync(sqlitePath);
  } catch (err) {
    console.error('Failed to open SQLite database:', err.message);
    process.exit(1);
  }

  console.log('2. Connecting to target Neon PostgreSQL database...');
  const pool = new Pool({
    connectionString,
    ssl: true
  });

  try {
    // 3. Ensure schema exists on PostgreSQL
    console.log('3. Ensuring PostgreSQL schema exists...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'examiner')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 15,
        pass_percentage INTEGER NOT NULL DEFAULT 50,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option TEXT NOT NULL CHECK(correct_option IN ('A', 'B', 'C', 'D')),
        marks INTEGER NOT NULL DEFAULT 1,
        explanation TEXT
      );
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        total_questions INTEGER NOT NULL,
        answered_count INTEGER NOT NULL,
        correct_count INTEGER NOT NULL,
        wrong_count INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        percentage REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PASSED', 'FAILED')),
        answers_json TEXT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS submission_answers (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        selected_option TEXT,
        is_correct INTEGER NOT NULL,
        marks_awarded INTEGER NOT NULL
      );
    `);

    // 4. Migrate users
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    console.log(`4. Migrating ${users.length} users...`);
    for (const u of users) {
      await pool.query(`
        INSERT INTO users (id, username, password_hash, full_name, role, email, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          email = EXCLUDED.email
      `, [u.id, u.username, u.password_hash, u.full_name, u.role, u.email || null, u.created_at || new Date().toISOString()]);
    }

    // 5. Migrate sessions
    const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();
    console.log(`5. Migrating ${sessions.length} active sessions...`);
    for (const s of sessions) {
      await pool.query(`
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (token) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          expires_at = EXCLUDED.expires_at
      `, [s.token, s.user_id, s.expires_at]);
    }

    // 6. Migrate exams
    const exams = sqliteDb.prepare('SELECT * FROM exams').all();
    console.log(`6. Migrating ${exams.length} exams...`);
    for (const e of exams) {
      await pool.query(`
        INSERT INTO exams (id, title, description, subject, duration_minutes, pass_percentage, created_by, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          subject = EXCLUDED.subject,
          duration_minutes = EXCLUDED.duration_minutes,
          pass_percentage = EXCLUDED.pass_percentage,
          created_by = EXCLUDED.created_by,
          is_active = EXCLUDED.is_active
      `, [e.id, e.title, e.description, e.subject, e.duration_minutes, e.pass_percentage, e.created_by, e.is_active, e.created_at || new Date().toISOString()]);
    }

    // 7. Migrate questions
    const questions = sqliteDb.prepare('SELECT * FROM questions').all();
    console.log(`7. Migrating ${questions.length} questions...`);
    for (const q of questions) {
      await pool.query(`
        INSERT INTO questions (id, exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          exam_id = EXCLUDED.exam_id,
          question_text = EXCLUDED.question_text,
          option_a = EXCLUDED.option_a,
          option_b = EXCLUDED.option_b,
          option_c = EXCLUDED.option_c,
          option_d = EXCLUDED.option_d,
          correct_option = EXCLUDED.correct_option,
          marks = EXCLUDED.marks,
          explanation = EXCLUDED.explanation
      `, [q.id, q.exam_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks, q.explanation]);
    }

    // 8. Migrate submissions
    const submissions = sqliteDb.prepare('SELECT * FROM submissions').all();
    console.log(`8. Migrating ${submissions.length} submissions...`);
    for (const s of submissions) {
      await pool.query(`
        INSERT INTO submissions (
          id, exam_id, user_id, attempt_number, time_taken_seconds, total_questions, answered_count,
          correct_count, wrong_count, score, total_marks, percentage, status, answers_json, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::timestamp)
        ON CONFLICT (id) DO UPDATE SET
          attempt_number = EXCLUDED.attempt_number,
          score = EXCLUDED.score,
          percentage = EXCLUDED.percentage,
          status = EXCLUDED.status
      `, [
        s.id, s.exam_id, s.user_id, s.attempt_number || 1, s.time_taken_seconds || 0,
        s.total_questions, s.answered_count, s.correct_count, s.wrong_count,
        s.score, s.total_marks, s.percentage, s.status, s.answers_json, s.submitted_at || new Date().toISOString()
      ]);
    }

    // 9. Migrate submission_answers
    let answers = [];
    try {
      answers = sqliteDb.prepare('SELECT * FROM submission_answers').all();
    } catch {
      answers = [];
    }
    console.log(`9. Migrating ${answers.length} granular answer records...`);
    for (const a of answers) {
      await pool.query(`
        INSERT INTO submission_answers (id, submission_id, question_id, selected_option, is_correct, marks_awarded)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [a.id, a.submission_id, a.question_id, a.selected_option, a.is_correct, a.marks_awarded]);
    }

    // 10. Align PostgreSQL Sequences
    console.log('10. Synchronizing PostgreSQL sequences to prevent ID collisions...');
    await pool.query(`
      SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
      SELECT setval(pg_get_serial_sequence('exams', 'id'), COALESCE((SELECT MAX(id) FROM exams), 1));
      SELECT setval(pg_get_serial_sequence('questions', 'id'), COALESCE((SELECT MAX(id) FROM questions), 1));
      SELECT setval(pg_get_serial_sequence('submissions', 'id'), COALESCE((SELECT MAX(id) FROM submissions), 1));
      SELECT setval(pg_get_serial_sequence('submission_answers', 'id'), COALESCE((SELECT MAX(id) FROM submission_answers), 1));
    `);

    console.log('\n=======================================================');
    console.log('✓ Migration to Neon PostgreSQL completed successfully!');
    console.log('=======================================================');
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

migrate();

