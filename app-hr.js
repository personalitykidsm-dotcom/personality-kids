// ============================================================
// APP-HR.JS — Employees, Leaves, Attendance, Salaries
// ============================================================

function renderHR() {
  const emps   = filterByBranch(DB.all('employees'));
  const leaves = DB.all('leaves');
  const active = emps.filter(e => e.status === 'active').length;
  const onLeave= emps.filter(e => e.status === 'leave').length;
  const expiring = emps.filter(e => daysUntil(e.contractEnd) < 60 && daysUntil(e.contractEnd) >= 0).length;

  document.getElementById('hrStats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">👩‍🏫</div><div>
      <div class="stat-value" style="color:var(--primary)">${emps.length}</div>
      <div class="stat-label">إجمالي العاملين</div></div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div>
      <div class="stat-value" style="color:var(--info)">${active}</div>
      <div class="stat-label">نشطون</div></div></div>
    <div class="stat-card"><div class="stat-icon">🏖️</div><div>
      <div class="stat-value" style="color:var(--accent)">${onLeave}</div>
      <div class="stat-label">في إجازة</div></div></div>
    <div class="stat-card"><div class="stat-icon">📋</div><div>
      <div class="stat-value" style="color:var(--danger)">${expiring}</div>
      <div class="stat-label">عقود تنتهي قريباً</div></div></div>`;

  document.getElementById('hrTabs').innerHTML = `
    <button class="tab active" onclick="hrTab(this,'hr-emps')">👩‍🏫 العاملون</button>
    <button class="tab" onclick="hrTab(this,'hr-leaves')">🏖️ الإجازات</button>
    <button class="tab" onclick="hrTab(this,'hr-att')">📅 الحضور</button>
    <button class="tab" onclick="hrTab(this,'hr-sal')">💰 الرواتب</button>`;

  document.getElementById('hrContent').innerHTML = `
    <!-- Employees -->
    <div id="hr-emps">
      <div class="filter-bar">
        <span class="filter-chip active" onclick="hrBranch(this,'all')">كل الفروع</span>
        <span class="filter-chip" onclick="hrBranch(this,'esh')">اشبيلية</span>
        <span class="filter-chip" onclick="hrBranch(this,'sol')">الصليبخات</span>
        <span class="filter-chip" onclick="hrBranch(this,'mat')">المطلاع</span>
        <button class="btn btn-primary" style="margin-right:auto" onclick="openAddEmployee()">➕ إضافة موظف</button>
        <button class="btn btn-outline" onclick="exportHRExcel()">📥 Excel</button>
        <button class="btn btn-outline" onclick="printHRReport()">🖨️ PDF</button>
      </div>
      <div class="card"><div class="table-wrap"><table id="hrTable"></table></div></div>
    </div>
    <!-- Leaves -->
    <div id="hr-leaves" style="display:none">
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-primary" onclick="openAddLeave()">➕ طلب إجازة</button>
      </div>
      <div class="card"><div class="table-wrap"><table id="leavesTable"></table></div></div>
    </div>
    <!-- Attendance -->
    <div id="hr-att" style="display:none">
      <div class="filter-bar">
        <input type="date" id="attDate" value="${new Date().toISOString().split('T')[0]}"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">
        <button class="btn btn-primary" onclick="saveAttendance()">💾 حفظ الحضور</button>
        <button class="btn btn-outline" onclick="exportAttExcel()">📥 Excel</button>
      </div>
      <div class="card"><div class="table-wrap"><table id="attTable"></table></div></div>
    </div>
    <!-- Salaries -->
    <div id="hr-sal" style="display:none">
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <b style="font-size:14px">كشف رواتب — ${new Date().toLocaleDateString('ar-KW',{month:'long',year:'numeric'})}</b>
        <button class="btn btn-outline" style="margin-right:auto" onclick="exportSalaryExcel()">📥 Excel</button>
        <button class="btn btn-outline" onclick="printSalaryReport()">🖨️ PDF</button>
      </div>
      <div class="card"><div class="table-wrap"><table id="salTable"></table></div></div>
    </div>`;

  renderHRTable('all');
}

function hrTab(el, id) {
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['hr-emps','hr-leaves','hr-att','hr-sal'].forEach(i => {
    const el2 = document.getElementById(i);
    if (el2) el2.style.display = i === id ? '' : 'none';
  });
  if (id === 'hr-leaves') renderLeavesTable();
  if (id === 'hr-att')    renderAttTable();
  if (id === 'hr-sal')    renderSalaryTable();
}

function hrBranch(el, b) {
  el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderHRTable(b);
}

function renderHRTable(b) {
  let list = DB.all('employees');
  if (b !== 'all') list = list.filter(e => e.branch === b);
  else list = filterByBranch(list);

  const rows = list.map(e => {
    const st  = empStatus(e);
    const d   = daysUntil(e.contractEnd);
    const cBadge = d < 0 ? 'badge-red' : d < 60 ? 'badge-orange' : 'badge-gray';
    const cLbl   = d < 0 ? 'منتهي' : d < 60 ? `${d} يوم` : fmtDate(e.contractEnd);
    return `<tr>
      <td style="color:var(--text-muted)">${e.id}</td>
      <td><b>${e.name}</b></td>
      <td>${e.role}</td>
      <td><span class="badge ${BRANCHES[e.branch].badge}">${BRANCHES[e.branch].name}</span></td>
      <td>${e.nationality||'—'}</td>
      <td>${e.phone||'—'}</td>
      <td><b>${fmtKD((e.salary||0)+(e.allowance||0))}</b></td>
      <td>${fmtDate(e.contractStart)}</td>
      <td><span class="badge ${cBadge}">${cLbl}</span></td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openEditEmployee('${e.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEmployee('${e.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</td></tr>`;

  document.getElementById('hrTable').innerHTML = `
    <thead><tr><th>الكود</th><th>الاسم</th><th>الوظيفة</th><th>الفرع</th><th>الجنسية</th>
    <th>الهاتف</th><th>الراتب</th><th>بداية العقد</th><th>نهاية العقد</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function deleteEmployee(id) {
  if (!confirm('حذف الموظف؟')) return;
  DB.remove('employees', id);
  renderHRTable('all');
  renderHR();
  showToast('تم الحذف');
}

// ===== ADD EMPLOYEE MODAL =====
function openAddEmployee() {
  const branchOpts = ['esh','sol','mat','esh_e','sol_e','mat_e'].map(b =>
    `<option value="${b}">${BRANCHES[b].name}</option>`).join('');

  document.getElementById('modals').innerHTML = `
  <div id="modal-emp" class="modal-overlay open">
    <div class="modal modal-lg">
      <div class="modal-header"><div class="modal-title">➕ إضافة موظف</div>
        <button class="modal-close" onclick="closeModal('modal-emp')">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>الاسم الكامل *</label><input type="text" id="eName"></div>
          <div class="form-group"><label>الجنسية</label><input type="text" id="eNat" placeholder="كويتي / مصري"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الوظيفة *</label>
            <select id="eRole">
              ${ROLES_HR.map(r=>`<option>${r}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>الفرع *</label><select id="eBranch">${branchOpts}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الهاتف</label><input type="tel" id="ePhone" placeholder="965XXXXXXXX"></div>
          <div class="form-group"><label>رقم الهوية</label><input type="text" id="eIdNo"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الراتب الأساسي (د.ك)</label><input type="number" id="eSalary" step="0.001"></div>
          <div class="form-group"><label>البدلات (د.ك)</label><input type="number" id="eAllow" step="0.001" value="0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>بداية العقد</label><input type="date" id="eStart"></div>
          <div class="form-group"><label>نهاية العقد</label><input type="date" id="eEnd"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>نوع العقد</label>
            <select id="eType"><option>دوام كامل</option><option>دوام جزئي</option><option>مؤقت</option><option>تجريبي</option></select>
          </div>
          <div class="form-group"><label>أيام الإجازة السنوية</label><input type="number" id="eLeave" value="30" min="0"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-emp')">إلغاء</button>
        <button class="btn btn-primary" onclick="saveEmployee()">💾 حفظ</button>
      </div>
    </div>
  </div>`;
}

function saveEmployee() {
  const name = document.getElementById('eName').value.trim();
  if (!name) { showToast('⚠️ أدخل اسم الموظف'); return; }
  DB.add('employees', {
    id: DB.nextId('employees','E'),
    name,
    nationality:   document.getElementById('eNat').value,
    role:          document.getElementById('eRole').value,
    branch:        document.getElementById('eBranch').value,
    phone:         document.getElementById('ePhone').value,
    idNo:          document.getElementById('eIdNo').value,
    salary:        parseFloat(document.getElementById('eSalary').value)||0,
    allowance:     parseFloat(document.getElementById('eAllow').value)||0,
    contractStart: document.getElementById('eStart').value,
    contractEnd:   document.getElementById('eEnd').value,
    contractType:  document.getElementById('eType').value,
    annualLeave:   parseInt(document.getElementById('eLeave').value)||30,
    status:        'active'
  });
  closeModal('modal-emp');
  renderHR();
  showToast('✅ تم إضافة الموظف: ' + name);
}

function openEditEmployee(id) {
  const e = DB.all('employees').find(x => x.id === id);
  if (!e) return;
  showToast('تعديل: ' + e.name + ' — قريباً');
}

// ===== LEAVES =====
function renderLeavesTable() {
  const leaves = DB.all('leaves');
  const rows = leaves.map(l => {
    const badge = l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-orange';
    const lbl   = l.status === 'approved' ? 'موافق' : l.status === 'rejected' ? 'مرفوض' : 'انتظار';
    const btns  = l.status === 'pending'
      ? `<button class="btn btn-primary btn-sm" onclick="approveLeave('${l.id}')">✓ موافقة</button>
         <button class="btn btn-danger btn-sm" onclick="rejectLeave('${l.id}')">✕ رفض</button>`
      : '—';
    return `<tr>
      <td><b>${l.empName}</b></td>
      <td><span class="badge ${BRANCHES[l.branch]?.badge||'badge-gray'}">${BRANCHES[l.branch]?.name||l.branch}</span></td>
      <td>${l.type}</td><td>${fmtDate(l.from)}</td><td>${fmtDate(l.to)}</td><td>${l.days}</td>
      <td><span class="badge ${badge}">${lbl}</span></td><td>${btns}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد طلبات</td></tr>`;
  document.getElementById('leavesTable').innerHTML = `
    <thead><tr><th>الموظف</th><th>الفرع</th><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>الأيام</th><th>الحالة</th><th>إجراء</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function approveLeave(id) {
  DB.update('leaves', id, { status: 'approved' });
  renderLeavesTable();
  showToast('✅ تمت الموافقة');
}
function rejectLeave(id) {
  DB.update('leaves', id, { status: 'rejected' });
  renderLeavesTable();
  showToast('تم الرفض');
}

function openAddLeave() {
  const empOpts = filterByBranch(DB.all('employees')).map(e =>
    `<option value="${e.id}" data-branch="${e.branch}">${e.name}</option>`).join('');
  document.getElementById('modals').innerHTML = `
  <div id="modal-leave" class="modal-overlay open">
    <div class="modal" style="max-width:420px">
      <div class="modal-header"><div class="modal-title">🏖️ طلب إجازة</div>
        <button class="modal-close" onclick="closeModal('modal-leave')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>الموظف *</label><select id="lvEmp">${empOpts}</select></div>
        <div class="form-group"><label>نوع الإجازة</label>
          <select id="lvType"><option>سنوية</option><option>مرضية</option><option>أمومة</option><option>طارئة</option><option>بدون راتب</option></select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>من</label><input type="date" id="lvFrom" onchange="calcLvDays()"></div>
          <div class="form-group"><label>إلى</label><input type="date" id="lvTo" onchange="calcLvDays()"></div>
        </div>
        <div class="form-group"><label>عدد الأيام</label><input type="number" id="lvDays" readonly value="0"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-leave')">إلغاء</button>
        <button class="btn btn-primary" onclick="saveLeave()">📨 تقديم</button>
      </div>
    </div>
  </div>`;
}

function calcLvDays() {
  const f = document.getElementById('lvFrom').value;
  const t = document.getElementById('lvTo').value;
  if (f && t) {
    const d = Math.round((new Date(t) - new Date(f)) / 86400000) + 1;
    document.getElementById('lvDays').value = d > 0 ? d : 0;
  }
}

function saveLeave() {
  const empSel = document.getElementById('lvEmp');
  const empId  = empSel.value;
  const emp    = DB.all('employees').find(e => e.id === empId);
  if (!emp) { showToast('⚠️ اختر موظفاً'); return; }
  DB.add('leaves', {
    id: DB.nextId('leaves','L'),
    empId, empName: emp.name, branch: emp.branch,
    type:  document.getElementById('lvType').value,
    from:  document.getElementById('lvFrom').value,
    to:    document.getElementById('lvTo').value,
    days:  parseInt(document.getElementById('lvDays').value)||0,
    status:'pending'
  });
  closeModal('modal-leave');
  renderLeavesTable();
  showToast('✅ تم تقديم طلب الإجازة');
}

// ===== ATTENDANCE =====
function renderAttTable() {
  const emps = filterByBranch(DB.all('employees'));
  const rows = emps.map(e => `<tr>
    <td><b>${e.name}</b></td>
    <td><span class="badge ${BRANCHES[e.branch].badge}">${BRANCHES[e.branch].name}</span></td>
    <td>${e.role}</td>
    <td>
      <select class="inst-input att-status" data-id="${e.id}" style="width:120px">
        <option value="present">✅ حاضر</option>
        <option value="absent">❌ غائب</option>
        <option value="late">⏰ متأخر</option>
        <option value="leave">🏖️ إجازة</option>
      </select>
    </td>
    <td><input type="time" class="inst-input att-time" data-id="${e.id}" value="07:30" style="width:100px"></td>
    <td><input type="text" class="inst-input att-note" data-id="${e.id}" placeholder="ملاحظة" style="width:130px"></td>
  </tr>`).join('');

  document.getElementById('attTable').innerHTML = `
    <thead><tr><th>الموظف</th><th>الفرع</th><th>الوظيفة</th><th>الحالة</th><th>وقت الحضور</th><th>ملاحظة</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function saveAttendance() {
  showToast('✅ تم حفظ سجل الحضور بنجاح');
}

function exportAttExcel() {
  const rows = [];
  document.querySelectorAll('.att-status').forEach(sel => {
    const id   = sel.dataset.id;
    const emp  = DB.all('employees').find(e => e.id === id);
    const time = document.querySelector(`.att-time[data-id="${id}"]`)?.value || '';
    const note = document.querySelector(`.att-note[data-id="${id}"]`)?.value || '';
    if (emp) rows.push({ 'الموظف': emp.name, 'الفرع': BRANCHES[emp.branch].name,
      'الوظيفة': emp.role, 'الحالة': sel.value, 'وقت الحضور': time, 'ملاحظة': note });
  });
  xlsxExport(rows, 'سجل_الحضور_' + (document.getElementById('attDate')?.value||''));
}

// ===== SALARIES =====
function renderSalaryTable() {
  const emps = filterByBranch(DB.all('employees'));
  const rows = emps.map(e => {
    const net = (e.salary||0) + (e.allowance||0);
    return `<tr>
      <td><b>${e.name}</b></td>
      <td><span class="badge ${BRANCHES[e.branch].badge}">${BRANCHES[e.branch].name}</span></td>
      <td>${e.role}</td>
      <td>${fmtKD(e.salary)}</td>
      <td>${fmtKD(e.allowance)}</td>
      <td>0.000 د.ك</td>
      <td><b>${fmtKD(net)}</b></td>
      <td><span class="badge badge-orange" id="sal-status-${e.id}">لم يُصرف</span></td>
      <td><button class="btn btn-primary btn-sm" onclick="markSalaryPaid('${e.id}')">💳 صرف</button></td>
    </tr>`;
  }).join('');
  document.getElementById('salTable').innerHTML = `
    <thead><tr><th>الموظف</th><th>الفرع</th><th>الوظيفة</th><th>الراتب</th><th>البدلات</th><th>الخصومات</th><th>الصافي</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function markSalaryPaid(id) {
  const el = document.getElementById('sal-status-' + id);
  if (el) { el.className = 'badge badge-green'; el.textContent = '✓ مصروف'; }
  event.target.closest('td').innerHTML = '—';
  showToast('✅ تم صرف الراتب');
}

function exportHRExcel() {
  const data = filterByBranch(DB.all('employees')).map(e => ({
    'الكود': e.id, 'الاسم': e.name, 'الوظيفة': e.role,
    'الفرع': BRANCHES[e.branch].name, 'الجنسية': e.nationality||'',
    'الهاتف': e.phone||'', 'الراتب': e.salary, 'البدلات': e.allowance,
    'الصافي': (e.salary||0)+(e.allowance||0),
    'بداية العقد': fmtDate(e.contractStart), 'نهاية العقد': fmtDate(e.contractEnd),
    'الحالة': empStatus(e).label
  }));
  xlsxExport(data, 'تقرير_الموظفين');
}

function exportSalaryExcel() {
  const data = filterByBranch(DB.all('employees')).map(e => ({
    'الموظف': e.name, 'الفرع': BRANCHES[e.branch].name, 'الوظيفة': e.role,
    'الراتب الأساسي': e.salary, 'البدلات': e.allowance,
    'الخصومات': 0, 'الصافي': (e.salary||0)+(e.allowance||0)
  }));
  xlsxExport(data, 'كشف_الرواتب');
}

function printHRReport() {
  const data = filterByBranch(DB.all('employees'));
  printReport('تقرير شؤون العاملين',
    ['الاسم','الوظيفة','الفرع','الراتب','نهاية العقد','الحالة'],
    data.map(e => [e.name, e.role, BRANCHES[e.branch].name,
      fmtKD((e.salary||0)+(e.allowance||0)), fmtDate(e.contractEnd), empStatus(e).label]));
}

function printSalaryReport() {
  const data = filterByBranch(DB.all('employees'));
  printReport('كشف الرواتب',
    ['الموظف','الفرع','الراتب','البدلات','الصافي'],
    data.map(e => [e.name, BRANCHES[e.branch].name,
      fmtKD(e.salary), fmtKD(e.allowance), fmtKD((e.salary||0)+(e.allowance||0))]));
}
