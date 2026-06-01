// ============================================================
// APP-REPORTS.JS — Fees, Reports, Clothes, Supplies, Excel
// ============================================================

// ===== FEES PAGE =====
function renderFees() {
  document.getElementById('feesTabs').innerHTML = `
    <button class="tab active" onclick="feesTab(this,'fees-inst')">📋 الأقساط</button>
    <button class="tab" onclick="feesTab(this,'fees-pay')">💳 تسجيل دفعة</button>`;

  document.getElementById('feesContent').innerHTML = `
    <div id="fees-inst">
      <div class="filter-bar">
        <span class="filter-chip active" onclick="feesFilter(this,'all')">الكل</span>
        <span class="filter-chip" onclick="feesFilter(this,'pending')">قادم</span>
        <span class="filter-chip" onclick="feesFilter(this,'late')">متأخر</span>
        <span class="filter-chip" onclick="feesFilter(this,'paid')">مدفوع</span>
        <input type="search" id="feesSearch" placeholder="🔍 بحث باسم أو كود الطالب"
          style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;min-width:220px"
          oninput="renderFeesTable(currentFeesStatus||'all')">
        <button class="btn btn-outline" style="margin-right:auto" onclick="exportFeesExcel()">📥 Excel</button>
        <button class="btn btn-outline" onclick="printFeesReport()">🖨️ PDF</button>
      </div>
      <div class="card">
        <div class="table-wrap"><table id="feesTable"></table></div>
      </div>
    </div>
    <div id="fees-pay" style="display:none">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">💳 تسجيل دفعة جديدة</div>
          <div class="form-group"><label>الطالب</label>
            <select id="payStudent" onchange="loadStudentInstalls()">
              <option value="">-- اختر الطالب --</option>
              ${filterByBranch(DB.all('students')).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>القسط</label>
            <select id="payInst"><option value="">-- اختر القسط --</option></select>
          </div>
          <div class="form-group"><label>المبلغ (د.ك)</label>
            <input type="number" id="payAmt" step="0.001" placeholder="0.000">
          </div>
          <div class="form-group"><label>تاريخ الدفع</label>
            <input type="date" id="payDate" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group"><label>طريقة الدفع</label>
            <div class="pay-method" id="payMethodChips">
              <div class="pay-chip selected" onclick="selPay(this)">💵 نقدي</div>
              <div class="pay-chip" onclick="selPay(this)">📱 برنامج</div>
              <div class="pay-chip" onclick="selPay(this)">💳 كي نت</div>
              <div class="pay-chip" onclick="selPay(this)">🔗 رابط</div>
            </div>
          </div>
          <div class="form-group"><label>إيصال الدفع (صورة)</label>
            <input type="file" id="payReceiptFees" accept="image/*" onchange="previewFeeReceipt(this)"
              style="font-size:13px">
            <div id="payReceiptFeesPreview" style="margin-top:8px"></div>
          </div>
          <div class="form-group"><label>بيان / ملاحظات</label>
            <textarea id="payNote" class="form-control" rows="2" placeholder="أي ملاحظات إضافية..." style="resize:vertical;font-family:inherit;font-size:13px"></textarea>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick="registerPayment()">💾 تسجيل الدفعة</button>
        </div>
        <div class="card">
          <div class="card-title">📊 خطة أقساط الطالب</div>
          <div id="payStudentPlan" style="padding:30px;text-align:center;color:var(--text-muted)">اختر طالباً</div>
        </div>
      </div>
    </div>`;

  renderFeesTable('all');
}

function feesTab(el, id) {
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('fees-inst').style.display = id === 'fees-inst' ? '' : 'none';
  document.getElementById('fees-pay').style.display  = id === 'fees-pay'  ? '' : 'none';
}

let currentFeesStatus = 'all';
function feesFilter(el, status) {
  el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentFeesStatus = status;
  renderFeesTable(status);
}

function renderFeesTable(statusFilter) {
  const searchVal = (document.getElementById('feesSearch')?.value || '').toLowerCase();
  const students  = filterByBranch(DB.all('students')).filter(s =>
    !searchVal || s.name.toLowerCase().includes(searchVal) || s.id.toLowerCase().includes(searchVal)
  );
  const installs = DB.all('installments');
  const today    = new Date();

  let rows = students.map(s => {
    const sInst = installs.filter(i => i.studentId === s.id);
    const paid  = sInst.filter(i => i.status === 'paid').length;
    const total = sInst.length;
    const late  = sInst.some(i => i.status === 'pending' && daysUntil(i.dueDate) < 0);
    const st    = studentStatus(s);

    if (statusFilter === 'paid'    && st.label !== 'مكتمل') return '';
    if (statusFilter === 'pending' && (st.label === 'مكتمل' || late)) return '';
    if (statusFilter === 'late'    && !late) return '';

    const pct = s.net > 0 ? Math.round(s.paid / s.net * 100) : 0;
    return `<tr>
      <td><b>${s.name}</b></td>
      <td><span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span></td>
      <td>${fmtKD(s.fees)}</td><td>${fmtKD(s.discount)}</td>
      <td><b>${fmtKD(s.net)}</b></td><td style="color:var(--primary)">${fmtKD(s.paid)}</td>
      <td style="color:var(--danger)">${fmtKD(s.net-s.paid)}</td>
      <td><div class="progress-bar" style="width:80px;display:inline-flex">
        <div class="progress-fill" style="width:${pct}%"></div></div> ${pct}%</td>
      <td>${paid}/${total}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="openStudentInstallments('${s.id}')">📋</button></td>
    </tr>`;
  }).join('');

  if (!rows.trim()) rows = `<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</td></tr>`;
  document.getElementById('feesTable').innerHTML = `
    <thead><tr><th>الطالب</th><th>الفرع</th><th>الإجمالي</th><th>الخصم</th><th>الصافي</th>
    <th>المدفوع</th><th>المتبقي</th><th>نسبة السداد</th><th>الأقساط</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function loadStudentInstalls() {
  const sid   = document.getElementById('payStudent').value;
  const insts = DB.all('installments').filter(i => i.studentId === sid && (i.status === 'pending' || i.status === 'partial'));
  const sel   = document.getElementById('payInst');
  sel.innerHTML =
    `<option value="">-- اختر القسط --</option>` +
    insts.map(i => {
      const remaining = i.amount - (i.partialPaid || 0);
      const label = insts.length === 1
        ? `المبلغ: ${fmtKD(i.amount)} — المتبقي: ${fmtKD(remaining)}`
        : `قسط ${i.num} — ${fmtKD(i.amount)} — المتبقي: ${fmtKD(remaining)}`;
      return `<option value="${i.id}">${label}</option>`;
    }).join('');

  // clear amount when switching student
  document.getElementById('payAmt').value = '';

  // auto-select if only one installment
  if (insts.length === 1) {
    sel.value = insts[0].id;
    const rem = insts[0].amount - (insts[0].partialPaid || 0);
    document.getElementById('payAmt').value = rem.toFixed(3);
  }

  const s = DB.all('students').find(x => x.id === sid);
  if (s) {
    const remaining = s.net - s.paid;
    document.getElementById('payStudentPlan').innerHTML =
      `<div style="text-align:right">
        <p><b>الطالب:</b> ${s.name}</p>
        <p><b>الصافي:</b> ${fmtKD(s.net)}</p>
        <p><b>المدفوع:</b> <span style="color:var(--primary)">${fmtKD(s.paid)}</span></p>
        <p><b>المتبقي:</b> <span style="color:${remaining > 0 ? 'var(--danger)' : 'var(--primary)'}">${fmtKD(remaining)}</span></p>
        ${remaining <= 0 ? '<p style="color:var(--primary);font-weight:bold">✅ مكتمل السداد</p>' : ''}
      </div>`;
  }
}

function registerPayment() {
  const sid    = document.getElementById('payStudent').value;
  const instId = document.getElementById('payInst').value;
  const amt    = parseFloat(document.getElementById('payAmt').value);
  const date   = document.getElementById('payDate').value;
  const method = document.querySelector('#payMethodChips .pay-chip.selected')?.textContent.trim() || 'نقدي';

  if (!sid) { showToast('⚠️ اختر الطالب'); return; }
  if (!amt || amt <= 0) { showToast('⚠️ أدخل مبلغاً صحيحاً'); return; }

  const _s = DB.all('students').find(x => x.id === sid);
  const _remaining = _s ? (_s.net - _s.paid) : 0;
  if (_s && _remaining <= 0 && !instId) {
    showToast('⚠️ هذا الطالب مكتمل السداد');
    return;
  }
  if (_remaining > 0 && amt > _remaining) {
    showToast(`⚠️ المبلغ أكبر من المتبقي (${fmtKD(_remaining)})`);
    return;
  }

  const fileInput = document.getElementById('payReceiptFees');
  const file = fileInput?.files?.[0];

  function applyFeePayment(receiptData) {
    const s = DB.all('students').find(x => x.id === sid);
    if (!s) return;

    if (instId) {
      // update existing installment
      const inst = DB.all('installments').find(i => i.id === instId);
      if (inst) {
        const newPartial = (inst.partialPaid || 0) + amt;
        const newStatus = newPartial >= inst.amount ? 'paid' : 'partial';
        const note = document.getElementById('payNote')?.value?.trim() || '';
        const updates = { status: newStatus, paidDate: date, method, partialPaid: newPartial, note };
        if (receiptData) updates.receipt = receiptData;
        DB.update('installments', instId, updates);
      }
    } else {
      // no installment selected — create a new payment record
      const newInstId = DB.nextId('installments','I');
      const note = document.getElementById('payNote')?.value?.trim() || '';
      const rec = {
        id: newInstId, studentId: sid,
        num: DB.all('installments').filter(i=>i.studentId===sid).length + 1,
        amount: amt, partialPaid: amt,
        dueDate: date, paidDate: date,
        status: 'paid', method, note
      };
      if (receiptData) rec.receipt = receiptData;
      DB.add('installments', rec);
    }

    const newTotalPaid = Math.min((s.paid || 0) + amt, s.net || 999999);
    DB.update('students', sid, { paid: newTotalPaid });
    showToast('✅ تم تسجيل الدفعة بنجاح');
    if (fileInput) fileInput.value = '';
    const prev = document.getElementById('payReceiptFeesPreview');
    if (prev) prev.innerHTML = '';
    document.getElementById('payAmt').value = '';
    const noteEl = document.getElementById('payNote');
    if (noteEl) noteEl.value = '';
    loadStudentInstalls();
    renderFeesTable('all');
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = e => applyFeePayment(e.target.result);
    reader.readAsDataURL(file);
  } else {
    applyFeePayment(null);
  }
}

function previewFeeReceipt(input) {
  const prev = document.getElementById('payReceiptFeesPreview');
  if (!input.files || !input.files[0]) { prev.innerHTML = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border)">`;
  };
  reader.readAsDataURL(input.files[0]);
}

// ===== REPORTS PAGE =====
function renderReports() {
  document.getElementById('reportsTabs').innerHTML = `
    <button class="tab active" onclick="repTab(this,'rep-payments')">📋 المدفوعات</button>
    <button class="tab" onclick="repTab(this,'rep-plan')">📅 خطة الأقساط</button>
    <button class="tab" onclick="repTab(this,'rep-student')">🔍 بحث عن طالب</button>
    <button class="tab" onclick="repTab(this,'rep-daily')">📄 التقرير اليومي</button>`;

  document.getElementById('reportsContent').innerHTML = `
    <div id="rep-payments">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="filter-bar" style="margin:0">
          <span class="filter-chip active" onclick="repBranch(this,'all')">كل الفروع</span>
          <span class="filter-chip" onclick="repBranch(this,'esh')">اشبيلية</span>
          <span class="filter-chip" onclick="repBranch(this,'sol')">الصليبخات</span>
          <span class="filter-chip" onclick="repBranch(this,'mat')">المطلاع</span>
          <input type="date" id="repFrom" style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">
          <input type="date" id="repTo"   style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" onclick="exportPaymentsExcel()">📥 Excel</button>
          <button class="btn btn-outline" onclick="printPaymentsReport()">🖨️ PDF</button>
        </div>
      </div>
      <div class="card"><div class="table-wrap"><table id="repPayTable"></table></div></div>
    </div>
    <div id="rep-plan" style="display:none">
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px">
        <button class="btn btn-outline" onclick="exportPlanExcel()">📥 Excel</button>
        <button class="btn btn-outline" onclick="printPlanReport()">🖨️ PDF</button>
      </div>
      <div class="card"><div class="table-wrap"><table id="repPlanTable"></table></div></div>
    </div>
    <div id="rep-daily" style="display:none">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <input type="date" id="dailyDate" style="padding:7px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
        <button class="btn btn-primary" onclick="renderDailyReport()">🔍 عرض</button>
        <button class="btn btn-outline" onclick="printDailyReport()">🖨️ طباعة</button>
      </div>
      <div id="dailyReportContent"></div>
    </div>
    <div id="rep-student" style="display:none">
      <div class="card">
        <div class="card-title">🔍 بحث عن طالب — عرض بياناته وأقساطه</div>
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
          <input type="search" id="studentLookupSearch"
            placeholder="اسم الطالب أو الكود..."
            style="flex:1;min-width:220px;padding:9px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit"
            oninput="lookupStudentSearch()">
          <select id="studentLookupSelect"
            style="min-width:220px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit"
            onchange="lookupStudentById(this.value)">
            <option value="">-- اختر الطالب --</option>
            ${filterByBranch(DB.all('students')).map(s=>`<option value="${s.id}">${s.id} — ${s.name}</option>`).join('')}
          </select>
        </div>
        <div id="studentLookupResult" style="color:var(--text-muted);text-align:center;padding:20px">
          ابحث عن طالب لعرض بياناته الكاملة
        </div>
      </div>
    </div>`;

  renderPaymentsReport('all');
}

let repBranchFilter = 'all';
function repBranch(el, b) {
  el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  repBranchFilter = b;
  renderPaymentsReport(b);
}

function repTab(el, id) {
  el.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('rep-payments').style.display = id === 'rep-payments' ? '' : 'none';
  document.getElementById('rep-plan').style.display     = id === 'rep-plan'     ? '' : 'none';
  document.getElementById('rep-student').style.display  = id === 'rep-student'  ? '' : 'none';
  document.getElementById('rep-daily').style.display    = id === 'rep-daily'    ? '' : 'none';
  if (id === 'rep-plan')  renderPlanReport();
  if (id === 'rep-daily') {
    document.getElementById('dailyDate').value = new Date().toISOString().split('T')[0];
    renderDailyReport();
  }
}

function renderPaymentsReport(branchF) {
  const installs = DB.all('installments').filter(i => i.status === 'paid');
  const students = DB.all('students');
  const rows = installs.map(i => {
    const s = students.find(x => x.id === i.studentId);
    if (!s) return '';
    if (branchF !== 'all' && s.branch !== branchF) return '';
    return `<tr>
      <td><b>${s.name}</b></td>
      <td><span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span></td>
      <td>${fmtDate(i.paidDate)}</td>
      <td><b>${fmtKD(i.amount)}</b></td>
      <td>${i.method||'—'}</td>
      <td>قسط ${i.num}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد مدفوعات</td></tr>`;

  document.getElementById('repPayTable').innerHTML = `
    <thead><tr><th>الطالب</th><th>الفرع</th><th>تاريخ الدفع</th><th>المبلغ</th><th>الطريقة</th><th>القسط</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderPlanReport() {
  const installs = DB.all('installments');
  const students = DB.all('students');
  const rows = installs.map(i => {
    const s = students.find(x => x.id === i.studentId);
    if (!s) return '';
    const late    = i.status === 'pending' && daysUntil(i.dueDate) < 0;
    const badge   = i.status === 'paid' ? 'badge-green' : late ? 'badge-red' : 'badge-orange';
    const label   = i.status === 'paid' ? 'مدفوع' : late ? 'متأخر' : 'قادم';
    return `<tr>
      <td><b>${s.name}</b></td>
      <td><span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span></td>
      <td>قسط ${i.num}</td><td>${fmtKD(i.amount)}</td>
      <td>${fmtDate(i.dueDate)}</td><td>${fmtDate(i.paidDate)}</td>
      <td><span class="badge ${badge}">${label}</span></td>
    </tr>`;
  }).join('');
  document.getElementById('repPlanTable').innerHTML = `
    <thead><tr><th>الطالب</th><th>الفرع</th><th>القسط</th><th>المبلغ</th><th>الاستحقاق</th><th>الدفع</th><th>الحالة</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

// ============================================================
// ===== CLOTHES INVENTORY (PK System) =====
// ============================================================

// --- Data helpers ---
const INV_TYPES_DEFAULT = ['قميص','بنطلون','فستان','جاكيت','بيجاما','تيشيرت','شورت'];
const INV_STAGES = ['الحضانة (0-2)','KG1','KG2'];
const INV_MIN_QTY = 10;

function invGetTypes()       { return DB.get('invTypes')       || INV_TYPES_DEFAULT; }
function invGetMainStock()   {
  return DB.get('invMainStock') || invGetTypes().map((t,i) => ({type:t, qty:80+i*15}));
}
function invGetBranchStock() {
  return DB.get('invBranchStock') || ['esh','sol','mat','esh_e','sol_e','mat_e'].flatMap(b =>
    invGetTypes().map((t,i) => ({type:t, branch:b, qty:20+i*3, minQty:INV_MIN_QTY}))
  );
}
function invGetDispatch()    { return DB.get('invDispatch')    || []; }
function invGetRequests()    { return DB.get('invRequests')    || []; }
function invGetSizes()       { return DB.get('invSizes') || ['2 سنوات','3 سنوات','4 سنوات','5 سنوات','6 سنوات','7 سنوات','8 سنوات']; }
function invSaveSizes(arr)   { DB.set('invSizes', arr); }
function invSaveMain(d)      { DB.set('invMainStock', d); }
function invSaveBranch(d)    { DB.set('invBranchStock', d); }
function invSaveDispatch(d)  { DB.set('invDispatch', d); }
function invSaveRequests(d)  { DB.set('invRequests', d); }

function invIsAdmin()   { return currentUser?.role === 'admin'; }
function invBranchKey() { return currentUser?.branch || 'esh'; }
function invBranchName(){ return BRANCHES[invBranchKey()]?.name || '—'; }

// --- Main render ---
function renderClothes() {
  const isAdmin = invIsAdmin();
  const tabs = isAdmin
    ? [{id:'pkdash',l:'🏠 لوحة التحكم'},{id:'pkmain',l:'🏭 المخزن الرئيسي'},
       {id:'pkbranches',l:'🏪 أرصدة الفروع'},{id:'pkrequests',l:'📋 الطلبات'},{id:'pklog',l:'📜 سجل الصرف'}]
    : [{id:'pkbdash',l:'🏠 لوحتي'},{id:'pkbstock',l:'📦 مخزوني'},
       {id:'pkdispatch',l:'✅ صرف قطعة'},{id:'pkbreq',l:'📤 طلب تزويد'},{id:'pkblog',l:'📜 سجلي'}];

  const page = document.getElementById('page-clothes');
  page.innerHTML = `
    <div id="inv-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      ${tabs.map((t,i) => `<button id="invtab-${t.id}" onclick="pkShowTab('${t.id}')"
        style="padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:${i===0?'var(--primary)':'var(--bg)'};
        color:${i===0?'#fff':'var(--text-muted)'};cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s">${t.l}</button>`).join('')}
    </div>
    <div id="inv-content"></div>`;
  pkShowTab(tabs[0].id);
}

function pkShowTab(id) {
  document.querySelectorAll('#inv-tabs button').forEach(b => {
    b.style.background='var(--bg)'; b.style.color='var(--text-muted)'; b.style.borderColor='var(--border)';
  });
  const btn = document.getElementById('invtab-'+id);
  if (btn) { btn.style.background='var(--primary)'; btn.style.color='#fff'; btn.style.borderColor='var(--primary)'; }

  const cont = document.getElementById('inv-content');
  if (!cont) return;
  if (id==='pkdash')     cont.innerHTML = pkBuildAdminDash();
  else if (id==='pkmain')     cont.innerHTML = pkBuildMainStock();
  else if (id==='pkbranches') cont.innerHTML = pkBuildBranches();
  else if (id==='pkrequests') cont.innerHTML = pkBuildRequests();
  else if (id==='pklog')      cont.innerHTML = pkBuildLog(null);
  else if (id==='pkbdash')    cont.innerHTML = pkBuildBranchDash();
  else if (id==='pkbstock')   cont.innerHTML = pkBuildBranchStock();
  else if (id==='pkdispatch') cont.innerHTML = pkBuildDispatchForm();
  else if (id==='pkbreq')     cont.innerHTML = pkBuildRequestForm();
  else if (id==='pkblog')     cont.innerHTML = pkBuildLog(invBranchKey());
}

// PK styling helpers
const pks = 'background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:14px';
const pkm = 'background:var(--bg-secondary,#f7f7f5);border-radius:10px;padding:14px;text-align:center;flex:1;min-width:110px';
function pkBadge(bg,c,t){ return `<span style="display:inline-block;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;background:${bg};color:${c}">${t}</span>`; }
function pkOk(t){ return pkBadge('#dcfce7','#166534',t); }
function pkWarn(t){ return pkBadge('#fef3c7','#92400e',t); }
function pkDanger(t){ return pkBadge('#fee2e2','#991b1b',t); }

// Admin Dashboard
function pkBuildAdminDash() {
  const main     = invGetMainStock();
  const branch   = invGetBranchStock();
  const dispatch = invGetDispatch();
  const requests = invGetRequests();
  const tMain = main.reduce((s,i)=>s+i.qty,0);
  const tBranch = branch.reduce((s,i)=>s+i.qty,0);
  const pend = requests.filter(r=>r.status==='pending').length;
  const alerts = main.filter(i=>i.qty<INV_MIN_QTY)
    .map(i=>`<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:6px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e">⚠️ ${i.type}: متبقي ${i.qty} قطعة فقط</div>`).join('');
  const fills = ['esh','sol','mat','esh_e','sol_e','mat_e'].map(b=>{
    const tot = branch.filter(x=>x.branch===b).reduce((s,i)=>s+i.qty,0);
    const cap = invGetTypes().length * 30;
    const pct = Math.min(100, Math.round(tot/cap*100));
    const c = pct>60?'var(--primary)':pct>30?'var(--accent)':'var(--danger)';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span>فرع ${BRANCHES[b].name}</span><span style="color:var(--text-muted)">${tot} قطعة (${pct}%)</span>
      </div>
      <div style="background:#e0e0e0;border-radius:4px;height:7px;overflow:hidden">
        <div style="height:7px;border-radius:4px;width:${pct}%;background:${c}"></div>
      </div></div>`;
  }).join('');
  const lastLog = dispatch.slice().reverse().slice(0,5)
    .map(d=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
      <b>${d.childName}</b><span style="color:var(--text-muted)">${BRANCHES[d.branch]?.name||d.branch} | ${d.type} ×${d.qty}</span></div>`).join('') || '<p style="color:var(--text-muted);font-size:13px">لا توجد عمليات بعد</p>';

  return `
  <!-- Sizes Settings Card -->
  <div style="${pks};margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <b style="font-size:14px">📏 إدارة المقاسات</b>
      <button class="btn btn-primary btn-sm" onclick="pkOpenSizesManager()">⚙️ تعديل المقاسات</button>
    </div>
    <div id="sizesBadges" style="display:flex;flex-wrap:wrap;gap:6px">
      ${invGetSizes().map(s=>`<span class="badge badge-blue" style="padding:5px 10px;font-size:13px">${s}</span>`).join('')}
    </div>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--primary)">${tMain}</div><div style="font-size:11px;color:var(--text-muted)">المخزن الرئيسي</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--info,#378ADD)">${tBranch}</div><div style="font-size:11px;color:var(--text-muted)">إجمالي الفروع</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--accent)">${pend}</div><div style="font-size:11px;color:var(--text-muted)">طلبات معلقة</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--text)">${dispatch.length}</div><div style="font-size:11px;color:var(--text-muted)">عمليات صرف</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
    <div style="${pks}"><b style="font-size:14px">🔔 تنبيهات المخزون</b><div style="margin-top:10px">${alerts||'<div style="padding:9px 12px;border-radius:8px;font-size:13px;border:1px solid #86efac;background:#f0fdf4;color:#166534">✅ جميع الأصناف ضمن الحد الأدنى</div>'}</div></div>
    <div style="${pks}"><b style="font-size:14px">⏱️ آخر عمليات الصرف</b><div style="margin-top:10px">${lastLog}</div></div>
  </div>
  <div style="${pks}"><b style="font-size:14px">📊 نسبة امتلاء الفروع</b><div style="margin-top:12px">${fills}</div></div>`;
}

// Admin: Main stock
function pkBuildMainStock() {
  const main = invGetMainStock();
  const rows = main.map(i => {
    const st = i.qty<INV_MIN_QTY?pkDanger('منخفض'):i.qty<INV_MIN_QTY*2?pkWarn('متوسط'):pkOk('جيد');
    return `<tr>
      <td><b>${i.type}</b></td><td>${i.qty}</td><td>${INV_MIN_QTY}</td><td>${st}</td>
      <td>
        <input type="number" id="pkaq-${i.type}" value="10" min="1"
          style="width:65px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-family:inherit">
        <button onclick="pkAddToMain('${i.type}')"
          style="padding:5px 10px;font-size:12px;border:1px solid var(--primary);background:var(--primary-light,#e8f5ee);color:var(--primary-dark);border-radius:6px;cursor:pointer;font-family:inherit">+ إضافة</button>
        <button class="btn btn-outline btn-sm" onclick="pkEditType('${i.type}')">✏️</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="pkDeleteType('${i.type}')">🗑️</button>
      </td></tr>`;
  }).join('');
  return `<div style="${pks}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <b style="font-size:14px">🏭 المخزن الرئيسي</b>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="pkExportMainExcel()">📥 Excel</button>
        <button class="btn btn-outline btn-sm" onclick="pkPrintMainReport()">🖨️ PDF</button>
        <button class="btn btn-primary btn-sm" onclick="pkOpenAddType()">➕ نوع جديد</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>النوع</th><th>الكمية</th><th>الحد الأدنى</th><th>الحالة</th><th>إضافة كمية</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

function pkEditType(oldType) {
  const newType = prompt('تعديل اسم النوع:', oldType);
  if (!newType || newType === oldType) return;
  // Update types list
  const types = invGetTypes();
  const ti = types.indexOf(oldType);
  if (ti >= 0) types[ti] = newType;
  DB.set('invTypes', types);
  // Update main stock
  const main = invGetMainStock();
  main.forEach(i => { if (i.type === oldType) i.type = newType; });
  invSaveMain(main);
  // Update branch stock
  const bs = invGetBranchStock();
  bs.forEach(i => { if (i.type === oldType) i.type = newType; });
  invSaveBranch(bs);
  pkShowTab('pkmain');
  showToast('✅ تم تعديل اسم النوع إلى: ' + newType);
}

function pkDeleteType(type) {
  if (!confirm(`هل تريد حذف نوع "${type}" من المخزن الرئيسي وجميع الفروع؟`)) return;
  // Remove from types
  const types = invGetTypes().filter(t => t !== type);
  DB.set('invTypes', types);
  // Remove from main stock
  invSaveMain(invGetMainStock().filter(i => i.type !== type));
  // Remove from branch stock
  invSaveBranch(invGetBranchStock().filter(i => i.type !== type));
  pkShowTab('pkmain');
  showToast('🗑️ تم حذف النوع: ' + type);
}

function pkDeleteBranchItem(branch, type) {
  if (!confirm(`هل تريد إزالة "${type}" من فرع ${BRANCHES[branch]?.name}؟`)) return;
  const bs = invGetBranchStock().filter(i => !(i.branch === branch && i.type === type));
  invSaveBranch(bs);
  pkShowTab('pkbranches');
  showToast(`🗑️ تم إزالة ${type} من فرع ${BRANCHES[branch]?.name}`);
}

function pkAddToMain(type) {
  const qty = parseInt(document.getElementById('pkaq-'+type)?.value)||0;
  if (qty <= 0) { showToast('⚠️ أدخل كمية صالحة'); return; }
  const main = invGetMainStock();
  const idx = main.findIndex(i=>i.type===type);
  if (idx >= 0) main[idx].qty += qty;
  invSaveMain(main);
  pkShowTab('pkmain');
  showToast(`✅ تمت إضافة ${qty} قطعة من ${type}`);
}

function pkOpenAddType() {
  document.getElementById('modals').innerHTML = `
  <div id="modal-inv-type" class="modal-overlay open">
    <div class="modal" style="max-width:360px">
      <div class="modal-header"><div class="modal-title">➕ إضافة نوع ملابس</div>
        <button class="modal-close" onclick="closeModal('modal-inv-type')">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>اسم النوع *</label>
          <input id="invNewType" class="form-control" placeholder="مثال: معطف"></div>
        <div class="form-group"><label>الكمية الابتدائية في المخزن الرئيسي</label>
          <input id="invNewTypeQty" type="number" class="form-control" value="0" min="0"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-inv-type')">إلغاء</button>
        <button class="btn btn-primary" onclick="pkSaveNewType()">💾 حفظ</button>
      </div>
    </div>
  </div>`;
}

function pkSaveNewType() {
  const name = document.getElementById('invNewType').value.trim();
  const qty  = parseInt(document.getElementById('invNewTypeQty').value)||0;
  if (!name) { showToast('⚠️ أدخل اسم النوع'); return; }
  const types = invGetTypes();
  if (types.includes(name)) { showToast('هذا النوع موجود بالفعل'); return; }
  types.push(name);
  DB.set('invTypes', types);
  const main = invGetMainStock(); main.push({type:name, qty});
  invSaveMain(main);
  const branch = invGetBranchStock();
  ['esh','sol','mat','esh_e','sol_e','mat_e'].forEach(b => branch.push({type:name, branch:b, qty:0, minQty:INV_MIN_QTY}));
  invSaveBranch(branch);
  closeModal('modal-inv-type');
  pkShowTab('pkmain');
  showToast('✅ تمت إضافة النوع: '+name);
}

// Admin: Branch stocks
function pkBuildBranches() {
  const stock = invGetBranchStock();
  const exportBar = `<div style="display:flex;gap:6px;margin-bottom:14px">
    <button class="btn btn-outline btn-sm" onclick="pkExportBranchesExcel()">📥 Excel</button>
    <button class="btn btn-outline btn-sm" onclick="pkPrintBranchesReport()">🖨️ PDF</button>
  </div>`;
  const cards = ['esh','sol','mat','esh_e','sol_e','mat_e'].map(b => {
    const bStock = stock.filter(x=>x.branch===b);
    const tot = bStock.reduce((s,i)=>s+i.qty,0);
    const rows = bStock.map(i => {
      const st = i.qty<8?pkDanger('نفذ تقريباً'):i.qty<15?pkWarn('منخفض'):pkOk('متاح');
      return `<tr><td><b>${i.type}</b></td><td>${i.qty}</td><td>${i.minQty||INV_MIN_QTY}</td><td>${st}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="pkTransferToBranch('${b}','${i.type}')">📤 تحويل</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="pkDeleteBranchItem('${b}','${i.type}')">🗑️</button>
        </td></tr>`;
    }).join('');
    return `<div style="${pks}"><b style="font-size:14px">🏪 فرع ${BRANCHES[b].name} — ${tot} قطعة</b>
      <div class="table-wrap" style="margin-top:12px"><table>
        <thead><tr><th>النوع</th><th>الكمية</th><th>الحد الأدنى</th><th>الحالة</th><th>إجراء</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>`;
  }).join('');
  return exportBar + cards;
}

function pkTransferToBranch(branch, type) {
  const qty = parseInt(prompt(`كمية التحويل من المخزن الرئيسي إلى فرع ${BRANCHES[branch].name} (${type}):`))||0;
  if (qty <= 0) return;
  const main = invGetMainStock();
  const mIdx = main.findIndex(i=>i.type===type);
  if (mIdx<0 || main[mIdx].qty < qty) { showToast('⚠️ الكمية أكبر من المتاح في المخزن الرئيسي'); return; }
  main[mIdx].qty -= qty;
  invSaveMain(main);
  const bs = invGetBranchStock();
  const bIdx = bs.findIndex(i=>i.branch===branch&&i.type===type);
  if (bIdx>=0) bs[bIdx].qty += qty;
  invSaveBranch(bs);
  pkShowTab('pkbranches');
  showToast(`✅ تم تحويل ${qty} قطعة من ${type} إلى فرع ${BRANCHES[branch].name}`);
}

// Admin: Requests
function pkBuildRequests() {
  const reqs = invGetRequests();
  const rows = reqs.length
    ? reqs.slice().reverse().map(r => {
        const st = r.status==='approved'?pkOk('موافق'):r.status==='rejected'?pkDanger('مرفوض'):pkWarn('انتظار');
        const act = r.status==='pending'
          ? `<button onclick="pkApproveReq('${r.id}')" style="font-size:11px;padding:4px 8px;margin-left:4px;border:1px solid #16a34a;background:#f0fdf4;color:#166534;border-radius:6px;cursor:pointer;font-family:inherit">✅ موافقة</button>
             <button onclick="pkRejectReq('${r.id}')" style="font-size:11px;padding:4px 8px;border:1px solid #dc2626;background:#fef2f2;color:#991b1b;border-radius:6px;cursor:pointer;font-family:inherit">❌ رفض</button>`
          : '—';
        return `<tr><td>${r.id}</td><td>${BRANCHES[r.branch]?.name||r.branch}</td>
          <td>${r.type}</td><td>${r.size||'—'}</td><td>${r.qty}</td><td>${fmtDate(r.date)}</td>
          <td>${st}</td><td>${act}</td></tr>`;
      }).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد طلبات</td></tr>`;
  return `<div style="${pks}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <b style="font-size:14px">📋 طلبات التزويد من الفروع</b>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="pkExportRequestsExcel()">📥 Excel</button>
        <button class="btn btn-outline btn-sm" onclick="pkPrintRequestsReport()">🖨️ PDF</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>رقم</th><th>الفرع</th><th>النوع</th><th>المقاس</th><th>الكمية</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

function pkApproveReq(id) {
  const reqs = invGetRequests();
  const req = reqs.find(r=>r.id===id);
  if (!req) return;
  const main = invGetMainStock();
  const mIdx = main.findIndex(i=>i.type===req.type);
  if (mIdx<0 || main[mIdx].qty < req.qty) { showToast('⚠️ الكمية غير كافية في المخزن الرئيسي'); return; }
  main[mIdx].qty -= req.qty;
  invSaveMain(main);
  const bs = invGetBranchStock();
  const bIdx = bs.findIndex(i=>i.branch===req.branch&&i.type===req.type);
  if (bIdx>=0) bs[bIdx].qty += req.qty;
  invSaveBranch(bs);
  reqs.find(r=>r.id===id).status = 'approved';
  invSaveRequests(reqs);
  pkShowTab('pkrequests');
  showToast('✅ تمت الموافقة وتحويل الكمية');
}

function pkRejectReq(id) {
  const reqs = invGetRequests();
  const r = reqs.find(x=>x.id===id);
  if (r) r.status = 'rejected';
  invSaveRequests(reqs);
  pkShowTab('pkrequests');
  showToast('❌ تم رفض الطلب');
}

// Admin: Dispatch log
function pkBuildLog(branch) {
  const log = invGetDispatch().filter(d=>!branch||d.branch===branch).slice().reverse();
  const rows = log.length
    ? log.map(d=>`<tr>
        <td>${fmtDate(d.date)}</td>
        <td>${BRANCHES[d.branch]?.name||d.branch}</td>
        <td><b>${d.childName}</b></td><td>${d.stage}</td>
        <td>${d.type}</td><td>${d.size||'—'}</td><td>${d.qty}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد سجلات</td></tr>`;
  const title = branch ? `سجل صرف فرع ${BRANCHES[branch]?.name}` : 'سجل الصرف — جميع الفروع';
  const bArg = branch ? `'${branch}'` : 'null';
  return `<div style="${pks}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <b style="font-size:14px">📜 ${title}</b>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="pkExportLogExcel(${bArg})">📥 Excel</button>
        <button class="btn btn-outline btn-sm" onclick="pkPrintLogReport(${bArg})">🖨️ PDF</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>التاريخ</th><th>الفرع</th><th>اسم الطفل/ة</th><th>المرحلة</th><th>النوع</th><th>المقاس</th><th>الكمية</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

// Branch: Dashboard
function pkBuildBranchDash() {
  const b     = invBranchKey();
  const stock = invGetBranchStock().filter(x=>x.branch===b);
  const log   = invGetDispatch().filter(d=>d.branch===b);
  const reqs  = invGetRequests().filter(r=>r.branch===b&&r.status==='pending');
  const tot   = stock.reduce((s,i)=>s+i.qty,0);
  const low   = stock.filter(i=>i.qty<(i.minQty||INV_MIN_QTY));
  const alerts= low.map(i=>`<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:6px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e">⚠️ ${i.type}: متبقي ${i.qty} فقط</div>`).join('')
    || `<div style="padding:9px 12px;border-radius:8px;font-size:13px;border:1px solid #86efac;background:#f0fdf4;color:#166534">✅ المخزون ضمن المستوى الطبيعي</div>`;
  const last = log.slice().reverse().slice(0,4).map(d=>`<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:13px"><b>${d.childName}</b> — ${d.stage}<br><span style="color:var(--text-muted);font-size:12px">${d.type} × ${d.qty}</span></div>`).join('')
    || '<p style="color:var(--text-muted);font-size:13px">لا يوجد بعد</p>';
  return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--primary)">${tot}</div><div style="font-size:11px;color:var(--text-muted)">إجمالي مخزوني</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--info,#378ADD)">${log.length}</div><div style="font-size:11px;color:var(--text-muted)">عمليات الصرف</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--danger)">${low.length}</div><div style="font-size:11px;color:var(--text-muted)">أصناف منخفضة</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--accent)">${reqs.length}</div><div style="font-size:11px;color:var(--text-muted)">طلبات معلقة</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="${pks}"><b>🔔 تنبيهات</b><div style="margin-top:10px">${alerts}</div></div>
    <div style="${pks}"><b>⏱️ آخر الصرف</b><div style="margin-top:10px">${last}</div>
  </div></div>`;
}

// Branch: My stock
function pkBuildBranchStock() {
  const b     = invBranchKey();
  const stock = invGetBranchStock().filter(x=>x.branch===b);
  const tot   = stock.reduce((s,i)=>s+i.qty,0);
  const rows  = stock.map(i=>{
    const st = i.qty<(i.minQty||INV_MIN_QTY)?pkDanger('نفذ تقريباً'):i.qty<15?pkWarn('منخفض'):pkOk('متاح');
    return `<tr><td><b>${i.type}</b></td><td>${i.qty}</td><td>${i.minQty||INV_MIN_QTY}</td><td>${st}</td></tr>`;
  }).join('');
  return `<div style="${pks}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <b style="font-size:14px">📦 مخزون فرع ${invBranchName()} — إجمالي: ${tot} قطعة</b>
      <div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="pkExportBranchStockExcel()">📥 Excel</button>
        <button class="btn btn-outline btn-sm" onclick="pkPrintBranchStockReport()">🖨️ PDF</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>النوع</th><th>الكمية</th><th>الحد الأدنى</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

// Branch: Dispatch form
function pkBuildDispatchForm() {
  const b     = invBranchKey();
  const stock = invGetBranchStock().filter(x=>x.branch===b);
  const typeOpts = stock.map(i=>`<option value="${i.type}">  ${i.type} (متاح: ${i.qty})</option>`).join('');
  const stageOpts = INV_STAGES.map(s=>`<option>${s}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];
  return `<div style="${pks}"><b style="font-size:14px">✅ تسجيل صرف قطعة لطفل/ة</b>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px;align-items:flex-end">
      <div class="form-group" style="margin:0"><label>اسم الطفل/ة *</label>
        <input id="pkd-child" class="form-control" placeholder="الاسم الكامل"></div>
      <div class="form-group" style="margin:0"><label>المرحلة</label>
        <select id="pkd-stage" class="form-control">${stageOpts}</select></div>
      <div class="form-group" style="margin:0"><label>نوع القطعة *</label>
        <select id="pkd-type" class="form-control">${typeOpts}</select></div>
      <div class="form-group" style="margin:0"><label>المقاس</label>
        <select id="pkd-size" class="form-control">
          <option value="">— اختر المقاس —</option>
          ${invGetSizes().map(s=>`<option>${s}</option>`).join('')}
        </select></div>
      <div class="form-group" style="margin:0"><label>الكمية</label>
        <input id="pkd-qty" type="number" class="form-control" value="1" min="1"></div>
      <div class="form-group" style="margin:0"><label>التاريخ</label>
        <input id="pkd-date" type="date" class="form-control" value="${today}"></div>
      <div class="form-group" style="margin:0;align-self:flex-end">
        <button class="btn btn-primary" onclick="pkSubmitDispatch()">✅ تسجيل</button>
      </div>
    </div>
    <div id="pk-dispatch-msg" style="margin-top:10px"></div></div>`;
}

function pkSubmitDispatch() {
  const b     = invBranchKey();
  const child = document.getElementById('pkd-child')?.value.trim();
  const stage = document.getElementById('pkd-stage')?.value;
  const type  = document.getElementById('pkd-type')?.value;
  const size  = document.getElementById('pkd-size')?.value || '';
  const qty   = parseInt(document.getElementById('pkd-qty')?.value)||0;
  const date  = document.getElementById('pkd-date')?.value;
  if (!child) { showToast('⚠️ أدخل اسم الطفل/ة'); return; }
  if (qty <= 0) { showToast('⚠️ أدخل كمية صالحة'); return; }
  const bs = invGetBranchStock();
  const idx = bs.findIndex(i=>i.branch===b&&i.type===type);
  if (idx<0||bs[idx].qty<qty) { showToast('⚠️ الكمية المتاحة غير كافية'); return; }
  bs[idx].qty -= qty;
  invSaveBranch(bs);
  const log = invGetDispatch();
  log.push({id:`D${Date.now()}`, branch:b, childName:child, stage, type, size, qty, date});
  invSaveDispatch(log);
  const msg = document.getElementById('pk-dispatch-msg');
  if (msg) msg.innerHTML = `<div style="padding:10px 14px;border-radius:8px;background:#f0fdf4;color:#166534;border:1px solid #86efac;font-size:13px">✅ تم صرف ${qty} قطعة من ${type} للطفل/ة ${child}</div>`;
  showToast('✅ تم تسجيل الصرف');
}

// Branch: Request form
function pkBuildRequestForm() {
  const b = invBranchKey();
  const reqs = invGetRequests().filter(r=>r.branch===b);
  const typeOpts = invGetTypes().map(t=>`<option>${t}</option>`).join('');
  const rows = reqs.length
    ? reqs.slice().reverse().map(r=>{
        const st = r.status==='approved'?pkOk('موافق'):r.status==='rejected'?pkDanger('مرفوض'):pkWarn('انتظار');
        return `<tr><td>${r.id}</td><td>${r.type}</td><td>${r.size||'—'}</td><td>${r.qty}</td><td>${fmtDate(r.date)}</td><td>${st}</td></tr>`;
      }).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:14px;color:var(--text-muted)">لا توجد طلبات</td></tr>`;
  const today = new Date().toISOString().split('T')[0];
  return `<div style="${pks}"><b style="font-size:14px">📤 طلب تزويد من المخزن الرئيسي</b>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:14px">
      <div class="form-group" style="margin:0"><label>نوع القطعة</label>
        <select id="pkr-type" class="form-control">${typeOpts}</select></div>
      <div class="form-group" style="margin:0"><label>المقاس</label>
        <select id="pkr-size" class="form-control">
          <option value="">— اختر —</option>
          ${invGetSizes().map(s=>`<option>${s}</option>`).join('')}
        </select></div>
      <div class="form-group" style="margin:0"><label>الكمية المطلوبة</label>
        <input id="pkr-qty" type="number" class="form-control" value="10" min="1" style="width:100px"></div>
      <div class="form-group" style="margin:0;align-self:flex-end">
        <button class="btn btn-primary" onclick="pkSubmitRequest()">📤 إرسال الطلب</button>
      </div>
    </div>
    <hr style="margin:16px 0;border-color:var(--border)">
    <b>طلباتي السابقة</b>
    <div class="table-wrap" style="margin-top:10px"><table>
      <thead><tr><th>رقم</th><th>النوع</th><th>المقاس</th><th>الكمية</th><th>التاريخ</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

function pkSubmitRequest() {
  const b    = invBranchKey();
  const type = document.getElementById('pkr-type')?.value;
  const size = document.getElementById('pkr-size')?.value || '';
  const qty  = parseInt(document.getElementById('pkr-qty')?.value)||0;
  if (qty <= 0) { showToast('⚠️ أدخل كمية صالحة'); return; }
  const reqs = invGetRequests();
  const id   = `RQ-${String(reqs.length+1).padStart(3,'0')}`;
  reqs.push({id, branch:b, type, size, qty, date:new Date().toISOString().split('T')[0], status:'pending'});
  invSaveRequests(reqs);
  pkShowTab('pkbreq');
  showToast('✅ تم إرسال الطلب — بانتظار موافقة الإدارة');
}

// ============================================================
// ===== SUPPLIES INVENTORY (Same PK structure) =====
// ============================================================

function supGetDispatchLog() { return DB.get('supDispatch') || []; }
function supSaveDispatchLog(d) { DB.set('supDispatch', d); }

function renderSupplies() {
  const isAdmin = invIsAdmin();
  const tabs = isAdmin
    ? [{id:'supdash',l:'🏠 لوحة التحكم'},{id:'supinv',l:'📦 المخزون'},{id:'suplog',l:'📜 سجل الصرف'},{id:'supreqs',l:'📋 الطلبات'}]
    : [{id:'supbdash',l:'🏠 لوحتي'},{id:'supbinv',l:'📦 مخزوني'},{id:'supbdisp',l:'✅ صرف صنف'},{id:'supbreq',l:'📤 طلب تزويد'},{id:'supblog',l:'📜 سجلي'}];

  document.getElementById('suppliesTabs').innerHTML = tabs.map((t,i)=>`
    <button id="suptab-${t.id}" onclick="supShowTab('${t.id}')"
      class="tab ${i===0?'active':''}">${t.l}</button>`).join('');
  document.getElementById('suppliesContent').innerHTML = `<div id="sup-page-content"></div>`;
  supShowTab(tabs[0].id);
}

function supShowTab(id) {
  document.querySelectorAll('#suppliesTabs .tab').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('suptab-'+id);
  if (btn) btn.classList.add('active');
  const cont = document.getElementById('sup-page-content');
  if (!cont) return;

  if      (id==='supdash')  cont.innerHTML = supBuildAdminDash();
  else if (id==='supinv')   { cont.innerHTML = supBuildInventory('all'); }
  else if (id==='suplog')   cont.innerHTML = supBuildLog(null);
  else if (id==='supreqs')  cont.innerHTML = supBuildAdminReqs();
  else if (id==='supbdash') cont.innerHTML = supBuildBranchDash();
  else if (id==='supbinv')  cont.innerHTML = supBuildInventory(invBranchKey());
  else if (id==='supbdisp') cont.innerHTML = supBuildDispForm();
  else if (id==='supbreq')  cont.innerHTML = supBuildBranchReq();
  else if (id==='supblog')  cont.innerHTML = supBuildLog(invBranchKey());
}

function supBuildAdminDash() {
  const items = DB.all('supplies');
  const expiring = items.filter(s=>daysUntil(s.expiryDate)>=0&&daysUntil(s.expiryDate)<30);
  const expired  = items.filter(s=>daysUntil(s.expiryDate)<0);
  const alerts = [...expired.map(s=>`<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:6px;border:1px solid #fca5a5;background:#fef2f2;color:#991b1b">🔴 ${s.name} (${BRANCHES[s.branch]?.name}): منتهي الصلاحية</div>`),
    ...expiring.map(s=>`<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:6px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e">⚠️ ${s.name} (${BRANCHES[s.branch]?.name}): ينتهي خلال ${daysUntil(s.expiryDate)} يوم</div>`)].join('')
    || `<div style="padding:9px 12px;border-radius:8px;font-size:13px;border:1px solid #86efac;background:#f0fdf4;color:#166534">✅ لا توجد تنبيهات</div>`;
  return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--primary)">${items.length}</div><div style="font-size:11px;color:var(--text-muted)">إجمالي الأصناف</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--accent)">${expiring.length}</div><div style="font-size:11px;color:var(--text-muted)">تنتهي قريباً</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--danger)">${expired.length}</div><div style="font-size:11px;color:var(--text-muted)">منتهية الصلاحية</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--text)">${supGetDispatchLog().length}</div><div style="font-size:11px;color:var(--text-muted)">عمليات الصرف</div></div>
  </div>
  <div style="${pks}"><b style="font-size:14px">🔔 تنبيهات الصلاحية</b><div style="margin-top:10px">${alerts}</div></div>`;
}

function supBuildBranchDash() {
  const b = invBranchKey();
  const items = DB.all('supplies').filter(s=>s.branch===b);
  const expiring = items.filter(s=>daysUntil(s.expiryDate)>=0&&daysUntil(s.expiryDate)<30);
  const log = supGetDispatchLog().filter(d=>d.branch===b);
  const alerts = expiring.map(s=>`<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:6px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e">⚠️ ${s.name}: ينتهي خلال ${daysUntil(s.expiryDate)} يوم</div>`).join('')
    || `<div style="padding:9px 12px;border-radius:8px;font-size:13px;border:1px solid #86efac;background:#f0fdf4;color:#166534">✅ لا توجد تنبيهات</div>`;
  const lastLog = log.slice().reverse().slice(0,4).map(d=>`<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:13px"><b>${d.itemName}</b> ×${d.qty} ${d.unit||''}<br><span style="color:var(--text-muted);font-size:12px">${d.purpose||''} — ${fmtDate(d.date)}</span></div>`).join('')
    || '<p style="color:var(--text-muted);font-size:13px">لا توجد عمليات بعد</p>';
  return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--primary)">${items.length}</div><div style="font-size:11px;color:var(--text-muted)">أصناف مخزوني</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--accent)">${expiring.length}</div><div style="font-size:11px;color:var(--text-muted)">تنتهي قريباً</div></div>
    <div style="${pkm}"><div style="font-size:22px;font-weight:700;color:var(--info,#378ADD)">${log.length}</div><div style="font-size:11px;color:var(--text-muted)">عمليات الصرف</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="${pks}"><b>🔔 تنبيهات</b><div style="margin-top:10px">${alerts}</div></div>
    <div style="${pks}"><b>⏱️ آخر الصرف</b><div style="margin-top:10px">${lastLog}</div></div>
  </div>`;
}

function supBuildInventory(branch) {
  const isAdmin = branch === 'all';
  let list = DB.all('supplies');
  if (branch !== 'all') list = list.filter(s=>s.branch===branch);
  const rows = list.map(s => {
    const d = daysUntil(s.expiryDate);
    const badge = d<0?'badge-red':d<30?'badge-orange':'badge-green';
    const lbl   = d<0?'منتهي':d<30?`⚠️ ${d} يوم`:'✅ جيد';
    return `<tr>
      <td><b>${s.name}</b></td><td>${s.unit||'—'}</td>
      <td><span class="badge ${BRANCHES[s.branch]?.badge||'badge-gray'}">${BRANCHES[s.branch]?.name||s.branch}</span></td>
      <td>${s.qty}</td><td>${fmtDate(s.receiveDate)}</td><td>${fmtDate(s.expiryDate)}</td>
      <td><span class="badge ${badge}">${lbl}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="supEditItem('${s.id}')">✏️</button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="supDeleteItem('${s.id}')">🗑</button>
      </td></tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</td></tr>`;

  const branchSel = isAdmin
    ? `<select id="supBranchFilter" onchange="supBuildInventoryInplace(this.value)" class="form-control" style="max-width:170px">
        <option value="all">كل الفروع</option>
        <option value="esh">اشبيلية</option><option value="sol">الصليبخات</option><option value="mat">المطلاع</option>
        <option value="esh_e">اشبيلية مسائي</option><option value="sol_e">الصليبخات مسائي</option><option value="mat_e">المطلاع مسائي</option>
      </select>` : '';

  return `<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      ${branchSel}
      <button class="btn btn-primary" onclick="supOpenAdd('${branch}')">➕ إضافة صنف</button>
      <button class="btn btn-outline" onclick="supExportExcel('${branch}')">📥 Excel</button>
      <button class="btn btn-outline" onclick="supPrintReport('${branch}')">🖨️ PDF</button>
    </div>
    <div class="card"><div class="table-wrap" id="supTableWrap">
      <table>
        <thead><tr><th>الصنف</th><th>الوحدة</th><th>الفرع</th><th>الكمية</th><th>الاستلام</th><th>الانتهاء</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>`;
}

function supBuildInventoryInplace(branch) {
  // re-render inventory section in same tab
  document.getElementById('sup-page-content').innerHTML = supBuildInventory(branch);
  if (branch!=='all') document.getElementById('supBranchFilter') && (document.getElementById('supBranchFilter').value = branch);
}

function supOpenAdd(branch) {
  const defaultBranch = branch !== 'all' ? branch : (invIsAdmin()?'esh':invBranchKey());
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('modals').innerHTML = `
  <div id="modal-supply" class="modal-overlay open">
    <div class="modal" style="max-width:480px">
      <div class="modal-header"><div class="modal-title">➕ إضافة صنف مستهلكات</div>
        <button class="modal-close" onclick="closeModal('modal-supply')">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>اسم الصنف *</label><input type="text" id="spName" class="form-control"></div>
          <div class="form-group"><label>الوحدة</label><input type="text" id="spUnit" class="form-control" placeholder="علبة / زجاجة / كرتون"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الفرع *</label>
            <select id="spBranch" class="form-control" ${!invIsAdmin()?'disabled':''}>
              <option value="esh" ${defaultBranch==='esh'?'selected':''}>اشبيلية</option>
              <option value="sol" ${defaultBranch==='sol'?'selected':''}>الصليبخات</option>
              <option value="mat" ${defaultBranch==='mat'?'selected':''}>المطلاع</option>
            </select></div>
          <div class="form-group"><label>الكمية</label><input type="number" id="spQty" class="form-control" value="1" min="0"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الحد الأدنى للتنبيه</label><input type="number" id="spMin" class="form-control" value="5" min="0"></div>
          <div class="form-group"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>تاريخ الاستلام</label><input type="date" id="spRec" class="form-control" value="${today}"></div>
          <div class="form-group"><label>تاريخ انتهاء الصلاحية</label><input type="date" id="spExp" class="form-control"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-supply')">إلغاء</button>
        <button class="btn btn-primary" onclick="supSaveItem()">💾 حفظ</button>
      </div>
    </div>
  </div>`;
}

function supSaveItem() {
  const name = document.getElementById('spName').value.trim();
  if (!name) { showToast('⚠️ أدخل اسم الصنف'); return; }
  DB.add('supplies', {
    id: DB.nextId('supplies','P'), name,
    unit:        document.getElementById('spUnit').value.trim(),
    branch:      document.getElementById('spBranch').value,
    qty:         parseInt(document.getElementById('spQty').value)||0,
    minQty:      parseInt(document.getElementById('spMin').value)||5,
    receiveDate: document.getElementById('spRec').value,
    expiryDate:  document.getElementById('spExp').value
  });
  closeModal('modal-supply');
  supShowTab(invIsAdmin()?'supinv':'supbinv');
  showToast('✅ تم إضافة الصنف');
}

function supEditItem(id) {
  const s = DB.all('supplies').find(x=>x.id===id);
  if (!s) return;
  document.getElementById('modals').innerHTML = `
  <div id="modal-supply-edit" class="modal-overlay open">
    <div class="modal" style="max-width:480px">
      <div class="modal-header"><div class="modal-title">✏️ تعديل صنف</div>
        <button class="modal-close" onclick="closeModal('modal-supply-edit')">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label>الاسم *</label><input id="seditName" class="form-control" value="${s.name}"></div>
          <div class="form-group"><label>الوحدة</label><input id="seditUnit" class="form-control" value="${s.unit||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>الكمية</label><input type="number" id="seditQty" class="form-control" value="${s.qty}"></div>
          <div class="form-group"><label>الحد الأدنى</label><input type="number" id="seditMin" class="form-control" value="${s.minQty||5}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>تاريخ الاستلام</label><input type="date" id="seditRec" class="form-control" value="${s.receiveDate||''}"></div>
          <div class="form-group"><label>تاريخ الانتهاء</label><input type="date" id="seditExp" class="form-control" value="${s.expiryDate||''}"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-supply-edit')">إلغاء</button>
        <button class="btn btn-primary" onclick="supUpdateItem('${id}')">💾 حفظ</button>
      </div>
    </div>
  </div>`;
}

function supUpdateItem(id) {
  DB.update('supplies', id, {
    name:        document.getElementById('seditName').value.trim(),
    unit:        document.getElementById('seditUnit').value.trim(),
    qty:         parseInt(document.getElementById('seditQty').value)||0,
    minQty:      parseInt(document.getElementById('seditMin').value)||5,
    receiveDate: document.getElementById('seditRec').value,
    expiryDate:  document.getElementById('seditExp').value
  });
  closeModal('modal-supply-edit');
  supShowTab(invIsAdmin()?'supinv':'supbinv');
  showToast('✅ تم تحديث الصنف');
}

function supDeleteItem(id) {
  if (!confirm('هل تريد حذف هذا الصنف؟')) return;
  DB.remove('supplies', id);
  supShowTab(invIsAdmin()?'supinv':'supbinv');
  showToast('🗑️ تم الحذف');
}

function supBuildDispForm() {
  const b    = invBranchKey();
  const items = DB.all('supplies').filter(s=>s.branch===b&&s.qty>0);
  const opts  = items.map(s=>`<option value="${s.id}">${s.name} (${s.qty} ${s.unit||''})</option>`).join('');
  const today = new Date().toISOString().split('T')[0];
  return `<div style="${pks}"><b style="font-size:14px">✅ تسجيل صرف صنف من المستهلكات</b>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px;align-items:flex-end">
      <div class="form-group" style="margin:0"><label>الصنف *</label>
        <select id="supd-item" class="form-control">${opts||'<option>لا يوجد مخزون</option>'}</select></div>
      <div class="form-group" style="margin:0"><label>الكمية المصروفة *</label>
        <input id="supd-qty" type="number" class="form-control" value="1" min="1"></div>
      <div class="form-group" style="margin:0"><label>الغرض</label>
        <input id="supd-purpose" class="form-control" placeholder="مثال: استخدام يومي"></div>
      <div class="form-group" style="margin:0"><label>التاريخ</label>
        <input id="supd-date" type="date" class="form-control" value="${today}"></div>
      <div class="form-group" style="margin:0;align-self:flex-end">
        <button class="btn btn-primary" onclick="supSubmitDispatch()">✅ تسجيل</button>
      </div>
    </div>
    <div id="sup-disp-msg" style="margin-top:10px"></div></div>`;
}

function supSubmitDispatch() {
  const b      = invBranchKey();
  const itemId = document.getElementById('supd-item')?.value;
  const qty    = parseInt(document.getElementById('supd-qty')?.value)||0;
  const purpose= document.getElementById('supd-purpose')?.value||'';
  const date   = document.getElementById('supd-date')?.value;
  if (!itemId || qty<=0) { showToast('⚠️ أكمل الحقول المطلوبة'); return; }
  const item = DB.all('supplies').find(s=>s.id===itemId);
  if (!item||item.qty<qty) { showToast('⚠️ الكمية المتاحة غير كافية'); return; }
  DB.update('supplies', itemId, {qty: item.qty - qty});
  const log = supGetDispatchLog();
  log.push({id:`SD${Date.now()}`, branch:b, itemId, itemName:item.name, unit:item.unit, qty, purpose, date});
  supSaveDispatchLog(log);
  const msg = document.getElementById('sup-disp-msg');
  if (msg) msg.innerHTML = `<div style="padding:10px 14px;border-radius:8px;background:#f0fdf4;color:#166534;border:1px solid #86efac;font-size:13px">✅ تم صرف ${qty} ${item.unit||''} من ${item.name}</div>`;
  showToast('✅ تم تسجيل الصرف');
}

function supBuildLog(branch) {
  const log = supGetDispatchLog().filter(d=>!branch||d.branch===branch).slice().reverse();
  const rows = log.length
    ? log.map(d=>`<tr>
        <td>${fmtDate(d.date)}</td>
        <td>${BRANCHES[d.branch]?.name||d.branch}</td>
        <td><b>${d.itemName}</b></td><td>${d.qty} ${d.unit||''}</td>
        <td>${d.purpose||'—'}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد سجلات</td></tr>`;
  return `<div style="${pks}"><b style="font-size:14px">📜 سجل الصرف${branch?' — '+BRANCHES[branch]?.name:''}</b>
    <div class="table-wrap" style="margin-top:12px"><table>
      <thead><tr><th>التاريخ</th><th>الفرع</th><th>الصنف</th><th>الكمية</th><th>الغرض</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
}

function supBuildAdminReqs() {
  // placeholder for supply requests (same pattern as clothes)
  return `<div style="${pks}"><b style="font-size:14px">📋 طلبات التزويد من الفروع</b>
    <p style="color:var(--text-muted);font-size:13px;margin-top:10px">استخدم تبويب "طلب تزويد" في حساب الفرع لإرسال الطلبات</p></div>`;
}

function supBuildBranchReq() {
  const b = invBranchKey();
  const items = DB.all('supplies').filter(s=>s.branch===b&&s.qty<=(s.minQty||5));
  const alert = items.length
    ? `<div style="padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e">⚠️ ${items.length} أصناف تحتاج تزويد: ${items.map(s=>s.name).join('، ')}</div>` : '';
  return `<div style="${pks}"><b style="font-size:14px">📤 طلب تزويد مستهلكات</b>
    ${alert}
    <div style="margin-top:14px">
      <div class="form-group"><label>الصنف المطلوب *</label>
        <input id="supreq-name" class="form-control" placeholder="اسم الصنف أو المستهلك"></div>
      <div class="form-row">
        <div class="form-group"><label>الكمية المطلوبة *</label>
          <input id="supreq-qty" type="number" class="form-control" value="10" min="1"></div>
        <div class="form-group"><label>الوحدة</label>
          <input id="supreq-unit" class="form-control" placeholder="علبة / كرتون"></div>
      </div>
      <div class="form-group"><label>ملاحظات</label>
        <textarea id="supreq-notes" class="form-control" rows="2" placeholder="سبب الطلب..."></textarea></div>
      <button class="btn btn-primary" onclick="supSubmitReq()">📤 إرسال الطلب</button>
    </div></div>`;
}

function supSubmitReq() {
  const name = document.getElementById('supreq-name')?.value.trim();
  const qty  = parseInt(document.getElementById('supreq-qty')?.value)||0;
  if (!name||qty<=0) { showToast('⚠️ أكمل الحقول المطلوبة'); return; }
  showToast(`✅ تم إرسال طلب: ${qty} ${document.getElementById('supreq-unit')?.value||''} من ${name}`);
}

function supExportExcel(branch) {
  let list = DB.all('supplies');
  if (branch!=='all') list = list.filter(s=>s.branch===branch);
  const data = list.map(s=>({
    'الصنف':s.name, 'الوحدة':s.unit||'', 'الفرع':BRANCHES[s.branch]?.name||s.branch,
    'الكمية':s.qty, 'الحد الأدنى':s.minQty||5,
    'تاريخ الاستلام':fmtDate(s.receiveDate), 'تاريخ الانتهاء':fmtDate(s.expiryDate),
    'الأيام المتبقية':daysUntil(s.expiryDate),
    'الحالة':daysUntil(s.expiryDate)<0?'منتهي':daysUntil(s.expiryDate)<30?'ينتهي قريباً':'جيد'
  }));
  xlsxExport(data, 'مخزون_المستهلكات');
}

// ===== EXCEL EXPORTS =====
function exportStudentsExcel() {
  const data = filterByBranch(DB.all('students')).map(s => ({
    'الكود': s.id, 'الاسم': s.name,
    'الفرع': BRANCHES[s.branch].name,
    'المرحلة': s.grade === 'nursery' ? 'حضانة' : s.grade,
    'هاتف 1': s.phone1, 'هاتف 2': s.phone2||'',
    'الرسوم': s.fees, 'الخصم': s.discount,
    'الصافي': s.net, 'المدفوع': s.paid, 'المتبقي': s.net - s.paid
  }));
  xlsxExport(data, 'تقرير_الطلاب');
}

function exportFeesExcel() {
  const data = filterByBranch(DB.all('students')).map(s => ({
    'الطالب': s.name, 'الفرع': BRANCHES[s.branch].name,
    'الرسوم الإجمالية': s.fees, 'الخصم': s.discount,
    'الصافي': s.net, 'المدفوع': s.paid, 'المتبقي': s.net - s.paid,
    'نسبة السداد': s.net > 0 ? Math.round(s.paid/s.net*100)+'%' : '0%'
  }));
  xlsxExport(data, 'تقرير_الرسوم');
}

function exportPaymentsExcel() {
  const installs = DB.all('installments').filter(i => i.status === 'paid');
  const students = DB.all('students');
  const data = installs.map(i => {
    const s = students.find(x => x.id === i.studentId) || {};
    return {
      'الطالب': s.name||'', 'الفرع': s.branch ? BRANCHES[s.branch].name : '',
      'رقم القسط': i.num, 'المبلغ': i.amount,
      'تاريخ الدفع': fmtDate(i.paidDate), 'طريقة الدفع': i.method||''
    };
  });
  xlsxExport(data, 'تقرير_المدفوعات');
}

function exportPlanExcel() {
  const installs = DB.all('installments');
  const students = DB.all('students');
  const data = installs.map(i => {
    const s    = students.find(x => x.id === i.studentId) || {};
    const late = i.status === 'pending' && daysUntil(i.dueDate) < 0;
    return {
      'الطالب': s.name||'', 'الفرع': s.branch ? BRANCHES[s.branch].name : '',
      'رقم القسط': i.num, 'المبلغ': i.amount,
      'تاريخ الاستحقاق': fmtDate(i.dueDate), 'تاريخ الدفع': fmtDate(i.paidDate),
      'الحالة': i.status === 'paid' ? 'مدفوع' : late ? 'متأخر' : 'قادم'
    };
  });
  xlsxExport(data, 'خطة_الاقساط');
}

function xlsxExport(data, filename) {
  if (!data.length) { showToast('⚠️ لا توجد بيانات للتصدير'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
  showToast('✅ تم تصدير Excel');
}

// ===== PRINT REPORTS =====
function printReport(title, headers, rows) {
  const thead = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  const tbody = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl;font-size:12px}
    h2{color:#1a9e6a;margin-bottom:12px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:right}
    th{background:#f0f0f0}@media print{button{display:none}}</style></head><body>
    <h2>🌟 روضة الأمل — ${title}</h2>
    <p style="font-size:11px;color:#888;margin-bottom:12px">تاريخ التقرير: ${new Date().toLocaleDateString('ar-KW')}</p>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
    <br><button onclick="window.print()">🖨️ طباعة</button></body></html>`);
  win.document.close();
}

function printFeesReport() {
  const data = filterByBranch(DB.all('students'));
  printReport('تقرير الرسوم والأقساط',
    ['الطالب','الفرع','الصافي','المدفوع','المتبقي','نسبة السداد'],
    data.map(s => [s.name, BRANCHES[s.branch].name,
      fmtKD(s.net), fmtKD(s.paid), fmtKD(s.net-s.paid),
      s.net>0 ? Math.round(s.paid/s.net*100)+'%' : '0%']));
}

function printPaymentsReport() {
  const installs = DB.all('installments').filter(i => i.status === 'paid');
  const students = DB.all('students');
  printReport('تقرير المدفوعات',
    ['الطالب','الفرع','تاريخ الدفع','المبلغ','الطريقة'],
    installs.map(i => {
      const s = students.find(x => x.id === i.studentId)||{};
      return [s.name||'', s.branch ? BRANCHES[s.branch].name : '',
        fmtDate(i.paidDate), fmtKD(i.amount), i.method||'—'];
    }));
}

function printPlanReport() {
  const installs = DB.all('installments');
  const students = DB.all('students');
  printReport('خطة الأقساط',
    ['الطالب','الفرع','القسط','المبلغ','الاستحقاق','الدفع','الحالة'],
    installs.map(i => {
      const s    = students.find(x => x.id === i.studentId)||{};
      const late = i.status==='pending' && daysUntil(i.dueDate)<0;
      return [s.name||'', s.branch ? BRANCHES[s.branch].name : '',
        'قسط '+i.num, fmtKD(i.amount),
        fmtDate(i.dueDate), fmtDate(i.paidDate),
        i.status==='paid'?'مدفوع':i.status==='partial'?'جزئي':late?'متأخر':'قادم'];
    }));
}

// ===== STUDENT LOOKUP (Section 2) =====
function lookupStudentSearch() {
  const q = (document.getElementById('studentLookupSearch')?.value||'').toLowerCase();
  if (q.length < 2) return;
  const matches = filterByBranch(DB.all('students')).filter(s =>
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  const sel = document.getElementById('studentLookupSelect');
  if (sel) {
    sel.innerHTML = '<option value="">-- اختر من النتائج --</option>' +
      matches.map(s => `<option value="${s.id}">${s.id} — ${s.name}</option>`).join('');
  }
  if (matches.length === 1) lookupStudentById(matches[0].id);
  else if (!matches.length) {
    document.getElementById('studentLookupResult').innerHTML =
      '<p style="color:var(--danger)">لم يُعثر على طالب بهذا الاسم أو الكود</p>';
  }
}

function lookupStudentById(sid) {
  if (!sid) return;
  const s     = DB.all('students').find(x => x.id === sid);
  const insts = DB.all('installments').filter(i => i.studentId === sid);
  if (!s) return;

  const gradeMap = { nursery:'حضانة', KG1:'KG1', KG2:'KG2' };
  const st = studentStatus(s);
  const instRows = insts.map(i => {
    const late = i.status==='pending' && daysUntil(i.dueDate)<0;
    const badge = i.status==='paid'?'badge-green':i.status==='partial'?'badge-blue':late?'badge-red':'badge-orange';
    const label = i.status==='paid'?'مدفوع':i.status==='partial'?'جزئي':late?'متأخر':'قادم';
    return `<tr>
      <td>${i.num}</td><td>${fmtKD(i.amount)}</td>
      <td>${i.partialPaid>0?fmtKD(i.partialPaid):'—'}</td>
      <td>${fmtDate(i.dueDate)}</td><td>${fmtDate(i.paidDate)}</td>
      <td>${i.method||'—'}</td>
      <td><span class="badge ${badge}">${label}</span></td>
      <td>${i.receiptImg?`<button class="btn btn-outline btn-sm" onclick="viewReceipt('${i.id}')">🧾</button>`:'—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">لا توجد أقساط</td></tr>';

  document.getElementById('studentLookupResult').innerHTML = `
    <div style="text-align:right">
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <div>
          <span style="font-size:18px;font-weight:700">${s.name}</span>
          <span style="margin-right:8px;font-size:12px;color:var(--text-muted)">${s.id}</span>
          <span class="badge ${BRANCHES[s.branch].badge}">${BRANCHES[s.branch].name}</span>
          <span class="badge" style="margin-right:4px">${gradeMap[s.grade]||s.grade}</span>
          <span class="badge ${st.cls}">${st.label}</span>
        </div>
        <div style="margin-right:auto;display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="exportStudentExcel('${s.id}')">📥 Excel</button>
          <button class="btn btn-outline btn-sm" onclick="printStudentReport('${s.id}')">🖨️ PDF</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">
        <div style="background:var(--primary-light,#e8f5ee);padding:10px 14px;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted)">الصافي</div>
          <div style="font-weight:700;color:var(--primary)">${fmtKD(s.net)}</div>
        </div>
        <div style="background:var(--info-light,#e6f1fb);padding:10px 14px;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted)">المدفوع</div>
          <div style="font-weight:700;color:var(--info,#378ADD)">${fmtKD(s.paid)}</div>
        </div>
        <div style="background:var(--danger-light,#fcebeb);padding:10px 14px;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted)">المتبقي</div>
          <div style="font-weight:700;color:var(--danger)">${fmtKD(s.net-s.paid)}</div>
        </div>
        <div style="background:var(--bg-secondary,#f7f7f5);padding:10px 14px;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted)">الهاتف</div>
          <div style="font-weight:700;font-size:12px">${s.phone1}</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>المبلغ</th><th>المدفوع جزئياً</th><th>الاستحقاق</th><th>تاريخ الدفع</th><th>الطريقة</th><th>الحالة</th><th>إيصال</th></tr></thead>
          <tbody>${instRows}</tbody>
        </table>
      </div>
    </div>`;
}

function exportStudentExcel(sid) {
  const s     = DB.all('students').find(x => x.id === sid);
  const insts = DB.all('installments').filter(i => i.studentId === sid);
  if (!s) return;

  const wb = XLSX.utils.book_new();
  // Sheet 1: Student info
  const infoSheet = XLSX.utils.json_to_sheet([{
    'الكود': s.id, 'الاسم': s.name, 'الفرع': BRANCHES[s.branch].name,
    'المرحلة': s.grade==='nursery'?'حضانة':s.grade,
    'هاتف 1': s.phone1, 'هاتف 2': s.phone2||'',
    'تاريخ الميلاد': fmtDate(s.dob), 'تاريخ المباشرة': fmtDate(s.startDate),
    'الرسوم': s.fees, 'الخصم': s.discount, 'الصافي': s.net,
    'المدفوع': s.paid, 'المتبقي': s.net-s.paid
  }]);
  XLSX.utils.book_append_sheet(wb, infoSheet, 'بيانات الطالب');

  // Sheet 2: Installments
  const instData = insts.map(i => ({
    'رقم القسط': i.num, 'المبلغ': i.amount,
    'المدفوع جزئياً': i.partialPaid||0,
    'تاريخ الاستحقاق': fmtDate(i.dueDate), 'تاريخ الدفع': fmtDate(i.paidDate),
    'طريقة الدفع': i.method||'—',
    'رابط الدفع': i.payLink||'',
    'اسم الإيصال': i.receiptName||'',
    'الحالة': i.status==='paid'?'مدفوع':i.status==='partial'?'جزئي':daysUntil(i.dueDate)<0?'متأخر':'قادم'
  }));
  if (instData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instData), 'الأقساط');
  XLSX.writeFile(wb, `طالب_${s.id}_${s.name}.xlsx`);
  showToast('✅ تم تصدير بيانات الطالب');
}

function printStudentReport(sid) {
  const s     = DB.all('students').find(x => x.id === sid);
  const insts = DB.all('installments').filter(i => i.studentId === sid);
  if (!s) return;

  const rows = insts.map(i => {
    const late = i.status==='pending'&&daysUntil(i.dueDate)<0;
    return `<tr>
      <td>${i.num}</td><td>${fmtKD(i.amount)}</td>
      <td>${i.partialPaid>0?fmtKD(i.partialPaid):'—'}</td>
      <td>${fmtDate(i.dueDate)}</td><td>${fmtDate(i.paidDate)||'—'}</td>
      <td>${i.method||'—'}</td>
      <td>${i.status==='paid'?'✅ مدفوع':i.status==='partial'?'🔵 جزئي':late?'🔴 متأخر':'⏳ قادم'}</td>
    </tr>`;
  }).join('');

  printReport(`بيانات الطالب — ${s.name} (${s.id})`,
    ['#','المبلغ','مدفوع جزئياً','الاستحقاق','تاريخ الدفع','الطريقة','الحالة'],
    insts.map(i => {
      const late = i.status==='pending'&&daysUntil(i.dueDate)<0;
      return [i.num, fmtKD(i.amount), i.partialPaid?fmtKD(i.partialPaid):'—',
        fmtDate(i.dueDate), fmtDate(i.paidDate)||'—', i.method||'—',
        i.status==='paid'?'مدفوع':i.status==='partial'?'جزئي':late?'متأخر':'قادم'];
    })
  );
}

// ============================================================
// SIZES MANAGER
// ============================================================
function pkOpenSizesManager() {
  const sizes = invGetSizes();
  document.getElementById('modals').innerHTML = `
    <div class="modal-overlay open" id="modal-sizes">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>📏 إدارة المقاسات</h3>
          <button class="modal-close" onclick="closeModal('modal-sizes')">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px">اضف أو احذف المقاسات المتاحة في فورم الصرف والطلبات</p>
          <div id="sizesList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
            ${sizes.map(s=>`
              <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-secondary,#f5f5f5);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:13px">
                ${s}
                <button onclick="pkRemoveSize('${s}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0;line-height:1">✕</button>
              </span>`).join('')}
          </div>
          <div style="display:flex;gap:8px">
            <input id="newSizeInput" class="form-control" placeholder="مثال: 9 سنوات" style="flex:1">
            <button class="btn btn-primary" onclick="pkAddSize()">➕ إضافة</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="pkSaveSizes()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="closeModal('modal-sizes')">إلغاء</button>
        </div>
      </div>
    </div>`;
}

let _tempSizes = null;
function pkRemoveSize(size) {
  if (!_tempSizes) _tempSizes = [...invGetSizes()];
  _tempSizes = _tempSizes.filter(s => s !== size);
  const list = document.getElementById('sizesList');
  if (list) list.innerHTML = _tempSizes.map(s=>`
    <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-secondary,#f5f5f5);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:13px">
      ${s}
      <button onclick="pkRemoveSize('${s}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0;line-height:1">✕</button>
    </span>`).join('');
}

function pkAddSize() {
  if (!_tempSizes) _tempSizes = [...invGetSizes()];
  const input = document.getElementById('newSizeInput');
  const val = input?.value.trim();
  if (!val) return;
  if (_tempSizes.includes(val)) { showToast('المقاس موجود بالفعل'); return; }
  _tempSizes.push(val);
  input.value = '';
  pkRemoveSize('__refresh__'); // trigger re-render
  _tempSizes = _tempSizes.filter(s => s !== '__refresh__');
  const list = document.getElementById('sizesList');
  if (list) list.innerHTML = _tempSizes.map(s=>`
    <span style="display:inline-flex;align-items:center;gap:6px;background:var(--bg-secondary,#f5f5f5);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:13px">
      ${s}
      <button onclick="pkRemoveSize('${s}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0;line-height:1">✕</button>
    </span>`).join('');
}

function pkSaveSizes() {
  const sizes = _tempSizes || invGetSizes();
  invSaveSizes(sizes);
  _tempSizes = null;
  closeModal('modal-sizes');
  showToast('✅ تم حفظ المقاسات');
  // refresh badges
  const badges = document.getElementById('sizesBadges');
  if (badges) badges.innerHTML = sizes.map(s=>`<span class="badge badge-blue" style="padding:5px 10px;font-size:13px">${s}</span>`).join('');
  pkShowTab('pkdash');
}

// ============================================================
// CLOTHES EXPORT FUNCTIONS
// ============================================================
function pkExportMainExcel() {
  const data = invGetMainStock().map(i => ({
    'النوع': i.type, 'الكمية': i.qty, 'الحد الأدنى': INV_MIN_QTY,
    'الحالة': i.qty<INV_MIN_QTY?'منخفض':i.qty<INV_MIN_QTY*2?'متوسط':'جيد'
  }));
  xlsxExport(data, 'المخزن_الرئيسي_ملابس');
}
function pkPrintMainReport() {
  const rows = invGetMainStock().map(i => [i.type, i.qty, INV_MIN_QTY, i.qty<INV_MIN_QTY?'منخفض':i.qty<INV_MIN_QTY*2?'متوسط':'جيد']);
  printReport('المخزن الرئيسي — ملابس', ['النوع','الكمية','الحد الأدنى','الحالة'], rows);
}
function pkExportBranchesExcel() {
  const data = invGetBranchStock().map(i => ({
    'النوع': i.type, 'الفرع': BRANCHES[i.branch]?.name||i.branch,
    'الكمية': i.qty, 'الحد الأدنى': i.minQty||INV_MIN_QTY,
    'الحالة': i.qty<(i.minQty||INV_MIN_QTY)?'منخفض':'متاح'
  }));
  xlsxExport(data, 'أرصدة_الفروع_ملابس');
}
function pkPrintBranchesReport() {
  const rows = invGetBranchStock().map(i => [i.type, BRANCHES[i.branch]?.name||i.branch, i.qty, i.minQty||INV_MIN_QTY, i.qty<(i.minQty||INV_MIN_QTY)?'منخفض':'متاح']);
  printReport('أرصدة الفروع — ملابس', ['النوع','الفرع','الكمية','الحد الأدنى','الحالة'], rows);
}
function pkExportRequestsExcel() {
  const data = invGetRequests().map(r => ({
    'الرقم': r.id, 'الفرع': BRANCHES[r.branch]?.name||r.branch,
    'النوع': r.type, 'المقاس': r.size||'—', 'الكمية': r.qty, 'التاريخ': fmtDate(r.date),
    'الحالة': r.status==='approved'?'موافق':r.status==='rejected'?'مرفوض':'انتظار'
  }));
  xlsxExport(data, 'طلبات_التزويد_ملابس');
}
function pkPrintRequestsReport() {
  const rows = invGetRequests().map(r => [r.id, BRANCHES[r.branch]?.name||r.branch, r.type, r.size||'—', r.qty, fmtDate(r.date), r.status==='approved'?'موافق':r.status==='rejected'?'مرفوض':'انتظار']);
  printReport('طلبات التزويد — ملابس', ['الرقم','الفرع','النوع','المقاس','الكمية','التاريخ','الحالة'], rows);
}
function pkExportLogExcel(branch) {
  let log = invGetDispatch();
  if (branch) log = log.filter(d=>d.branch===branch);
  const data = log.map(d => ({'اسم الطفل': d.childName||'—', 'المرحلة': d.stage||'—', 'النوع': d.type, 'المقاس': d.size||'—', 'الكمية': d.qty, 'الفرع': BRANCHES[d.branch]?.name||d.branch, 'التاريخ': fmtDate(d.date)||'—'}));
  xlsxExport(data, 'سجل_صرف_الملابس');
}
function pkPrintLogReport(branch) {
  let log = invGetDispatch();
  if (branch) log = log.filter(d=>d.branch===branch);
  const rows = log.map(d => [d.childName||'—', d.stage||'—', d.type, d.size||'—', d.qty, BRANCHES[d.branch]?.name||d.branch, fmtDate(d.date)||'—']);
  printReport('سجل صرف الملابس', ['اسم الطفل','المرحلة','النوع','المقاس','الكمية','الفرع','التاريخ'], rows);
}
function pkExportBranchStockExcel() {
  const b = invBranchKey();
  const data = invGetBranchStock().filter(x=>x.branch===b).map(i => ({'النوع': i.type, 'الكمية': i.qty, 'الحد الأدنى': i.minQty||INV_MIN_QTY, 'الحالة': i.qty<(i.minQty||INV_MIN_QTY)?'منخفض':'متاح'}));
  xlsxExport(data, `مخزن_${invBranchName()}_ملابس`);
}
function pkPrintBranchStockReport() {
  const b = invBranchKey();
  const rows = invGetBranchStock().filter(x=>x.branch===b).map(i => [i.type, i.qty, i.minQty||INV_MIN_QTY, i.qty<(i.minQty||INV_MIN_QTY)?'منخفض':'متاح']);
  printReport(`مخزون ملابس فرع ${invBranchName()}`, ['النوع','الكمية','الحد الأدنى','الحالة'], rows);
}

// ============================================================
// SUPPLIES EXPORT FUNCTIONS
// ============================================================
function supPrintReport(branch) {
  let list = DB.all('supplies');
  if (branch !== 'all') list = list.filter(s=>s.branch===branch);
  const rows = list.map(s => { const d=daysUntil(s.expiryDate); return [s.name, s.unit||'—', BRANCHES[s.branch]?.name||s.branch, s.qty, fmtDate(s.receiveDate)||'—', fmtDate(s.expiryDate)||'—', d<0?'منتهي':d<30?'ينتهي قريباً':'جيد']; });
  printReport('تقرير المستهلكات', ['الصنف','الوحدة','الفرع','الكمية','تاريخ الاستلام','تاريخ الانتهاء','الحالة'], rows);
}
function supExportLogExcel(branch) {
  let log = supGetDispatchLog();
  if (branch) log = log.filter(d=>d.branch===branch);
  const data = log.map(d => ({'الصنف': d.itemName||'—', 'الوحدة': d.unit||'—', 'الكمية': d.qty, 'الفرع': BRANCHES[d.branch]?.name||d.branch, 'الغرض': d.purpose||'—', 'التاريخ': fmtDate(d.date)||'—'}));
  xlsxExport(data, 'سجل_صرف_المستهلكات');
}
function supPrintLogReport(branch) {
  let log = supGetDispatchLog();
  if (branch) log = log.filter(d=>d.branch===branch);
  const rows = log.map(d => [d.itemName||'—', d.unit||'—', d.qty, BRANCHES[d.branch]?.name||d.branch, d.purpose||'—', fmtDate(d.date)||'—']);
  printReport('سجل صرف المستهلكات', ['الصنف','الوحدة','الكمية','الفرع','الغرض','التاريخ'], rows);
}

// ============================================================
// DAILY REPORT — التقرير اليومي التحصيلي
// ============================================================
function renderDailyReport() {
  const date     = document.getElementById('dailyDate').value;
  if (!date) return;
  const branch   = currentUser?.role === 'super_admin' || currentUser?.role === 'admin'
                   ? (currentBranch === 'all' ? null : currentBranch)
                   : currentUser?.branch;
  const branchName = branch ? (BRANCHES[branch]?.name || branch) : 'كل الفروع';
  const students = DB.all('students');
  const installs = DB.all('installments').filter(i => {
    if (i.status !== 'paid' && i.status !== 'partial') return false;
    if ((i.paidDate || '').slice(0,10) !== date) return false;
    if (branch) {
      const s = students.find(x => x.id === i.studentId);
      if (!s || s.branch !== branch) return false;
    }
    return true;
  });

  // totals by method
  const totals = { 'نقدي':0, 'برنامج':0, 'كي نت':0, 'رابط':0 };
  installs.forEach(i => {
    const amt = i.partialPaid || i.amount || 0;
    const m = (i.method||'').replace('💵 ','').replace('📱 ','').replace('💳 ','').replace('🔗 ','');
    const key = m.includes('برنامج')||m.includes('📱') ? 'برنامج'
              : m.includes('كي نت')||m.includes('💳') ? 'كي نت'
              : m.includes('رابط')||m.includes('🔗') ? 'رابط' : 'نقدي';
    totals[key] = (totals[key]||0) + parseFloat(amt);
  });
  const total = Object.values(totals).reduce((a,b)=>a+b,0);

  const rows = installs.map((i, idx) => {
    const s   = students.find(x => x.id === i.studentId);
    const amt = parseFloat(i.partialPaid || i.amount || 0);
    const m   = (i.method||'نقدي').replace('💵 ','').replace('📱 ','').replace('💳 ','').replace('🔗 ','');
    return `<tr>
      <td style="text-align:center">${idx+1}</td>
      <td>${s?.name||'—'}</td>
      <td>${i.note||'—'}</td>
      <td style="text-align:center">${fmtKD(amt)}</td>
      <td style="text-align:center">${m}</td>
      <td style="text-align:center">${i.id||'—'}</td>
      <td style="text-align:center">${fmtDate(s?.startDate||'')}</td>
      <td></td>
    </tr>`;
  }).join('');

  const dateAr = new Date(date).toLocaleDateString('ar-KW',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  document.getElementById('dailyReportContent').innerHTML = `
    <div id="dailyPrintArea" style="font-family:inherit;direction:rtl">
      <div style="text-align:center;margin-bottom:8px">
        <h3 style="margin:0">التقرير التحصيلي اليومي — فرع ${branchName}</h3>
        <p style="margin:4px 0;font-size:13px">اليوم: ${dateAr}</p>
      </div>
      ${installs.length === 0
        ? '<p style="text-align:center;color:var(--text-muted);padding:30px">لا توجد مدفوعات في هذا اليوم</p>'
        : `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--primary);color:#fff">
            <th style="border:1px solid #ccc;padding:6px 4px;text-align:center">م</th>
            <th style="border:1px solid #ccc;padding:6px 8px">الاسم</th>
            <th style="border:1px solid #ccc;padding:6px 8px">البيانات</th>
            <th style="border:1px solid #ccc;padding:6px 4px;text-align:center">المبلغ</th>
            <th style="border:1px solid #ccc;padding:6px 4px;text-align:center">طريقة الدفع</th>
            <th style="border:1px solid #ccc;padding:6px 4px;text-align:center">رقم السند</th>
            <th style="border:1px solid #ccc;padding:6px 4px;text-align:center">المباشرة</th>
            <th style="border:1px solid #ccc;padding:6px 8px">الملاحظات</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:20px;gap:16px;flex-wrap:wrap">
        <table style="border-collapse:collapse;font-size:13px;min-width:220px">
          <tr><td style="border:1px solid #ccc;padding:6px 12px">الإيراد نقداً</td><td style="border:1px solid #ccc;padding:6px 12px;min-width:80px">${fmtKD(totals['نقدي'])}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">الإيراد رابط</td><td style="border:1px solid #ccc;padding:6px 12px">${fmtKD(totals['رابط'])}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">الإيراد كي نت</td><td style="border:1px solid #ccc;padding:6px 12px">${fmtKD(totals['كي نت'])}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">الإيراد برنامج</td><td style="border:1px solid #ccc;padding:6px 12px">${fmtKD(totals['برنامج'])}</td></tr>
          <tr style="font-weight:bold;background:#f0f0f0"><td style="border:1px solid #ccc;padding:6px 12px">الإجمالي</td><td style="border:1px solid #ccc;padding:6px 12px">${fmtKD(total)}</td></tr>
        </table>
        <table style="border-collapse:collapse;font-size:13px;min-width:240px">
          <tr><td style="border:1px solid #ccc;padding:6px 12px">اسم الموظفة</td><td style="border:1px solid #ccc;padding:6px 60px"></td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">التوقيع</td><td style="border:1px solid #ccc;padding:6px 60px"></td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">اسم مستلم الكاش</td><td style="border:1px solid #ccc;padding:6px 60px"></td></tr>
          <tr><td style="border:1px solid #ccc;padding:6px 12px">التوقيع</td><td style="border:1px solid #ccc;padding:6px 60px"></td></tr>
        </table>
      </div>`}
    </div>`;
}

function printDailyReport() {
  const area = document.getElementById('dailyPrintArea');
  if (!area) { showToast('⚠️ اعرض التقرير أولاً'); return; }
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px 8px}
    th{background:#1a5c42;color:#fff}@media print{button{display:none}}</style>
    </head><body>${area.innerHTML}<br><button onclick="window.print()">🖨️ طباعة</button></body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

