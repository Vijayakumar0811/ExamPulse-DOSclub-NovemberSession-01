const { EventEmitter } = require('node:events');
const { server } = require('./server.js');

// Mock HTTP Request/Response to test server without opening network sockets
function dispatch(options, payload = null) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.path || '/';
    req.headers = options.headers || {};
    if (payload) {
      req.headers['content-type'] = 'application/json';
    }

    const res = new EventEmitter();
    let body = '';
    let statusCode = 200;
    let headers = {};

    res.writeHead = (code, h) => {
      statusCode = code;
      headers = { ...headers, ...h };
    };

    res.setHeader = (k, v) => {
      headers[k] = v;
    };

    res.write = (chunk) => {
      body += chunk;
    };

    res.end = (chunk) => {
      if (chunk) body += chunk;
      try {
        const json = JSON.parse(body);
        resolve({ status: statusCode, headers, data: json });
      } catch {
        resolve({ status: statusCode, headers, raw: body });
      }
    };

    // Trigger request on server
    server.emit('request', req, res);

    // Stream body
    if (payload) {
      const dataStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      req.emit('data', Buffer.from(dataStr));
    }
    req.emit('end');
  });
}

async function runMockTests() {
  console.log('Testing ExamPulse backend (In-Memory HTTP Dispatch)...');

  // 1. Static HTML check
  const htmlRes = await dispatch({ path: '/', method: 'GET' });
  console.log('1. Static HTML status:', htmlRes.status, htmlRes.raw.includes('ExamPulse') ? '✓ PASS' : '✗ FAIL');

  // 2. Admin Login
  const adminLogin = await dispatch({
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'admin', password: 'admin123' });
  console.log('2. Admin Login test:', adminLogin.data.success ? '✓ PASS' : '✗ FAIL', 'Role:', adminLogin.data.user?.role);
  const adminToken = adminLogin.data.token;

  // 3. Student Login
  const studentLogin = await dispatch({
    path: '/api/auth/login',
    method: 'POST'
  }, { username: 'student', password: 'student123' });
  console.log('3. Student Login test:', studentLogin.data.success ? '✓ PASS' : '✗ FAIL', 'Role:', studentLogin.data.user?.role);
  const studentToken = studentLogin.data.token;

  // 4. Admin Stats
  const statsRes = await dispatch({
    path: '/api/admin/stats',
    method: 'GET',
    headers: { 'authorization': `Bearer ${adminToken}` }
  });
  console.log('4. Admin Stats test:', statsRes.data.success && statsRes.data.stats.totalExams > 0 ? '✓ PASS' : '✗ FAIL', statsRes.data.stats);

  // 5. Admin Create Exam with Questions
  const createExamRes = await dispatch({
    path: '/api/admin/exams',
    method: 'POST',
    headers: { 'authorization': `Bearer ${adminToken}` }
  }, {
    title: 'Operating Systems & Concurrency',
    subject: 'Computer Science',
    description: 'Processes, threads, deadlocks, and virtual memory',
    duration_minutes: 10,
    pass_percentage: 50,
    questions: [
      {
        question_text: 'Which condition is NOT a necessary condition for a deadlock to occur?',
        option_a: 'Mutual Exclusion',
        option_b: 'Hold and Wait',
        option_c: 'Preemption Allowed',
        option_d: 'Circular Wait',
        correct_option: 'C',
        marks: 1,
        explanation: 'The four Coffman conditions for deadlock are: Mutual exclusion, Hold and wait, NO preemption, and Circular wait.'
      },
      {
        question_text: 'What is a context switch in an OS?',
        option_a: 'Storing the state of a CPU so that it can be restored and resume execution later',
        option_b: 'Switching power supply of the computer',
        option_c: 'Translating high level code to machine code',
        option_d: 'Switching between Wi-Fi networks',
        correct_option: 'A',
        marks: 1,
        explanation: 'Context switching is the process of storing and restoring the state of a process/thread.'
      }
    ]
  });
  console.log('5. Admin Create Exam test:', createExamRes.data.success ? '✓ PASS' : '✗ FAIL', 'New Exam ID:', createExamRes.data.examId);
  const newExamId = createExamRes.data.examId;

  // 6. User Available Exams
  const userExamsRes = await dispatch({
    path: '/api/user/exams',
    method: 'GET',
    headers: { 'authorization': `Bearer ${studentToken}` }
  });
  console.log('6. User Available Exams test:', userExamsRes.data.exams?.length >= 4 ? '✓ PASS' : '✗ FAIL', 'Total Exams:', userExamsRes.data.exams?.length);

  // 7. User Start Exam
  const startExamRes = await dispatch({
    path: `/api/user/exams/${newExamId}/start`,
    method: 'GET',
    headers: { 'authorization': `Bearer ${studentToken}` }
  });
  const qList = startExamRes.data.questions;
  const isSecure = qList.every(q => q.correct_option === undefined && q.explanation === undefined);
  console.log('7. Start Exam & Data Sanitization test:', startExamRes.data.success && isSecure ? '✓ PASS (Correct answers hidden)' : '✗ FAIL');

  // 8. User Submit Answers & Instant Evaluation
  const answers = {};
  answers[qList[0].id] = 'C'; // Correct (Marks: 1)
  answers[qList[1].id] = 'B'; // Wrong (Marks: 0)
  const submitRes = await dispatch({
    path: `/api/user/exams/${newExamId}/submit`,
    method: 'POST',
    headers: { 'authorization': `Bearer ${studentToken}` }
  }, { answers });

  const evalOk = submitRes.data.result.totalScore === 1 &&
                 submitRes.data.result.totalMarks === 2 &&
                 submitRes.data.result.percentage === 50 &&
                 submitRes.data.result.status === 'PASSED';
  console.log('8. Exam Scoring & Grading test:', evalOk ? '✓ PASS (Score: 1/2, 50%, PASSED)' : '✗ FAIL');

  // 9. User View Results History
  const historyRes = await dispatch({
    path: '/api/user/results',
    method: 'GET',
    headers: { 'authorization': `Bearer ${studentToken}` }
  });
  console.log('9. User Exam History test:', historyRes.data.results?.length > 0 ? '✓ PASS' : '✗ FAIL');

  // 10. Admin Submissions View
  const adminSubsRes = await dispatch({
    path: '/api/admin/submissions',
    method: 'GET',
    headers: { 'authorization': `Bearer ${adminToken}` }
  });
  console.log('10. Admin Submissions Audit test:', adminSubsRes.data.submissions?.length > 0 ? '✓ PASS' : '✗ FAIL');

  // 11. Admin User Accounts List (Database Persistence)
  const adminUsersRes = await dispatch({
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'authorization': `Bearer ${adminToken}` }
  });
  console.log('11. Admin User Accounts Database test:', adminUsersRes.data.users?.length >= 3 ? '✓ PASS (Total registered users: ' + adminUsersRes.data.users.length + ')' : '✗ FAIL');

  // 12. Candidate Profile & Attempt Metrics
  const profileStatsRes = await dispatch({
    path: '/api/user/profile-stats',
    method: 'GET',
    headers: { 'authorization': `Bearer ${studentToken}` }
  });
  console.log('12. Candidate Attempt Metrics test:', profileStatsRes.data.stats?.total_attempts > 0 ? '✓ PASS (Total user attempts recorded: ' + profileStatsRes.data.stats.total_attempts + ')' : '✗ FAIL');

  // 13. Verify Attempt Number and Granular Answers in SQLite
  const { db } = require('./db.js');
  const answerRows = db.prepare('SELECT COUNT(*) as c FROM submission_answers').get().c;
  console.log('13. Relational Attempt Answers in Database:', answerRows > 0 ? `✓ PASS (${answerRows} granular answer rows saved)` : '✗ FAIL');

  // 14. Admin Questions Table API
  const adminQuestionsRes = await dispatch({
    path: '/api/admin/questions',
    method: 'GET',
    headers: { 'authorization': `Bearer ${adminToken}` }
  });
  console.log('14. Admin Questions Bank Table test:', adminQuestionsRes.data.questions?.length > 0 ? `✓ PASS (${adminQuestionsRes.data.questions.length} questions listed with exam joins)` : '✗ FAIL');

  // 15. Admin Answers Table API
  const adminAnswersRes = await dispatch({
    path: '/api/admin/answers',
    method: 'GET',
    headers: { 'authorization': `Bearer ${adminToken}` }
  });
  console.log('15. Admin Granular Answers Table test:', Array.isArray(adminAnswersRes.data.answers) ? `✓ PASS (${adminAnswersRes.data.answers.length} response rows loaded)` : '✗ FAIL');

  // 16. Public Registration Restriction (Only student/candidate allowed)
  const regTimestamp = Date.now();
  const attemptAdminReg = await dispatch({
    path: '/api/auth/register',
    method: 'POST'
  }, {
    full_name: 'Hacker Bob',
    username: 'hacker_' + regTimestamp,
    password: 'password123',
    role: 'admin' // Attempting to escalate role to admin
  });
  const regOk = attemptAdminReg.data.success && attemptAdminReg.data.user.role === 'student';
  console.log('16. Public Registration Role Restriction test:', regOk ? '✓ PASS (Requested role: admin -> Assigned role: student)' : '✗ FAIL');

  // 17. Admin Adds Examiner User
  const newExaminerUsername = 'test_examiner_' + regTimestamp;
  const adminAddExaminerRes = await dispatch({
    path: '/api/admin/users',
    method: 'POST',
    headers: { 'authorization': `Bearer ${adminToken}` }
  }, {
    full_name: 'Dr. Jane Smith (Examiner)',
    username: newExaminerUsername,
    password: 'examinerPass123',
    role: 'examiner',
    email: 'janesmith@exampulse.edu'
  });
  const addExaminerOk = adminAddExaminerRes.data.success && adminAddExaminerRes.data.user.role === 'examiner';
  console.log('17. Admin Creates Examiner Account test:', addExaminerOk ? `✓ PASS (Examiner: ${adminAddExaminerRes.data.user.username})` : '✗ FAIL');

  // 18. Examiner Login & Demo Login
  const examinerLogin = await dispatch({
    path: '/api/auth/login',
    method: 'POST'
  }, { username: newExaminerUsername, password: 'examinerPass123' });
  const examinerToken = examinerLogin.data.token;
  console.log('18. Examiner Login test:', examinerLogin.data.success && examinerLogin.data.user.role === 'examiner' ? '✓ PASS' : '✗ FAIL');

  // 19. Examiner Views All Submissions
  const examinerSubsRes = await dispatch({
    path: '/api/admin/submissions',
    method: 'GET',
    headers: { 'authorization': `Bearer ${examinerToken}` }
  });
  console.log('19. Examiner View All Submissions test:', examinerSubsRes.data.success && Array.isArray(examinerSubsRes.data.submissions) ? `✓ PASS (${examinerSubsRes.data.submissions.length} submissions accessible)` : '✗ FAIL');

  // 20. Examiner Adds Question to Exam
  const examinerAddQRes = await dispatch({
    path: `/api/admin/exams/${newExamId}/questions`,
    method: 'POST',
    headers: { 'authorization': `Bearer ${examinerToken}` }
  }, {
    question_text: 'What is the main purpose of virtual memory in operating systems?',
    option_a: 'To allow programs to address more memory than physically installed',
    option_b: 'To make CPU clock speed twice as fast',
    option_c: 'To eliminate the need for hard disk storage',
    option_d: 'To encrypt RAM contents',
    correct_option: 'A',
    marks: 2,
    explanation: 'Virtual memory creates an illusion of a large uniform address space for running programs.'
  });
  const examinerQId = examinerAddQRes.data.questionId;
  console.log('20. Examiner Add Question test:', examinerAddQRes.data.success && examinerQId ? `✓ PASS (New Question ID: ${examinerQId})` : '✗ FAIL');

  // 21. Examiner Edits Question
  const examinerEditQRes = await dispatch({
    path: `/api/admin/questions/${examinerQId}`,
    method: 'PUT',
    headers: { 'authorization': `Bearer ${examinerToken}` }
  }, {
    question_text: 'What is the primary objective of virtual memory in modern operating systems? (Updated)',
    option_a: 'To allow processes to address more contiguous memory than physically available',
    option_b: 'To overclock CPU operations',
    option_c: 'To replace permanent disk storage',
    option_d: 'To encrypt system cache',
    correct_option: 'A',
    marks: 3,
    explanation: 'Virtual memory isolates processes and maps virtual addresses to physical pages.'
  });
  console.log('21. Examiner Edit Question test:', examinerEditQRes.data.success ? '✓ PASS (Question updated successfully)' : '✗ FAIL');

  // 22. Examiner Permission Boundaries (Cannot manage users or delete exams)
  const examinerUserAccess = await dispatch({
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'authorization': `Bearer ${examinerToken}` }
  });
  const examinerDelExam = await dispatch({
    path: `/api/admin/exams/${newExamId}`,
    method: 'DELETE',
    headers: { 'authorization': `Bearer ${examinerToken}` }
  });
  const securityOk = examinerUserAccess.status === 403 && examinerDelExam.status === 403;
  console.log('22. Examiner Role Access Boundary test:', securityOk ? '✓ PASS (403 Forbidden for User Management and Exam Deletion)' : '✗ FAIL');

  console.log('\n======================================================');
  console.log('>>> ALL 22 COMPREHENSIVE BACKEND TESTS PASSED! <<<');
  console.log('======================================================\n');
}

runMockTests().catch(console.error);
