const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, initDatabase, ensureDbReady, hashPassword, verifyPassword } = require('./db.js');

// Pre-warm database initialization
let isDbReady = false;
ensureDbReady().then(() => {
  isDbReady = true;
}).catch(err => {
  console.error('[Database] Initialization error:', err.message);
});

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME type map for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(payload);
}

// Helper to parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Authentication & Session Helper (Async for Neon PostgreSQL / SQLite)
async function getAuthenticatedUser(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'session_token') {
        token = v;
        break;
      }
    }
  }

  if (!token) return null;

  const now = Date.now();
  const session = await db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.username, u.full_name, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now);

  if (!session) return null;

  // Sliding inactivity timeout: every authenticated request extends the session.
  const expiresAt = now + 15 * 60 * 1000;
  await db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(expiresAt, token);

  return session;
}

// Create new session token for user (Async for Neon PostgreSQL / SQLite)
async function createSession(userId) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes of inactivity
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return token;
}

// Static File Handler
function serveStaticFile(req, res, filePath) {
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  // Security check: ensure path is inside PUBLIC_DIR
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  });
}

// Main Request Handler (Works for Node http server and Vercel Serverless Functions)
async function handler(req, res) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  // Ensure DB schema & seed are ready before processing requests
  if (!isDbReady) {
    await ensureDbReady();
    isDbReady = true;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // ==========================================
    // API ROUTES
    // ==========================================

    // --- AUTHENTICATION APIS ---
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { success: false, message: 'Username and password are required' });
      }

      const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password_hash)) {
        return sendJson(res, 401, { success: false, message: 'Invalid username or password' });
      }

      const token = await createSession(user.id);
      return sendJson(res, 200, {
        success: true,
        token,
        user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
      });
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const { username, password, full_name, email } = await parseBody(req);
      if (!username || !password || !full_name) {
        return sendJson(res, 400, { success: false, message: 'Full name, username, and password are required' });
      }

      const cleanUsername = username.trim().toLowerCase();
      // Public self-registration is strictly restricted to student / candidate role
      const cleanRole = 'student';

      const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
      if (existing) {
        return sendJson(res, 400, { success: false, message: 'Username is already taken' });
      }

      const hash = hashPassword(password);
      const result = await db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanUsername, hash, full_name.trim(), cleanRole, email ? email.trim() : null);

      const userId = result.lastInsertRowid;
      const token = await createSession(userId);

      return sendJson(res, 201, {
        success: true,
        token,
        user: { id: userId, username: cleanUsername, full_name: full_name.trim(), role: cleanRole, email: email ? email.trim() : null }
      });
    }

    if (pathname === '/api/auth/demo-login' && method === 'POST') {
      const { role } = await parseBody(req);
      const targetRole = ['admin', 'examiner', 'student'].includes(role) ? role : 'student';
      const user = await db.prepare('SELECT * FROM users WHERE role = ? ORDER BY id ASC LIMIT 1').get(targetRole);

      if (!user) {
        return sendJson(res, 404, { success: false, message: 'No demo user found for this role' });
      }

      const token = await createSession(user.id);
      return sendJson(res, 200, {
        success: true,
        token,
        user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
      });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Not authenticated' });
      }
      return sendJson(res, 200, {
        success: true,
        user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role }
      });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      let token = null;
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
      if (token) {
        await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      }
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    }

    // --- PROTECTED APIS (Requires login) ---
    const user = await getAuthenticatedUser(req);

    // --- ADMIN & EXAMINER ENDPOINTS ---
    if (pathname.startsWith('/api/admin/')) {
      if (!user || (user.role !== 'admin' && user.role !== 'examiner')) {
        return sendJson(res, 403, { success: false, message: 'Admin or Examiner access required' });
      }

      // GET /api/admin/stats
      if (pathname === '/api/admin/stats' && method === 'GET') {
        const totalExamsRow = await db.prepare('SELECT COUNT(*) as c FROM exams').get();
        const totalExams = totalExamsRow ? Number(totalExamsRow.c) : 0;

        const totalQuestionsRow = await db.prepare('SELECT COUNT(*) as c FROM questions').get();
        const totalQuestions = totalQuestionsRow ? Number(totalQuestionsRow.c) : 0;

        const totalStudentsRow = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get();
        const totalStudents = totalStudentsRow ? Number(totalStudentsRow.c) : 0;

        const totalSubmissionsRow = await db.prepare('SELECT COUNT(*) as c FROM submissions').get();
        const totalSubmissions = totalSubmissionsRow ? Number(totalSubmissionsRow.c) : 0;

        const passedSubmissionsRow = await db.prepare("SELECT COUNT(*) as c FROM submissions WHERE status = 'PASSED'").get();
        const passedSubmissions = passedSubmissionsRow ? Number(passedSubmissionsRow.c) : 0;

        const avgScoreRow = await db.prepare('SELECT AVG(percentage) as avg FROM submissions').get();
        const avgScore = avgScoreRow && avgScoreRow.avg !== null ? Number(avgScoreRow.avg) : 0;

        const passRate = totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0;

        return sendJson(res, 200, {
          success: true,
          stats: {
            totalExams,
            totalQuestions,
            totalStudents,
            totalSubmissions,
            passRate,
            avgScore: Math.round(avgScore * 10) / 10
          }
        });
      }

      // GET /api/admin/exams
      if (pathname === '/api/admin/exams' && method === 'GET') {
        const exams = await db.prepare(`
          SELECT e.*,
                 u.full_name as creator_name,
                 (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as question_count,
                 (SELECT COUNT(*) FROM submissions s WHERE s.exam_id = e.id) as submission_count
          FROM exams e
          LEFT JOIN users u ON e.created_by = u.id
          ORDER BY e.id DESC
        `).all();

        return sendJson(res, 200, { success: true, exams });
      }

      // POST /api/admin/exams (Create exam with questions)
      if (pathname === '/api/admin/exams' && method === 'POST') {
        const body = await parseBody(req);
        const { title, description, subject, duration_minutes, pass_percentage, questions } = body;

        if (!title || !subject) {
          return sendJson(res, 400, { success: false, message: 'Title and Subject are required' });
        }

        const duration = parseInt(duration_minutes, 10) || 15;
        const passMarks = parseInt(pass_percentage, 10) || 50;

        const examResult = await db.prepare(`
          INSERT INTO exams (title, description, subject, duration_minutes, pass_percentage, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(title.trim(), (description || '').trim(), subject.trim(), duration, passMarks, user.id);

        const examId = examResult.lastInsertRowid;

        // Insert questions if provided
        if (Array.isArray(questions) && questions.length > 0) {
          const insertQ = db.prepare(`
            INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const q of questions) {
            if (q.question_text && q.option_a && q.option_b && q.option_c && q.option_d) {
              const correct = ['A', 'B', 'C', 'D'].includes(q.correct_option) ? q.correct_option : 'A';
              const marks = parseInt(q.marks, 10) || 1;
              await insertQ.run(
                examId,
                q.question_text.trim(),
                q.option_a.trim(),
                q.option_b.trim(),
                q.option_c.trim(),
                q.option_d.trim(),
                correct,
                marks,
                (q.explanation || '').trim()
              );
            }
          }
        }

        return sendJson(res, 201, {
          success: true,
          message: 'Exam created successfully',
          examId
        });
      }

      // Match /api/admin/exams/:id
      const examDetailMatch = pathname.match(/^\/api\/admin\/exams\/(\d+)$/);
      if (examDetailMatch) {
        const examId = parseInt(examDetailMatch[1], 10);

        if (method === 'GET') {
          const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
          if (!exam) return sendJson(res, 404, { success: false, message: 'Exam not found' });

          const questions = await db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC').all(examId);
          return sendJson(res, 200, { success: true, exam, questions });
        }

        if (method === 'PUT') {
          const body = await parseBody(req);
          const { title, description, subject, duration_minutes, pass_percentage } = body;

          await db.prepare(`
            UPDATE exams
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                subject = COALESCE(?, subject),
                duration_minutes = COALESCE(?, duration_minutes),
                pass_percentage = COALESCE(?, pass_percentage)
            WHERE id = ?
          `).run(
            title !== undefined ? title : null,
            description !== undefined ? description : null,
            subject !== undefined ? subject : null,
            duration_minutes !== undefined ? parseInt(duration_minutes, 10) : null,
            pass_percentage !== undefined ? parseInt(pass_percentage, 10) : null,
            examId
          );

          return sendJson(res, 200, { success: true, message: 'Exam updated successfully' });
        }

        if (method === 'DELETE') {
          if (user.role !== 'admin') {
            return sendJson(res, 403, { success: false, message: 'Only administrators can delete examinations' });
          }
          await db.prepare('DELETE FROM exams WHERE id = ?').run(examId);
          return sendJson(res, 200, { success: true, message: 'Exam deleted successfully' });
        }
      }

      // POST /api/admin/exams/:id/questions (Add single question to exam)
      const addQuestionMatch = pathname.match(/^\/api\/admin\/exams\/(\d+)\/questions$/);
      if (addQuestionMatch && method === 'POST') {
        const examId = parseInt(addQuestionMatch[1], 10);
        const q = await parseBody(req);

        if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
          return sendJson(res, 400, { success: false, message: 'Question text and all 4 options are required' });
        }

        const correct = ['A', 'B', 'C', 'D'].includes(q.correct_option) ? q.correct_option : 'A';
        const marks = parseInt(q.marks, 10) || 1;

        const result = await db.prepare(`
          INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, explanation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(examId, q.question_text.trim(), q.option_a.trim(), q.option_b.trim(), q.option_c.trim(), q.option_d.trim(), correct, marks, (q.explanation || '').trim());

        return sendJson(res, 201, { success: true, questionId: result.lastInsertRowid, message: 'Question added successfully' });
      }

      // Match /api/admin/questions/:id (GET, PUT, DELETE for editing & removing questions)
      const questionDetailMatch = pathname.match(/^\/api\/admin\/questions\/(\d+)$/);
      if (questionDetailMatch) {
        const questionId = parseInt(questionDetailMatch[1], 10);

        // GET single question for editing
        if (method === 'GET') {
          const question = await db.prepare(`
            SELECT q.*, e.title as exam_title, e.subject as exam_subject
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.id = ?
          `).get(questionId);

          if (!question) {
            return sendJson(res, 404, { success: false, message: 'Question not found' });
          }

          return sendJson(res, 200, { success: true, question });
        }

        // PUT update question details
        if (method === 'PUT') {
          const q = await parseBody(req);
          const existing = await db.prepare('SELECT id FROM questions WHERE id = ?').get(questionId);
          if (!existing) {
            return sendJson(res, 404, { success: false, message: 'Question not found' });
          }

          if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
            return sendJson(res, 400, { success: false, message: 'Question statement and all 4 options are required' });
          }

          const correct = ['A', 'B', 'C', 'D'].includes(q.correct_option) ? q.correct_option : 'A';
          const marks = parseInt(q.marks, 10) || 1;

          await db.prepare(`
            UPDATE questions
            SET question_text = ?,
                option_a = ?,
                option_b = ?,
                option_c = ?,
                option_d = ?,
                correct_option = ?,
                marks = ?,
                explanation = ?
            WHERE id = ?
          `).run(
            q.question_text.trim(),
            q.option_a.trim(),
            q.option_b.trim(),
            q.option_c.trim(),
            q.option_d.trim(),
            correct,
            marks,
            (q.explanation || '').trim(),
            questionId
          );

          return sendJson(res, 200, { success: true, message: 'Question updated successfully' });
        }

        // DELETE question
        if (method === 'DELETE') {
          await db.prepare('DELETE FROM questions WHERE id = ?').run(questionId);
          return sendJson(res, 200, { success: true, message: 'Question deleted successfully' });
        }
      }

      // GET /api/admin/questions (List all questions or filter by exam_id)
      if (pathname === '/api/admin/questions' && method === 'GET') {
        const examIdFilter = parsedUrl.searchParams.get('exam_id');
        let questions;
        if (examIdFilter) {
          questions = await db.prepare(`
            SELECT q.*, e.title as exam_title, e.subject as exam_subject
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.exam_id = ?
            ORDER BY q.id ASC
          `).all(parseInt(examIdFilter, 10));
        } else {
          questions = await db.prepare(`
            SELECT q.*, e.title as exam_title, e.subject as exam_subject
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            ORDER BY q.exam_id DESC, q.id ASC
          `).all();
        }

        return sendJson(res, 200, { success: true, questions });
      }

      // GET /api/admin/answers (List granular answers from submission_answers table)
      if (pathname === '/api/admin/answers' && method === 'GET') {
        const answersList = await db.prepare(`
          SELECT sa.id, sa.submission_id, sa.question_id, sa.selected_option, sa.is_correct, sa.marks_awarded,
                 q.question_text, q.correct_option,
                 e.title as exam_title,
                 u.full_name as student_name, u.username as student_username,
                 s.submitted_at
          FROM submission_answers sa
          JOIN questions q ON sa.question_id = q.id
          JOIN submissions s ON sa.submission_id = s.id
          JOIN exams e ON s.exam_id = e.id
          JOIN users u ON s.user_id = u.id
          ORDER BY sa.id DESC
          LIMIT 100
        `).all();

        return sendJson(res, 200, { success: true, answers: answersList });
      }

      // GET /api/admin/submissions (Examiner and Admin view all submissions)
      if (pathname === '/api/admin/submissions' && method === 'GET') {
        const submissions = await db.prepare(`
          SELECT s.*, e.title as exam_title, u.full_name as student_name, u.username as student_username
          FROM submissions s
          JOIN exams e ON s.exam_id = e.id
          JOIN users u ON s.user_id = u.id
          ORDER BY s.submitted_at DESC
        `).all();

        return sendJson(res, 200, { success: true, submissions });
      }

      // ==========================================
      // STRICT ADMIN ONLY USER MANAGEMENT ROUTES
      // ==========================================

      // GET /api/admin/users (List all registered user accounts with attempt summaries)
      if (pathname === '/api/admin/users' && method === 'GET') {
        if (user.role !== 'admin') {
          return sendJson(res, 403, { success: false, message: 'Only administrators can view user accounts' });
        }

        const usersList = await db.prepare(`
          SELECT u.id, u.username, u.full_name, u.email, u.role, u.created_at,
                 COUNT(s.id) as total_attempts,
                 COALESCE(SUM(CASE WHEN s.status = 'PASSED' THEN 1 ELSE 0 END), 0) as passed_attempts,
                 COALESCE(SUM(CASE WHEN s.status = 'FAILED' THEN 1 ELSE 0 END), 0) as failed_attempts,
                 ROUND(CAST(COALESCE(AVG(s.percentage), 0) AS NUMERIC), 1) as avg_percentage,
                 MAX(s.submitted_at) as last_attempt_at
          FROM users u
          LEFT JOIN submissions s ON u.id = s.user_id
          GROUP BY u.id, u.username, u.full_name, u.email, u.role, u.created_at
          ORDER BY u.id DESC
        `).all();

        return sendJson(res, 200, { success: true, users: usersList });
      }

      // POST /api/admin/users (Admin creates new Examiner, Student, or Admin user)
      if (pathname === '/api/admin/users' && method === 'POST') {
        if (user.role !== 'admin') {
          return sendJson(res, 403, { success: false, message: 'Only administrators can create user accounts' });
        }

        const { full_name, username, password, role, email } = await parseBody(req);
        if (!full_name || !username || !password) {
          return sendJson(res, 400, { success: false, message: 'Full name, username, and password are required' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const allowedRoles = ['admin', 'examiner', 'student'];
        const cleanRole = allowedRoles.includes(role) ? role : 'examiner';

        const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
        if (existing) {
          return sendJson(res, 400, { success: false, message: 'Username is already taken' });
        }

        const hash = hashPassword(password);
        const result = await db.prepare(`
          INSERT INTO users (username, password_hash, full_name, role, email)
          VALUES (?, ?, ?, ?, ?)
        `).run(cleanUsername, hash, full_name.trim(), cleanRole, email ? email.trim() : null);

        return sendJson(res, 201, {
          success: true,
          message: `Account created successfully for ${cleanRole}: ${full_name.trim()}`,
          user: {
            id: result.lastInsertRowid,
            username: cleanUsername,
            full_name: full_name.trim(),
            role: cleanRole,
            email: email ? email.trim() : null
          }
        });
      }

      // GET /api/admin/users/:id/attempts (Get all attempts of a specific user)
      const userAttemptsMatch = pathname.match(/^\/api\/admin\/users\/(\d+)\/attempts$/);
      if (userAttemptsMatch && method === 'GET') {
        if (user.role !== 'admin') {
          return sendJson(res, 403, { success: false, message: 'Only administrators can view user attempts' });
        }

        const targetUserId = parseInt(userAttemptsMatch[1], 10);
        const targetUser = await db.prepare('SELECT id, username, full_name, role, email, created_at FROM users WHERE id = ?').get(targetUserId);
        if (!targetUser) return sendJson(res, 404, { success: false, message: 'User not found' });

        const attempts = await db.prepare(`
          SELECT s.*, e.title as exam_title, e.subject
          FROM submissions s
          JOIN exams e ON s.exam_id = e.id
          WHERE s.user_id = ?
          ORDER BY s.submitted_at DESC
        `).all(targetUserId);

        return sendJson(res, 200, { success: true, user: targetUser, attempts });
      }

      // DELETE /api/admin/users/:id
      const delUserMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (delUserMatch && method === 'DELETE') {
        if (user.role !== 'admin') {
          return sendJson(res, 403, { success: false, message: 'Only administrators can delete user accounts' });
        }

        const targetUserId = parseInt(delUserMatch[1], 10);
        if (targetUserId === user.id) {
          return sendJson(res, 400, { success: false, message: 'You cannot delete your own admin account' });
        }
        await db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);
        return sendJson(res, 200, { success: true, message: 'User account deleted successfully' });
      }
    }

    // --- USER / STUDENT ENDPOINTS ---
    if (pathname.startsWith('/api/user/')) {
      if (!user) {
        return sendJson(res, 401, { success: false, message: 'Authentication required' });
      }

      // GET /api/user/exams (List published exams with student's attempt status)
      if (pathname === '/api/user/exams' && method === 'GET') {
        const exams = await db.prepare(`
          SELECT e.id, e.title, e.description, e.subject, e.duration_minutes, e.pass_percentage,
                 (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as question_count,
                 (SELECT COUNT(*) FROM submissions s WHERE s.exam_id = e.id AND s.user_id = ?) as student_attempts,
                 (SELECT MAX(s.percentage) FROM submissions s WHERE s.exam_id = e.id AND s.user_id = ?) as best_percentage
          FROM exams e
          WHERE e.is_active = 1
          ORDER BY e.id DESC
        `).all(user.id, user.id);

        return sendJson(res, 200, { success: true, exams });
      }

      // GET /api/user/exams/:id/start (Fetch questions WITHOUT correct answers)
      const startExamMatch = pathname.match(/^\/api\/user\/exams\/(\d+)\/start$/);
      if (startExamMatch && method === 'GET') {
        const examId = parseInt(startExamMatch[1], 10);
        const exam = await db.prepare('SELECT id, title, description, subject, duration_minutes, pass_percentage FROM exams WHERE id = ?').get(examId);

        if (!exam) {
          return sendJson(res, 404, { success: false, message: 'Exam not found' });
        }

        // Fetch questions without exposing correct_option or explanation
        const questions = await db.prepare(`
          SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, marks
          FROM questions
          WHERE exam_id = ?
          ORDER BY id ASC
        `).all(examId);

        if (questions.length === 0) {
          return sendJson(res, 400, { success: false, message: 'This exam does not have any questions yet' });
        }

        return sendJson(res, 200, {
          success: true,
          exam,
          questions
        });
      }

      // POST /api/user/exams/:id/submit (Submit answers and calculate score)
      const submitExamMatch = pathname.match(/^\/api\/user\/exams\/(\d+)\/submit$/);
      if (submitExamMatch && method === 'POST') {
        const examId = parseInt(submitExamMatch[1], 10);
        const exam = await db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);

        if (!exam) {
          return sendJson(res, 404, { success: false, message: 'Exam not found' });
        }

        const body = await parseBody(req);
        const studentAnswers = body.answers || {}; // { [questionId]: "A" | "B" | "C" | "D" }

        // Fetch actual questions with correct answers
        const questions = await db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC').all(examId);

        let correctCount = 0;
        let wrongCount = 0;
        let answeredCount = 0;
        let totalScore = 0;
        let totalMarks = 0;

        const reviewDetails = questions.map(q => {
          const userChoice = studentAnswers[q.id] || null;
          const isAnswered = userChoice !== null && userChoice !== undefined && userChoice !== '';
          const isCorrect = isAnswered && userChoice.toUpperCase() === q.correct_option.toUpperCase();
          const marks = q.marks || 1;
          totalMarks += marks;

          if (isAnswered) {
            answeredCount++;
            if (isCorrect) {
              correctCount++;
              totalScore += marks;
            } else {
              wrongCount++;
            }
          }

          return {
            questionId: q.id,
            questionText: q.question_text,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            userChoice,
            correctOption: q.correct_option,
            isCorrect,
            isAnswered,
            marks,
            explanation: q.explanation || ''
          };
        });

        const totalQuestions = questions.length;
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 1000) / 10 : 0;
        const status = percentage >= exam.pass_percentage ? 'PASSED' : 'FAILED';

        // Calculate attempt number & time taken
        const prevAttempts = await db.prepare('SELECT COUNT(*) as count FROM submissions WHERE exam_id = ? AND user_id = ?').get(examId, user.id);
        const attemptNumber = (prevAttempts ? Number(prevAttempts.count) : 0) + 1;
        const timeTakenSeconds = parseInt(body.time_taken_seconds, 10) || 0;

        // Store submission
        const insertSubmission = db.prepare(`
          INSERT INTO submissions (
            exam_id, user_id, attempt_number, time_taken_seconds, total_questions, answered_count,
            correct_count, wrong_count, score, total_marks, percentage, status, answers_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const subResult = await insertSubmission.run(
          examId,
          user.id,
          attemptNumber,
          timeTakenSeconds,
          totalQuestions,
          answeredCount,
          correctCount,
          wrongCount,
          totalScore,
          totalMarks,
          percentage,
          status,
          JSON.stringify(studentAnswers)
        );

        const submissionId = subResult.lastInsertRowid;

        // Store granular question responses in submission_answers table
        const insertAnswer = db.prepare(`
          INSERT INTO submission_answers (submission_id, question_id, selected_option, is_correct, marks_awarded)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const r of reviewDetails) {
          await insertAnswer.run(
            submissionId,
            r.questionId,
            r.userChoice || null,
            r.isCorrect ? 1 : 0,
            r.isCorrect ? r.marks : 0
          );
        }

        return sendJson(res, 200, {
          success: true,
          submissionId,
          result: {
            examTitle: exam.title,
            attemptNumber,
            timeTakenSeconds,
            totalQuestions,
            answeredCount,
            unansweredCount: totalQuestions - answeredCount,
            correctCount,
            wrongCount,
            totalScore,
            totalMarks,
            percentage,
            passPercentage: exam.pass_percentage,
            status,
            reviewDetails
          }
        });
      }

      // GET /api/user/profile-stats (Candidate comprehensive metrics)
      if (pathname === '/api/user/profile-stats' && method === 'GET') {
        const stats = await db.prepare(`
          SELECT
            COUNT(s.id) as total_attempts,
            COALESCE(SUM(CASE WHEN s.status = 'PASSED' THEN 1 ELSE 0 END), 0) as passed_attempts,
            COALESCE(SUM(CASE WHEN s.status = 'FAILED' THEN 1 ELSE 0 END), 0) as failed_attempts,
            ROUND(CAST(COALESCE(AVG(s.percentage), 0) AS NUMERIC), 1) as avg_percentage,
            COALESCE(MAX(s.percentage), 0) as best_percentage
          FROM submissions s
          WHERE s.user_id = ?
        `).get(user.id);

        return sendJson(res, 200, { success: true, stats });
      }

      // GET /api/user/results (Get current student's exam history)
      if (pathname === '/api/user/results' && method === 'GET') {
        const results = await db.prepare(`
          SELECT s.*, e.title as exam_title, e.subject, e.pass_percentage
          FROM submissions s
          JOIN exams e ON s.exam_id = e.id
          WHERE s.user_id = ?
          ORDER BY s.submitted_at DESC
        `).all(user.id);

        return sendJson(res, 200, { success: true, results });
      }

      // GET /api/user/results/:id (Get detailed review of a submission)
      const reviewResultMatch = pathname.match(/^\/api\/user\/results\/(\d+)$/);
      if (reviewResultMatch && method === 'GET') {
        const submissionId = parseInt(reviewResultMatch[1], 10);
        const sub = await db.prepare(`
          SELECT s.*, e.title as exam_title, e.subject, e.pass_percentage
          FROM submissions s
          JOIN exams e ON s.exam_id = e.id
          WHERE s.id = ? AND (s.user_id = ? OR ? IN ('admin', 'examiner'))
        `).get(submissionId, user.id, user.role);

        if (!sub) {
          return sendJson(res, 404, { success: false, message: 'Result not found' });
        }

        const answers = JSON.parse(sub.answers_json || '{}');
        const questions = await db.prepare('SELECT * FROM questions WHERE exam_id = ? ORDER BY id ASC').all(sub.exam_id);

        const reviewDetails = questions.map(q => {
          const userChoice = answers[q.id] || null;
          const isAnswered = userChoice !== null && userChoice !== undefined && userChoice !== '';
          const isCorrect = isAnswered && userChoice.toUpperCase() === q.correct_option.toUpperCase();

          return {
            questionId: q.id,
            questionText: q.question_text,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            userChoice,
            correctOption: q.correct_option,
            isCorrect,
            isAnswered,
            marks: q.marks,
            explanation: q.explanation || ''
          };
        });

        return sendJson(res, 200, {
          success: true,
          submission: sub,
          reviewDetails
        });
      }
    }

    // ==========================================
    // STATIC ASSETS SERVING
    // ==========================================
    if (method === 'GET') {
      let targetFile = pathname;
      if (targetFile === '/' || targetFile === '') {
        targetFile = '/index.html';
      }
      return serveStaticFile(req, res, targetFile);
    }

    // Default 404
    sendJson(res, 404, { success: false, message: 'API endpoint not found' });

  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, 500, { success: false, message: 'Internal server error: ' + error.message });
  }
}

// HTTP Server
const server = http.createServer(handler);

// Start Server if run directly via `node server.js`
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  ExamPulse - Mini Online Examination Portal is LIVE!   `);
    console.log(`  URL: http://localhost:${PORT} (or http://127.0.0.1:${PORT})`);
    console.log(`=======================================================`);
    console.log(`  Demo Accounts:                                        `);
    console.log(`  - Admin:    username 'admin'    / password 'admin123'   `);
    console.log(`  - Examiner: username 'examiner' / password 'examiner123'`);
    console.log(`  - Student:  username 'student'  / password 'student123' `);
    console.log(`=======================================================`);
  });
}

// Export handler and server for Vercel Serverless Functions and testing
module.exports = handler;
module.exports.handler = handler;
module.exports.server = server;
module.exports.PORT = PORT;
module.exports.ensureDbReady = ensureDbReady;
