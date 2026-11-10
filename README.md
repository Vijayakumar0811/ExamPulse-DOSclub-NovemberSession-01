# ExamPulse - Mini Online Examination Portal (MCQ)

A lightweight, modern, full-stack Online Examination Portal featuring an **Admin Dashboard** (create & manage exams, build MCQ questions, monitor student performance), **Examiner Portal** (manage questions, review submissions), and **User/Student Dashboard** (browse exams, take timed assessments with live countdown timer, and review performance).

Built with **Node.js**, **Neon PostgreSQL Hosting** (optimized for **Vercel** serverless deployment), with seamless local SQLite fallback for offline development.

---

## 🚀 Key Features

### 👨‍💼 Admin Dashboard (Full Control)
- **Role Control & User Management**:
  - Exclusive authority to create **Examiner accounts**, Student accounts, or additional Administrators.
  - View all registered user profiles with attempt aggregations and delete accounts when needed.
- **Examinations & Question Bank Management**:
  - Create and manage exams, configure duration and pass mark criteria.
  - Add, edit, and delete questions with 4 options, marks, and explanations.
  - Delete examinations with cascading clean-up.
- **Submissions & Results Audit**:
  - Real-time audit log of all completed exams with candidate names, scores, percentages, and `PASSED`/`FAILED` status badges.
  - One-click detailed review to inspect student answer choices vs correct answers.

---

### 🧑‍🏫 Examiner Portal
- **View All Submissions**:
  - Full access to review candidate exam submissions, attempt scores, percentages, and pass/fail statuses.
  - Detailed solution audit to inspect individual student responses and rationales.
- **Questions Bank Management**:
  - **Add Questions**: Add new MCQ questions to any active examination.
  - **Edit Questions**: Full modal interface to edit question statements, options A-D, correct answer key, marks, and explanation.
  - Delete obsolete questions.
- **Access Boundaries**:
  - Protected from modifying or deleting user accounts or deleting examinations (reserved for Admin).

---

### 🎓 Candidate / Student Dashboard
- **Available Examinations Grid**:
  - Clean card layout with subject tags, test duration, number of questions, passing mark requirement, and past best score badges.
- **Timed Assessment Arena (Focused Exam Mode)**:
  - **Live Countdown Timer**: Visual countdown timer that triggers warning alerts when time is low, and **auto-submits** when time reaches `00:00`.
  - **Question Palette Sidebar**: Numbered navigation buttons (1, 2, 3...) color-coded by state:
    - 🟩 **Green**: Answered
    - 🟦 **Blue**: Current Question
    - ⬜ **Gray**: Unanswered
  - **Interactive MCQ Cards**: Clickable options (A, B, C, D) with high-contrast active states.
  - Controls for "Previous", "Next", "Clear Selection", and "Submit Exam".
  - **Submission Confirmation Dialog**: Summarizes answered vs unanswered questions before final submission.
- **Anti-Cheating Security**:
  - Candidate exam sessions only receive question text and options—**correct options and explanations are never sent to the browser during the test**.
  - All grading and score computations occur strictly on the backend.
- **Instant Scorecard & Detailed Review**:
  - Instant score calculation (% and marks scored out of total).
  - Breakdown of Correct, Wrong, and Unanswered questions.
  - Detailed question-by-question review highlighting candidate choices, correct answers, and full explanations.
- **Past Attempts & Score History**: Complete list of all previously taken exams with retake options.

---

### 🔑 Default Demo Credentials

| Role | Username | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full control: Add examiners, manage all users, exams & submissions |
| **Examiner** | `examiner` | `examiner123` | View all candidate submissions, add & edit questions |
| **Student** | `student` | `student123` | Browse tests, attend timed exams, view personal scores |
| **Student (Alt)** | `priya` | `priya123` | Additional candidate profile with sample history |

*Note: Public self-registration is strictly restricted to **Student / Candidate** accounts. Examiner accounts are created and managed exclusively by Administrators.*

---

## 🐘 Neon PostgreSQL & Vercel Hosting

This project is fully converted to **Neon – PostgreSQL hosting** using `@neondatabase/serverless` connection pooling, making it 100% cloud-ready for **Vercel** serverless hosting.

### 1. Create a Free Neon PostgreSQL Database
1. Go to [https://neon.tech](https://neon.tech) and sign up (free tier available).
2. Click **Create Project** (e.g. name it `exampulse-db`).
3. Under your project **Dashboard**, locate the **Connection Details** box.
4. Copy the connection string. It will look like:
   ```
   postgresql://neondb_owner:npg_xxxxxx@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Local Setup with Neon
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your Neon connection string into `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://neondb_owner:your_password@ep-xxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Initialize and seed your Neon database with default users and exams:
   ```bash
   npm run db:setup
   ```
4. *(Optional)* If you already have existing local SQLite data in `exam_portal.db` that you want to transfer to Neon:
   ```bash
   npm run db:migrate
   ```

*(Note: If `DATABASE_URL` is omitted, the project automatically falls back to local SQLite so offline testing and development always work seamlessly).*

---

## ⚡ Deploying to Vercel (Step-by-Step)

The project includes `vercel.json` and `api/index.js` preconfigured for Vercel Serverless deployment.

### Option A: Deploy via Vercel Dashboard & GitHub (Recommended)
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [https://vercel.com](https://vercel.com) and log in.
3. Click **Add New... > Project** and select your repository.
4. In the **Environment Variables** section, add:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Neon PostgreSQL connection string (from step 1 above).
5. Click **Deploy**!
   - Vercel automatically deploys your static frontend and serverless API functions.
   - The database schema and seed accounts (admin, examiner, student, and sample exams) initialize automatically on the first request!

### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Log in and deploy
vercel

# Add your Neon connection string to Vercel environment variables
vercel env add DATABASE_URL

# Deploy to production
vercel --prod
```

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js (`node:http`, `node:crypto`)
- **Database Engine**:
  - **Production / Cloud**: **Neon PostgreSQL** via `@neondatabase/serverless` (connection-pooled over HTTP/WebSocket for serverless functions).
  - **Local Development**: Automatic fallback to SQLite (`node:sqlite`) when offline or before setting `DATABASE_URL`.
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, and responsive CSS3 (no frameworks, no bundlers, zero bloat).
- **Hosting Platform**: Vercel Serverless Functions (`api/index.js`) + Edge CDN for static assets.
- **Authentication**: Sliding-session Bearer Tokens with native `scrypt` password hashing and constant-time buffer comparison.

---

## 🏁 How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000)

### 4. Run Automated Test Suite
An automated end-to-end test suite validates all 22 operations (authentication, role boundaries, exam creation, anti-cheating question sanitization, scoring, and relational attempt records):
```bash
npm test
```

---

## 📁 Project Structure

```
Mini examination portal/
├── api/
│   └── index.js             # Vercel serverless function entrypoint
├── scripts/
│   ├── setup_neon.js        # Standalone Neon DB connection test & table seeder
│   └── migrate_sqlite_to_neon.js # One-click data migration from SQLite to Neon
├── public/                  # Frontend client assets (Unchanged UI/UX)
│   ├── index.html           # SPA markup for Admin, Examiner, Student dashboards
│   ├── style.css            # Responsive, modern stylesheet
│   └── app.js               # Frontend state, countdown timer, API interaction
├── .env.example             # Environment template for Neon DATABASE_URL
├── vercel.json              # Vercel routing and rewrite configuration
├── db.js                    # Neon PostgreSQL adapter + SQLite fallback
├── server.js                # Core HTTP server & REST API endpoints
├── test_runner.js           # 22-test automated test suite
└── package.json             # Scripts & dependencies
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login` - Authenticate with username and password.
- `POST /api/auth/register` - Register a new candidate account.
- `POST /api/auth/demo-login` - Instant one-click demo login (`admin`, `examiner`, or `student`).
- `GET /api/auth/me` - Retrieve authenticated user session info.
- `POST /api/auth/logout` - Invalidate session token.

### Admin Endpoints
- `GET /api/admin/stats` - Total exams, questions, students, submissions, pass rate.
- `GET /api/admin/exams` - List all created exams with question and submission counts.
- `POST /api/admin/exams` - Create a new exam with batch MCQ questions.
- `GET /api/admin/exams/:id` - Get exam details and questions with answers.
- `PUT /api/admin/exams/:id` - Update exam metadata.
- `DELETE /api/admin/exams/:id` - Delete an exam (Admin only).
- `POST /api/admin/exams/:id/questions` - Add a question to an exam.
- `GET /api/admin/questions/:id` - Get single question details for editing.
- `PUT /api/admin/questions/:id` - Edit question options, answer, and explanation.
- `DELETE /api/admin/questions/:id` - Delete a question.
- `GET /api/admin/questions` - List questions (optionally filtered by `exam_id`).
- `GET /api/admin/answers` - List granular question answers from submissions.
- `GET /api/admin/submissions` - Audit all student attempts and scores.
- `GET /api/admin/users` - List user accounts with attempt statistics (Admin only).
- `POST /api/admin/users` - Create examiner or student account (Admin only).
- `GET /api/admin/users/:id/attempts` - View specific candidate's exam attempts.
- `DELETE /api/admin/users/:id` - Delete a user account (Admin only).

### Student Endpoints
- `GET /api/user/exams` - List available published exams with student's attempt status.
- `GET /api/user/exams/:id/start` - Start exam session (questions sanitized without answers).
- `POST /api/user/exams/:id/submit` - Submit answers, calculate score, and return detailed review.
- `GET /api/user/profile-stats` - Candidate comprehensive metrics.
- `GET /api/user/results` - Get candidate's past exam submission history.
- `GET /api/user/results/:id` - Get detailed solution review for a past attempt.
