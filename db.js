const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, 'exam_portal.db');
const db = new DatabaseSync(DB_PATH);

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

// Initialize tables
function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'examiner')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sessions table for token authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
  `);

  // Exams table
  db.exec(`
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

  // Questions table (MCQ with 4 options A, B, C, D)
  db.exec(`
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

  // Submissions / Results table
  db.exec(`
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

  // Detailed per-question answer records for each attempt
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_option TEXT,
      is_correct INTEGER NOT NULL,
      marks_awarded INTEGER NOT NULL
    );
  `);

  // Safe schema migrations for existing database columns & check constraints
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userCols.includes('email')) {
      db.exec('ALTER TABLE users ADD COLUMN email TEXT;');
    }
    const subCols = db.prepare('PRAGMA table_info(submissions)').all().map(c => c.name);
    if (!subCols.includes('attempt_number')) {
      db.exec('ALTER TABLE submissions ADD COLUMN attempt_number INTEGER DEFAULT 1;');
    }
    if (!subCols.includes('time_taken_seconds')) {
      db.exec('ALTER TABLE submissions ADD COLUMN time_taken_seconds INTEGER DEFAULT 0;');
    }

    // Migrate users table if role check constraint does not allow 'examiner'
    const tableDdl = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
    if (tableDdl && tableDdl.sql && !tableDdl.sql.includes('examiner')) {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec(`
        CREATE TABLE users_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'student', 'examiner')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          email TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_temp (id, username, password_hash, full_name, role, created_at, email)
        SELECT id, username, password_hash, full_name, role, created_at, email FROM users;
      `);
      db.exec('DROP TABLE users;');
      db.exec('ALTER TABLE users_temp RENAME TO users;');
      db.exec('PRAGMA foreign_keys = ON;');
    }
  } catch (migErr) {
    console.warn('Migration note:', migErr.message);
  }

  seedInitialData();
}

// Seed default users and sample MCQ exams if empty
function seedInitialData() {
  // Ensure default demo examiner exists even in populated databases
  try {
    const hasExaminer = db.prepare("SELECT id FROM users WHERE role = 'examiner'").get();
    if (!hasExaminer) {
      db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES (?, ?, ?, ?, ?)
      `).run('examiner', hashPassword('examiner123'), 'Dr. Robert Vance', 'examiner', 'examiner@exampulse.edu');
    }
  } catch (e) {
    console.warn('Examiner seed note:', e.message);
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Seeding initial users and exams...');

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);

    insertUser.run('admin', hashPassword('admin123'), 'System Administrator', 'admin');
    insertUser.run('student', hashPassword('student123'), 'Alex Johnson', 'student');
    insertUser.run('priya', hashPassword('priya123'), 'Priya Sharma', 'student');

    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    // Seed Exam 1: Web Development & JavaScript Fundamentals
    const insertExam = db.prepare(`
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

    const insertQuestion = db.prepare(`
      INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuestion.run(
      exam1Id,
      'Which HTML5 tag is used to specify a footer for a document or section?',
      '<bottom>',
      '<footer>',
      '<section-footer>',
      '<end>',
      'B',
      1,
      'The <footer> tag defines a footer for a document or section containing author, copyright, or contact info.'
    );

    insertQuestion.run(
      exam1Id,
      'In JavaScript, what is the value of `typeof null`?',
      '"null"',
      '"undefined"',
      '"object"',
      '"boolean"',
      'C',
      1,
      'In JavaScript, `typeof null` returns "object" due to a historical legacy bug in the original JS implementation.'
    );

    insertQuestion.run(
      exam1Id,
      'Which CSS property is used to create a flexible, responsive container along one dimension?',
      'display: flex;',
      'display: inline;',
      'position: relative;',
      'float: left;',
      'A',
      1,
      'Flexbox (`display: flex;`) provides an efficient way to lay out, align, and distribute space among items in a container.'
    );

    insertQuestion.run(
      exam1Id,
      'What does the Promise.all() method in JavaScript do?',
      'Resolves only the fastest promise in the array',
      'Executes promises in sequential order one by one',
      'Waits for all promises to resolve, or rejects if any promise rejects',
      'Cancels all ongoing async operations',
      'C',
      1,
      'Promise.all accepts an iterable of promises and fulfills when all promises fulfill, or rejects when any promise rejects.'
    );

    insertQuestion.run(
      exam1Id,
      'Which keyword in JavaScript declares a block-scoped variable that cannot be reassigned?',
      'var',
      'const',
      'let',
      'static',
      'B',
      1,
      '`const` declares block-scoped variables whose identifier reference cannot be reassigned.'
    );

    // Seed Exam 2: Python Programming & Logic
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
      '[0, 1, 4, 9]',
      '[1, 4, 9, 16]',
      '[0, 2, 4, 6]',
      '[1, 2, 3, 4]',
      'A',
      1,
      '`range(4)` generates numbers 0, 1, 2, 3. Squaring each yields [0, 1, 4, 9].'
    );

    insertQuestion.run(
      exam2Id,
      'Which built-in Python data structure is immutable and ordered?',
      'List',
      'Set',
      'Dictionary',
      'Tuple',
      'D',
      1,
      'Tuples in Python are ordered collections of items that cannot be modified after creation (immutable).'
    );

    insertQuestion.run(
      exam2Id,
      'Which method is automatically called when a new instance of a Python class is created?',
      '__create__()',
      '__init__()',
      '__new_instance__()',
      '__start__()',
      'B',
      1,
      'The `__init__` method represents the constructor that initializes newly created class objects.'
    );

    insertQuestion.run(
      exam2Id,
      'What does the `pass` statement in Python do?',
      'Terminates the program immediately',
      'Skips the next line of code',
      'Acts as a syntactic placeholder that performs no operation',
      'Passes an argument to a function',
      'C',
      1,
      '`pass` is a null statement in Python used as a placeholder where code is syntactically required.'
    );

    // Seed Exam 3: General Aptitude & Logical Reasoning
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
      '95',
      '127',
      '126',
      '120',
      'B',
      1,
      'Each number follows the rule: next = (current * 2) + 1. So 63 * 2 + 1 = 127.'
    );

    insertQuestion.run(
      exam3Id,
      'If an item priced at $200 is discounted by 20%, what is the final selling price?',
      '$160',
      '$150',
      '$180',
      '$140',
      'A',
      1,
      '20% of $200 is $40. The discounted selling price is $200 - $40 = $160.'
    );

    insertQuestion.run(
      exam3Id,
      'A train traveling at 60 km/h covers a distance in 3 hours. How long will it take at 90 km/h?',
      '1.5 hours',
      '2 hours',
      '2.5 hours',
      '3 hours',
      'B',
      1,
      'Distance = speed * time = 60 * 3 = 180 km. Time at 90 km/h = 180 / 90 = 2 hours.'
    );

    // Seed a couple of sample submissions for student Alex Johnson
    const studentUser = db.prepare('SELECT id FROM users WHERE username = ?').get('student');
    const insertSub = db.prepare(`
      INSERT INTO submissions (
        exam_id, user_id, total_questions, answered_count,
        correct_count, wrong_count, score, total_marks, percentage, status, answers_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleAnswers1 = JSON.stringify({ "1": "B", "2": "C", "3": "A", "4": "C", "5": "B" });
    insertSub.run(
      exam1Id,
      studentUser.id,
      5,
      5,
      5,
      0,
      5,
      5,
      100.0,
      'PASSED',
      sampleAnswers1
    );

    const priyaUser = db.prepare('SELECT id FROM users WHERE username = ?').get('priya');
    const sampleAnswers2 = JSON.stringify({ "1": "B", "2": "A", "3": "A", "4": "B", "5": "B" });
    insertSub.run(
      exam1Id,
      priyaUser.id,
      5,
      5,
      3,
      2,
      3,
      5,
      60.0,
      'PASSED',
      sampleAnswers2
    );

    console.log('Database initialized and seeded successfully.');
  }
}

module.exports = {
  db,
  initDatabase,
  hashPassword,
  verifyPassword
};
