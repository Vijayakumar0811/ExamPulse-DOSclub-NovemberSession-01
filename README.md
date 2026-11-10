# ExamPulse - Mini Online Examination Portal (MCQ)

A lightweight, modern, full-stack Online Examination Portal featuring an **Admin Dashboard** (create & manage exams, build MCQ questions, monitor student performance) and a **User/Student Dashboard** (browse exams, take timed assessments, view live countdown timer, and review performance).

Built with **Node.js**, native **SQLite (`node:sqlite`)**, and modern responsive CSS/JavaScript with **zero external npm dependencies** required to run!

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
  - All grading and score computations occur strictly on the backend against SQLite.
- **Instant Scorecard & Detailed Review**:
  - Instant score calculation (% and marks scored out of total).
  - Breakdown of Correct, Wrong, and Unanswered questions.
  - Detailed question-by-question review highlighting candidate choices, correct answers, and full explanations.
- **Past Attempts & Score History**: Complete list of all previously taken exams with retake options.

---

### 🔑 Default Credentials

| Role | Username | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full control: Add examiners, manage all users, exams & submissions |
| **Examiner** | `examiner` | `examiner123` | View all candidate submissions, add & edit questions |
| **Student** | `student` | `student123` | Browse tests, attend timed exams, view personal scores |
| **Student (Alt)** | `priya` | `priya123` | Additional candidate profile with sample history |

*Note: Public self-registration is strictly restricted to **Student / Candidate** accounts. Examiner accounts are created and managed exclusively by Administrators.*

---

## 🗄️ Database Architecture & Storage (SQLite)

**SQLite is 100% capable of handling all application data permanently.** It operates as a full ACID-compliant relational SQL engine stored directly in `exam_portal.db` without requiring any cloud services (like Firebase), external servers, or network configuration.

### Relational Tables in `exam_portal.db`:

1. **`users` Table (User Accounts)**
   - `id`: Auto-incrementing primary key.
   - `username`: Unique username for authentication.
   - `password_hash`: Salted `scrypt` cryptographic hash.
   - `full_name`: Candidate or examiner's display name.
   - `email`: Optional email address.
   - `role`: Role constraint (`admin`, `examiner`, or `student`).
   - `created_at`: Account registration timestamp.

2. **`sessions` Table (Active Sessions)**
   - `token`: Unique UUID Bearer session token.
   - `user_id`: Foreign key reference to `users(id)`.
   - `expires_at`: Millisecond expiration timestamp.

3. **`exams` Table (Examinations)**
   - `id`: Primary key.
   - `title`, `description`, `subject`: Exam metadata.
   - `duration_minutes`: Timer duration.
   - `pass_percentage`: Passing grade criteria.
   - `created_by`: Foreign key reference to examiner `users(id)`.
   - `created_at`: Creation date.

4. **`questions` Table (MCQ Bank)**
   - `id`: Primary key.
   - `exam_id`: Foreign key reference to `exams(id)`.
   - `question_text`: Problem statement.
   - `option_a`, `option_b`, `option_c`, `option_d`: Multiple-choice options.
   - `correct_option`: Correct answer constraint (`A`, `B`, `C`, or `D`).
   - `marks`: Weightage.
   - `explanation`: Detailed solution rationale.

5. **`submissions` Table (User Attempts & Exam History)**
   - `id`: Primary key.
   - `exam_id`: Foreign key reference to `exams(id)`.
   - `user_id`: Foreign key reference to `users(id)`.
   - `attempt_number`: Sequential attempt counter (Attempt #1, Attempt #2, etc.).
   - `time_taken_seconds`: Exact duration the student spent on the test.
   - `total_questions`, `answered_count`, `correct_count`, `wrong_count`: Metric counts.
   - `score`, `total_marks`, `percentage`: Final calculated grading.
   - `status`: Outcome (`PASSED` or `FAILED`).
   - `answers_json`: Snapshot of student choices.
   - `submitted_at`: Completion timestamp.

6. **`submission_answers` Table (Granular Per-Question Response Records)**
   - `id`: Primary key.
   - `submission_id`: Foreign key to `submissions(id)`.
   - `question_id`: Foreign key to `questions(id)`.
   - `selected_option`: Option chosen by candidate (`A`, `B`, `C`, `D`, or `NULL`).
   - `is_correct`: Boolean flag (`1` for correct, `0` for incorrect).
   - `marks_awarded`: Marks earned for this question.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js (`node:http`, `node:crypto`)
- **Database**: SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`), automatically initialized and seeded with sample exams upon first startup.
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, and modern CSS3 (Custom Properties, Flexbox, CSS Grid, mobile-responsive layout).
- **Authentication**: Bearer Token & Session Management with cryptographically secure salts and `scrypt` password hashing.
- **Zero External Dependencies**: Runs directly on Node.js v22+ without needing `npm install` or native compilers!

---

## 🏁 How to Run

### 1. Start the Server
Open terminal in this project directory and run:

```bash
node server.js
```

Or:

```bash
npm start
```

### 2. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Run Automated Tests
An end-to-end test suite is included that validates all 10 API endpoints, authentication, exam creation, anti-cheating sanitization, and automated scoring:

```bash
npm test
```

---

## 📁 Project Structure

```
Mini examination portal/
├── db.js             # SQLite database schema, connections, seeds & crypto helpers
├── server.js         # HTTP server, routing, REST API endpoints & static file server
├── test_runner.js    # Automated end-to-end test suite
├── package.json      # Project metadata & npm scripts
├── README.md         # Documentation
└── public/           # Frontend client assets
    ├── index.html    # SPA markup with Admin, Student & Exam Arena views
    ├── style.css     # Modern, high-contrast, responsive stylesheet
    └── app.js        # Frontend state management, countdown timer & API handlers
```

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login` - Authenticate with username and password.
- `POST /api/auth/register` - Create a new student or admin account.
- `POST /api/auth/demo-login` - Instant single-click authentication for demo testing (`admin` or `student`).
- `GET /api/auth/me` - Retrieve current session information.
- `POST /api/auth/logout` - Invalidate active session.

### Admin Endpoints
- `GET /api/admin/stats` - Total exams, questions, students, submissions, pass rate.
- `GET /api/admin/exams` - List all created exams with question and submission counts.
- `POST /api/admin/exams` - Create a new exam with batch MCQ questions.
- `GET /api/admin/exams/:id` - Get exam details and questions with correct answers.
- `PUT /api/admin/exams/:id` - Update exam metadata.
- `DELETE /api/admin/exams/:id` - Delete an exam.
- `POST /api/admin/exams/:id/questions` - Add a question to an existing exam.
- `DELETE /api/admin/questions/:id` - Delete a question.
- `GET /api/admin/submissions` - Audit all student attempts and scores.

### Student Endpoints
- `GET /api/user/exams` - List available published exams with student's attempt history.
- `GET /api/user/exams/:id/start` - Start exam session (questions sanitized without answers).
- `POST /api/user/exams/:id/submit` - Submit candidate answers, calculate score, and return detailed review.
- `GET /api/user/results` - Get candidate's past exam submission history.
- `GET /api/user/results/:id` - Get detailed solution review for a past attempt.
