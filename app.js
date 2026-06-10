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
// GRADES HELPER
// ============================================================
const GRADES_DEFAULT = [
  { id:'nursery', label:'حضانة (2-3 سنوات)' },
  { id:'KG1',     label:'KG1 (3-4 سنوات)'  },
  { id:'KG2',     label:'KG2 (4-5 سنوات)'  }
];

function getGrades() {
  return DB.get('appGrades') || GRADES_DEFAULT;
}

function saveGrades(arr) {
  DB.set('appGrades', arr);
}

// ============================================================
// LOGIN
// ============================================================
function initLogin() {
  document.getElementById('loginBtn').onclick = doLogin;
  document.getElementById('loginPIN').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPIN').focus();
  });
}

function doLogin() {
  const userName = document.getElementById('loginUser').value.trim();
  const pin      = document.getElementById('loginPIN').value;
  const errEl    = document.getElementById('loginError');
  const users    = DB.all('users');
  const user     = users.find(u => u.name === userName);

  errEl.textContent = '';
  if (!userName)       { errEl.textContent = 'أدخل اسم المستخدم'; return; }
  if (!pin)            { errEl.textContent = 'أدخل الرقم السري'; return; }
  if (!user)           { errEl.textContent = '❌ اسم المستخدم غير موجود'; return; }
  if (user.pin !== pin){ errEl.textContent = '❌ الرقم السري غير صحيح'; return; }

  currentUser   = user;
  currentBranch = user.branch === 'all' ? 'all' : user.branch;

  // update topbar
  document.getElementById('avatarLetter').textContent = user.avatar;
  document.getElementById('currentUser').textContent  = user.name;
  document.getElementById('branchLabel').textContent  = '• ' + BRANCHES[user.branch].name;

  // restrict branch selector for supervisors
  const branchSel = document.getElementById('branchSelect');
  if (!isAdmin(user)) {
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
  DB.update('users', user.id, { lastLogin: new Date().toLocaleString('ar-KW') });

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
// Pages blocked per role by default
const SUPERVISOR_BLOCKED_DEFAULT = ['licenses'];
const ADMIN_BLOCKED_DEFAULT      = ['settings']; // admin can see all but not settings

function isSuperAdmin(user) { return user?.role === 'super_admin'; }
function isAdmin(user)      { return user?.role === 'admin' || isSuperAdmin(user); }

function getUserPermissions(user) {
  if (isSuperAdmin(user)) return null; // unrestricted
  if (isAdmin(user)) {
    // admin: all pages except settings
    return Object.keys(PAGE_TITLES).filter(p => !ADMIN_BLOCKED_DEFAULT.includes(p));
  }
  const custom = DB.get('userPerms_' + user.id);
  if (custom) return custom;
  return Object.keys(PAGE_TITLES).filter(p => !SUPERVISOR_BLOCKED_DEFAULT.includes(p));
}

function canAccessPage(pageId) {
  if (!currentUser) return false;
  if (isSuperAdmin(currentUser)) return true;
  const perms = getUserPermissions(currentUser);
  if (!perms) return true;
  return perms.includes(pageId);
}

function applyNavPermissions(user) {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    const pageId = item.dataset.page;
    const perms  = getUserPermissions(user);
    item.style.display = (!perms || perms.includes(pageId)) ? '' : 'none';
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
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  const branches = isAdmin
    ? (currentBranch === 'all' ? ['esh','sol','mat','esh_e','sol_e','mat_e'] : [currentBranch])
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

  // Evening subscriptions expiring within 5 days
  const expiringSubscriptions = getExpiringSubscriptions(5);
  if (expiringSubscriptions.length) {
    const names = expiringSubscriptions.map(s => `<b>${s.name}</b> (${daysUntil(s.subscriptionEnd)} يوم)`).join('، ');
    alerts.push(`<div class="alert alert-warning">🌙 اشتراكات المسائي تنتهي قريباً: ${names}
      <button class="btn btn-outline btn-sm" style="margin-right:8px" onclick="setBranchFilter('esh_e',document.querySelector('[onclick*=esh_e]'));showPage('students')">عرض</button>
    </div>`);
  }

  if (!alerts.length)
    alerts.push(`<div class="alert alert-success">✅ لا توجد تنبيهات عاجلة</div>`);

  document.getElementById('alertsContainer').innerHTML = alerts.join('');
}

// ============================================================
// STUDENTS
// ============================================================
let studentSearchQuery = '';

function renderStudents() {
  const container = document.getElementById('studentsFilter');
  container.innerHTML = `
    ${isAdmin(currentUser)
      ? Object.entries(BRANCHES).map(([k,v]) => `<span class="filter-chip ${currentBranch===k?'active':''}" onclick="setBranchFilter('${k}',this)">${v.name}</span>`).join('')
      : `<span class="filter-chip active">${BRANCHES[currentBranch]?.name || ''}</span>`
    }
    <span class="filter-chip" id="gradeAll" onclick="gradeFilter('all',this)">كل المراحل</span>
    <span class="filter-chip" onclick="gradeFilter('nursery',this)">حضانة</span>
    <span class="filter-chip" onclick="gradeFilter('KG1',this)">KG1</span>
    <span class="filter-chip" onclick="gradeFilter('KG2',this)">KG2</span>
    <input type="text" id="studentSearch" placeholder="🔍 بحث باسم الطالب أو الكود..."
      value="${studentSearchQuery}"
      oninput="studentSearchQuery=this.value;renderStudentsTable(activeGrade)"
      style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;width:220px;font-family:inherit">
    <button class="btn btn-primary" style="margin-right:auto" onclick="openAddStudent()">➕ إضافة طالب</button>
    <button class="btn btn-outline" id="archiveToggleBtn" onclick="toggleArchivedStudents(this)">🗄 الأرشيف</button>
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
  if (currentUser && !isAdmin(currentUser)) return;
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

let showArchivedStudents = false;

function toggleArchivedStudents(btn) {
  showArchivedStudents = !showArchivedStudents;
  btn.textContent = showArchivedStudents ? '👁 إخفاء الأرشيف' : '🗄 الأرشيف';
  btn.classList.toggle('btn-primary', showArchivedStudents);
  renderStudentsTable(activeGrade);
}

function renderStudentsTable(grade) {
  let list = filterByBranch(DB.all('students'));
  if (grade !== 'all') list = list.filter(s => s.grade === grade);
  // Search filter
  if (studentSearchQuery && studentSearchQuery.trim()) {
    const q = studentSearchQuery.trim().toLowerCase();
    list = list.filter(s => s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || s.phone1?.includes(q));
  }

  const isEveningView = EVENING_BRANCHES.includes(currentBranch);

  if (isEveningView) {
    if (showArchivedStudents) {
      list = list.filter(s => s.enrollStatus === 'withdrawn');
    } else {
      list = list.filter(s => s.enrollStatus !== 'withdrawn');
    }
  }

  const grades     = getGrades();
  const gradeLabel = Object.fromEntries(grades.map(g=>[g.id, g.label]));
  const gradeBadge = Object.fromEntries(grades.map((g,i)=>[g.id, ['badge-green','badge-blue','badge-purple','badge-orange','badge-gray'][i%5]]));

  const rows = list.map(s => {
    const st  = studentStatus(s);
    const rem = s.net - s.paid;
    const evening = isEveningBranch(s.branch);

    const subscriptionCells = evening ? `
      <td style="font-size:12px">${s.subscriptionType==='monthly'?'شهري':s.subscriptionType==='weekly'?'أسبوعي':'يومي'}</td>
      <td style="font-size:12px">${fmtDate(s.subscriptionEnd)||'—'}</td>
      <td style="font-size:12px;color:var(--text-muted)">${fmtDate(s.joinDate||s.startDate)||'—'}</td>
      ${s.enrollStatus==='withdrawn'?`<td style="font-size:12px;color:var(--danger)">${fmtDate(s.withdrawDate)||'—'}</td>`:'<td>—</td>'}
    ` : `<td colspan="4" style="color:var(--text-muted);font-size:11px;text-align:center">—</td>`;

    const actionBtns = evening ? `
      <button class="btn btn-outline btn-sm" onclick="openEditStudent('${s.id}')">✏️ تعديل</button>
      <button class="btn btn-outline btn-sm" onclick="openStudentInstallments('${s.id}')">📋 الأقساط</button>
      ${s.enrollStatus !== 'withdrawn'
        ? `<button class="btn btn-primary btn-sm" onclick="openRenewModal('${s.id}')">🔄 تجديد</button>
           <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="withdrawStudent('${s.id}','${s.name}')">🚪 انسحاب</button>`
        : `<button class="btn btn-outline btn-sm" style="color:var(--primary);border-color:var(--primary)" onclick="reactivateStudent('${s.id}')">↩️ إعادة</button>`
      }
      <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteStudent('${s.id}','${s.name}')">🗑️ حذف</button>
    ` : `
      <button class="btn btn-outline btn-sm" onclick="openEditStudent('${s.id}')">✏️ تعديل</button>
      <button class="btn btn-outline btn-sm" onclick="openStudentInstallments('${s.id}')">📋 الأقساط</button>
      <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteStudent('${s.id}','${s.name}')">🗑️ حذف</button>
    `;

    const showFinancials = isAdmin(currentUser);
    const financialCells = showFinancials
      ? `<td>${fmtKD(s.net)}</td>
         <td style="color:var(--primary)">${fmtKD(s.paid)}</td>
         <td style="color:${rem>0?'var(--danger)':'var(--primary)'}">${fmtKD(rem)}</td>`
      : '';

    return `<tr style="${s.enrollStatus==='withdrawn'?'opacity:0.6':s.subscriptionEnd&&daysUntil(s.subscriptionEnd)<=5&&daysUntil(s.subscriptionEnd)>=0?'background:#fffbeb':''}">
      <td style="color:var(--text-muted)">${s.id}</td>
      <td><b>${s.name}</b></td>
      <td><span class="badge ${gradeBadge[s.grade]||'badge-gray'}">${gradeLabel[s.grade]||s.grade}</span></td>
      <td><span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span></td>
      <td>${s.phone1}</td>
      <td>${s.phone2||'—'}</td>
      <td>${fmtDate(s.dob)}</td>
      <td>${fmtDate(s.startDate)}</td>
      ${financialCells}
      ${subscriptionCells}
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>${actionBtns}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="17" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</td></tr>`;

  const eveningHeaders = isEveningView
    ? `<th>نوع الاشتراك</th><th>انتهاء الاشتراك</th><th>تاريخ الانضمام</th><th>تاريخ الانسحاب</th>`
    : `<th colspan="4"></th>`;

  const showFinancialHeaders = isAdmin(currentUser);

  document.getElementById('studentsTable').innerHTML = `
    <thead><tr>
      <th>الكود</th><th>الاسم</th><th>المرحلة</th><th>الفرع</th>
      <th>هاتف 1</th><th>هاتف 2</th><th>تاريخ الميلاد</th><th>تاريخ المباشرة</th>
      ${showFinancialHeaders ? '<th>الصافي</th><th>المدفوع</th><th>المتبقي</th>' : ''}
      ${eveningHeaders}
      <th>الحالة</th><th>إجراءات</th>
    </tr></thead>
    <tbody>${rows}</tbody>`;
}

// ===== EVENING SUBSCRIPTION ACTIONS =====

function withdrawStudent(id, name) {
  if (!confirm('تسجيل انسحاب ' + name + '؟')) return;
  const today = new Date().toISOString().split('T')[0];
  DB.update('students', id, { enrollStatus: 'withdrawn', withdrawDate: today });
  renderStudentsTable(activeGrade);
  showToast('🚪 تم تسجيل انسحاب ' + name);
}

function reactivateStudent(id) {
  DB.update('students', id, { enrollStatus: 'active', withdrawDate: '' });
  renderStudentsTable(activeGrade);
  showToast('✅ تم إعادة تفعيل الطالب');
}

function openRenewModal(studentId) {
  const s = DB.all('students').find(st => st.id === studentId);
  if (!s) return;
  const today = new Date().toISOString().split('T')[0];
  const div = document.createElement('div');
  div.innerHTML = `
    <div id="modal-renew" class="modal-overlay open">
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <div class="modal-title">🔄 تجديد اشتراك — ${s.name}</div>
          <button class="modal-close" onclick="document.getElementById('modal-renew').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="background:var(--bg);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px">
            <span style="color:var(--text-muted)">انتهاء الاشتراك الحالي:</span>
            <b style="color:var(--primary)">${fmtDate(s.subscriptionEnd||today)}</b>
          </div>
          <div class="form-group">
            <label>نوع الاشتراك</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap" id="renewTypeChips">
              <div class="pay-chip ${(!s.subscriptionType||s.subscriptionType==='monthly')?'selected':''}" onclick="selRenewType(this)">📅 شهري</div>
              <div class="pay-chip ${s.subscriptionType==='weekly'?'selected':''}" onclick="selRenewType(this)">🗓 أسبوعي</div>
              <div class="pay-chip ${s.subscriptionType==='daily'?'selected':''}" onclick="selRenewType(this)">☀️ يومي</div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>تاريخ بداية الاشتراك الجديد</label>
              <input type="date" id="renewStart" value="${today}"
                style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="calcRenewEnd()">
            </div>
            <div class="form-group">
              <label>تاريخ الانتهاء</label>
              <input type="date" id="renewEnd"
                style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            </div>
          </div>
          <div class="form-group">
            <label>رسوم الاشتراك (د.ك) *</label>
            <input type="number" id="renewFee" step="0.001" min="0" placeholder="0.000"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>
          <div class="form-group">
            <label>ملاحظة</label>
            <input type="text" id="renewNote" placeholder="اختياري"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modal-renew').remove()">إلغاء</button>
          <button class="btn btn-primary" onclick="confirmRenew('${studentId}')">✅ تأكيد التجديد</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modals').appendChild(div.firstElementChild);
  calcRenewEnd();
}

function selRenewType(el) {
  el.closest('#renewTypeChips').querySelectorAll('.pay-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  calcRenewEnd();
}

function calcRenewEnd() {
  const start = document.getElementById('renewStart')?.value;
  if (!start) return;
  const label = document.querySelector('#renewTypeChips .pay-chip.selected')?.textContent || '';
  const d = new Date(start);
  if (label.includes('شهري'))       d.setMonth(d.getMonth() + 1);
  else if (label.includes('أسبوعي')) d.setDate(d.getDate() + 7);
  document.getElementById('renewEnd').value = d.toISOString().split('T')[0];
}

function confirmRenew(studentId) {
  const fee   = parseFloat(document.getElementById('renewFee').value) || 0;
  const end   = document.getElementById('renewEnd').value;
  const start = document.getElementById('renewStart').value;
  const note  = document.getElementById('renewNote').value.trim();
  const label = document.querySelector('#renewTypeChips .pay-chip.selected')?.textContent || '';
  const type  = label.includes('شهري') ? 'monthly' : label.includes('أسبوعي') ? 'weekly' : 'daily';

  if (!fee) { showToast('⚠️ أدخل رسوم الاشتراك'); return; }
  if (!end) { showToast('⚠️ أدخل تاريخ الانتهاء'); return; }

  const s = DB.all('students').find(st => st.id === studentId);
  if (!s) return;

  DB.update('students', studentId, {
    subscriptionType: type,
    subscriptionEnd:  end,
    enrollStatus:     'active',
    fees: (s.fees||0) + fee,
    net:  (s.net||0)  + fee
  });

  DB.add('installments', {
    id:          DB.nextId('installments','I'),
    studentId,
    num:         DB.all('installments').filter(i => i.studentId === studentId).length + 1,
    amount:      fee,
    partialPaid: 0,
    dueDate:     start,
    paidDate:    '',
    status:      'pending',
    method:      '',
    note:        note || ('اشتراك ' + (type==='monthly'?'شهري':type==='weekly'?'أسبوعي':'يومي'))
  });

  document.getElementById('modal-renew').remove();
  renderStudentsTable(activeGrade);
  showToast('✅ تم تجديد اشتراك ' + s.name + ' حتى ' + fmtDate(end));
}
function filterByBranch(arr) {
  if (currentUser && !isAdmin(currentUser)) {
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
// openStudentInstallments def