require('dotenv').config();
const path = require('node:path');
const crypto = require('node:crypto');

// Helper for password hashing using native scrypt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const salt = parts[0];
    const key = parts[1];
    const keyBuffer = Buffer.from(key, 'hex');
    const matchBuffer = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, matchBuffer);
  } catch (e) {
    return false;
  }
}

// Convert SQLite '?' parameters to PostgreSQL '$1, $2, ...' and auto-append 'RETURNING id' for INSERT
function convertSqlForPg(sql) {
  let i = 1;
  let inString = false;
  let stringChar = '';
  let out = '';
  for (let c = 0; c < sql.length; c++) {
    const ch = sql[c];
    if (inString) {
      out += ch;
      if (ch === stringChar && sql[c - 1] !== '\\') inString = false;
    } else {
      if (ch === '\'' || ch === '"') {
        inString = true;
        stringChar = ch;
        out += ch;
      } else if (ch === '?') {
        out += '$' + (i++);
      } else {
        out += ch;
      }
    }
  }

  const trimmed = out.trim();
  if (/^INSERT\s+INTO/i.test(trimmed) && !/RETURNING/i.test(trimmed)) {
    out = trimmed + ' RETURNING id';
  }

  return out;
}

// Flatten parameter lists: accepts query(sql, [a, b]) or query(sql, a, b)
function normalizeParams(args) {
  let params = args;
  if (args.length === 1 && Array.isArray(args[0])) {
    params = args[0];
  }
  return params.map(p => (p === undefined ? null : p));
}

// Connection detection
const connectionString = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  ''
).trim();

const isPostgres = Boolean(connectionString && (
  connectionString.startsWith('postgres://') ||
  connectionString.startsWith('postgresql://')
));

let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  // Use official Neon serverless driver (WebSocket/HTTP pooled client)
  const { Pool, types } = require('@neondatabase/serverless');

  // Parse int8 (BIGINT and COUNT) as number
  types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));
  // Parse numeric/decimal (AVG, SUM) as float
  types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

  pgPool = new Pool({
    connectionString,
    ssl: true,
    max: 10
  });

  console.log('[Database] Initialized with Neon PostgreSQL hosting.');
} else {
  // Local SQLite fallback when DATABASE_URL is not set
  const { DatabaseSync } = require('node:sqlite');
  const DB_PATH = path.join(__dirname, 'exam_portal.db');
  sqliteDb = new DatabaseSync(DB_PATH);
  console.log('[Database] DATABASE_URL not set; using local SQLite database (exam_portal.db).');
}

// Unified Database Adapter
const db = {
  isPostgres,

  async query(sql, ...args) {
    const params = normalizeParams(args);

    if (isPostgres) {
      const pgSql = convertSqlForPg(sql);
      const res = await pgPool.query(pgSql, params);
      const lastInsertRowid = res.rows && res.rows[0] && res.rows[0].id !== undefined ? res.rows[0].id : null;
      return {
        rows: res.rows || [],
        rowCount: res.rowCount || 0,
        lastInsertRowid
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const trimmed = sql.trim();
      if (/^SELECT\b/i.test(trimmed) || /\bRETURNING\b/i.test(trimmed)) {
        const rows = stmt.all(...params);
        return {
          rows,
          rowCount: rows.length,
          lastInsertRowid: null
        };
      } else {
        const info = stmt.run(...params);
        return {
          rows: [],
          rowCount: info.changes || 0,
          lastInsertRowid: info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : null
        };
      }
    }
  },

  async get(sql, ...args) {
    const params = normalizeParams(args);
    if (isPostgres) {
      const pgSql = convertSqlForPg(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows[0] || null;
    } else {
      const stmt = sqliteDb.prepare(sql);
      const row = stmt.get(...params);
      return row || null;
    }
  },

  async all(sql, ...args) {
    const params = normalizeParams(args);
    if (isPostgres) {
      const pgSql = convertSqlForPg(sql);
      const res = await pgPool.query(pgSql, params);
      return res.rows || [];
    } else {
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params) || [];
    }
  },

  async run(sql, ...args) {
    const params = normalizeParams(args);
    if (isPostgres) {
      const pgSql = convertSqlForPg(sql);
      const res = await pgPool.query(pgSql, params);
      const lastInsertRowid = res.rows && res.rows[0] && res.rows[0].id !== undefined ? res.rows[0].id : null;
      return {
        lastInsertRowid,
        changes: res.rowCount || 0
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      const info = stmt.run(...params);
      return {
        lastInsertRowid: info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : null,
        changes: info.changes || 0
      };
    }
  },

  // Drop-in compatibility for existing db.prepare(sql).get / all / run
  prepare(sql) {
    return {
      get: (...args) => this.get(sql, ...args),
      all: (...args) => this.all(sql, ...args),
      run: (...args) => this.run(sql, ...args)
    };
  },

  async exec(sql) {
    if (isPostgres) {
      await pgPool.query(sql);
    } else {
      sqliteDb.exec(sql);
    }
  },

  async close() {
    if (isPostgres && pgPool) {
      await pgPool.end();
    } else if (sqliteDb) {
      sqliteDb.close();
    }
  }
};

// Singleton initialization promise to prevent race conditions during cold starts in Vercel
let initPromise = null;

function ensureDbReady() {
  if (!initPromise) {
    initPromise = initDatabase().catch(err => {
      initPromise = null; // reset on error so retry is possible
      throw err;
    });
  }
  return initPromise;
}

// Database schema initialization
async function initDatabase() {
  if (isPostgres) {
    await initPostgresSchema();
    await seedPostgresData();
  } else {
    initSqliteSchema();
    seedSqliteData();
  }
}

// -------------------------------------------------------------
// POSTGRESQL (NEON) SCHEMA & SEEDING
// -------------------------------------------------------------
async function initPostgresSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'examiner')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      email TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL
    );
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
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
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS submission_answers (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option TEXT,
      is_correct INTEGER NOT NULL,
      marks_awarded INTEGER NOT NULL
    );
  `);

  // Column migrations if schema existed previously
  try {
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;');
    await db.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;');
    await db.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT 0;');
  } catch (migErr) {
    console.warn('Neon Postgres migration note:', migErr.message);
  }
}

async function seedPostgresData() {
  // Ensure default demo examiner exists
  try {
    const hasExaminer = await db.get("SELECT id FROM users WHERE role = 'examiner' LIMIT 1");
    if (!hasExaminer) {
      await db.run(
        `INSERT INTO users (username, password_hash, full_name, role, email) VALUES (?, ?, ?, ?, ?)`,
        'examiner', hashPassword('examiner123'), 'Dr. Robert Vance', 'examiner', 'examiner@exampulse.edu'
      );
    }
  } catch (e) {
    console.warn('Examiner seed note:', e.message);
  }

  const userCountRow = await db.get('SELECT COUNT(*) as count FROM users');
  const count = userCountRow ? Number(userCountRow.count) : 0;

  if (count === 0 || count <= 1) { // 0 or only the examiner inserted above
    console.log('Seeding initial users and exams into Neon PostgreSQL...');

    const adminRes = await db.run(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
      'admin', hashPassword('admin123'), 'System Administrator', 'admin'
    );
    const adminId = adminRes.lastInsertRowid;

    await db.run(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
      'student', hashPassword('student123'), 'Alex Johnson', 'student'
    );

    await db.run(
      `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
      'priya', hashPassword('priya123'), 'Priya Sharma', 'student'
    );

    // Seed Exam 1: Web Development
    const exam1Result = await db.run(`
      INSERT INTO exams (title, description, subject, duration_minutes, pass_percentage, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      'Web Development & JavaScript Essentials',
      'Test your understanding of core web technologies including HTML5, CSS3, ES6 JavaScript concepts, and DOM manipulation.',
      'Computer Science',
      10,
      50,
      adminId
    );
    const exam1Id = exam1Result.lastInsertRowid;

    const insertQ = (eId, txt, a, b, c, d, correct, marks, exp) => {
      return db.run(`
        INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, eId, txt, a, b, c, d, correct, marks, exp);
    };

    await insertQ(
      exam1Id,
      'Which HTML5 tag is used to specify a footer for a document or section?',
      '<bottom>', '<footer>', '<section-footer>', '<end>', 'B', 1,
      'The <footer> tag defines a footer for a document or section containing author, copyright, or contact info.'
    );

    await insertQ(
      exam1Id,
      'In JavaScript, what is the value of `typeof null`?',
      '"null"', '"undefined"', '"object"', '"boolean"', 'C', 1,
      'In JavaScript, `typeof null` returns "object" due to a historical legacy bug in the original JS implementation.'
    );

    await insertQ(
      exam1Id,
      'Which CSS property is used to create a flexible, responsive container along one dimension?',
      'display: flex;', 'display: inline;', 'position: relative;', 'float: left;', 'A', 1,
      'Flexbox (`display: flex;`) provides an efficient way to lay out, align, and distribute space among items in a container.'
    );

    await insertQ(
      exam1Id,
      'What does the Promise.all() method in JavaScript do?',
      'Resolves only the fastest promise in the array',
      'Executes promises in sequential order one by one',
      'Waits for all promises to resolve, or rejects if any promise rejects',
      'Cancels all ongoing async operations',
      'C', 1,
      'Promise.all accepts an iterable of promises and fulfills when all promises fulfill, or rejects when any promise rejects.'
    );

    await insertQ(
      exam1Id,
      'Which keyword in JavaScript declares a block-scoped variable that cannot be reassigned?',
      'var', 'const', 'let', 'static', 'B', 1,
      '`const` declares block-scoped variables whose identifier reference cannot be reassigned.'
    );

    // Seed Exam 2: Python Programming
    const exam2Result = await db.run(`
      INSERT INTO exams (title, description, subject, duration_minutes, pass_percentage, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      'Python Programming & Data Structures',
      'Assessment covering Python data structures (lists, tuples, dicts), comprehension syntax, and object-oriented programming concepts.',
      'Programming',
      12,
      60,
      adminId
    );
    const exam2Id = exam2Result.lastInsertRowid;

    await insertQ(
      exam2Id,
      'What is the output of `[x**2 for x in range(4)]` in Python?',
      '[0, 1, 4, 9]', '[1, 4, 9, 16]', '[0, 2, 4, 6]', '[1, 2, 3, 4]', 'A', 1,
      '`range(4)` generates numbers 0, 1, 2, 3. Squaring each yields [0, 1, 4, 9].'
    );

    await insertQ(
      exam2Id,
      'Which built-in Python data structure is immutable and ordered?',
      'List', 'Set', 'Dictionary', 'Tuple', 'D', 1,
      'Tuples in Python are ordered collections of items that cannot be modified after creation (immutable).'
    );

    await insertQ(
      exam2Id,
      'Which method is automatically called when a new instance of a Python class is created?',
      '__create__()', '__init__()', '__new_instance__()', '__start__()', 'B', 1,
      'The `__init__` method represents the constructor that initializes newly created class objects.'
    );

    await insertQ(
      exam2Id,
      'What does the `pass` statement in Python do?',
      'Terminates the program immediately',
      'Skips the next line of code',
      'Acts as a syntactic placeholder that performs no operation',
      'Passes an argument to a function',
      'C', 1,
      '`pass` is a null statement in Python used as a placeholder where code is syntactically required.'
    );

    // Seed Exam 3: General Aptitude
    const exam3Result = await db.run(`
      INSERT INTO exams (title, description, subject, duration_minutes, pass_percentage, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      'General Aptitude & Logical Reasoning',
      'Test your analytical problem-solving skills, numerical patterns, percentages, and deductive reasoning.',
      'Aptitude',
      8,
      50,
      adminId
    );
    const exam3Id = exam3Result.lastInsertRowid;

    await insertQ(
      exam3Id,
      'Find the next number in the series: 3, 7, 15, 31, 63, ?',
      '95', '127', '126', '120', 'B', 1,
      'Each number follows the rule: next = (current * 2) + 1. So 63 * 2 + 1 = 127.'
    );

    await insertQ(
      exam3Id,
      'If an item priced at $200 is discounted by 20%, what is the final selling price?',
      '$160', '$150', '$180', '$140', 'A', 1,
      '20% of $200 is $40. The discounted selling price is $200 - $40 = $160.'
    );

    await insertQ(
      exam3Id,
      'A train traveling at 60 km/h covers a distance in 3 hours. How long will it take at 90 km/h?',
      '1.5 hours', '2 hours', '2.5 hours', '3 hours', 'B', 1,
      'Distance = speed * time = 60 * 3 = 180 km. Time at 90 km/h = 180 / 90 = 2 hours.'
    );

    // Seed sample submissions for student Alex Johnson
    const studentUser = await db.get("SELECT id FROM users WHERE username = 'student'");
    if (studentUser) {
      const sampleAnswers1 = JSON.stringify({ "1": "B", "2": "C", "3": "A", "4": "C", "5": "B" });
      await db.run(`
        INSERT INTO submissions (
          exam_id, user_id, total_questions, answered_count,
          correct_count, wrong_count, score, total_marks, percentage, status, answers_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, exam1Id, studentUser.id, 5, 5, 5, 0, 5, 5, 100.0, 'PASSED', sampleAnswers1);
    }

    const priyaUser = await db.get("SELECT id FROM users WHERE username = 'priya'");
    if (priyaUser) {
      const sampleAnswers2 = JSON.stringify({ "1": "B", "2": "A", "3": "A", "4": "B", "5": "B" });
      await db.run(`
        INSERT INTO submissions (
          exam_id, user_id, total_questions, answered_count,
          correct_count, wrong_count, score, total_marks, percentage, status, answers_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, exam1Id, priyaUser.id, 5, 5, 3, 2, 3, 5, 60.0, 'PASSED', sampleAnswers2);
    }

    // Synchronize PostgreSQL sequences so subsequent inserts do not collide with seeded IDs
    try {
      await db.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));`);
      await db.query(`SELECT setval(pg_get_serial_sequence('exams', 'id'), COALESCE((SELECT MAX(id) FROM exams), 1));`);
      await db.query(`SELECT setval(pg_get_serial_sequence('questions', 'id'), COALESCE((SELECT MAX(id) FROM questions), 1));`);
      await db.query(`SELECT setval(pg_get_serial_sequence('submissions', 'id'), COALESCE((SELECT MAX(id) FROM submissions), 1));`);
      await db.query(`SELECT setval(pg_get_serial_sequence('submission_answers', 'id'), COALESCE((SELECT MAX(id) FROM submission_answers), 1));`);
    } catch (seqErr) {
      console.warn('Sequence alignment note:', seqErr.message);
    }

    console.log('[Database] Neon PostgreSQL database initialized and seeded successfully.');
  }
}

// -------------------------------------------------------------
// SQLITE FALLBACK SCHEMA & SEEDING (FOR OFFLINE / TEST RUNS)
// -------------------------------------------------------------
function initSqliteSchema() {
  sqliteDb.exec('PRAGMA foreign_keys = ON;');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'examiner')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email TEXT
    );
  `);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      pass_percentage INTEGER NOT NULL DEFAULT 50,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  `);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS submission_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option TEXT,
      is_correct INTEGER NOT NULL,
      marks_awarded INTEGER NOT NULL
    );
  `);

  try {
    const userCols = sqliteDb.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userCols.includes('email')) {
      sqliteDb.exec('ALTER TABLE users ADD COLUMN email TEXT;');
    }
    const subCols = sqliteDb.prepare('PRAGMA table_info(submissions)').all().map(c => c.name);
    if (!subCols.includes('attempt_number')) {
      sqliteDb.exec('ALTER TABLE submissions ADD COLUMN attempt_number INTEGER DEFAULT 1;');
    }
    if (!subCols.includes('time_taken_seconds')) {
      sqliteDb.exec('ALTER TABLE submissions ADD COLUMN time_taken_seconds INTEGER DEFAULT 0;');
    }
  } catch (migErr) {
    console.warn('SQLite migration note:', migErr.message);
  }
}

function seedSqliteData() {
  try {
    const hasExaminer = sqliteDb.prepare("SELECT id FROM users WHERE role = 'examiner'").get();
    if (!hasExaminer) {
      sqliteDb.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES (?, ?, ?, ?, ?)
      `).run('examiner', hashPassword('examiner123'), 'Dr. Robert Vance', 'examiner', 'examiner@exampulse.edu');
    }
  } catch (e) {
    console.warn('Examiner seed note:', e.message);
  }

  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial users and exams into SQLite...');

    const insertUser = sqliteDb.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin', hashPassword('admin123'), 'System Administrator', 'admin');
    insertUser.run('student', hashPassword('student123'), 'Alex Johnson', 'student');
    insertUser.run('priya', hashPassword('priya123'), 'Priya Sharma', 'student');

    const admin = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    const insertExam = sqliteDb.prepare(`
      INSERT INTO exams (title, description, subject, duration_minutes, pass_percentage, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const exam1Result = insertExam.run(
      'Web Development & JavaScript Essentials',
      'Test your understanding of core web technologies including HTML5, CSS3, ES6 JavaScript concepts, and DOM manipulation.',
      'Computer Science',
      10,
      50,
      admin.id
    );
    const exam1Id = exam1Result.lastInsertRowid;

    const insertQuestion = sqliteDb.prepare(`
      INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuestion.run(
      exam1Id,
      'Which HTML5 tag is used to specify a footer for a document or section?',
      '<bottom>', '<footer>', '<section-footer>', '<end>', 'B', 1,
      'The <footer> tag defines a footer for a document or section containing author, copyright, or contact info.'
    );

    insertQuestion.run(
      exam1Id,
      'In JavaScript, what is the value of `typeof null`?',
      '"null"', '"undefined"', '"object"', '"boolean"', 'C', 1,
      'In JavaScript, `typeof null` returns "object" due to a historical legacy bug in the original JS implementation.'
    );

    insertQuestion.run(
      exam1Id,
      'Which CSS property is used to create a flexible, responsive container along one dimension?',
      'display: flex;', 'display: inline;', 'position: relative;', 'float: left;', 'A', 1,
      'Flexbox (`display: flex;`) provides an efficient way to lay out, align, and distribute space among items in a container.'
    );

    insertQuestion.run(
      exam1Id,
      'What does the Promise.all() method in JavaScript do?',
      'Resolves only the fastest promise in the array',
      'Executes promises in sequential order one by one',
      'Waits for all promises to resolve, or rejects if any promise rejects',
      'Cancels all ongoing async operations',
      'C', 1,
      'Promise.all accepts an iterable of promises and fulfills when all promises fulfill, or rejects when any promise rejects.'
    );

    insertQuestion.run(
      exam1Id,
      'Which keyword in JavaScript declares a block-scoped variable that cannot be reassigned?',
      'var', 'const', 'let', 'static', 'B', 1,
      '`const` declares block-scoped variables whose identifier reference cannot be reassigned.'
    );

    const exam2Result = insertExam.run(
      'Python Programming & Data Structures',
      'Assessment covering Python data structures (lists, tuples, dicts), comprehension syntax, and object-oriented programming concepts.',
      'Programming',
      12,
      60,
      admin.id
    );
    const exam2Id = exam2Result.lastInsertRowid;

    insertQuestion.run(
      exam2Id,
      'What is the output of `[x**2 for x in range(4)]` in Python?',
      '[0, 1, 4, 9]', '[1, 4, 9, 16]', '[0, 2, 4, 6]', '[1, 2, 3, 4]', 'A', 1,
      '`range(4)` generates numbers 0, 1, 2, 3. Squaring each yields [0, 1, 4, 9].'
    );

    insertQuestion.run(
      exam2Id,
      'Which built-in Python data structure is immutable and ordered?',
      'List', 'Set', 'Dictionary', 'Tuple', 'D', 1,
      'Tuples in Python are ordered collections of items that cannot be modified after creation (immutable).'
    );

    insertQuestion.run(
      exam2Id,
      'Which method is automatically called when a new instance of a Python class is created?',
      '__create__()', '__init__()', '__new_instance__()', '__start__()', 'B', 1,
      'The `__init__` method represents the constructor that initializes newly created class objects.'
    );

    insertQuestion.run(
      exam2Id,
      'What does the `pass` statement in Python do?',
      'Terminates the program immediately',
      'Skips the next line of code',
      'Acts as a syntactic placeholder that performs no operation',
      'Passes an argument to a function',
      'C', 1,
      '`pass` is a null statement in Python used as a placeholder where code is syntactically required.'
    );

    const exam3Result = insertExam.run(
      'General Aptitude & Logical Reasoning',
      'Test your analytical problem-solving skills, numerical patterns, percentages, and deductive reasoning.',
      'Aptitude',
      8,
      50,
      admin.id
    );
    const exam3Id = exam3Result.lastInsertRowid;

    insertQuestion.run(
      exam3Id,
      'Find the next number in the series: 3, 7, 15, 31, 63, ?',
      '95', '127', '126', '120', 'B', 1,
      'Each number follows the rule: next = (current * 2) + 1. So 63 * 2 + 1 = 127.'
    );

    insertQuestion.run(
      exam3Id,
      'If an item priced at $200 is discounted by 20%, what is the final selling price?',
      '$160', '$150', '$180', '$140', 'A', 1,
      '20% of $200 is $40. The discounted selling price is $200 - $40 = $160.'
    );

    insertQuestion.run(
      exam3Id,
      'A train traveling at 60 km/h covers a distance in 3 hours. How long will it take at 90 km/h?',
      '1.5 hours', '2 hours', '2.5 hours', '3 hours', 'B', 1,
      'Distance = speed * time = 60 * 3 = 180 km. Time at 90 km/h = 180 / 90 = 2 hours.'
    );

    const studentUser = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get('student');
    const insertSub = sqliteDb.prepare(`
      INSERT INTO submissions (
        exam_id, user_id, total_questions, answered_count,
        correct_count, wrong_count, score, total_marks, percentage, status, answers_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleAnswers1 = JSON.stringify({ "1": "B", "2": "C", "3": "A", "4": "C", "5": "B" });
    insertSub.run(exam1Id, studentUser.id, 5, 5, 5, 0, 5, 5, 100.0, 'PASSED', sampleAnswers1);

    const priyaUser = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get('priya');
    const sampleAnswers2 = JSON.stringify({ "1": "B", "2": "A", "3": "A", "4": "B", "5": "B" });
    insertSub.run(exam1Id, priyaUser.id, 5, 5, 3, 2, 3, 5, 60.0, 'PASSED', sampleAnswers2);

    console.log('[Database] SQLite database initialized and seeded successfully.');
  }
}

module.exports = {
  db,
  isPostgres,
  initDatabase,
  ensureDbReady,
  hashPassword,
  verifyPassword
};
