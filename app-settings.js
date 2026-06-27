// ============================================================
// APP-SETTINGS.JS  —  System settings & user management
// ============================================================

// ============================================================
// GRADES HELPERS (defined here to avoid dependency on app.js version)
// ============================================================
// getGrades + saveGrades + GRADES_DEFAULT are defined in app.js

// ============================================================
function renderSettings() {
  const cont = document.getElementById('page-settings');
  if (!cont) return;

  const settings = DB.get('nurserySettings') || {};
  const users    = DB.all('users');

  // only admin can access settings
  if (currentUser?.role !== 'super_admin') {
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <h3 style="color:var(--danger)">صلاحية مقيدة</h3>
      <p style="color:var(--text-muted)">الإعدادات متاحة للمدير الرئيسي فقط</p>
    </div>`;
    return;
  }

  cont.innerHTML = `
    <div class="tabs" style="margin-bottom:20px">
      <button class="tab-btn active" onclick="settTab('users',this)">👤 المستخدمون</button>
      <button class="tab-btn" onclick="settTab('perms',this)">🔑 الصلاحيات</button>
      <button class="tab-btn" onclick="settTab('nursery',this)">🏫 إعدادات الروضة</button>
      <button class="tab-btn" onclick="settTab('grades',this)">🎓 المراحل الدراسية</button>
      <button class="tab-btn" onclick="settTab('contracts',this)">🧾 العقود</button>
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
              <option value="super_admin">مدير رئيسي</option>
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
              <option value="esh_e">اشبيلية مسائي</option>
              <option value="sol_e">الصليبخات مسائي</option>
              <option value="mat_e">المطلاع مسائي</option>
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
  if (tab === 'grades')  renderGradesTab(cont);
  if (tab === 'contracts') renderContractsTab(cont);
  if (tab === 'data')    renderDataTab(cont);
}

// ── USERS TAB ──────────────────────────────────────────────
function renderUsersTab(cont) {
  const users = DB.all('users');
  const rows  = users.map(u => `
    <tr>
      <td><span class="avatar-circle" style="width:32px;height:32px;font-size:14px">${u.avatar||u.name[0]}</span></td>
      <td><b>${u.name}</b></td>
      <td><span class="badge ${u.role==='super_admin'?'badge-red':u.role==='admin'?'badge-purple':'badge-blue'}">${u.role==='super_admin'?'مدير رئيسي':u.role==='admin'?'مدير عام':'مشرف'}</span></td>
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
  document.getElementById('userBranchGroup').style.display = (role === 'admin' || role === 'super_admin') ? 'none' : '';
}

function saveUser() {
  const name   = document.getElementById('userName').value.trim();
  const role   = document.getElementById('userRole').value;
  const branch = (role === 'admin' || role === 'super_admin') ? 'all' : document.getElementById('userBranch').value;
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
  const branchWa = s.branchWaNumbers || {};
  const allBranches = [
    { id:'esh',   name:'اشبيلية' },
    { id:'sol',   name:'الصليبخات' },
    { id:'mat',   name:'المطلاع' },
    { id:'esh_e', name:'اشبيلية مسائي' },
    { id:'sol_e', name:'الصليبخات مسائي' },
    { id:'mat_e', name:'المطلاع مسائي' }
  ];
  cont.innerHTML = `
    <div class="card" style="max-width:560px">
      <h3 style="margin-top:0">إعدادات الروضة</h3>
      <div class="form-group">
        <label>اسم الروضة</label>
        <input id="stgName" class="form-control" value="${s.name||'Personality Kids'}">
      </div>
      <div class="form-group">
        <label>رقم WhatsApp للمسؤول (الرئيسي)</label>
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
    </div>

    <div class="card" style="max-width:560px;margin-top:16px">
      <h3 style="margin-top:0">📱 أرقام واتساب مشرفي الفروع</h3>
      <p style="color:var(--text-muted);font-size:12px;margin-bottom:14px">
        رقم الواتساب الذي سترسل منه رسائل كل فرع — يجب أن يكون مفتوحاً في واتساب ويب أو الجهاز
      </p>
      ${allBranches.map(b => `
      <div class="form-group">
        <label>${b.name}</label>
        <input id="branchWa_${b.id}" class="form-control" placeholder="965XXXXXXXX"
          value="${branchWa[b.id]||''}">
      </div>`).join('')}
      <button class="btn btn-primary" onclick="saveBranchWaNumbers()">💾 حفظ أرقام الفروع</button>
    </div>`;
}

function saveNurserySettings() {
  const s = DB.get('nurserySettings') || {};
  DB.set('nurserySettings', {
    ...s,
    name:                document.getElementById('stgName').value.trim(),
    waNumber:            document.getElementById('stgWA').value.trim(),
    year:                document.getElementById('stgYear').value.trim(),
    regFee:              parseFloat(document.getElementById('stgRegFee').value) || 0,
    defaultInstallments: parseInt(document.getElementById('stgInst').value) || 4
  });
  showToast('✅ تم حفظ إعدادات الروضة');
}

function saveBranchWaNumbers() {
  const s = DB.get('nurserySettings') || {};
  const allBranchIds = ['esh','sol','mat','esh_e','sol_e','mat_e'];
  const branchWaNumbers = {};
  allBranchIds.forEach(id => {
    const el = document.getElementById('branchWa_' + id);
    if (el) branchWaNumbers[id] = el.value.trim();
  });
  DB.set('nurserySettings', { ...s, branchWaNumbers });
  showToast('✅ تم حفظ أرقام واتساب الفروع');
}

// ── DATA TAB ───────────────────────────────────────────────
function renderGradesTab(cont) {
  const grades = getGrades();
  cont.innerHTML = `
    <div class="card">
      <div class="card-title">🎓 إدارة المراحل الدراسية</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
        أضف أو عدّل أو احذف المراحل الدراسية — ستظهر في فورم إضافة الطالب وفي جداول الصرف
      </p>

      <div id="gradesList" style="margin-bottom:20px">
        ${renderGradesRows(grades)}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;padding:14px;background:var(--bg-secondary,#f7f7f5);border-radius:10px">
        <div class="form-group" style="margin:0;flex:1;min-width:140px">
          <label>الكود (بالانجليزي)</label>
          <input id="newGradeId" class="form-control" placeholder="مثال: KG3">
        </div>
        <div class="form-group" style="margin:0;flex:2;min-width:180px">
          <label>الاسم المعروض</label>
          <input id="newGradeLabel" class="form-control" placeholder="مثال: KG3 (5-6 سنوات)">
        </div>
        <button class="btn btn-primary" onclick="addGrade()">➕ إضافة مرحلة</button>
      </div>
    </div>`;
}

function renderGradesRows(grades) {
  if (!grades.length) return '<p style="color:var(--text-muted)">لا توجد مراحل</p>';
  return `<table style="width:100%">
    <thead><tr><th>الكود</th><th>الاسم المعروض</th><th>إجراءات</th></tr></thead>
    <tbody>
      ${grades.map((g,i) => `<tr>
        <td><code style="background:var(--bg-secondary);padding:3px 8px;border-radius:6px">${g.id}</code></td>
        <td>
          <input class="form-control" id="glabel-${i}" value="${g.label}"
            style="max-width:260px" onchange="updateGradeLabel(${i}, this.value)">
        </td>
        <td>
          <button class="btn btn-outline btn-sm" style="color:var(--danger)"
            onclick="deleteGrade(${i})">🗑️ حذف</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function updateGradeLabel(idx, newLabel) {
  const grades = getGrades();
  if (grades[idx]) {
    grades[idx].label = newLabel;
    saveGrades(grades);
    showToast('✅ تم تحديث المرحلة');
  }
}

function addGrade() {
  const id    = document.getElementById('newGradeId').value.trim().replace(/\s+/g,'');
  const label = document.getElementById('newGradeLabel').value.trim();
  if (!id || !label) { showToast('⚠️ أدخل الكود والاسم'); return; }
  const grades = getGrades();
  if (grades.find(g => g.id === id)) { showToast('⚠️ هذا الكود موجود بالفعل'); return; }
  grades.push({ id, label });
  saveGrades(grades);
  showToast('✅ تمت إضافة المرحلة: ' + label);
  // Re-render
  const cont = document.getElementById('settContent');
  if (cont) renderGradesTab(cont);
}

function deleteGrade(idx) {
  const grades = getGrades();
  const g = grades[idx];
  if (!g) return;
  if (!confirm(`هل تريد حذف المرحلة "${g.label}"؟`)) return;
  grades.splice(idx, 1);
  saveGrades(grades);
  showToast('🗑️ تم حذف المرحلة');
  const cont = document.getElementById('settContent');
  if (cont) renderGradesTab(cont);
}

// ── CONTRACTS TAB (morning branches only) ───────────────────
function renderContractsTab(cont) {
  if (!window._contractsBranch || !MORNING_BRANCHES.includes(window._contractsBranch)) {
    window._contractsBranch = MORNING_BRANCHES[0];
  }
  const branch = window._contractsBranch;
  cont.innerHTML = `
    <div class="card">
      <div class="card-title">🧾 إعدادات العقود (الأفرع الصباحية)</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
        حدد لكل فرع صباحي فئات العقود (الرسوم وخطة التقسيط)، الخصومات المتاحة، والشروط والأحكام — ستظهر هذه القوائم عند إضافة/تعديل الطالب وطباعة العقد.
      </p>
      <div class="tabs" style="margin-bottom:16px">
        ${MORNING_BRANCHES.map(b=>`<button class="tab-btn ${b===branch?'active':''}" onclick="contractsSwitchBranch('${b}')">${BRANCHES[b].name}</button>`).join('')}
      </div>
      <div id="contractsBranchContent"></div>
    </div>`;
  renderContractsBranchContent(branch);
}

function contractsSwitchBranch(branch) {
  window._contractsBranch = branch;
  const cont = document.getElementById('settContent');
  if (cont) renderContractsTab(cont);
}

function renderContractsBranchContent(branch) {
  const settings = getContractSettings();
  const branchData = settings[branch];
  const grades = getGrades();
  const categories = Object.entries(branchData.categories || {});

  const categoriesHtml = categories.map(([catId, cat]) => {
    const gradeChecks = grades.map(g => `
      <label style="display:inline-flex;align-items:center;gap:4px;margin-left:12px;font-size:12px;cursor:pointer">
        <input type="checkbox" ${(cat.grades||[]).includes(g.id) ? 'checked' : ''}
          onchange="toggleContractCategoryGrade('${branch}','${catId}','${g.id}',this.checked)">
        ${g.label}
      </label>`).join('');

    const instRows = (cat.installments || []).map((row, idx) => `
      <tr>
        <td style="padding:4px"><input class="form-control" style="font-size:12px" value="${row.label||''}" onchange="updateContractInstRow('${branch}','${catId}',${idx},'label',this.value)"></td>
        <td style="padding:4px"><input type="number" step="0.001" class="form-control" style="font-size:12px;width:110px" value="${row.amount||0}" onchange="updateContractInstRow('${branch}','${catId}',${idx},'amount',this.value)"></td>
        <td style="padding:4px;text-align:center">
          <button onclick="deleteContractInstRow('${branch}','${catId}',${idx})" style="background:none;border:none;color:var(--danger);cursor:pointer">🗑</button>
        </td>
      </tr>`).join('');

    const instTotal = (cat.installments || []).reduce((s,r)=> s + (parseFloat(r.amount)||0), 0);
    const offerFee = parseFloat(cat.offerFee) || 0;
    const diff = parseFloat((instTotal - offerFee).toFixed(3));

    return `
    <div class="card" style="background:var(--bg-secondary,#f7f7f5);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap">
        <input class="form-control" style="font-weight:700;max-width:260px" value="${cat.label||''}" onchange="updateContractCategory('${branch}','${catId}','label',this.value)" placeholder="اسم الفئة (مثال: KG1)">
        <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger)" onclick="deleteContractCategory('${branch}','${catId}')">🗑️ حذف الفئة</button>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted)">المراحل المرتبطة بهذه الفئة</label><br>
        ${gradeChecks || '<span style="color:var(--text-muted)">لا توجد مراحل معرّفة</span>'}
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>الرسوم الإجمالية (د.ك)</label>
          <input type="number" step="0.001" class="form-control" value="${cat.totalFee||0}" onchange="updateContractCategory('${branch}','${catId}','totalFee',this.value)">
        </div>
        <div class="form-group">
          <label>العرض السنوي (د.ك)</label>
          <input type="number" step="0.001" class="form-control" value="${cat.offerFee||0}" onchange="updateContractCategory('${branch}','${catId}','offerFee',this.value)">
        </div>
        <div class="form-group">
          <label>حجز المقعد (د.ك)</label>
          <input type="number" step="0.001" class="form-control" value="${cat.seatFee||0}" onchange="updateContractCategory('${branch}','${catId}','seatFee',this.value)">
        </div>
      </div>
      <div style="margin-top:10px">
        <div style="font-size:12px;font-weight:700;margin-bottom:6px">📅 خطة التقسيط (مبنية على العرض السنوي)</div>
        <table style="width:100%">
          <thead><tr><th style="font-size:11px">البند</th><th style="font-size:11px">المبلغ (د.ك)</th><th></th></tr></thead>
          <tbody>${instRows}</tbody>
        </table>
        <button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="addContractInstRow('${branch}','${catId}')">➕ إضافة بند</button>
        <div style="margin-top:6px;font-size:12px">
          إجمالي الخطة: <b>${instTotal.toFixed(3)} د.ك</b>
          ${Math.abs(diff) < 0.001
            ? '<span style="color:var(--primary)"> ✅ يطابق العرض السنوي</span>'
            : `<span style="color:var(--danger)"> ⚠️ فرق عن العرض السنوي: ${diff>0?'+':''}${diff} د.ك</span>`}
        </div>
      </div>
    </div>`;
  }).join('') || '<p style="color:var(--text-muted)">لا توجد فئات بعد — أضف فئة جديدة بالأسفل</p>';

  const discounts = branchData.discounts || [];
  const discountRows = discounts.map((d, idx) => `
    <tr>
      <td style="padding:4px"><input class="form-control" style="font-size:12px" value="${d.name||''}" onchange="updateContractDiscount('${branch}',${idx},'name',this.value)"></td>
      <td style="padding:4px">
        <select class="form-control" style="font-size:12px" onchange="updateContractDiscount('${branch}',${idx},'type',this.value)">
          <option value="fixed" ${d.type==='fixed'?'selected':''}>مبلغ ثابت (د.ك)</option>
          <option value="percent" ${d.type==='percent'?'selected':''}>نسبة %</option>
        </select>
      </td>
      <td style="padding:4px"><input type="number" step="0.001" class="form-control" style="font-size:12px;width:100px" value="${d.value||0}" onchange="updateContractDiscount('${branch}',${idx},'value',this.value)"></td>
      <td style="padding:4px;text-align:center"><button onclick="deleteContractDiscount('${branch}',${idx})" style="background:none;border:none;color:var(--danger);cursor:pointer">🗑</button></td>
    </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:10px">لا توجد خصومات</td></tr>`;

  const c = document.getElementById('contractsBranchContent');
  if (!c) return;
  c.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div style="font-size:13px;font-weight:700;color:var(--primary-dark)">📋 فئات العقود (الرسوم وخطة التقسيط)</div>
        <button class="btn btn-primary btn-sm" onclick="addContractCategory('${branch}')">➕ إضافة فئة</button>
      </div>
      ${categoriesHtml}
    </div>

    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;color:var(--primary-dark);margin-bottom:10px">🏷️ الخصومات</div>
      <div class="table-wrap">
        <table style="width:100%">
          <thead><tr><th>اسم الخصم</th><th>النوع</th><th>القيمة</th><th></th></tr></thead>
          <tbody>${discountRows}</tbody>
        </table>
      </div>
      <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addContractDiscount('${branch}')">➕ إضافة خصم</button>
    </div>`;
}

function addContractCategory(branch) {
  const settings = getContractSettings();
  const catId = 'cat' + Date.now();
  settings[branch].categories[catId] = { id:catId, label:'فئة جديدة', grades:[], totalFee:0, offerFee:0, seatFee:0, installments:[] };
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function updateContractCategory(branch, catId, field, value) {
  const settings = getContractSettings();
  const cat = settings[branch].categories[catId];
  if (!cat) return;
  cat[field] = (field === 'label') ? value : (parseFloat(value) || 0);
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function toggleContractCategoryGrade(branch, catId, gradeId, checked) {
  const settings = getContractSettings();
  const cat = settings[branch].categories[catId];
  if (!cat) return;
  cat.grades = cat.grades || [];
  if (checked) {
    if (!cat.grades.includes(gradeId)) cat.grades.push(gradeId);
  } else {
    cat.grades = cat.grades.filter(g => g !== gradeId);
  }
  saveContractSettings(settings);
}

function deleteContractCategory(branch, catId) {
  if (!confirm('هل تريد حذف هذه الفئة؟')) return;
  const settings = getContractSettings();
  delete settings[branch].categories[catId];
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function addContractInstRow(branch, catId) {
  const settings = getContractSettings();
  const cat = settings[branch].categories[catId];
  if (!cat) return;
  cat.installments = cat.installments || [];
  cat.installments.push({ label: 'قسط ' + (cat.installments.length + 1), amount: 0 });
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function updateContractInstRow(branch, catId, idx, field, value) {
  const settings = getContractSettings();
  const cat = settings[branch].categories[catId];
  if (!cat || !cat.installments[idx]) return;
  cat.installments[idx][field] = field === 'amount' ? (parseFloat(value) || 0) : value;
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function deleteContractInstRow(branch, catId, idx) {
  const settings = getContractSettings();
  const cat = settings[branch].categories[catId];
  if (!cat) return;
  cat.installments.splice(idx, 1);
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function addContractDiscount(branch) {
  const settings = getContractSettings();
  settings[branch].discounts.push({ name:'خصم جديد', type:'fixed', value:0 });
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

function updateContractDiscount(branch, idx, field, value) {
  const settings = getContractSettings();
  const d = settings[branch].discounts[idx];
  if (!d) return;
  d[field] = field === 'value' ? (parseFloat(value) || 0) : value;
  saveContractSettings(settings);
  if (field === 'type') renderContractsBranchContent(branch);
}

function deleteContractDiscount(branch, idx) {
  if (!confirm('هل تريد حذف هذا الخصم؟')) return;
  const settings = getContractSettings();
  settings[branch].discounts.splice(idx, 1);
  saveContractSettings(settings);
  renderContractsBranchContent(branch);
}

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
      <h4>📊 استيراد Excel</h4>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">حمّل النموذج أولاً، عبّيه، ثم ارفعه</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-weight:700;margin-bottom:8px">👦 الطلاب</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="downloadStudentsTemplate()">📄 نموذج</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('impStudents').click()">📤 رفع</button>
            <input type="file" id="impStudents" accept=".xlsx,.xls" style="display:none" onchange="importStudentsFromExcel(event)">
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-weight:700;margin-bottom:8px">👕 مخزن الملابس</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="downloadClothesTemplate()">📄 نموذج</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('impClothes').click()">📤 رفع</button>
            <input type="file" id="impClothes" accept=".xlsx,.xls" style="display:none" onchange="importClothesFromExcel(event)">
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-weight:700;margin-bottom:8px">📦 المستهلكات</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="downloadSuppliesTemplate()">📄 نموذج</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('impSupplies').click()">📤 رفع</button>
            <input type="file" id="impSupplies" accept=".xlsx,.xls" style="display:none" onchange="importSuppliesFromExcel(event)">
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:10px;padding:14px">
          <div style="font-weight:700;margin-bottom:8px">👩‍🏫 الموظفين</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="downloadEmployeesTemplate()">📄 نموذج</button>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('impEmployees').click()">📤 رفع</button>
            <input type="file" id="impEmployees" accept=".xlsx,.xls" style="display:none" onchange="importEmployeesFromExcel(event)">
          </div>
        </div>
      </div>
      <hr>
      <h4 style="color:var(--danger)">⚠️ منطقة الخطر</h4>
      <p style="color:var(--text-muted);font-size:13px">سيؤدي إعادة الضبط إلى حذف جميع البيانات واستعادة البيانات الافتراضية.</p>
      <button class="btn" style="background:var(--danger);color:#fff" onclick="resetAllData()">🔄 إعادة ضبط المصنع</button>
    </div>`;
}

function exportAllData() {
  const data = {};
  Object.keys(TABLES).forEach(k => { data[k] = CACHE[k] || []; });
  // settings (key/value rows stored under CACHE['s_'+key])
  const settingsRows = [];
  Object.keys(CACHE).forEach(k => {
    if (k.startsWith('s_')) settingsRows.push({ key: k.slice(2), value: CACHE[k] });
  });
  data.settings = settingsRows;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'nursery_backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  const summary = Object.keys(TABLES).map(k => `${k}:${(CACHE[k]||[]).length}`).join(', ');
  showToast('✅ تم تصدير البيانات — ' + summary);
}

function importDataClick() {
  document.getElementById('importFileInput').click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const keys = Object.keys(TABLES).filter(k => Array.isArray(data[k]) && data[k].length);
      if (!keys.length && !(Array.isArray(data.settings) && data.settings.length)) {
        showToast('⚠️ الملف لا يحتوي بيانات قابلة للاستيراد (نسخة قديمة؟)');
        return;
      }
      showToast('⏳ جارِ استيراد البيانات...');
      for (const key of keys) {
        await SB.upsert(TABLES[key], data[key]);
      }
      if (Array.isArray(data.settings) && data.settings.length) {
        await SB.upsert('settings', data.settings);
      }
      showToast('✅ تم استيراد البيانات — جارِ إعادة التحميل');
      setTimeout(()=>location.reload(), 1500);
    } catch (err) {
      console.error('import error:', err);
      showToast('❌ ملف غير صالح: ' + err.message);
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
  const supervisors = DB.all('users').filter(u => u.role !== 'admin' && u.role !== 'super_admin');
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

// ============================================================
// EXCEL IMPORT/EXPORT FUNCTIONS
// ============================================================
function xlsxExport(data, filename) {
  if (typeof XLSX === 'undefined') { showToast('❌ مكتبة Excel غير محملة'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
}

function readExcelFile(file, callback) {
  if (typeof XLSX === 'undefined') { showToast('❌ مكتبة Excel غير محملة'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target.result, { type:'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      callback(rows);
    } catch(err) { showToast('❌ خطأ في قراءة الملف'); }
  };
  reader.readAsBinaryString(file);
}

function downloadStudentsTemplate() {
  // Row 1: example morning branch student
  // Row 2: example evening branch student
  xlsxExport([
    {
      'الكود':'S001',
      'الاسم':'أحمد محمد الرشيد',
      'الفرع':'اشبيلية',
      'المرحلة':'KG1',
      'هاتف 1':'96550001','هاتف 2':'',
      'تاريخ الميلاد':'2020-03-15',
      'تاريخ المباشرة':'2023-09-01',
      'الرسوم':1200,'الخصم':0,'المسدد':0,
      'تاريخ الدفع':'','طريقة الدفع':'نقدي',
      'نوع الاشتراك':'','انتهاء الاشتراك':'','ملاحظات':''
    },
    {
      'الكود':'S002',
      'الاسم':'سارة علي الكندري',
      'الفرع':'اشبيلية مسائي',
      'المرحلة':'حضانة',
      'هاتف 1':'96560002','هاتف 2':'',
      'تاريخ الميلاد':'2022-05-10',
      'تاريخ المباشرة':'2026-06-01',
      'الرسوم':50,'الخصم':0,'المسدد':50,
      'تاريخ الدفع':'2026-06-01','طريقة الدفع':'نقدي',
      'نوع الاشتراك':'شهري','انتهاء الاشتراك':'2026-07-01','ملاحظات':''
    }
  ], 'نموذج_الطلاب');
}

function downloadClothesTemplate() {
  xlsxExport([{
    'الكود':'C001','الصنف':'قميص','المقاس':'4 سنوات',
    'الفرع (esh/sol/mat/esh_e/sol_e/mat_e)':'esh','الكمية':'10','الحد الأدنى':'5'
  }], 'نموذج_الملابس');
}

function downloadSuppliesTemplate() {
  xlsxExport([{
    'الكود':'P001','الصنف':'صابون يدين','الوحدة':'علبة',
    'الفرع (esh/sol/mat/esh_e/sol_e/mat_e)':'esh','الكمية':'10',
    'تاريخ الاستلام (YYYY-MM-DD)':'2025-01-01',
    'تاريخ الانتهاء (YYYY-MM-DD)':'2026-01-01'
  }], 'نموذج_المستهلكات');
}

function downloadEmployeesTemplate() {
  xlsxExport([{
    'الكود':'E001','الاسم':'سلمى أحمد','الوظيفة':'معلمة KG1',
    'الفرع (esh/sol/mat/esh_e/sol_e/mat_e)':'esh','الجنسية':'كويتية',
    'الهاتف':'96560001','رقم الهوية':'',
    'الراتب':'450','البدل':'50',
    'بداية العقد (YYYY-MM-DD)':'2023-09-01',
    'نهاية العقد (YYYY-MM-DD)':'2026-08-31',
    'نوع العقد':'دوام كامل','الإجازة السنوية':'30',
    'الحالة (active/leave/inactive)':'active'
  }], 'نموذج_الموظفين');
}

function excelDateToStr(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to YYYY-MM-DD
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  // already a string — normalize separators
  return String(val).replace(/\//g, '-').slice(0, 10);
}

// branch & grade name → key mapping
const _BRANCH_MAP = {
  'اشبيلية':'esh','الصليبخات':'sol','المطلاع':'mat',
  'اشبيلية مسائي':'esh_e','الصليبخات مسائي':'sol_e','المطلاع مسائي':'mat_e',
  'esh':'esh','sol':'sol','mat':'mat','esh_e':'esh_e','sol_e':'sol_e','mat_e':'mat_e'
};
const _GRADE_MAP = {
  'حضانة':'nursery','nursery':'nursery',
  'KG1':'KG1','كي جي 1':'KG1',
  'KG2':'KG2','كي جي 2':'KG2'
};
const _SUBTYPE_MAP = {
  'شهري':'monthly','monthly':'monthly',
  'أسبوعي':'weekly','weekly':'weekly',
  'يومي':'daily','daily':'daily'
};
const _PAY_METHOD_MAP = {
  'نقدي':'نقدي','برنامج':'برنامج','كي نت':'كي نت','رابط':'رابط',
  'cash':'نقدي','knet':'كي نت'
};

function importStudentsFromExcel(e) {
  const file = e.target.files[0]; if (!file) return;
  readExcelFile(file, rows => {
    // parse rows into structured preview data
    const parsed = rows.map((r, i) => {
      const name      = (r['الاسم']||'').toString().trim();
      const branchRaw = (r['الفرع']||r['الفرع (esh/sol/mat/esh_e/sol_e/mat_e)']||'').toString().trim();
      const branch    = _BRANCH_MAP[branchRaw] || branchRaw;
      const gradeRaw  = (r['المرحلة']||r['المرحلة (nursery/KG1/KG2)']||'').toString().trim();
      const grade     = _GRADE_MAP[gradeRaw] || (gradeRaw.startsWith('KG1')?'KG1':gradeRaw.startsWith('KG2')?'KG2':'nursery');
      const phone1    = (r['هاتف 1']||r['هاتف1']||'').toString().trim();
      const phone2    = (r['هاتف 2']||r['هاتف2']||'').toString().trim();
      const dob       = excelDateToStr(r['تاريخ الميلاد']||r['تاريخ الميلاد (YYYY-MM-DD)']||'');
      const startDate = excelDateToStr(r['تاريخ المباشرة']||r['تاريخ المباشرة (YYYY-MM-DD)']||'');
      const fees      = parseFloat(r['الرسوم'])||0;
      const disc      = parseFloat(r['الخصم'])||0;
      const net       = Math.max(0, fees - disc);
      const paid      = Math.min(parseFloat(r['المسدد'])||0, net);
      const payDate   = excelDateToStr(r['تاريخ الدفع']||r['تاريخ الدفع (YYYY-MM-DD)']||'');
      const method    = _PAY_METHOD_MAP[(r['طريقة الدفع']||r['طريقة الدفع (نقدي/برنامج/كي نت/رابط)']||'نقدي').toString().trim()] || 'نقدي';
      const subTypeRaw= (r['نوع الاشتراك']||'').toString().trim();
      const subType   = _SUBTYPE_MAP[subTypeRaw] || (isEveningBranch(branch)?'monthly':'');
      const subEnd    = excelDateToStr(r['انتهاء الاشتراك']||'');
      const notes     = (r['ملاحظات']||'').toString().trim();
      const idRaw     = String(r['الكود']||'').trim();

      const errors = [];
      if (!name)  errors.push('الاسم مطلوب');
      if (!BRANCHES[branch]) errors.push('فرع غير معروف: '+branchRaw);
      if (!fees && !isEveningBranch(branch)) errors.push('الرسوم مطلوبة');

      return { _row:i+2, idRaw, name, branch, grade, phone1, phone2, dob, startDate,
               fees, disc, net, paid, payDate, method, subType, subEnd, notes, errors };
    });

    window._importStudentsPending = parsed;
    showStudentsImportPreview(parsed);
    e.target.value='';
  });
}

function showStudentsImportPreview(students) {
  const valid   = students.filter(s=>!s.errors.length).length;
  const invalid = students.filter(s=>s.errors.length).length;
  const rows = students.map(s => `
    <tr style="${s.errors.length?'background:#fff0f0':''}">
      <td style="font-size:11px;color:#999">${s._row}</td>
      <td><b>${s.name||'—'}</b></td>
      <td>${(BRANCHES[s.branch]||{}).name||s.branch||'—'}</td>
      <td>${s.grade==='nursery'?'حضانة':s.grade}</td>
      <td>${s.phone1||'—'}</td>
      <td>${s.startDate||'—'}</td>
      <td>${s.fees}</td>
      <td>${s.disc}</td>
      <td style="color:${s.paid>0?'var(--primary)':'inherit'}">${s.paid}</td>
      <td style="font-size:11px">${s.subType==='monthly'?'شهري':s.subType==='weekly'?'أسبوعي':s.subType==='daily'?'يومي':''}</td>
      <td style="font-size:11px">${s.subEnd||''}</td>
      <td style="color:var(--danger);font-size:11px">${s.errors.join(', ')}</td>
    </tr>`).join('');

  const html = `
  <div id="modal-students-import" class="modal-overlay open">
    <div class="modal" style="max-width:1000px">
      <div class="modal-header">
        <div class="modal-title">📤 معاينة استيراد الطلاب — ${students.length} صف</div>
        <button class="modal-close" onclick="document.getElementById('modal-students-import').remove()">✕</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
          <span class="badge badge-green">✅ سيُستورد: ${valid}</span>
          ${invalid?`<span class="badge badge-red">⚠️ سيُتجاوز: ${invalid}</span>`:''}
          <span style="font-size:12px;color:var(--text-muted)">الصفوف الحمراء لن تُستورد</span>
        </div>
        <div style="overflow:auto;max-height:420px">
          <table class="data-table" style="font-size:12px;white-space:nowrap">
            <thead><tr>
              <th>#</th><th>الاسم</th><th>الفرع</th><th>المرحلة</th>
              <th>هاتف</th><th>المباشرة</th><th>الرسوم</th><th>الخصم</th><th>المسدد</th>
              <th>نوع الاشتراك</th><th>انتهاء الاشتراك</th><th>ملاحظة</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('modal-students-import').remove()">إلغاء</button>
        ${valid ? `<button class="btn btn-primary" onclick="doImportStudents()">✅ استيراد ${valid} طالب</button>` : ''}
      </div>
    </div>
  </div>`;
  window._importStudentsPending = students;
  document.body.insertAdjacentHTML('beforeend', html);
}

function doImportStudents() {
  const students = window._importStudentsPending || [];
  const valid    = students.filter(s=>!s.errors.length);
  const existing = DB.all('students');
  let added = 0, skipped = 0;

  valid.forEach(s => {
    const id = s.idRaw || DB.nextId('students','S');
    if (existing.find(x=>x.id===id)) { skipped++; return; }
    const evening = isEveningBranch(s.branch);
    DB.add('students', {
      id, name: s.name,
      branch: s.branch, grade: s.grade,
      phone1: s.phone1, phone2: s.phone2,
      dob: s.dob, startDate: s.startDate, joinDate: s.startDate,
      fees: s.fees, discount: s.disc, net: s.net, paid: s.paid,
      enrollStatus:     evening ? 'active' : '',
      subscriptionType: evening ? (s.subType||'monthly') : '',
      subscriptionEnd:  evening ? s.subEnd : '',
      withdrawDate: '',
      notes: s.notes
    });
    DB.add('installments', {
      id: DB.nextId('installments','I'),
      studentId: id, num: 1,
      amount: s.net, partialPaid: s.paid,
      dueDate: s.startDate,
      paidDate: s.paid > 0 ? (s.payDate || new Date().toISOString().split('T')[0]) : '',
      status: s.paid >= s.net ? 'paid' : s.paid > 0 ? 'partial' : 'pending',
      method: s.paid > 0 ? s.method : '',
      note: ''
    });
    added++;
  });

  document.getElementById('modal-students-import').remove();
  showToast('تم استيراد ' + added + ' طالب' + (skipped?' | تجاوز '+skipped:''));
}
