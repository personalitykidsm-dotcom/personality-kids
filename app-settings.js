// ============================================================
// APP-SETTINGS.JS  —  System settings & user management
// ============================================================

function renderSettings() {
  const cont = document.getElementById('page-settings');
  if (!cont) return;

  const settings = DB.get('nurserySettings') || {};
  const users    = DB.all('users');

  // only admin can access settings
  if (currentUser?.role !== 'admin') {
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <h3 style="color:var(--danger)">صلاحية مقيدة</h3>
      <p style="color:var(--text-muted)">الإعدادات متاحة للمدير العام فقط</p>
    </div>`;
    return;
  }

  cont.innerHTML = `
    <div class="tabs" style="margin-bottom:20px">
      <button class="tab-btn active" onclick="settTab('users',this)">👤 المستخدمون</button>
      <button class="tab-btn" onclick="settTab('perms',this)">🔑 الصلاحيات</button>
      <button class="tab-btn" onclick="settTab('nursery',this)">🏫 إعدادات الروضة</button>
      <button class="tab-btn" onclick="settTab('data',this)">💾 البيانات</button>
    </div>
    <div id="settContent"></div>

    <!-- PIN Change Modal -->
    <div class="modal-overlay" id="pinModal">
      <div class="modal" style="max-width:360px">
        <div class="modal-header">
          <h3>تغيير الرقم السري</h3>
          <button class="modal-close" onclick="closeModal('pinModal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="pinUserId">
          <div class="form-group">
            <label>المستخدم</label>
            <input id="pinUserName" class="form-control" readonly style="background:var(--bg-secondary)">
          </div>
          <div class="form-group">
            <label>الرقم السري الجديد *</label>
            <input id="pinNew" class="form-control" type="password" maxlength="6" placeholder="أدخل رقماً سرياً من 4-6 أرقام">
          </div>
          <div class="form-group">
            <label>تأكيد الرقم السري *</label>
            <input id="pinConfirm" class="form-control" type="password" maxlength="6" placeholder="أعد إدخال الرقم السري">
          </div>
          <div id="pinError" style="color:var(--danger);font-size:13px;margin-top:4px"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="savePIN()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="closeModal('pinModal')">إلغاء</button>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div class="modal-overlay" id="addUserModal">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3 id="addUserTitle">إضافة مستخدم</h3>
          <button class="modal-close" onclick="closeModal('addUserModal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="editUserId">
          <div class="form-group">
            <label>الاسم *</label>
            <input id="userName" class="form-control" placeholder="اسم المستخدم">
          </div>
          <div class="form-group">
            <label>الدور *</label>
            <select id="userRole" class="form-control" onchange="toggleUserBranch()">
              <option value="admin">مدير عام</option>
              <option value="supervisor">مشرف فرع</option>
            </select>
          </div>
          <div class="form-group" id="userBranchGroup">
            <label>الفرع *</label>
            <select id="userBranch" class="form-control">
              <option value="esh">اشبيلية</option>
              <option value="sol">الصليبخات</option>
              <option value="mat">المطلاع</option>
            </select>
          </div>
          <div class="form-group">
            <label>الرمز (حرف للصورة الرمزية)</label>
            <input id="userAvatar" class="form-control" maxlength="2" placeholder="أ">
          </div>
          <div class="form-group">
            <label>الرقم السري *</label>
            <input id="userPin" class="form-control" type="password" maxlength="6" placeholder="4-6 أرقام">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveUser()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="closeModal('addUserModal')">إلغاء</button>
        </div>
      </div>
    </div>
  `;

  settTab('users', cont.querySelector('.tab-btn'));
}

function settTab(tab, el) {
  document.querySelectorAll('#page-settings .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  const cont = document.getElementById('settContent');
  if (tab === 'users')   renderUsersTab(cont);
  if (tab === 'perms')   renderPermsTab(cont);
  if (tab === 'nursery') renderNurseryTab(cont);
  if (tab === 'data')    renderDataTab(cont);
}

// ── USERS TAB ──────────────────────────────────────────────
function renderUsersTab(cont) {
  const users = DB.all('users');
  const rows  = users.map(u => `
    <tr>
      <td><span class="avatar-circle" style="width:32px;height:32px;font-size:14px">${u.avatar||u.name[0]}</span></td>
      <td><b>${u.name}</b></td>
      <td><span class="badge ${u.role==='admin'?'badge-purple':'badge-blue'}">${u.role==='admin'?'مدير عام':'مشرف'}</span></td>
      <td><span class="badge ${BRANCHES[u.branch]?.badge||'badge-gray'}">${BRANCHES[u.branch]?.name||u.branch}</span></td>
      <td style="color:var(--text-muted);font-size:12px">${u.lastLogin||'—'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openChangePIN('${u.id}')">🔑 تغيير PIN</button>
        <button class="btn btn-outline btn-sm" onclick="openEditUser('${u.id}')">✏️</button>
        ${u.id !== currentUser?.id ? `<button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="deleteUser('${u.id}')">🗑️</button>` : ''}
      </td>
    </tr>`).join('');

  cont.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">إدارة المستخدمين</h3>
      <button class="btn btn-primary" onclick="openAddUser()">➕ إضافة مستخدم</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th></th><th>الاسم</th><th>الدور</th><th>الفرع</th><th>آخر دخول</th><th>إجراءات</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openChangePIN(userId) {
  const u = DB.all('users').find(x => x.id === userId);
  if (!u) return;
  document.getElementById('pinUserId').value   = userId;
  document.getElementById('pinUserName').value = u.name;
  document.getElementById('pinNew').value      = '';
  document.getElementById('pinConfirm').value  = '';
  document.getElementById('pinError').textContent = '';
  openModal('pinModal');
}

function savePIN() {
  const id  = document.getElementById('pinUserId').value;
  const p1  = document.getElementById('pinNew').value;
  const p2  = document.getElementById('pinConfirm').value;
  const err = document.getElementById('pinError');
  err.textContent = '';
  if (p1.length < 4) { err.textContent = '❌ الرقم السري يجب أن يكون 4 أرقام على الأقل'; return; }
  if (p1 !== p2)     { err.textContent = '❌ الرقمان السريان غير متطابقين'; return; }
  DB.update('users', id, { pin: p1 });
  closeModal('pinModal');
  showToast('✅ تم تغيير الرقم السري');
}

function openAddUser() {
  document.getElementById('addUserTitle').textContent = 'إضافة مستخدم';
  document.getElementById('editUserId').value = '';
  ['userName','userAvatar','userPin'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('userRole').value   = 'supervisor';
  document.getElementById('userBranch').value = 'esh';
  toggleUserBranch();
  openModal('addUserModal');
}

function openEditUser(id) {
  const u = DB.all('users').find(x => x.id === id);
  if (!u) return;
  document.getElementById('addUserTitle').textContent = 'تعديل مستخدم';
  document.getElementById('editUserId').value  = id;
  document.getElementById('userName').value    = u.name;
  document.getElementById('userRole').value    = u.role;
  document.getElementById('userBranch').value  = u.branch;
  document.getElementById('userAvatar').value  = u.avatar || '';
  document.getElementById('userPin').value     = '';
  toggleUserBranch();
  openModal('addUserModal');
}

function toggleUserBranch() {
  const role = document.getElementById('userRole').value;
  document.getElementById('userBranchGroup').style.display = role === 'admin' ? 'none' : '';
}

function saveUser() {
  const name   = document.getElementById('userName').value.trim();
  const role   = document.getElementById('userRole').value;
  const branch = role === 'admin' ? 'all' : document.getElementById('userBranch').value;
  const avatar = document.getElementById('userAvatar').value.trim() || name[0];
  const pin    = document.getElementById('userPin').value;
  const editId = document.getElementById('editUserId').value;

  if (!name) { showToast('❌ الاسم مطلوب'); return; }

  if (editId) {
    const upd = { name, role, branch, avatar };
    if (pin) upd.pin = pin;
    DB.update('users', editId, upd);
    showToast('✅ تم تحديث المستخدم');
  } else {
    if (!pin || pin.length < 4) { showToast('❌ أدخل رقماً سرياً صالحاً'); return; }
    DB.add('users', { id: DB.nextId('users','USR'), name, role, branch, avatar, pin });
    showToast('✅ تم إضافة المستخدم');
  }
  closeModal('addUserModal');
  renderUsersTab(document.getElementById('settContent'));
}

function deleteUser(id) {
  if (!confirm('هل تريد حذف هذا المستخدم؟')) return;
  DB.remove('users', id);
  showToast('🗑️ تم الحذف');
  renderUsersTab(document.getElementById('settContent'));
}

// ── NURSERY TAB ────────────────────────────────────────────
function renderNurseryTab(cont) {
  const s = DB.get('nurserySettings') || {};
  cont.innerHTML = `
    <div class="card" style="max-width:560px">
      <h3 style="margin-top:0">إعدادات الروضة</h3>
      <div class="form-group">
        <label>اسم الروضة</label>
        <input id="stgName" class="form-control" value="${s.name||'روضة الأمل'}">
      </div>
      <div class="form-group">
        <label>رقم WhatsApp للمسؤول</label>
        <input id="stgWA" class="form-control" placeholder="965XXXXXXXX" value="${s.waNumber||''}">
      </div>
      <div class="form-group">
        <label>السنة الدراسية</label>
        <input id="stgYear" class="form-control" placeholder="2024-2025" value="${s.year||''}">
      </div>
      <div class="form-group">
        <label>رسوم التسجيل الافتراضية (د.ك)</label>
        <input id="stgRegFee" class="form-control" type="number" step="0.001" value="${s.regFee||0}">
      </div>
      <div class="form-group">
        <label>عدد الأقساط الافتراضي</label>
        <input id="stgInst" class="form-control" type="number" min="1" max="12" value="${s.defaultInstallments||4}">
      </div>
      <button class="btn btn-primary" onclick="saveNurserySettings()">💾 حفظ الإعدادات</button>
    </div>`;
}

function saveNurserySettings() {
  DB.set('nurserySettings', {
    name:                document.getElementById('stgName').value.trim(),
    waNumber:            document.getElementById('stgWA').value.trim(),
    year:                document.getElementById('stgYear').value.trim(),
    regFee:              parseFloat(document.getElementById('stgRegFee').value) || 0,
    defaultInstallments: parseInt(document.getElementById('stgInst').value) || 4
  });
  showToast('✅ تم حفظ إعدادات الروضة');
}

// ── DATA TAB ───────────────────────────────────────────────
function renderDataTab(cont) {
  const students   = DB.all('students').length;
  const employees  = DB.all('employees').length;
  const licenses   = DB.all('licenses').length;
  const installs   = DB.all('installments').length;

  cont.innerHTML = `
    <div class="card" style="max-width:560px">
      <h3 style="margin-top:0">إدارة البيانات</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="stat-card"><div class="stat-icon">👦</div><div>
          <div class="stat-value" style="color:var(--primary)">${students}</div>
          <div class="stat-label">طالب</div></div></div>
        <div class="stat-card"><div class="stat-icon">👩‍🏫</div><div>
          <div class="stat-value" style="color:var(--purple)">${employees}</div>
          <div class="stat-label">موظف</div></div></div>
        <div class="stat-card"><div class="stat-icon">📋</div><div>
          <div class="stat-value" style="color:var(--info)">${installs}</div>
          <div class="stat-label">قسط</div></div></div>
        <div class="stat-card"><div class="stat-icon">📜</div><div>
          <div class="stat-value" style="color:var(--accent)">${licenses}</div>
          <div class="stat-label">ترخيص</div></div></div>
      </div>
      <hr>
      <h4>تصدير كامل للبيانات</h4>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <button class="btn btn-outline" onclick="exportAllData()">📥 تصدير JSON</button>
        <button class="btn btn-outline" onclick="importDataClick()">📤 استيراد JSON</button>
        <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importData(event)">
      </div>
      <hr>
      <h4 style="color:var(--danger)">⚠️ منطقة الخطر</h4>
      <p style="color:var(--text-muted);font-size:13px">سيؤدي إعادة الضبط إلى حذف جميع البيانات واستعادة البيانات الافتراضية.</p>
      <button class="btn" style="background:var(--danger);color:#fff" onclick="resetAllData()">🔄 إعادة ضبط المصنع</button>
    </div>`;
}

function exportAllData() {
  const data = {};
  ['students','installments','employees','leaves','attendance','supplies','clothes',
   'licenses','users','autoRules','nurserySettings','licenseReminderDays'].forEach(k => {
    data[k] = localStorage.getItem('pk_' + k)
      ? JSON.parse(localStorage.getItem('pk_' + k)) : null;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'nursery_backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  showToast('✅ تم تصدير البيانات');
}

function importDataClick() {
  document.getElementById('importFileInput').click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null) localStorage.setItem('pk_' + k, JSON.stringify(v));
      });
      showToast('✅ تم استيراد البيانات — أعد تحميل الصفحة');
    } catch {
      showToast('❌ ملف غير صالح');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('تحذير: سيتم حذف جميع البيانات! هل أنت متأكد؟')) return;
  if (!confirm('تأكيد نهائي: سيتم حذف كل شيء وإعادة البيانات الافتراضية!')) return;
  DB.reset();
  showToast('✅ تم إعادة الضبط — جارٍ إعادة التحميل...');
  setTimeout(() => location.reload(), 1500);
}

// ============================================================
// ── PERMISSIONS TAB ──────────────────────────────────────────
// ============================================================

const ALL_PAGES_LABELS = {
  dashboard: '🏠 لوحة التحكم',
  students:  '👦 الطلاب',
  fees:      '💳 الرسوم والأقساط',
  reports:   '📊 التقارير',
  clothes:   '👔 مخزن الملابس',
  supplies:  '📦 المستهلكات',
  messages:  '💬 رسائل واتساب',
  autoreply: '🤖 الرد التلقائي',
  hr:        '👩‍🏫 شؤون العاملين',
  licenses:  '📜 التراخيص (مدير فقط)',
  settings:  '⚙️ الإعدادات'
};

// Pages that are always admin-only — cannot be granted to supervisors
const ALWAYS_ADMIN = ['licenses', 'settings'];

function renderPermsTab(cont) {
  const supervisors = DB.all('users').filter(u => u.role !== 'admin');
  if (!supervisors.length) {
    cont.innerHTML = `<div class="card" style="padding:30px;text-align:center;color:var(--text-muted)">لا يوجد مشرفون لضبط صلاحياتهم</div>`;
    return;
  }

  const cards = supervisors.map(u => {
    const savedPerms = DB.get('userPerms_' + u.id);
    const allPages   = Object.keys(ALL_PAGES_LABELS).filter(p => !ALWAYS_ADMIN.includes(p));
    const granted    = savedPerms || allPages.filter(p => p !== 'licenses');

    const checks = allPages.map(p => `
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="perm-${u.id}-${p}" ${granted.includes(p)?'checked':''}
          style="width:15px;height:15px;cursor:pointer">
        <span>${ALL_PAGES_LABELS[p]}</span>
      </label>`).join('');

    return `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div class="avatar-circle">${u.avatar||u.name[0]}</div>
          <div>
            <div style="font-weight:700">${u.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">
              <span class="badge ${BRANCHES[u.branch]?.badge||'badge-gray'}">${BRANCHES[u.branch]?.name||u.branch}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-right:auto"
            onclick="saveUserPerms('${u.id}')">💾 حفظ الصلاحيات</button>
          <button class="btn btn-outline btn-sm"
            onclick="resetUserPerms('${u.id}')">↩️ إعادة الضبط</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px">
          ${checks}
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">
          * التراخيص والإعدادات محجوزة للمدير العام دائماً ولا يمكن منحها
        </p>
      </div>`;
  }).join('');

  cont.innerHTML = `
    <h3 style="margin-bottom:16px">🔑 إدارة صلاحيات المشرفين</h3>
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">
      حدد الصفحات التي يمكن لكل مشرف/ة الوصول إليها. التغييرات تُطبق فوراً عند تسجيل الدخول.
    </p>
    ${cards}`;
}

function saveUserPerms(userId) {
  const allPages = Object.keys(ALL_PAGES_LABELS).filter(p => !ALWAYS_ADMIN.includes(p));
  const granted  = allPages.filter(p => document.getElementById(`perm-${userId}-${p}`)?.checked);
  DB.set('userPerms_' + userId, granted);
  showToast('✅ تم حفظ صلاحيات المستخدم');
  // re-apply nav if this is the current user
  if (currentUser?.id === userId) applyNavPermissions(currentUser);
}

function resetUserPerms(userId) {
  DB.set('userPerms_' + userId, null);
  localStorage.removeItem('nursery4_userPerms_' + userId);
  showToast('↩️ تم إعادة ضبط الصلاحيات للافتراضي');
  renderPermsTab(document.getElementById('settContent'));
}
