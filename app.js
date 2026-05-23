// ============================================================
// APP.JS  —  Main application logic
// ============================================================

// ===== STATE =====
let currentUser  = null;   // logged-in user object
let currentBranch = 'all'; // active branch filter

// Page titles map
const PAGE_TITLES = {
  dashboard: 'لوحة التحكم',
  students:  'الطلاب',
  fees:      'الرسوم والأقساط',
  reports:   'التقارير',
  clothes:   'مخزن الملابس',
  supplies:  'المستهلكات',
  messages:  'رسائل واتساب',
  autoreply: 'الرد التلقائي',
  hr:        'شؤون العاملين',
  licenses:  'التراخيص',
  settings:  'الإعدادات'
};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await DB.init();
  if (typeof applyNurseryBranding === 'function') applyNurseryBranding();
  initLogin();
  initNav();
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('ar-KW', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
});

// ============================================================
// LOGIN
// ============================================================
function initLogin() {
  const users = DB.all('users');
  const sel   = document.getElementById('loginUser');
  sel.innerHTML = users.map(u =>
    `<option value="${u.id}">${u.name}</option>`
  ).join('');

  document.getElementById('loginBtn').onclick = doLogin;
  document.getElementById('loginPIN').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

function doLogin() {
  const userId = document.getElementById('loginUser').value;
  const pin    = document.getElementById('loginPIN').value;
  const errEl  = document.getElementById('loginError');
  const users  = DB.all('users');
  const user   = users.find(u => u.id === userId);

  errEl.textContent = '';
  if (!pin)            { errEl.textContent = 'أدخل الرقم السري'; return; }
  if (!user || user.pin !== pin) { errEl.textContent = '❌ الرقم السري غير صحيح'; return; }

  currentUser   = user;
  currentBranch = user.branch === 'all' ? 'all' : user.branch;

  // update topbar
  document.getElementById('avatarLetter').textContent = user.avatar;
  document.getElementById('currentUser').textContent  = user.name;
  document.getElementById('branchLabel').textContent  = '• ' + BRANCHES[user.branch].name;

  // restrict branch selector for supervisors
  const branchSel = document.getElementById('branchSelect');
  if (user.role !== 'admin') {
    branchSel.style.display = 'none';
    branchSel.value = user.branch;
    currentBranch = user.branch;
  } else {
    branchSel.style.display = '';
    Array.from(branchSel.options).forEach(o => { o.style.display = ''; o.disabled = false; });
  }
  branchSel.onchange = () => {
    currentBranch = branchSel.value;
    renderCurrentPage();
  };

  // save last login
  DB.update('users', userId, { lastLogin: new Date().toLocaleString('ar-KW') });

  // apply nav visibility based on permissions
  applyNavPermissions(user);

  // logout button
  let logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) {
    logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.style.cssText = 'font-size:12px;padding:5px 12px;color:var(--danger);border-color:var(--danger);margin-left:8px';
    logoutBtn.innerHTML = '🚪 خروج';
    logoutBtn.onclick = doLogout;
    document.querySelector('.topbar-right').prepend(logoutBtn);
  }

  document.getElementById('loginScreen').classList.add('hidden');
  showPage('dashboard');
  showToast('مرحباً ' + user.name + ' 👋');
}

function doLogout() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;
  currentUser = null;
  currentBranch = 'all';
  document.getElementById('avatarLetter').textContent = 'م';
  document.getElementById('currentUser').textContent = 'المدير';
  document.getElementById('branchLabel').textContent = '• كل الفروع';
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.remove();
  const branchSel = document.getElementById('branchSelect');
  branchSel.value = 'all';
  branchSel.style.display = '';
  Array.from(branchSel.options).forEach(o => { o.disabled = false; o.style.display = ''; });
  branchSel.onchange = null;
  document.querySelectorAll('.nav-item[data-page]').forEach(i => i.style.display = '');
  document.getElementById('loginPIN').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginScreen').classList.remove('hidden');
}

// ============================================================
// PERMISSIONS
// ============================================================

// Pages restricted to admin only (always)
const ADMIN_ONLY_PAGES = ['licenses'];

// Default page permissions per role (supervisor can't access these unless granted)
const SUPERVISOR_BLOCKED_DEFAULT = ['licenses'];

function getUserPermissions(user) {
  // admin has all permissions
  if (user.role === 'admin') return null; // null = unrestricted
  // load per-user custom permissions (set via settings)
  const custom = DB.get('userPerms_' + user.id);
  if (custom) return custom; // array of allowed page IDs
  // default: supervisors blocked from licenses
  const allPages = Object.keys(PAGE_TITLES);
  return allPages.filter(p => !SUPERVISOR_BLOCKED_DEFAULT.includes(p));
}

function canAccessPage(pageId) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  const perms = getUserPermissions(currentUser);
  if (!perms) return true;
  return perms.includes(pageId);
}

function applyNavPermissions(user) {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    const pageId = item.dataset.page;
    const allowed = user.role === 'admin' || !SUPERVISOR_BLOCKED_DEFAULT.includes(pageId);
    item.style.display = allowed ? '' : 'none';
    // also check custom perms
    if (allowed && user.role !== 'admin') {
      const perms = getUserPermissions(user);
      if (perms && !perms.includes(pageId)) {
        item.style.display = 'none';
      }
    }
  });
}

// ============================================================
// NAVIGATION
// ============================================================
function initNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      showPage(item.dataset.page);
    });
  });
}

function showPage(pageId) {
  // permission check
  if (currentUser && !canAccessPage(pageId)) {
    showToast('🚫 ليس لديك صلاحية الوصول إلى هذه الصفحة');
    return;
  }

  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // show target
  const page = document.getElementById('page-' + pageId);
  if (!page) return;
  page.classList.add('active');

  // highlight nav
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('pageTitle').textContent = PAGE_TITLES[pageId] || pageId;

  // render content
  renderPage(pageId);
}

function renderCurrentPage() {
  const active = document.querySelector('.page.active');
  if (active) {
    const id = active.id.replace('page-', '');
    renderPage(id);
  }
}

function renderPage(id) {
  const map = {
    dashboard: renderDashboard,
    students:  renderStudents,
    fees:      renderFees,
    reports:   renderReports,
    clothes:   renderClothes,
    supplies:  renderSupplies,
    messages:  renderMessages,
    autoreply: renderAutoreply,
    hr:        renderHR,
    licenses:  renderLicenses,
    settings:  renderSettings
  };
  if (map[id]) map[id]();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const students  = filterByBranch(DB.all('students'));
  const installs  = DB.all('installments');
  const employees = filterByBranch(DB.all('employees'));
  const licenses  = DB.all('licenses');

  const totalPaid    = students.reduce((s, st) => s + (st.paid || 0), 0);
  const totalNet     = students.reduce((s, st) => s + (st.net  || 0), 0);
  const totalPending = totalNet - totalPaid;
  const lateInst     = installs.filter(i => i.status === 'pending' && daysUntil(i.dueDate) < 0);

  // Stats cards
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">👦</div><div>
      <div class="stat-value" style="color:var(--primary)">${students.length}</div>
      <div class="stat-label">إجمالي الطلاب</div></div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div>
      <div class="stat-value" style="color:var(--info)">${fmtKD(totalPaid)}</div>
      <div class="stat-label">إجمالي المحصّل</div></div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div>
      <div class="stat-value" style="color:var(--accent)">${fmtKD(totalPending)}</div>
      <div class="stat-label">المتبقي</div></div></div>
    <div class="stat-card"><div class="stat-icon">👩‍🏫</div><div>
      <div class="stat-value" style="color:var(--purple)">${employees.length}</div>
      <div class="stat-label">العاملون</div></div></div>
  `;

  // Branch summary table
  const isAdmin = currentUser && currentUser.role === 'admin';
  const branches = isAdmin
    ? (currentBranch === 'all' ? ['esh','sol','mat'] : [currentBranch])
    : [currentUser.branch];

  const allStudents = isAdmin ? DB.all('students') : DB.all('students').filter(s => s.branch === currentUser.branch);
  const rows = branches.map(b => {
    const bs   = allStudents.filter(s => s.branch === b);
    const bPaid= bs.reduce((s,st) => s + st.paid, 0);
    const bNet = bs.reduce((s,st) => s + st.net,  0);
    const pct  = bNet > 0 ? Math.round(bPaid / bNet * 100) : 0;
    const cls  = pct >= 90 ? 'badge-green' : pct >= 60 ? 'badge-orange' : 'badge-red';
    return `<tr>
      <td><b>${BRANCHES[b].name}</b></td>
      <td>${bs.length}</td>
      <td><b>${fmtKD(bPaid)}</b></td>
      <td>${fmtKD(bNet - bPaid)}</td>
      <td><span class="badge ${cls}">${pct}%</span></td>
    </tr>`;
  }).join('');

  document.getElementById('branchSummaryTable').innerHTML = `
    <thead><tr><th>الفرع</th><th>الطلاب</th><th>المحصّل</th><th>المتبقي</th><th>نسبة السداد</th></tr></thead>
    <tbody>${rows}</tbody>`;

  // Alerts
  const alerts = [];
  if (lateInst.length)
    alerts.push(`<div class="alert alert-danger">⚠️ <div><b>${lateInst.length} قسط</b> متأخر عن موعد السداد</div></div>`);

  licenses.forEach(l => {
    const d = daysUntil(l.expiryDate);
    if (d < 0)
      alerts.push(`<div class="alert alert-danger">📜 ترخيص <b>${l.name}</b> منتهي منذ ${Math.abs(d)} يوم</div>`);
    else if (d < 60)
      alerts.push(`<div class="alert alert-warning">📜 ترخيص <b>${l.name}</b> ينتهي خلال <b>${d} يوم</b></div>`);
  });

  const expiring = DB.all('supplies').filter(p => daysUntil(p.expiryDate) < 30 && daysUntil(p.expiryDate) >= 0);
  if (expiring.length)
    alerts.push(`<div class="alert alert-warning">📦 <b>${expiring.length} أصناف</b> في المستهلكات تنتهي صلاحيتها قريباً</div>`);

  if (!alerts.length)
    alerts.push(`<div class="alert alert-success">✅ لا توجد تنبيهات عاجلة</div>`);

  document.getElementById('alertsContainer').innerHTML = alerts.join('');
}

// ============================================================
// STUDENTS
// ============================================================
function renderStudents() {
  const container = document.getElementById('studentsFilter');
  container.innerHTML = `
    <span class="filter-chip ${currentBranch==='all'?'active':''}" onclick="setBranchFilter('all',this)">كل الفروع</span>
    <span class="filter-chip ${currentBranch==='esh'?'active':''}" onclick="setBranchFilter('esh',this)">اشبيلية</span>
    <span class="filter-chip ${currentBranch==='sol'?'active':''}" onclick="setBranchFilter('sol',this)">الصليبخات</span>
    <span class="filter-chip ${currentBranch==='mat'?'active':''}" onclick="setBranchFilter('mat',this)">المطلاع</span>
    <span class="filter-chip" id="gradeAll" onclick="gradeFilter('all',this)">كل المراحل</span>
    <span class="filter-chip" onclick="gradeFilter('nursery',this)">حضانة</span>
    <span class="filter-chip" onclick="gradeFilter('KG1',this)">KG1</span>
    <span class="filter-chip" onclick="gradeFilter('KG2',this)">KG2</span>
    <button class="btn btn-primary" style="margin-right:auto" onclick="openAddStudent()">➕ إضافة طالب</button>
    <button class="btn btn-outline" onclick="exportStudentsExcel()">📥 Excel</button>
  `;
  // default grade chip active
  document.getElementById('gradeAll').classList.add('active');
  renderStudentsTable('all');
}

let activeGrade = 'all';

function gradeFilter(grade, el) {
  activeGrade = grade;
  document.querySelectorAll('#studentsFilter .filter-chip').forEach(c => {
    if (['كل المراحل','حضانة','KG1','KG2'].includes(c.textContent))
      c.classList.remove('active');
  });
  el.classList.add('active');
  renderStudentsTable(grade);
}

function setBranchFilter(branch, el) {
  if (currentUser && currentUser.role !== 'admin') return;
  currentBranch = branch;
  document.getElementById('branchSelect').value = branch;
  renderStudentsTable(activeGrade);
  // update chips highlight
  el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c => {
    if (['كل الفروع','اشبيلية','الصليبخات','المطلاع'].includes(c.textContent))
      c.classList.remove('active');
  });
  el.classList.add('active');
}

function renderStudentsTable(grade) {
  let list = filterByBranch(DB.all('students'));
  if (grade !== 'all') list = list.filter(s => s.grade === grade);

  const gradeLabel = { nursery:'حضانة', KG1:'KG1', KG2:'KG2' };
  const gradeBadge = { nursery:'badge-green', KG1:'badge-blue', KG2:'badge-purple' };

  const rows = list.map(s => {
    const st  = studentStatus(s);
    const rem = s.net - s.paid;
    return `<tr>
      <td style="color:var(--text-muted)">${s.id}</td>
      <td><b>${s.name}</b></td>
      <td><span class="badge ${gradeBadge[s.grade]||'badge-gray'}">${gradeLabel[s.grade]||s.grade}</span></td>
      <td><span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span></td>
      <td>${s.phone1}</td>
      <td>${s.phone2||'—'}</td>
      <td>${fmtDate(s.dob)}</td>
      <td>${fmtDate(s.startDate)}</td>
      <td>${fmtKD(s.net)}</td>
      <td style="color:var(--primary)">${fmtKD(s.paid)}</td>
      <td style="color:${rem>0?'var(--danger)':'var(--primary)'}">${fmtKD(rem)}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openEditStudent('${s.id}')">✏️</button>
        <button class="btn btn-outline btn-sm" onclick="openStudentInstallments('${s.id}')">📋</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteStudent('${s.id}','${s.name}')">🗑️</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</td></tr>`;

  document.getElementById('studentsTable').innerHTML = `
    <thead><tr>
      <th>الكود</th><th>الاسم</th><th>المرحلة</th><th>الفرع</th>
      <th>هاتف 1</th><th>هاتف 2</th><th>تاريخ الميلاد</th><th>تاريخ المباشرة</th>
      <th>الصافي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراءات</th>
    </tr></thead>
    <tbody>${rows}</tbody>`;
}

// ============================================================
// UTIL — filter by current branch
// ============================================================
function filterByBranch(arr) {
  if (currentUser && currentUser.role !== 'admin') {
    return arr.filter(i => i.branch === currentUser.branch);
  }
  if (!currentBranch || currentBranch === 'all') return arr;
  return arr.filter(i => i.branch === currentBranch);
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.transform = 'translateX(-50%) translateY(80px)';
  }, 3000);
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ============================================================
// STUBS — filled in next parts
// ============================================================
// openAddStudent defined in app-students.js
// openEditStudent defined in app-students.js

function deleteStudent(id, name) {
  if (!confirm('هل تريد حذف الطالب "' + name + '"؟\nسيتم حذف جميع أقساطه أيضاً.')) return;
  DB.remove('students', id);
  const remaining = DB.all('installments').filter(i => i.studentId !== id);
  DB.save('installments', remaining);
  showToast('🗑️ تم حذف الطالب: ' + name);
  renderStudentsTable(activeGrade);
}
// openStudentInstallments defined in app-students.js
// exportStudentsExcel defined in app-students.js
function renderFees()    {}
function renderReports() {}
function renderClothes() {}
function renderSupplies(){}
function renderMessages(){}
function renderAutoreply(){}
function renderHR()      {}
function renderLicenses(){}
function renderSettings(){}
