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
// ============================================================
// CLOTHES
// ============================================================
function renderClothes() {
  const page = document.getElementById('page-clothes');
  if (!page) return;

  const items = filterByBranch(DB.all('clothes'));

  page.innerHTML = `
    <div class="filter-bar" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="openAddClothes()">➕ إضافة صنف</button>
      <button class="btn btn-outline" onclick="exportClothesExcel()">📥 Excel</button>
      <button class="btn btn-outline" onclick="printClothesReport()">🖨️ PDF</button>
    </div>
    <div class="card">
      <div class="card-title">👕 مخزن الملابس</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th><th>الصنف</th><th>المقاس</th>
              <th>الفرع</th><th>الكمية</th><th>الحد الأدنى</th>
              <th>الحالة</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${items.length ? items.map(i => {
              const low = i.qty <= i.minQty;
              return `<tr>
                <td>${i.id}</td>
                <td>${i.name}</td>
                <td>${i.size||'—'}</td>
                <td><span class="badge ${BRANCHES[i.branch]?.badge||'badge-gray'}">${BRANCHES[i.branch]?.name||i.branch}</span></td>
                <td><b>${i.qty}</b></td>
                <td>${i.minQty||0}</td>
                <td><span class="badge ${low?'badge-red':'badge-green'}">${low?'منخفض':'كافي'}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="editClothes('${i.id}')">✏️</button>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="deleteClothes('${i.id}')">🗑️</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد أصناف مضافة</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    <div id="modal-clothes"></div>
  `;
}

function openAddClothes(id) {
  const item = id ? DB.all('clothes').find(i => i.id === id) : null;
  const html = `
    <div class="modal-overlay open" id="mc">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>${item ? 'تعديل صنف' : 'إضافة صنف ملابس'}</h3>
          <button class="modal-close" onclick="document.getElementById('mc').remove()">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="cId" value="${item?.id||''}">
          <div class="form-group"><label>اسم الصنف *</label><input id="cName" class="form-control" value="${item?.name||''}"></div>
          <div class="form-row">
            <div class="form-group"><label>المقاس</label><input id="cSize" class="form-control" value="${item?.size||''}"></div>
            <div class="form-group"><label>الفرع *</label>
              <select id="cBranch" class="form-control" ${currentUser?.role!=='admin'?'disabled':''}>
                ${Object.entries(BRANCHES).filter(([k])=>k!=='all').map(([k,v])=>`<option value="${k}" ${(item?.branch||currentUser?.branch||'esh')===k?'selected':''}>${v.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الكمية *</label><input id="cQty" class="form-control" type="number" value="${item?.qty||0}"></div>
            <div class="form-group"><label>الحد الأدنى</label><input id="cMin" class="form-control" type="number" value="${item?.minQty||5}"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveClothes()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="document.getElementById('mc').remove()">إلغاء</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modal-clothes').innerHTML = html;
}

function saveClothes() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { showToast('❌ يرجى إدخال اسم الصنف'); return; }
  const id = document.getElementById('cId').value;
  const data = {
    name,
    size:   document.getElementById('cSize').value.trim(),
    branch: document.getElementById('cBranch').value,
    qty:    parseInt(document.getElementById('cQty').value)||0,
    minQty: parseInt(document.getElementById('cMin').value)||5
  };
  if (id) DB.update('clothes', id, data);
  else    DB.add('clothes', { id: DB.nextId('clothes','C'), ...data });
  document.getElementById('mc').remove();
  showToast('✅ تم الحفظ');
  renderClothes();
}

function editClothes(id)   { openAddClothes(id); }

function deleteClothes(id) {
  if (!confirm('هل تريد حذف هذا الصنف؟')) return;
  DB.remove('clothes', id);
  showToast('🗑️ تم الحذف');
  renderClothes();
}

function exportClothesExcel() {
  const items = filterByBranch(DB.all('clothes'));
  const data = items.map(i => ({
    'الكود':     i.id,
    'الصنف':     i.name,
    'المقاس':    i.size||'—',
    'الفرع':     BRANCHES[i.branch]?.name||i.branch,
    'الكمية':    i.qty,
    'الحد الأدنى': i.minQty||0,
    'الحالة':    i.qty<=(i.minQty||0) ? 'منخفض' : 'كافي'
  }));
  xlsxExport(data, 'مخزن_الملابس');
}

function printClothesReport() {
  const items = filterByBranch(DB.all('clothes'));
  const rows = items.map(i => [
    i.id, i.name, i.size||'—',
    BRANCHES[i.branch]?.name||i.branch,
    i.qty, i.minQty||0,
    i.qty<=(i.minQty||0)?'منخفض':'كافي'
  ]);
  printReport('تقرير مخزن الملابس',
    ['الكود','الصنف','المقاس','الفرع','الكمية','الحد الأدنى','الحالة'], rows);
}

// ============================================================
// SUPPLIES
// ============================================================
function renderSupplies() {
  const page = document.getElementById('page-supplies');
  if (!page) return;

  const items = filterByBranch(DB.all('supplies'));
  const today = new Date();

  page.innerHTML = `
    <div class="filter-bar" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="openAddSupply()">➕ إضافة صنف</button>
      <button class="btn btn-outline" onclick="exportSuppliesExcel()">📥 Excel</button>
      <button class="btn btn-outline" onclick="printSuppliesReport()">🖨️ PDF</button>
    </div>
    <div class="card">
      <div class="card-title">📦 المستهلكات</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th><th>الصنف</th><th>الوحدة</th><th>الفرع</th>
              <th>الكمية</th><th>تاريخ الاستلام</th><th>تاريخ الانتهاء</th>
              <th>الحالة</th><th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${items.length ? items.map(i => {
              const d = daysUntil(i.expiryDate);
              const st = d < 0 ? {label:'منتهي',cls:'badge-red'} : d < 30 ? {label:'ينتهي قريباً',cls:'badge-orange'} : {label:'جيد',cls:'badge-green'};
              return `<tr>
                <td>${i.id}</td>
                <td>${i.name}</td>
                <td>${i.unit||'—'}</td>
                <td><span class="badge ${BRANCHES[i.branch]?.badge||'badge-gray'}">${BRANCHES[i.branch]?.name||i.branch}</span></td>
                <td><b>${i.qty}</b></td>
                <td>${fmtDate(i.receiveDate)||'—'}</td>
                <td>${fmtDate(i.expiryDate)||'—'}</td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="editSupply('${i.id}')">✏️</button>
                  <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="deleteSupply('${i.id}')">🗑️</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد أصناف مضافة</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    <div id="modal-supply"></div>
  `;
}

function openAddSupply(id) {
  const item = id ? DB.all('supplies').find(i => i.id === id) : null;
  const html = `
    <div class="modal-overlay open" id="ms">
      <div class="modal" style="max-width:440px">
        <div class="modal-header">
          <h3>${item ? 'تعديل صنف' : 'إضافة صنف مستهلكات'}</h3>
          <button class="modal-close" onclick="document.getElementById('ms').remove()">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="supId" value="${item?.id||''}">
          <div class="form-row">
            <div class="form-group"><label>اسم الصنف *</label><input id="supName" class="form-control" value="${item?.name||''}"></div>
            <div class="form-group"><label>الوحدة</label><input id="supUnit" class="form-control" value="${item?.unit||''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الفرع *</label>
              <select id="supBranch" class="form-control" ${currentUser?.role!=='admin'?'disabled':''}>
                ${Object.entries(BRANCHES).filter(([k])=>k!=='all').map(([k,v])=>`<option value="${k}" ${(item?.branch||currentUser?.branch||'esh')===k?'selected':''}>${v.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>الكمية *</label><input id="supQty" class="form-control" type="number" value="${item?.qty||0}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تاريخ الاستلام</label><input id="supReceive" class="form-control" type="date" value="${item?.receiveDate||''}"></div>
            <div class="form-group"><label>تاريخ الانتهاء</label><input id="supExpiry" class="form-control" type="date" value="${item?.expiryDate||''}"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveSupply()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="document.getElementById('ms').remove()">إلغاء</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modal-supply').innerHTML = html;
}

function saveSupply() {
  const name = document.getElementById('supName').value.trim();
  if (!name) { showToast('❌ يرجى إدخال اسم الصنف'); return; }
  const id = document.getElementById('supId').value;
  const data = {
    name,
    unit:        document.getElementById('supUnit').value.trim(),
    branch:      document.getElementById('supBranch').value,
    qty:         parseFloat(document.getElementById('supQty').value)||0,
    receiveDate: document.getElementById('supReceive').value,
    expiryDate:  document.getElementById('supExpiry').value
  };
  if (id) DB.update('supplies', id, data);
  else    DB.add('supplies', { id: DB.nextId('supplies','P'), ...data });
  document.getElementById('ms').remove();
  showToast('✅ تم الحفظ');
  renderSupplies();
}

function editSupply(id)   { openAddSupply(id); }

function deleteSupply(id) {
  if (!confirm('هل تريد حذف هذا الصنف؟')) return;
  DB.remove('supplies', id);
  showToast('🗑️ تم الحذف');
  renderSupplies();
}

function exportSuppliesExcel() {
  const items = filterByBranch(DB.all('supplies'));
  const data = items.map(i => {
    const d = daysUntil(i.expiryDate);
    return {
      'الكود':          i.id,
      'الصنف':          i.name,
      'الوحدة':         i.unit||'—',
      'الفرع':          BRANCHES[i.branch]?.name||i.branch,
      'الكمية':         i.qty,
      'تاريخ الاستلام': fmtDate(i.receiveDate)||'—',
      'تاريخ الانتهاء': fmtDate(i.expiryDate)||'—',
      'الحالة':         d < 0 ? 'منتهي' : d < 30 ? 'ينتهي قريباً' : 'جيد'
    };
  });
  xlsxExport(data, 'المستهلكات');
}

function printSuppliesReport() {
  const items = filterByBranch(DB.all('supplies'));
  const rows = items.map(i => {
    const d = daysUntil(i.expiryDate);
    return [
      i.id, i.name, i.unit||'—',
      BRANCHES[i.branch]?.name||i.branch,
      i.qty, fmtDate(i.receiveDate)||'—',
      fmtDate(i.expiryDate)||'—',
      d < 0 ? 'منتهي' : d < 30 ? 'ينتهي قريباً' : 'جيد'
    ];
  });
  printReport('تقرير المستهلكات',
    ['الكود','الصنف','الوحدة','الفرع','الكمية','تاريخ الاستلام','تاريخ الانتهاء','الحالة'], rows);
}
function renderMessages(){}
function renderAutoreply(){}
function renderHR()      {}
function renderLicenses(){}
function renderSettings(){}
