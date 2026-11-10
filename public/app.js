/**
 * ExamPulse - Frontend Application Logic
 */

// Application State
const state = {
  currentUser: null,
  token: null,
  activeExam: null,
  activeQuestions: [],
  currentQuestionIndex: 0,
  userAnswers: {}, // { [questionId]: "A" | "B" | "C" | "D" }
  timerInterval: null,
  secondsRemaining: 0,
  examStartTime: null,
  adminExams: [],
  studentExams: []
};

// DOM Elements
const elements = {
  // Navigation & User
  userNavActions: document.getElementById('user-nav-actions'),
  brandLogo: document.getElementById('brand-logo'),

  // Views
  viewAuth: document.getElementById('view-auth'),
  viewAdmin: document.getElementById('view-admin'),
  viewStudent: document.getElementById('view-student'),
  viewExamSession: document.getElementById('view-exam-session'),

  // Auth View
  tabBtnLogin: document.getElementById('tab-btn-login'),
  tabBtnRegister: document.getElementById('tab-btn-register'),
  formLogin: document.getElementById('form-login'),
  formRegister: document.getElementById('form-register'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  regFullname: document.getElementById('reg-fullname'),
  regEmail: document.getElementById('reg-email'),
  regUsername: document.getElementById('reg-username'),
  regPassword: document.getElementById('reg-password'),
  regRole: document.getElementById('reg-role'),
  btnAutofillAdmin: document.getElementById('btn-autofill-admin'),
  btnAutofillExaminer: document.getElementById('btn-autofill-examiner'),
  btnAutofillStudent: document.getElementById('btn-autofill-student'),

  // Admin Dashboard
  adminGreeting: document.getElementById('admin-greeting'),
  adminBadgeRole: document.getElementById('admin-badge-role'),
  adminSubtitle: document.getElementById('admin-subtitle'),
  btnNavCreateExam: document.getElementById('btn-nav-create-exam'),
  cardStatExams: document.getElementById('card-stat-exams'),
  cardStatQuestions: document.getElementById('card-stat-questions'),
  cardStatUsers: document.getElementById('card-stat-users'),
  cardStatSubmissions: document.getElementById('card-stat-submissions'),
  statTotalExams: document.getElementById('stat-total-exams'),
  statTotalQuestions: document.getElementById('stat-total-questions'),
  statTotalStudents: document.getElementById('stat-total-students'),
  statPassRate: document.getElementById('stat-pass-rate'),
  adminTabExams: document.getElementById('admin-tab-exams'),
  adminTabQuestions: document.getElementById('admin-tab-questions'),
  adminTabUsers: document.getElementById('admin-tab-users'),
  adminTabSubmissions: document.getElementById('admin-tab-submissions'),
  adminTabAnswers: document.getElementById('admin-tab-answers'),
  adminTabCreate: document.getElementById('admin-tab-create'),
  badgeExamCount: document.getElementById('badge-exam-count'),
  badgeQuestionCount: document.getElementById('badge-question-count'),
  badgeUsersCount: document.getElementById('badge-users-count'),
  badgeSubCount: document.getElementById('badge-sub-count'),
  badgeAnswersCount: document.getElementById('badge-answers-count'),
  adminSectionExams: document.getElementById('admin-section-exams'),
  adminSectionQuestions: document.getElementById('admin-section-questions'),
  adminSectionUsers: document.getElementById('admin-section-users'),
  adminSectionSubmissions: document.getElementById('admin-section-submissions'),
  adminSectionAnswers: document.getElementById('admin-section-answers'),
  adminSectionCreate: document.getElementById('admin-section-create'),
  adminExamsTableBody: document.getElementById('admin-exams-table-body'),
  adminQuestionsTableBody: document.getElementById('admin-questions-table-body'),
  adminUsersTableBody: document.getElementById('admin-users-table-body'),
  adminSubmissionsTableBody: document.getElementById('admin-submissions-table-body'),
  adminAnswersTableBody: document.getElementById('admin-answers-table-body'),
  filterExamSelect: document.getElementById('filter-exam-select'),
  btnRefreshQuestions: document.getElementById('btn-refresh-questions'),
  btnToolbarAddQuestion: document.getElementById('btn-toolbar-add-question'),

  // Admin Create Form
  formCreateExam: document.getElementById('form-create-exam'),
  examTitle: document.getElementById('exam-title'),
  examSubject: document.getElementById('exam-subject'),
  examDescription: document.getElementById('exam-description'),
  examDuration: document.getElementById('exam-duration'),
  examPassmark: document.getElementById('exam-passmark'),
  questionsBuilderList: document.getElementById('questions-builder-list'),
  btnAddQuestionBlock: document.getElementById('btn-add-question-block'),
  btnPrefillSampleQuestions: document.getElementById('btn-prefill-sample-questions'),
  btnCancelCreateExam: document.getElementById('btn-cancel-create-exam'),

  // Student Dashboard
  studentGreeting: document.getElementById('student-greeting'),
  studentTabAvailable: document.getElementById('student-tab-available'),
  studentTabHistory: document.getElementById('student-tab-history'),
  studentSectionAvailable: document.getElementById('student-section-available'),
  studentSectionHistory: document.getElementById('student-section-history'),
  studentExamsGrid: document.getElementById('student-exams-grid'),
  studentHistoryTableBody: document.getElementById('student-history-table-body'),
  badgeStudentExams: document.getElementById('badge-student-exams'),
  badgeStudentResults: document.getElementById('badge-student-results'),
  btnStudentViewHistory: document.getElementById('btn-student-view-history'),
  studentStatAttempts: document.getElementById('student-stat-attempts'),
  studentStatPassed: document.getElementById('student-stat-passed'),
  studentStatAvg: document.getElementById('student-stat-avg'),
  studentStatBest: document.getElementById('student-stat-best'),

  // Live Exam Arena
  arenaSubjectBadge: document.getElementById('arena-subject-badge'),
  arenaExamTitle: document.getElementById('arena-exam-title'),
  examTimerBox: document.getElementById('exam-timer-box'),
  examCountdown: document.getElementById('exam-countdown'),
  btnTriggerSubmitModal: document.getElementById('btn-trigger-submit-modal'),
  examProgressFill: document.getElementById('exam-progress-fill'),
  answeredCounterLabel: document.getElementById('answered-counter-label'),
  paletteGrid: document.getElementById('palette-grid'),
  currentQPill: document.getElementById('current-q-pill'),
  currentQMarks: document.getElementById('current-q-marks'),
  currentQText: document.getElementById('current-q-text'),
  currentQOptions: document.getElementById('current-q-options'),
  btnClearSelection: document.getElementById('btn-clear-selection'),
  btnPrevQuestion: document.getElementById('btn-prev-question'),
  btnNextQuestion: document.getElementById('btn-next-question'),

  // Modals
  modalSubmitConfirm: document.getElementById('modal-submit-confirm'),
  btnCloseSubmitModal: document.getElementById('btn-close-submit-modal'),
  btnCancelSubmit: document.getElementById('btn-cancel-submit'),
  btnConfirmFinalSubmit: document.getElementById('btn-confirm-final-submit'),
  modalAnsweredCount: document.getElementById('modal-answered-count'),
  modalUnansweredCount: document.getElementById('modal-unanswered-count'),
  modalTotalCount: document.getElementById('modal-total-count'),

  modalResultReview: document.getElementById('modal-result-review'),
  btnCloseReviewModal: document.getElementById('btn-close-review-modal'),
  btnDismissReview: document.getElementById('btn-dismiss-review'),
  reviewExamTitle: document.getElementById('review-exam-title'),
  reviewPercent: document.getElementById('review-percent'),
  reviewScoreFraction: document.getElementById('review-score-fraction'),
  reviewStatusPill: document.getElementById('review-status-pill'),
  reviewCorrectCount: document.getElementById('review-correct-count'),
  reviewWrongCount: document.getElementById('review-wrong-count'),
  reviewUnansweredCount: document.getElementById('review-unanswered-count'),
  reviewQuestionsList: document.getElementById('review-questions-list'),

  modalAddSingleQuestion: document.getElementById('modal-add-single-question'),
  btnCloseAddQModal: document.getElementById('btn-close-add-q-modal'),
  btnCancelSingleQ: document.getElementById('btn-cancel-single-q'),
  formAddSingleQuestion: document.getElementById('form-add-single-question'),
  singleQExamId: document.getElementById('single-q-exam-id'),
  sqExamSelect: document.getElementById('sq-exam-select'),

  // Edit Question Modal
  modalEditQuestion: document.getElementById('modal-edit-question'),
  btnCloseEditQModal: document.getElementById('btn-close-edit-q-modal'),
  btnCancelEditQ: document.getElementById('btn-cancel-edit-q'),
  formEditQuestion: document.getElementById('form-edit-question'),
  eqId: document.getElementById('eq-id'),
  eqText: document.getElementById('eq-text'),
  eqOptA: document.getElementById('eq-opt-a'),
  eqOptB: document.getElementById('eq-opt-b'),
  eqOptC: document.getElementById('eq-opt-c'),
  eqOptD: document.getElementById('eq-opt-d'),
  eqCorrect: document.getElementById('eq-correct'),
  eqMarks: document.getElementById('eq-marks'),
  eqExplanation: document.getElementById('eq-explanation'),
  editQModalTitle: document.getElementById('edit-q-modal-title'),
  editQExamTitle: document.getElementById('edit-q-exam-title'),

  // Admin Add User / Examiner Modal
  btnOpenAddUserModal: document.getElementById('btn-open-add-user-modal'),
  modalAddUser: document.getElementById('modal-add-user'),
  btnCloseAddUserModal: document.getElementById('btn-close-add-user-modal'),
  btnCancelAddUser: document.getElementById('btn-cancel-add-user'),
  formAddUser: document.getElementById('form-add-user'),
  newFullName: document.getElementById('new-user-fullname'),
  newUsername: document.getElementById('new-user-username'),
  newUserRole: document.getElementById('new-user-role'),
  newUserPassword: document.getElementById('new-user-password'),
  newUserEmail: document.getElementById('new-user-email'),

  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// Toast Notifications
// ==========================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// API Helper
// ==========================================================================
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Server request failed');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// ==========================================================================
// View Routing
// ==========================================================================
function showView(viewId) {
  elements.viewAuth.classList.add('hidden');
  elements.viewAdmin.classList.add('hidden');
  elements.viewStudent.classList.add('hidden');
  elements.viewExamSession.classList.add('hidden');

  if (viewId === 'auth') elements.viewAuth.classList.remove('hidden');
  if (viewId === 'admin') elements.viewAdmin.classList.remove('hidden');
  if (viewId === 'student') elements.viewStudent.classList.remove('hidden');
  if (viewId === 'exam-session') elements.viewExamSession.classList.remove('hidden');
}

function renderNavProfile() {
  if (!state.currentUser) {
    elements.userNavActions.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-nav-login">Sign In</button>
    `;
    const btn = document.getElementById('btn-nav-login');
    if (btn) btn.onclick = () => showView('auth');
    return;
  }

  let roleBadgeClass = 'role-pill-student';
  let roleLabel = 'Student';
  if (state.currentUser.role === 'admin') {
    roleBadgeClass = 'role-pill-admin';
    roleLabel = 'Admin';
  } else if (state.currentUser.role === 'examiner') {
    roleBadgeClass = 'role-pill-examiner';
    roleLabel = 'Examiner';
  }
  const initials = state.currentUser.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  elements.userNavActions.innerHTML = `
    <div class="user-nav-profile">
      <div class="user-avatar-badge">
        <div class="avatar-circle">${initials}</div>
        <div class="user-details">
          <span class="user-name-text">${state.currentUser.full_name}</span>
          <span class="role-pill ${roleBadgeClass}">${roleLabel}</span>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-logout" title="Sign Out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  `;

  document.getElementById('btn-logout').onclick = logout;
}

// ==========================================================================
// Authentication Logic
// ==========================================================================
const SESSION_INACTIVITY_TIMEOUT = 15 * 60 * 1000;
let inactivityTimeoutId = null;
let lastSessionRefreshAt = 0;

function resetInactivityTimeout() {
  if (!state.token || !state.currentUser) return;

  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }

  inactivityTimeoutId = setTimeout(() => {
    logout();
  }, SESSION_INACTIVITY_TIMEOUT);
}

async function trackSessionActivity() {
  resetInactivityTimeout();

  // Refresh the server-side session periodically while the user is active.
  const now = Date.now();
  if (state.token && now - lastSessionRefreshAt >= 60 * 1000) {
    lastSessionRefreshAt = now;
    try {
      await apiRequest('/api/auth/me');
    } catch (err) {
      logout();
    }
  }
}

function setupSessionInactivityTracking() {
  const activityEvents = ['click', 'keydown', 'mousemove', 'mousedown', 'scroll', 'touchstart'];

  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, trackSessionActivity, { passive: true });
  });
}

async function initApp() {
  if (state.token) {
    try {
      const data = await apiRequest('/api/auth/me');
      state.currentUser = data.user;
      renderNavProfile();
      routeByRole();
      return;
    } catch (err) {
      console.warn('Session expired or invalid, logging out:', err);
      state.token = null;
    }
  }

  renderNavProfile();
  showView('auth');
}

function routeByRole() {
  if (!state.currentUser) {
    showView('auth');
    return;
  }
  if (state.currentUser.role === 'admin' || state.currentUser.role === 'examiner') {
    const isAdm = state.currentUser.role === 'admin';
    if (elements.adminBadgeRole) {
      elements.adminBadgeRole.textContent = isAdm ? 'Admin Control Center' : 'Examiner Portal';
    }
    if (elements.adminGreeting) {
      elements.adminGreeting.textContent = `Welcome, ${state.currentUser.full_name}`;
    }
    if (elements.adminSubtitle) {
      elements.adminSubtitle.textContent = isAdm
        ? 'Complete database management: view and edit exams, questions, candidate accounts, and attempt records.'
        : 'Exam & Question Management: view all submissions, add and edit questions.';
    }

    // Role-based visibility for Admin vs Examiner
    if (elements.adminTabUsers) {
      elements.adminTabUsers.style.display = isAdm ? '' : 'none';
    }
    if (elements.cardStatUsers) {
      elements.cardStatUsers.style.display = isAdm ? '' : 'none';
    }

    showView('admin');
    loadAdminDashboard();
  } else {
    elements.studentGreeting.textContent = `Welcome, ${state.currentUser.full_name}`;
    showView('student');
    loadStudentDashboard();
  }
}

async function login(username, password) {
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    state.token = data.token;
    state.currentUser = data.user;
    lastSessionRefreshAt = Date.now();
    resetInactivityTimeout();

    renderNavProfile();
    showToast(`Logged in successfully as ${data.user.full_name}`, 'success');
    routeByRole();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function demoLogin(role) {
  try {
    const data = await apiRequest('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });

    state.token = data.token;
    state.currentUser = data.user;
    lastSessionRefreshAt = Date.now();
    resetInactivityTimeout();

    renderNavProfile();
    showToast(`Switched to Demo ${role.toUpperCase()}: ${data.user.full_name}`, 'success');
    routeByRole();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function register(fullname, username, password, role, email = null) {
  try {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullname, username, password, role, email })
    });

    state.token = data.token;
    state.currentUser = data.user;
    lastSessionRefreshAt = Date.now();
    resetInactivityTimeout();

    renderNavProfile();
    showToast(`Account created! Welcome, ${data.user.full_name}`, 'success');
    routeByRole();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore network error on logout
  }

  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
    inactivityTimeoutId = null;
  }

  state.token = null;
  lastSessionRefreshAt = 0;
  state.currentUser = null;
  state.activeExam = null;
  renderNavProfile();
  showToast('You have been signed out', 'info');
  showView('auth');
}

// ==========================================================================
// Helper to format duration seconds
function formatTimeTaken(seconds) {
  if (!seconds || seconds <= 0) return '< 1 min';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// ==========================================================================
// Admin Dashboard
// ==========================================================================
async function loadAdminDashboard() {
  loadAdminStats();
  loadAdminExams();
  loadAdminQuestions();
  if (state.currentUser && state.currentUser.role === 'admin') {
    loadAdminUsers();
  }
  loadAdminSubmissions();
  loadAdminAnswers();
}

async function loadAdminStats() {
  try {
    const data = await apiRequest('/api/admin/stats');
    if (data.success) {
      elements.statTotalExams.textContent = data.stats.totalExams;
      elements.statTotalQuestions.textContent = data.stats.totalQuestions;
      elements.statTotalStudents.textContent = data.stats.totalStudents;
      elements.statPassRate.textContent = `${data.stats.passRate}%`;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadAdminExams() {
  try {
    const data = await apiRequest('/api/admin/exams');
    if (data.success) {
      state.adminExams = data.exams;
      elements.badgeExamCount.textContent = data.exams.length;
      renderAdminExamsTable(data.exams);
      populateExamFilterDropdown(data.exams);
    }
  } catch (err) {
    showToast('Failed to load exams: ' + err.message, 'error');
  }
}

function populateExamFilterDropdown(exams) {
  if (!elements.filterExamSelect) return;
  const currentVal = elements.filterExamSelect.value;
  elements.filterExamSelect.innerHTML = '<option value="">All Examinations</option>' +
    exams.map(e => `<option value="${e.id}">${escapeHtml(e.title)}</option>`).join('');
  if (currentVal) elements.filterExamSelect.value = currentVal;
}

function renderAdminExamsTable(exams) {
  if (exams.length === 0) {
    elements.adminExamsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-muted" style="text-align: center; padding: 2rem;">
          No exams found. Click "+ Add Exam" above to create your first examination!
        </td>
      </tr>
    `;
    return;
  }

  elements.adminExamsTableBody.innerHTML = exams.map(exam => `
    <tr>
      <td><span class="count-pill">#${exam.id}</span></td>
      <td>
        <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(exam.title)}</strong>
        <div class="text-muted" style="font-size: 0.75rem; margin-top: 0.2rem;">${escapeHtml(exam.description || 'No description')}</div>
      </td>
      <td>
        <span class="badge badge-purple">${escapeHtml(exam.subject)}</span>
      </td>
      <td>${exam.duration_minutes} Mins</td>
      <td><strong>${exam.question_count}</strong> Questions</td>
      <td>${exam.pass_percentage}% to Pass</td>
      <td>
        <span class="count-pill">${exam.submission_count} Attempts</span>
      </td>
      <td class="text-right">
        <div style="display: inline-flex; gap: 0.35rem; flex-wrap: wrap; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm" onclick="filterQuestionsByExam(${exam.id})" title="View all questions in this exam table">
            👁 Questions (${exam.question_count})
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openAddQuestionModal(${exam.id})" title="Add MCQ question">
            + Question
          </button>
          <button class="btn btn-outline btn-sm" onclick="startExam(${exam.id})" title="Preview test as candidate">
            Preview
          </button>
          ${state.currentUser && state.currentUser.role === 'admin' ? `
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fecaca;" onclick="deleteExam(${exam.id})" title="Delete exam">
              Delete
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// Questions Table Management in Admin Dashboard
async function loadAdminQuestions(examId = null) {
  try {
    const url = examId ? `/api/admin/questions?exam_id=${examId}` : '/api/admin/questions';
    const data = await apiRequest(url);
    if (data.success) {
      if (!examId) elements.badgeQuestionCount.textContent = data.questions.length;
      renderAdminQuestionsTable(data.questions);
    }
  } catch (err) {
    console.error('Failed to load questions:', err);
  }
}

function renderAdminQuestionsTable(questions) {
  if (!elements.adminQuestionsTableBody) return;
  if (questions.length === 0) {
    elements.adminQuestionsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-muted" style="text-align: center; padding: 2rem;">
          No questions found for this selection.
        </td>
      </tr>
    `;
    return;
  }

  elements.adminQuestionsTableBody.innerHTML = questions.map(q => `
    <tr>
      <td><span class="count-pill">#${q.id}</span></td>
      <td>
        <strong>${escapeHtml(q.exam_title || 'Exam #' + q.exam_id)}</strong>
        <div><span class="badge badge-purple" style="font-size:0.65rem;">${escapeHtml(q.exam_subject || 'General')}</span></div>
      </td>
      <td style="max-width: 280px;">
        <div style="font-weight:600; color:var(--text-main); line-height: 1.35;">${escapeHtml(q.question_text)}</div>
      </td>
      <td>
        <div style="font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.15rem;">
          <div><strong style="color:var(--primary);">A:</strong> ${escapeHtml(q.option_a)}</div>
          <div><strong style="color:var(--primary);">B:</strong> ${escapeHtml(q.option_b)}</div>
          <div><strong style="color:var(--primary);">C:</strong> ${escapeHtml(q.option_c)}</div>
          <div><strong style="color:var(--primary);">D:</strong> ${escapeHtml(q.option_d)}</div>
        </div>
      </td>
      <td>
        <span class="status-badge status-passed" style="font-size:0.8rem; font-weight:800;">Option ${q.correct_option}</span>
      </td>
      <td><strong>${q.marks || 1}</strong></td>
      <td class="text-muted" style="font-size:0.75rem; max-width: 200px;">
        ${escapeHtml(q.explanation || '—')}
      </td>
      <td class="text-right">
        <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="openEditQuestionModal(${q.id})" title="Edit question statement, options, or explanation">
            ✏️ Edit
          </button>
          <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fecaca;" onclick="deleteQuestion(${q.id})" title="Delete question">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function deleteQuestion(questionId) {
  if (!confirm('Are you sure you want to delete this question?')) return;
  try {
    const data = await apiRequest(`/api/admin/questions/${questionId}`, { method: 'DELETE' });
    showToast(data.message, 'success');
    loadAdminQuestions(elements.filterExamSelect ? elements.filterExamSelect.value : null);
    loadAdminStats();
    loadAdminExams();
  } catch (err) {
    showToast('Failed to delete question: ' + err.message, 'error');
  }
}

function filterQuestionsByExam(examId) {
  switchAdminTab('questions');
  if (elements.filterExamSelect) {
    elements.filterExamSelect.value = examId;
  }
  loadAdminQuestions(examId);
}

// Detailed Answers / Responses Table
async function loadAdminAnswers() {
  try {
    const data = await apiRequest('/api/admin/answers');
    if (data.success) {
      if (elements.badgeAnswersCount) elements.badgeAnswersCount.textContent = data.answers.length;
      renderAdminAnswersTable(data.answers);
    }
  } catch (err) {
    console.error('Failed to load answers:', err);
  }
}

function renderAdminAnswersTable(answers) {
  if (!elements.adminAnswersTableBody) return;
  if (answers.length === 0) {
    elements.adminAnswersTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-muted" style="text-align: center; padding: 2rem;">
          No student answer logs recorded in database yet. Attend an examination to see granular records.
        </td>
      </tr>
    `;
    return;
  }

  elements.adminAnswersTableBody.innerHTML = answers.map(a => {
    const isCorrect = a.is_correct === 1;
    const statusClass = isCorrect ? 'status-passed' : 'status-failed';
    const statusLabel = isCorrect ? '✓ Correct' : '✕ Incorrect';
    const dateFormatted = new Date(a.submitted_at).toLocaleString();

    return `
      <tr>
        <td><span class="count-pill">#${a.id}</span></td>
        <td>
          <strong>${escapeHtml(a.student_name)}</strong>
          <div class="text-muted" style="font-size:0.75rem;">@${escapeHtml(a.student_username)}</div>
        </td>
        <td>${escapeHtml(a.exam_title)}</td>
        <td style="max-width: 250px; font-size: 0.85rem;">
          <div style="font-weight: 500;">${escapeHtml(a.question_text)}</div>
        </td>
        <td><strong>Option ${escapeHtml(a.selected_option || 'None')}</strong></td>
        <td><strong style="color:var(--success);">Option ${a.correct_option}</strong></td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td><strong>${a.marks_awarded}</strong></td>
        <td class="text-muted" style="font-size:0.75rem;">${dateFormatted}</td>
      </tr>
    `;
  }).join('');
}

async function deleteExam(examId) {
  if (!confirm('Are you sure you want to delete this examination? All questions and student submissions will be permanently removed.')) {
    return;
  }

  try {
    const data = await apiRequest(`/api/admin/exams/${examId}`, { method: 'DELETE' });
    showToast(data.message, 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to delete exam: ' + err.message, 'error');
  }
}

async function loadAdminSubmissions() {
  try {
    const data = await apiRequest('/api/admin/submissions');
    if (data.success) {
      elements.badgeSubCount.textContent = data.submissions.length;
      renderAdminSubmissionsTable(data.submissions);
    }
  } catch (err) {
    console.error('Failed to load submissions:', err);
  }
}

function renderAdminSubmissionsTable(subs) {
  if (subs.length === 0) {
    elements.adminSubmissionsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-muted" style="text-align: center; padding: 2rem;">
          No student submissions recorded in database yet.
        </td>
      </tr>
    `;
    return;
  }

  elements.adminSubmissionsTableBody.innerHTML = subs.map(sub => {
    const isPassed = sub.status === 'PASSED';
    const statusClass = isPassed ? 'status-passed' : 'status-failed';
    const dateFormatted = new Date(sub.submitted_at).toLocaleString();
    const attemptBadge = `<span class="count-pill">Attempt #${sub.attempt_number || 1}</span>`;
    const timeTaken = formatTimeTaken(sub.time_taken_seconds);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(sub.student_name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">@${escapeHtml(sub.student_username)}</div>
        </td>
        <td>${escapeHtml(sub.exam_title)}</td>
        <td>${attemptBadge}</td>
        <td class="text-muted" style="font-size: 0.85rem;">${timeTaken}</td>
        <td><strong>${sub.score}</strong> / ${sub.total_marks}</td>
        <td><strong>${sub.percentage}%</strong></td>
        <td>
          <span class="status-badge ${statusClass}">${sub.status}</span>
        </td>
        <td class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</td>
        <td class="text-right">
          <button class="btn btn-outline btn-sm" onclick="viewDetailedSubmissionReview(${sub.id})">
            Review Answers
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// User Accounts Management in Admin Dashboard
async function loadAdminUsers() {
  try {
    const data = await apiRequest('/api/admin/users');
    if (data.success) {
      elements.badgeUsersCount.textContent = data.users.length;
      renderAdminUsersTable(data.users);
    }
  } catch (err) {
    console.error('Failed to load users:', err);
  }
}

function renderAdminUsersTable(users) {
  if (users.length === 0) {
    elements.adminUsersTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-muted" style="text-align: center; padding: 2rem;">
          No user accounts found in SQLite database.
        </td>
      </tr>
    `;
    return;
  }

  elements.adminUsersTableBody.innerHTML = users.map(u => {
    const isAdm = u.role === 'admin';
    let rolePill = '<span class="role-pill role-pill-student">Student</span>';
    if (u.role === 'admin') {
      rolePill = '<span class="role-pill role-pill-admin">Admin</span>';
    } else if (u.role === 'examiner') {
      rolePill = '<span class="role-pill role-pill-examiner">Examiner</span>';
    }
    const dateFormatted = new Date(u.created_at).toLocaleDateString();
    const attempts = u.total_attempts || 0;
    const passed = u.passed_attempts || 0;
    const failed = u.failed_attempts || 0;
    const avgScore = attempts > 0 ? `${u.avg_percentage}%` : '—';

    return `
      <tr>
        <td>
          <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(u.full_name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">@${escapeHtml(u.username)}</div>
        </td>
        <td>${rolePill}</td>
        <td class="text-muted" style="font-size: 0.85rem;">${escapeHtml(u.email || '—')}</td>
        <td class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</td>
        <td><strong>${attempts}</strong> Attempt${attempts === 1 ? '' : 's'}</td>
        <td>
          <span style="color: var(--success); font-weight: 700;">${passed} Passed</span> /
          <span style="color: var(--danger); font-weight: 700;">${failed} Failed</span>
        </td>
        <td><strong>${avgScore}</strong></td>
        <td class="text-right">
          ${isAdm ? '<span class="text-muted" style="font-size: 0.75rem;">Administrator</span>' : `
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: #fecaca;" onclick="deleteUserAccount(${u.id}, '${escapeHtml(u.username)}')" title="Delete user account">
              Delete
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function deleteUserAccount(userId, username) {
  if (!confirm(`Are you sure you want to delete user account @${username}? All their exam attempts and submissions will be permanently deleted from database.`)) {
    return;
  }
  try {
    const res = await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
    showToast(res.message, 'success');
    loadAdminDashboard();
  } catch (err) {
    showToast('Failed to delete user: ' + err.message, 'error');
  }
}

// Admin Tab Switching
function switchAdminTab(targetTab) {
  elements.adminTabExams.classList.remove('active');
  if (elements.adminTabQuestions) elements.adminTabQuestions.classList.remove('active');
  elements.adminTabCreate.classList.remove('active');
  elements.adminTabSubmissions.classList.remove('active');
  if (elements.adminTabUsers) elements.adminTabUsers.classList.remove('active');
  if (elements.adminTabAnswers) elements.adminTabAnswers.classList.remove('active');

  elements.adminSectionExams.classList.add('hidden');
  if (elements.adminSectionQuestions) elements.adminSectionQuestions.classList.add('hidden');
  elements.adminSectionCreate.classList.add('hidden');
  elements.adminSectionSubmissions.classList.add('hidden');
  if (elements.adminSectionUsers) elements.adminSectionUsers.classList.add('hidden');
  if (elements.adminSectionAnswers) elements.adminSectionAnswers.classList.add('hidden');

  if (targetTab === 'exams') {
    elements.adminTabExams.classList.add('active');
    elements.adminSectionExams.classList.remove('hidden');
    loadAdminExams();
  } else if (targetTab === 'questions') {
    if (elements.adminTabQuestions) elements.adminTabQuestions.classList.add('active');
    if (elements.adminSectionQuestions) elements.adminSectionQuestions.classList.remove('hidden');
    loadAdminQuestions(elements.filterExamSelect ? elements.filterExamSelect.value : null);
  } else if (targetTab === 'create') {
    elements.adminTabCreate.classList.add('active');
    elements.adminSectionCreate.classList.remove('hidden');
    if (elements.questionsBuilderList.children.length === 0) {
      addQuestionBuilderBlock();
    }
  } else if (targetTab === 'submissions') {
    elements.adminTabSubmissions.classList.add('active');
    elements.adminSectionSubmissions.classList.remove('hidden');
    loadAdminSubmissions();
  } else if (targetTab === 'users') {
    if (elements.adminTabUsers) elements.adminTabUsers.classList.add('active');
    if (elements.adminSectionUsers) elements.adminSectionUsers.classList.remove('hidden');
    loadAdminUsers();
  } else if (targetTab === 'answers') {
    if (elements.adminTabAnswers) elements.adminTabAnswers.classList.add('active');
    if (elements.adminSectionAnswers) elements.adminSectionAnswers.classList.remove('hidden');
    loadAdminAnswers();
  }
}

// Dynamic Question Builder in Admin Create Form
let questionCount = 0;
function addQuestionBuilderBlock(prefillData = null) {
  questionCount++;
  const block = document.createElement('div');
  block.className = 'question-builder-item';
  block.id = `q-builder-${questionCount}`;

  const currentQNum = elements.questionsBuilderList.children.length + 1;
  const qText = prefillData ? escapeHtml(prefillData.text) : '';
  const optA = prefillData ? escapeHtml(prefillData.a) : '';
  const optB = prefillData ? escapeHtml(prefillData.b) : '';
  const optC = prefillData ? escapeHtml(prefillData.c) : '';
  const optD = prefillData ? escapeHtml(prefillData.d) : '';
  const correct = prefillData ? prefillData.correct : 'A';
  const explanation = prefillData ? escapeHtml(prefillData.explanation) : '';
  const marks = prefillData ? prefillData.marks : 1;

  block.innerHTML = `
    <div class="q-item-header">
      <span class="q-badge">Question #<span class="q-seq-num">${currentQNum}</span></span>
      <button type="button" class="btn-remove-q" onclick="removeQuestionBuilderBlock(${questionCount})">
        ✕ Remove
      </button>
    </div>

    <div class="form-group">
      <label>Question Statement <span class="required">*</span></label>
      <textarea class="qb-text" rows="2" placeholder="e.g. What is the time complexity of binary search?" required>${qText}</textarea>
    </div>

    <div class="options-builder-grid">
      <div class="option-builder-input">
        <input type="radio" name="qb-correct-${questionCount}" value="A" ${correct === 'A' ? 'checked' : ''} title="Mark Option A as correct" />
        <span style="font-weight:700; color:var(--primary);">A</span>
        <input type="text" class="qb-opt-a" placeholder="Option A text" value="${optA}" required />
      </div>
      <div class="option-builder-input">
        <input type="radio" name="qb-correct-${questionCount}" value="B" ${correct === 'B' ? 'checked' : ''} title="Mark Option B as correct" />
        <span style="font-weight:700; color:var(--primary);">B</span>
        <input type="text" class="qb-opt-b" placeholder="Option B text" value="${optB}" required />
      </div>
      <div class="option-builder-input">
        <input type="radio" name="qb-correct-${questionCount}" value="C" ${correct === 'C' ? 'checked' : ''} title="Mark Option C as correct" />
        <span style="font-weight:700; color:var(--primary);">C</span>
        <input type="text" class="qb-opt-c" placeholder="Option C text" value="${optC}" required />
      </div>
      <div class="option-builder-input">
        <input type="radio" name="qb-correct-${questionCount}" value="D" ${correct === 'D' ? 'checked' : ''} title="Mark Option D as correct" />
        <span style="font-weight:700; color:var(--primary);">D</span>
        <input type="text" class="qb-opt-d" placeholder="Option D text" value="${optD}" required />
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label>Marks</label>
        <input type="number" class="qb-marks" value="${marks}" min="1" max="10" />
      </div>
      <div class="form-group">
        <label>Explanation (Revealed during result review)</label>
        <input type="text" class="qb-explanation" placeholder="Why this is the correct answer" value="${explanation}" />
      </div>
    </div>
  `;

  elements.questionsBuilderList.appendChild(block);
  updateQuestionSequenceNumbers();
}

function removeQuestionBuilderBlock(id) {
  const el = document.getElementById(`q-builder-${id}`);
  if (el) el.remove();
  updateQuestionSequenceNumbers();
}

function updateQuestionSequenceNumbers() {
  const items = elements.questionsBuilderList.querySelectorAll('.question-builder-item');
  items.forEach((item, idx) => {
    const numSpan = item.querySelector('.q-seq-num');
    if (numSpan) numSpan.textContent = idx + 1;
  });
}

function prefillSampleQuestions() {
  elements.examTitle.value = 'Database Management Systems (DBMS) Fundamentals';
  elements.examSubject.value = 'Database Systems';
  elements.examDescription.value = 'Core SQL, ACID properties, indexing, and normalization exam';
  elements.examDuration.value = 10;
  elements.examPassmark.value = 50;

  elements.questionsBuilderList.innerHTML = '';
  addQuestionBuilderBlock({
    text: 'Which SQL command is used to remove all records from a table without logging the individual row deletions?',
    a: 'DELETE FROM table_name',
    b: 'TRUNCATE TABLE table_name',
    c: 'DROP TABLE table_name',
    d: 'REMOVE TABLE table_name',
    correct: 'B',
    marks: 1,
    explanation: 'TRUNCATE is a DDL command that deallocates data pages directly, making it faster than DELETE with minimal transaction logging.'
  });

  addQuestionBuilderBlock({
    text: 'In relational database theory, what does the "A" in ACID properties stand for?',
    a: 'Accuracy',
    b: 'Availability',
    c: 'Atomicity',
    d: 'Association',
    correct: 'C',
    marks: 1,
    explanation: 'ACID stands for Atomicity, Consistency, Isolation, and Durability. Atomicity guarantees that all operations in a transaction succeed or none do.'
  });

  addQuestionBuilderBlock({
    text: 'Which normal form eliminates partial functional dependencies on a candidate key?',
    a: 'First Normal Form (1NF)',
    b: 'Second Normal Form (2NF)',
    c: 'Third Normal Form (3NF)',
    d: 'Boyce-Codd Normal Form (BCNF)',
    correct: 'B',
    marks: 1,
    explanation: 'A table is in 2NF if it is in 1NF and no non-prime attribute is dependent on any proper subset of any candidate key (no partial dependency).'
  });

  showToast('Sample questions loaded into builder!', 'success');
}

// Single Question Modal handlers
function populateExamSelectDropdown(selectedId = null) {
  if (!elements.sqExamSelect) return;
  const exams = state.adminExams || [];
  elements.sqExamSelect.innerHTML = exams.map(e =>
    `<option value="${e.id}">${escapeHtml(e.title)} (${escapeHtml(e.subject)})</option>`
  ).join('');
  if (selectedId) {
    elements.sqExamSelect.value = selectedId;
  }
}

function openAddQuestionModal(examId = null) {
  elements.formAddSingleQuestion.reset();
  populateExamSelectDropdown(examId || (state.adminExams && state.adminExams[0]?.id));
  const effectiveId = examId || (elements.sqExamSelect ? elements.sqExamSelect.value : '');
  if (elements.singleQExamId) elements.singleQExamId.value = effectiveId;
  if (examId && elements.sqExamSelect) {
    elements.sqExamSelect.value = examId;
  }
  elements.modalAddSingleQuestion.classList.remove('hidden');
}

// Edit Question Modal handlers
async function openEditQuestionModal(questionId) {
  try {
    const data = await apiRequest(`/api/admin/questions/${questionId}`);
    if (!data.success || !data.question) {
      showToast('Could not load question details', 'error');
      return;
    }
    const q = data.question;
    elements.eqId.value = q.id;
    elements.eqText.value = q.question_text;
    elements.eqOptA.value = q.option_a;
    elements.eqOptB.value = q.option_b;
    elements.eqOptC.value = q.option_c;
    elements.eqOptD.value = q.option_d;
    elements.eqCorrect.value = q.correct_option;
    elements.eqMarks.value = q.marks || 1;
    elements.eqExplanation.value = q.explanation || '';
    if (elements.editQModalTitle) {
      elements.editQModalTitle.textContent = `Edit Question #${q.id}`;
    }
    if (elements.editQExamTitle) {
      elements.editQExamTitle.textContent = `Examination: ${q.exam_title || '#' + q.exam_id} (${q.exam_subject || 'General'})`;
    }
    elements.modalEditQuestion.classList.remove('hidden');
  } catch (err) {
    showToast('Failed to load question: ' + err.message, 'error');
  }
}

// Admin Add Examiner / User Modal handlers
function openAddUserModal() {
  if (elements.formAddUser) elements.formAddUser.reset();
  if (elements.newUserRole) elements.newUserRole.value = 'examiner';
  if (elements.modalAddUser) elements.modalAddUser.classList.remove('hidden');
}

// ==========================================================================
// Student Dashboard
// ==========================================================================
async function loadStudentDashboard() {
  loadStudentExams();
  loadStudentHistory();
}

async function loadStudentExams() {
  try {
    const data = await apiRequest('/api/user/exams');
    if (data.success) {
      state.studentExams = data.exams;
      elements.badgeStudentExams.textContent = data.exams.length;
      renderStudentExamsGrid(data.exams);
    }
  } catch (err) {
    showToast('Failed to load exams: ' + err.message, 'error');
  }
}

function renderStudentExamsGrid(exams) {
  if (exams.length === 0) {
    elements.studentExamsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <p class="text-muted">No examinations are available right now. Please check back later!</p>
      </div>
    `;
    return;
  }

  elements.studentExamsGrid.innerHTML = exams.map(exam => {
    const hasAttempted = exam.student_attempts > 0;
    const buttonText = hasAttempted ? 'Retake Exam' : 'Start Exam';
    const bestScoreBadge = hasAttempted
      ? `<span class="badge badge-teal" style="font-size: 0.7rem;">Best: ${exam.best_percentage}%</span>`
      : '';

    return `
      <div class="exam-card">
        <div>
          <div class="exam-card-header">
            <span class="badge badge-purple">${escapeHtml(exam.subject)}</span>
            ${bestScoreBadge}
          </div>
          <h3 class="exam-card-title">${escapeHtml(exam.title)}</h3>
          <p class="exam-card-desc">${escapeHtml(exam.description || 'Test your knowledge and analytical skills in this topic.')}</p>

          <div class="exam-meta-pills">
            <div class="meta-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${exam.duration_minutes} Minutes</span>
            </div>
            <div class="meta-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span>${exam.question_count} Questions</span>
            </div>
            <div class="meta-pill">
              <span>Pass: ${exam.pass_percentage}%</span>
            </div>
          </div>
        </div>

        <div class="exam-card-footer">
          <span class="attempt-history-tag">${hasAttempted ? `${exam.student_attempts} completed` : 'Not yet attempted'}</span>
          <button class="btn btn-primary" onclick="startExam(${exam.id})">
            ${buttonText} →
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function loadStudentDashboard() {
  loadStudentExams();
  loadStudentHistory();
  loadStudentProfileStats();
}

async function loadStudentProfileStats() {
  try {
    const data = await apiRequest('/api/user/profile-stats');
    if (data.success && data.stats) {
      if (elements.studentStatAttempts) elements.studentStatAttempts.textContent = data.stats.total_attempts || 0;
      if (elements.studentStatPassed) elements.studentStatPassed.textContent = data.stats.passed_attempts || 0;
      if (elements.studentStatAvg) elements.studentStatAvg.textContent = `${data.stats.avg_percentage || 0}%`;
      if (elements.studentStatBest) elements.studentStatBest.textContent = `${data.stats.best_percentage || 0}%`;
    }
  } catch (err) {
    console.error('Failed to load profile stats:', err);
  }
}

async function loadStudentHistory() {
  try {
    const data = await apiRequest('/api/user/results');
    if (data.success) {
      elements.badgeStudentResults.textContent = data.results.length;
      renderStudentHistoryTable(data.results);
    }
  } catch (err) {
    console.error('Failed to load results history:', err);
  }
}

function renderStudentHistoryTable(results) {
  if (results.length === 0) {
    elements.studentHistoryTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-muted" style="text-align: center; padding: 2rem;">
          You haven't completed any examinations yet. Choose a test from "Available Examinations" to start!
        </td>
      </tr>
    `;
    return;
  }

  elements.studentHistoryTableBody.innerHTML = results.map(res => {
    const isPassed = res.status === 'PASSED';
    const statusClass = isPassed ? 'status-passed' : 'status-failed';
    const dateFormatted = new Date(res.submitted_at).toLocaleString();
    const attemptBadge = `<span class="count-pill">Attempt #${res.attempt_number || 1}</span>`;
    const timeTaken = formatTimeTaken(res.time_taken_seconds);

    return `
      <tr>
        <td><strong style="color: var(--text-main);">${escapeHtml(res.exam_title)}</strong></td>
        <td><span class="badge badge-purple">${escapeHtml(res.subject)}</span></td>
        <td>${attemptBadge}</td>
        <td class="text-muted" style="font-size: 0.85rem;">${timeTaken}</td>
        <td><strong>${res.score}</strong> / ${res.total_marks}</td>
        <td><strong>${res.percentage}%</strong></td>
        <td><span class="status-badge ${statusClass}">${res.status}</span></td>
        <td class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</td>
        <td class="text-right">
          <button class="btn btn-outline btn-sm" onclick="viewDetailedSubmissionReview(${res.id})">
            Review Scorecard
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function switchStudentTab(targetTab) {
  elements.studentTabAvailable.classList.remove('active');
  elements.studentTabHistory.classList.remove('active');

  elements.studentSectionAvailable.classList.add('hidden');
  elements.studentSectionHistory.classList.add('hidden');

  if (targetTab === 'available') {
    elements.studentTabAvailable.classList.add('active');
    elements.studentSectionAvailable.classList.remove('hidden');
    loadStudentExams();
  } else if (targetTab === 'history') {
    elements.studentTabHistory.classList.add('active');
    elements.studentSectionHistory.classList.remove('hidden');
    loadStudentHistory();
  }
}

// ==========================================================================
// Live Exam Arena (Taking Exam)
// ==========================================================================
async function startExam(examId) {
  try {
    const data = await apiRequest(`/api/user/exams/${examId}/start`);
    if (!data.success) {
      showToast(data.message, 'error');
      return;
    }

    state.activeExam = data.exam;
    state.activeQuestions = data.questions;
    state.currentQuestionIndex = 0;
    state.userAnswers = {};
    state.examStartTime = Date.now();

    // Setup Timer
    state.secondsRemaining = (data.exam.duration_minutes || 10) * 60;
    startCountdownTimer();

    // Render Exam Arena UI
    elements.arenaExamTitle.textContent = data.exam.title;
    elements.arenaSubjectBadge.textContent = data.exam.subject;

    renderPalette();
    renderCurrentQuestion();
    updateProgressIndicator();

    showView('exam-session');
    showToast(`Exam started: "${data.exam.title}". Good luck!`, 'info');
  } catch (err) {
    showToast('Failed to start exam: ' + err.message, 'error');
  }
}

function startCountdownTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  updateTimerDisplay();

  state.timerInterval = setInterval(() => {
    state.secondsRemaining--;
    updateTimerDisplay();

    if (state.secondsRemaining <= 0) {
      clearInterval(state.timerInterval);
      showToast('Time is up! Submitting your examination automatically...', 'warning');
      submitExam(true); // force submit
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(state.secondsRemaining / 60);
  const secs = state.secondsRemaining % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  elements.examCountdown.textContent = formatted;

  if (state.secondsRemaining < 120) {
    elements.examTimerBox.classList.add('timer-box-urgent');
  } else {
    elements.examTimerBox.classList.remove('timer-box-urgent');
  }
}

function renderPalette() {
  elements.paletteGrid.innerHTML = state.activeQuestions.map((q, idx) => {
    const isCurrent = idx === state.currentQuestionIndex;
    const isAnswered = state.userAnswers[q.id] !== undefined;

    let classes = 'btn-palette-q';
    if (isAnswered) classes += ' answered';
    if (isCurrent) classes += ' current';

    return `
      <button type="button" class="${classes}" onclick="jumpToQuestion(${idx})">
        ${idx + 1}
      </button>
    `;
  }).join('');

  const answeredCount = Object.keys(state.userAnswers).length;
  elements.answeredCounterLabel.textContent = `${answeredCount} / ${state.activeQuestions.length} Answered`;
}

function renderCurrentQuestion() {
  if (!state.activeQuestions || state.activeQuestions.length === 0) return;

  const q = state.activeQuestions[state.currentQuestionIndex];
  elements.currentQPill.textContent = `Question ${state.currentQuestionIndex + 1} of ${state.activeQuestions.length}`;
  elements.currentQMarks.textContent = `${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}`;
  elements.currentQText.textContent = q.question_text;

  const currentSelection = state.userAnswers[q.id];

  const options = [
    { letter: 'A', text: q.option_a },
    { letter: 'B', text: q.option_b },
    { letter: 'C', text: q.option_c },
    { letter: 'D', text: q.option_d }
  ];

  elements.currentQOptions.innerHTML = options.map(opt => {
    const isSelected = currentSelection === opt.letter;
    const selClass = isSelected ? 'selected' : '';

    return `
      <div class="option-card ${selClass}" onclick="selectOption('${opt.letter}')">
        <div class="option-letter-badge">${opt.letter}</div>
        <span class="option-text-span">${escapeHtml(opt.text)}</span>
      </div>
    `;
  }).join('');

  // Button disabled states
  elements.btnPrevQuestion.disabled = state.currentQuestionIndex === 0;
  elements.btnPrevQuestion.style.opacity = state.currentQuestionIndex === 0 ? '0.5' : '1';

  const isLast = state.currentQuestionIndex === state.activeQuestions.length - 1;
  elements.btnNextQuestion.textContent = isLast ? 'Review & Submit →' : 'Next Question →';

  renderPalette();
}

function selectOption(letter) {
  const currentQ = state.activeQuestions[state.currentQuestionIndex];
  state.userAnswers[currentQ.id] = letter;

  renderCurrentQuestion();
  updateProgressIndicator();
}

function clearSelection() {
  const currentQ = state.activeQuestions[state.currentQuestionIndex];
  delete state.userAnswers[currentQ.id];

  renderCurrentQuestion();
  updateProgressIndicator();
}

function jumpToQuestion(index) {
  if (index >= 0 && index < state.activeQuestions.length) {
    state.currentQuestionIndex = index;
    renderCurrentQuestion();
  }
}

function nextQuestion() {
  if (state.currentQuestionIndex < state.activeQuestions.length - 1) {
    state.currentQuestionIndex++;
    renderCurrentQuestion();
  } else {
    // Reached the end, trigger submit modal
    openSubmitConfirmationModal();
  }
}

function prevQuestion() {
  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
    renderCurrentQuestion();
  }
}

function updateProgressIndicator() {
  const total = state.activeQuestions.length;
  const answered = Object.keys(state.userAnswers).length;
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
  elements.examProgressFill.style.width = `${pct}%`;
}

// ==========================================================================
// Exam Submission & Result Review
// ==========================================================================
function openSubmitConfirmationModal() {
  const total = state.activeQuestions.length;
  const answered = Object.keys(state.userAnswers).length;
  const unanswered = total - answered;

  elements.modalTotalCount.textContent = total;
  elements.modalAnsweredCount.textContent = answered;
  elements.modalUnansweredCount.textContent = unanswered;

  elements.modalSubmitConfirm.classList.remove('hidden');
}

async function submitExam(forced = false) {
  if (!forced) {
    elements.modalSubmitConfirm.classList.add('hidden');
  }

  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  try {
    const timeSpent = state.examStartTime ? Math.max(1, Math.round((Date.now() - state.examStartTime) / 1000)) : 0;
    const data = await apiRequest(`/api/user/exams/${state.activeExam.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: state.userAnswers, time_taken_seconds: timeSpent })
    });

    if (data.success) {
      showToast('Exam submitted successfully and saved to database!', 'success');
      showResultReviewModal(data.result);
      routeByRole();
    }
  } catch (err) {
    showToast('Failed to submit exam: ' + err.message, 'error');
  }
}

function showResultReviewModal(result) {
  const attemptNum = result.attemptNumber ? ` (Attempt #${result.attemptNumber})` : '';
  elements.reviewExamTitle.textContent = `${result.examTitle}${attemptNum} - Scorecard`;
  elements.reviewPercent.textContent = `${result.percentage}%`;
  elements.reviewScoreFraction.textContent = `${result.totalScore} / ${result.totalMarks} Marks`;

  const isPassed = result.status === 'PASSED';
  elements.reviewStatusPill.textContent = result.status;
  elements.reviewStatusPill.className = `status-pill-lg ${isPassed ? 'status-passed-lg' : 'status-failed-lg'}`;

  elements.reviewCorrectCount.textContent = result.correctCount;
  elements.reviewWrongCount.textContent = result.wrongCount;
  elements.reviewUnansweredCount.textContent = result.unansweredCount;

  // Render question-by-question review
  renderReviewQuestions(result.reviewDetails);

  elements.modalResultReview.classList.remove('hidden');
}

async function viewDetailedSubmissionReview(submissionId) {
  try {
    const data = await apiRequest(`/api/user/results/${submissionId}`);
    if (data.success) {
      const sub = data.submission;
      showResultReviewModal({
        examTitle: sub.exam_title,
        attemptNumber: sub.attempt_number,
        timeTakenSeconds: sub.time_taken_seconds,
        percentage: sub.percentage,
        totalScore: sub.score,
        totalMarks: sub.total_marks,
        status: sub.status,
        correctCount: sub.correct_count,
        wrongCount: sub.wrong_count,
        unansweredCount: sub.total_questions - sub.answered_count,
        reviewDetails: data.reviewDetails
      });
    }
  } catch (err) {
    showToast('Could not load review: ' + err.message, 'error');
  }
}

function renderReviewQuestions(details) {
  elements.reviewQuestionsList.innerHTML = details.map((q, idx) => {
    let borderClass = 'border-unanswered';
    let statusBadge = '<span class="status-badge" style="background:#f1f5f9; color:#64748b;">Unanswered</span>';

    if (q.isAnswered) {
      if (q.isCorrect) {
        borderClass = 'border-correct';
        statusBadge = '<span class="status-badge status-passed">✓ Correct (+1)</span>';
      } else {
        borderClass = 'border-wrong';
        statusBadge = '<span class="status-badge status-failed">✕ Incorrect (0)</span>';
      }
    }

    const options = [
      { letter: 'A', text: q.optionA },
      { letter: 'B', text: q.optionB },
      { letter: 'C', text: q.optionC },
      { letter: 'D', text: q.optionD }
    ];

    const optionsHtml = options.map(opt => {
      const isCorrectOpt = opt.letter === q.correctOption;
      const isUserChoice = opt.letter === q.userChoice;

      let optClass = 'review-opt-item';
      let icon = '';

      if (isCorrectOpt) {
        optClass += ' is-correct-opt';
        icon = ' <strong style="margin-left:auto; color:var(--success);">✓ Correct Answer</strong>';
      } else if (isUserChoice && !q.isCorrect) {
        optClass += ' is-user-wrong';
        icon = ' <strong style="margin-left:auto; color:var(--danger);">✕ Your Choice</strong>';
      }

      return `
        <div class="${optClass}">
          <span style="font-weight:700;">${opt.letter}.</span>
          <span>${escapeHtml(opt.text)}</span>
          ${icon}
        </div>
      `;
    }).join('');

    return `
      <div class="review-question-card ${borderClass}">
        <div class="review-q-header">
          <span style="font-weight:700; color:var(--primary); font-size:0.85rem;">Question ${idx + 1}</span>
          ${statusBadge}
        </div>
        <div class="review-q-title">${escapeHtml(q.questionText)}</div>
        <div class="review-options-grid">
          ${optionsHtml}
        </div>
        ${q.explanation ? `
          <div class="review-explanation-box">
            <strong>Explanation:</strong> ${escapeHtml(q.explanation)}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ==========================================================================
// Helper Utilities
// ==========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
  setupSessionInactivityTracking();

  // Brand Logo Click
  elements.brandLogo.onclick = () => routeByRole();

  // Auth Tabs
  elements.tabBtnLogin.onclick = () => {
    elements.tabBtnLogin.classList.add('active');
    elements.tabBtnRegister.classList.remove('active');
    elements.formLogin.classList.remove('hidden');
    elements.formRegister.classList.add('hidden');
  };

  elements.tabBtnRegister.onclick = () => {
    elements.tabBtnRegister.classList.add('active');
    elements.tabBtnLogin.classList.remove('active');
    elements.formRegister.classList.remove('hidden');
    elements.formLogin.classList.add('hidden');
  };

  // Demo Autofill buttons in login card
  elements.btnAutofillAdmin.onclick = () => {
    elements.loginUsername.value = 'admin';
    elements.loginPassword.value = 'admin123';
    login('admin', 'admin123');
  };

  if (elements.btnAutofillExaminer) {
    elements.btnAutofillExaminer.onclick = () => {
      elements.loginUsername.value = 'examiner';
      elements.loginPassword.value = 'examiner123';
      login('examiner', 'examiner123');
    };
  }

  elements.btnAutofillStudent.onclick = () => {
    elements.loginUsername.value = 'student';
    elements.loginPassword.value = 'student123';
    login('student', 'student123');
  };

  // Login Form Submit
  elements.formLogin.onsubmit = (e) => {
    e.preventDefault();
    login(elements.loginUsername.value, elements.loginPassword.value);
  };

  // Register Form Submit
  elements.formRegister.onsubmit = (e) => {
    e.preventDefault();
    register(
      elements.regFullname.value,
      elements.regUsername.value,
      elements.regPassword.value,
      elements.regRole.value,
      elements.regEmail ? elements.regEmail.value.trim() : null
    );
  };

  // Admin Navigation Tabs & Shortcut Cards
  elements.adminTabExams.onclick = () => switchAdminTab('exams');
  if (elements.adminTabQuestions) elements.adminTabQuestions.onclick = () => switchAdminTab('questions');
  elements.adminTabCreate.onclick = () => switchAdminTab('create');
  elements.adminTabSubmissions.onclick = () => switchAdminTab('submissions');
  if (elements.adminTabUsers) elements.adminTabUsers.onclick = () => switchAdminTab('users');
  if (elements.adminTabAnswers) elements.adminTabAnswers.onclick = () => switchAdminTab('answers');
  elements.btnNavCreateExam.onclick = () => switchAdminTab('create');

  // Clickable shortcut cards
  if (elements.cardStatExams) elements.cardStatExams.onclick = () => switchAdminTab('exams');
  if (elements.cardStatQuestions) elements.cardStatQuestions.onclick = () => switchAdminTab('questions');
  if (elements.cardStatUsers) elements.cardStatUsers.onclick = () => switchAdminTab('users');
  if (elements.cardStatSubmissions) elements.cardStatSubmissions.onclick = () => switchAdminTab('submissions');

  // Questions Table Filter & Refresh
  if (elements.filterExamSelect) elements.filterExamSelect.onchange = (e) => loadAdminQuestions(e.target.value);
  if (elements.btnRefreshQuestions) elements.btnRefreshQuestions.onclick = () => loadAdminQuestions(elements.filterExamSelect ? elements.filterExamSelect.value : null);

  // Admin Question Builder Actions
  elements.btnAddQuestionBlock.onclick = () => addQuestionBuilderBlock();
  elements.btnPrefillSampleQuestions.onclick = () => prefillSampleQuestions();
  elements.btnCancelCreateExam.onclick = () => switchAdminTab('exams');

  // Admin Create Exam Submit
  elements.formCreateExam.onsubmit = async (e) => {
    e.preventDefault();

    const title = elements.examTitle.value.trim();
    const subject = elements.examSubject.value.trim();
    const description = elements.examDescription.value.trim();
    const duration_minutes = parseInt(elements.examDuration.value, 10) || 15;
    const pass_percentage = parseInt(elements.examPassmark.value, 10) || 50;

    // Collect questions
    const questionItems = elements.questionsBuilderList.querySelectorAll('.question-builder-item');
    if (questionItems.length === 0) {
      showToast('Please add at least one question to the exam', 'error');
      return;
    }

    const questions = [];
    for (const item of questionItems) {
      const qText = item.querySelector('.qb-text').value.trim();
      const optA = item.querySelector('.qb-opt-a').value.trim();
      const optB = item.querySelector('.qb-opt-b').value.trim();
      const optC = item.querySelector('.qb-opt-c').value.trim();
      const optD = item.querySelector('.qb-opt-d').value.trim();
      const correctRadio = item.querySelector('input[type="radio"]:checked');
      const correct_option = correctRadio ? correctRadio.value : 'A';
      const marks = parseInt(item.querySelector('.qb-marks').value, 10) || 1;
      const explanation = item.querySelector('.qb-explanation').value.trim();

      if (!qText || !optA || !optB || !optC || !optD) {
        showToast('Please ensure every question has a statement and all 4 options filled', 'error');
        return;
      }

      questions.push({
        question_text: qText,
        option_a: optA,
        option_b: optB,
        option_c: optC,
        option_d: optD,
        correct_option,
        marks,
        explanation
      });
    }

    try {
      const data = await apiRequest('/api/admin/exams', {
        method: 'POST',
        body: JSON.stringify({
          title,
          subject,
          description,
          duration_minutes,
          pass_percentage,
          questions
        })
      });

      if (data.success) {
        showToast('Examination published successfully with ' + questions.length + ' questions!', 'success');
        elements.formCreateExam.reset();
        elements.questionsBuilderList.innerHTML = '';
        switchAdminTab('exams');
        loadAdminDashboard();
      }
    } catch (err) {
      showToast('Failed to create exam: ' + err.message, 'error');
    }
  };

  // Questions Toolbar Add Button
  if (elements.btnToolbarAddQuestion) {
    elements.btnToolbarAddQuestion.onclick = () => {
      openAddQuestionModal(elements.filterExamSelect ? elements.filterExamSelect.value : null);
    };
  }

  // Single Question Add Form Submit
  elements.formAddSingleQuestion.onsubmit = async (e) => {
    e.preventDefault();
    const examId = (elements.sqExamSelect && elements.sqExamSelect.value) || elements.singleQExamId.value;
    if (!examId) {
      showToast('Please select a target examination', 'error');
      return;
    }
    const qText = document.getElementById('sq-text').value.trim();
    const optA = document.getElementById('sq-opt-a').value.trim();
    const optB = document.getElementById('sq-opt-b').value.trim();
    const optC = document.getElementById('sq-opt-c').value.trim();
    const optD = document.getElementById('sq-opt-d').value.trim();
    const correct = document.getElementById('sq-correct').value;
    const marks = parseInt(document.getElementById('sq-marks').value, 10) || 1;
    const explanation = document.getElementById('sq-explanation').value.trim();

    try {
      const data = await apiRequest(`/api/admin/exams/${examId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_text: qText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_option: correct,
          marks,
          explanation
        })
      });

      if (data.success) {
        showToast('Question added successfully!', 'success');
        elements.modalAddSingleQuestion.classList.add('hidden');
        loadAdminDashboard();
      }
    } catch (err) {
      showToast('Failed to add question: ' + err.message, 'error');
    }
  };

  // Edit Question Form Submit
  if (elements.formEditQuestion) {
    elements.formEditQuestion.onsubmit = async (e) => {
      e.preventDefault();
      const questionId = elements.eqId.value;
      const qText = elements.eqText.value.trim();
      const optA = elements.eqOptA.value.trim();
      const optB = elements.eqOptB.value.trim();
      const optC = elements.eqOptC.value.trim();
      const optD = elements.eqOptD.value.trim();
      const correct = elements.eqCorrect.value;
      const marks = parseInt(elements.eqMarks.value, 10) || 1;
      const explanation = elements.eqExplanation.value.trim();

      try {
        const data = await apiRequest(`/api/admin/questions/${questionId}`, {
          method: 'PUT',
          body: JSON.stringify({
            question_text: qText,
            option_a: optA,
            option_b: optB,
            option_c: optC,
            option_d: optD,
            correct_option: correct,
            marks,
            explanation
          })
        });

        if (data.success) {
          showToast('Question updated successfully!', 'success');
          elements.modalEditQuestion.classList.add('hidden');
          loadAdminQuestions(elements.filterExamSelect ? elements.filterExamSelect.value : null);
          loadAdminStats();
        }
      } catch (err) {
        showToast('Failed to update question: ' + err.message, 'error');
      }
    };
  }

  // Admin Add User / Examiner Form Submit
  if (elements.btnOpenAddUserModal) {
    elements.btnOpenAddUserModal.onclick = () => openAddUserModal();
  }
  if (elements.btnCloseAddUserModal) {
    elements.btnCloseAddUserModal.onclick = () => elements.modalAddUser.classList.add('hidden');
  }
  if (elements.btnCancelAddUser) {
    elements.btnCancelAddUser.onclick = () => elements.modalAddUser.classList.add('hidden');
  }

  if (elements.formAddUser) {
    elements.formAddUser.onsubmit = async (e) => {
      e.preventDefault();
      const full_name = elements.newFullName.value.trim();
      const username = elements.newUsername.value.trim();
      const password = elements.newUserPassword.value;
      const role = elements.newUserRole.value;
      const email = elements.newUserEmail ? elements.newUserEmail.value.trim() : null;

      try {
        const data = await apiRequest('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name,
            username,
            password,
            role,
            email
          })
        });

        if (data.success) {
          showToast(data.message || `Created account for ${full_name}`, 'success');
          elements.modalAddUser.classList.add('hidden');
          elements.formAddUser.reset();
          loadAdminUsers();
          loadAdminStats();
        }
      } catch (err) {
        showToast('Failed to create user: ' + err.message, 'error');
      }
    };
  }

  // Student Navigation Tabs
  elements.studentTabAvailable.onclick = () => switchStudentTab('available');
  elements.studentTabHistory.onclick = () => switchStudentTab('history');
  elements.btnStudentViewHistory.onclick = () => switchStudentTab('history');

  // Live Exam Arena Actions
  elements.btnClearSelection.onclick = () => clearSelection();
  elements.btnPrevQuestion.onclick = () => prevQuestion();
  elements.btnNextQuestion.onclick = () => nextQuestion();
  elements.btnTriggerSubmitModal.onclick = () => openSubmitConfirmationModal();

  // Modals close buttons
  elements.btnCloseSubmitModal.onclick = () => elements.modalSubmitConfirm.classList.add('hidden');
  elements.btnCancelSubmit.onclick = () => elements.modalSubmitConfirm.classList.add('hidden');
  elements.btnConfirmFinalSubmit.onclick = () => submitExam(false);

  elements.btnCloseReviewModal.onclick = () => elements.modalResultReview.classList.add('hidden');
  elements.btnDismissReview.onclick = () => {
    elements.modalResultReview.classList.add('hidden');
    routeByRole();
  };

  elements.btnCloseAddQModal.onclick = () => elements.modalAddSingleQuestion.classList.add('hidden');
  elements.btnCancelSingleQ.onclick = () => elements.modalAddSingleQuestion.classList.add('hidden');

  if (elements.btnCloseEditQModal) {
    elements.btnCloseEditQModal.onclick = () => elements.modalEditQuestion.classList.add('hidden');
  }
  if (elements.btnCancelEditQ) {
    elements.btnCancelEditQ.onclick = () => elements.modalEditQuestion.classList.add('hidden');
  }
}

// Global functions for inline DOM onclick handlers
window.startExam = startExam;
window.deleteExam = deleteExam;
window.deleteQuestion = deleteQuestion;
window.openEditQuestionModal = openEditQuestionModal;
window.openAddUserModal = openAddUserModal;
window.filterQuestionsByExam = filterQuestionsByExam;
window.deleteUserAccount = deleteUserAccount;
window.openAddQuestionModal = openAddQuestionModal;
window.removeQuestionBuilderBlock = removeQuestionBuilderBlock;
window.jumpToQuestion = jumpToQuestion;
window.selectOption = selectOption;
window.viewDetailedSubmissionReview = viewDetailedSubmissionReview;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initApp();
});
