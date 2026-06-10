// ============================================================
// APP-STUDENTS.JS  —  Add/Edit student + Installment builder
// ============================================================

// ===== ADD STUDENT MODAL =====
function openAddStudent() {
  const html = `
  <div id="modal-student" class="modal-overlay open">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">➕ تسجيل طالب جديد</div>
        <button class="modal-close" onclick="closeModal('modal-student')">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-row">
          <div class="form-group">
            <label>الكود (تلقائي)</label>
            <input type="text" id="sId" value="${DB.nextId('students','S')}" readonly>
          </div>
          <div class="form-group">
            <label>اسم الطالب *</label>
            <input type="text" id="sName" placeholder="الاسم الثلاثي">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>المرحلة *</label>
            <select id="sGrade">
              ${getGrades().map(g=>`<option value="${g.id}">${g.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الفرع *</label>
            <select id="sBranch" ${currentUser?.role !== 'admin' ? 'disabled' : ''}>
              ${Object.entries(BRANCHES).filter(([k])=>k!=='all').map(([k,v])=>
                `<option value="${k}">${v.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>هاتف ولي الأمر 1 *</label>
            <input type="tel" id="sPhone1" placeholder="965XXXXXXXX">
          </div>
          <div class="form-group">
            <label>هاتف ولي الأمر 2</label>
            <input type="tel" id="sPhone2" placeholder="965XXXXXXXX">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>تاريخ الميلاد</label>
            <input type="date" id="sDob">
          </div>
          <div class="form-group">
            <label>تاريخ المباشرة *</label>
            <input type="date" id="sStart">
          </div>
        </div>

        <hr style="margin:14px 0;border-color:var(--border)">
        <div style="font-size:13px;font-weight:700;color:var(--primary-dark);margin-bottom:12px">💰 الرسوم والأقساط</div>

        <div class="form-row-3">
          <div class="form-group">
            <label>الرسوم الإجمالية (د.ك) *</label>
            <input type="number" id="sFees" placeholder="1200" step="0.001" oninput="calcNet()">
          </div>
          <div class="form-group">
            <label>الخصم (د.ك)</label>
            <input type="number" id="sDiscount" placeholder="0" step="0.001" oninput="calcNet()">
          </div>
          <div class="form-group">
            <label>الصافي (د.ك)</label>
            <input type="number" id="sNet" placeholder="0" readonly>
          </div>
        </div>

        <div class="form-group">
          <label>سبب الخصم</label>
          <input type="text" id="sDiscountReason" placeholder="اختياري">
        </div>

        <!-- Installment builder -->
        <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;margin-bottom:10px">📅 خطة الأقساط</div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <div class="pay-chip selected" onclick="setInstMode(this,'equal')">⚖️ متساوية</div>
            <div class="pay-chip" onclick="setInstMode(this,'custom')">✏️ مخصصة</div>
          </div>

          <div class="form-row-3" style="margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label>عدد الأقساط</label>
              <input type="number" id="instCount" value="4" min="1" max="24"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                oninput="buildInstRows()">
            </div>
            <div class="form-group" style="margin:0">
              <label>بداية الأقساط</label>
              <input type="date" id="instStart"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="buildInstRows()">
            </div>
            <div class="form-group" style="margin:0">
              <label>كل</label>
              <select id="instInterval"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="buildInstRows()">
                <option value="1">شهر</option>
                <option value="2">شهرين</option>
                <option value="3">3 أشهر</option>
                <option value="6">6 أشهر</option>
              </select>
            </div>
          </div>

          <button class="btn btn-outline" style="font-size:11px;margin-bottom:10px" onclick="buildInstRows()">🔄 توليد الأقساط</button>

          <div class="table-wrap" id="instTableWrap">
            <table>
              <thead><tr>
                <th>#</th>
                <th>المبلغ (د.ك)</th>
                <th>تاريخ الاستحقاق</th>
                <th>ملاحظة</th>
                <th></th>
              </tr></thead>
              <tbody id="instRows"></tbody>
              <tfoot>
                <tr style="background:#f8f9fa">
                  <td colspan="2" style="padding:8px 10px;font-weight:700">
                    المجموع: <span id="instTotal" style="color:var(--primary)">0.000 د.ك</span>
                  </td>
                  <td colspan="3" style="padding:8px 10px">
                    <span id="instDiff" style="font-size:11px"></span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addInstRow()">➕ إضافة قسط</button>
        </div>

        <div id="eveningSubscriptionFields" style="display:none">
          <hr style="margin:14px 0;border-color:var(--border)">
          <div style="font-size:13px;font-weight:700;color:#8b5cf6;margin-bottom:12px">🌙 بيانات اشتراك المسائي</div>
          <div class="form-row">
            <div class="form-group">
              <label>نوع الاشتراك</label>
              <select id="sSubType" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
                <option value="monthly">📅 شهري</option>
                <option value="weekly">🗓 أسبوعي</option>
                <option value="daily">☀️ يومي</option>
              </select>
            </div>
            <div class="form-group">
              <label>تاريخ انتهاء الاشتراك</label>
              <input type="date" id="sSubEnd" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>ملاحظات</label>
          <textarea id="sNotes" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-student')">إلغاء</button>
        <button class="btn btn-outline" onclick="printStudentForm()">🖨️ طباعة استمارة</button>
        <button class="btn btn-primary" onclick="saveStudent()">💾 حفظ الطالب</button>
      </div>
    </div>
  </div>`;

  document.getElementById('modals').innerHTML = html;

  // set today as default start date
  document.getElementById('instStart').value = new Date().toISOString().split('T')[0];
  document.getElementById('sStart').value    = new Date().toISOString().split('T')[0];

  // set branch based on user role
  const branchSel = document.getElementById('sBranch');
  if (currentUser?.role !== 'admin') {
    branchSel.value    = currentUser.branch;
    branchSel.disabled = true;
  } else if (currentBranch !== 'all') {
    branchSel.value = currentBranch;
  }

  // show evening fields if evening branch selected
  function toggleEveningFields() {
    const isEvening = isEveningBranch(document.getElementById('sBranch').value);
    document.getElementById('eveningSubscriptionFields').style.display = isEvening ? '' : 'none';
  }
  branchSel.addEventListener('change', toggleEveningFields);
  toggleEveningFields();
}

// ===== NET CALCULATION =====
function calcNet() {
  const fees = parseFloat(document.getElementById('sFees').value) || 0;
  const disc = parseFloat(document.getElementById('sDiscount').value) || 0;
  const net  = Math.max(0, fees - disc);
  document.getElementById('sNet').value = net.toFixed(3);
  buildInstRows();
}

// ===== INSTALLMENT MODE =====
let instMode = 'equal';
function setInstMode(el, mode) {
  el.closest('div').querySelectorAll('.pay-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  instMode = mode;
  buildInstRows();
}

// ===== BUILD INSTALLMENT ROWS =====
function buildInstRows() {
  const n        = parseInt(document.getElementById('instCount').value) || 1;
  const startVal = document.getElementById('instStart').value;
  const months   = parseInt(document.getElementById('instInterval').value) || 1;
  const net      = parseFloat(document.getElementById('sNet').value) || 0;
  const base     = net > 0 ? parseFloat((net / n).toFixed(3)) : 0;
  const last     = net > 0 ? parseFloat((net - base * (n - 1)).toFixed(3)) : 0;

  const tbody = document.getElementById('instRows');
  if (!tbody) return;

  let rows = '';
  for (let i = 1; i <= n; i++) {
    const amt  = instMode === 'equal' ? (i === n ? last : base) : base;
    const date = startVal ? addMonths(startVal, months * (i - 1)) : '';
    rows += `<tr>
      <td style="padding:6px 10px;color:var(--text-muted)">${i}</td>
      <td style="padding:4px 6px">
        <input type="number" class="inst-input inst-amt" value="${amt || ''}" step="0.001" min="0"
          style="width:110px" oninput="updateInstTotal()">
      </td>
      <td style="padding:4px 6px">
        <input type="date" class="inst-input inst-date" value="${date}">
      </td>
      <td style="padding:4px 6px">
        <input type="text" class="inst-input inst-note" placeholder="اختياري" style="width:120px">
      </td>
      <td style="padding:4px 6px;text-align:center">
        <button onclick="this.closest('tr').remove();updateInstTotal()"
          style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:15px">🗑</button>
      </td>
    </tr>`;
  }
  tbody.innerHTML = rows;
  updateInstTotal();
}

function addInstRow() {
  const tbody = document.getElementById('instRows');
  if (!tbody) return;
  const n = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="padding:6px 10px;color:var(--text-muted)">${n}</td>
    <td style="padding:4px 6px"><input type="number" class="inst-input inst-amt" step="0.001" min="0" style="width:110px" oninput="updateInstTotal()"></td>
    <td style="padding:4px 6px"><input type="date" class="inst-input inst-date"></td>
    <td style="padding:4px 6px"><input type="text" class="inst-input inst-note" placeholder="اختياري" style="width:120px"></td>
    <td style="padding:4px 6px;text-align:center">
      <button onclick="this.closest('tr').remove();updateInstTotal()"
        style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:15px">🗑</button>
    </td>`;
  tbody.appendChild(tr);
  updateInstTotal();
}

function updateInstTotal() {
  const amts  = Array.from(document.querySelectorAll('.inst-amt')).map(i => parseFloat(i.value) || 0);
  const total = amts.reduce((a, b) => a + b, 0);
  const netEl = document.getElementById('sNet') || document.getElementById('esNet');
  const net   = parseFloat(netEl?.value) || 0;
  const diff  = parseFloat((total - net).toFixed(3));

  document.getElementById('instTotal').textContent = total.toFixed(3) + ' د.ك';
  const diffEl = document.getElementById('instDiff');
  if (net === 0) { diffEl.textContent = ''; return; }
  if (Math.abs(diff) < 0.001) {
    diffEl.innerHTML = '<span style="color:var(--primary)">✅ يطابق الصافي</span>';
  } else {
    diffEl.innerHTML = `<span style="color:var(--danger)">⚠️ فرق: ${diff > 0 ? '+' : ''}${diff} د.ك</span>`;
  }
}

// ===== SAVE STUDENT =====
function saveStudent() {
  const name  = document.getElementById('sName').value.trim();
  const phone1= document.getElementById('sPhone1').value.trim();
  const fees  = parseFloat(document.getElementById('sFees').value) || 0;

  if (!name)  { showToast('⚠️ أدخل اسم الطالب'); return; }
  if (!phone1){ showToast('⚠️ أدخل رقم الهاتف'); return; }
  if (!fees)  { showToast('⚠️ أدخل الرسوم'); return; }

  const id = document.getElementById('sId').value;
  const branch = document.getElementById('sBranch').value;
  const isEvening = isEveningBranch(branch);
  const student = {
    id,
    name,
    branch,
    grade:           document.getElementById('sGrade').value,
    phone1,
    phone2:          document.getElementById('sPhone2').value.trim(),
    dob:             document.getElementById('sDob').value,
    startDate:       document.getElementById('sStart').value,
    joinDate:        document.getElementById('sStart').value,
    fees,
    discount:        parseFloat(document.getElementById('sDiscount').value) || 0,
    net:             parseFloat(document.getElementById('sNet').value) || fees,
    paid:            0,
    notes:           document.getElementById('sNotes').value,
    enrollStatus:    isEvening ? 'active' : '',
    subscriptionType:isEvening ? (document.getElementById('sSubType')?.value || 'monthly') : '',
    subscriptionEnd: isEvening ? (document.getElementById('sSubEnd')?.value || '') : '',
    withdrawDate:    ''
  };

  DB.add('students', student);

  // save installments
  const rows = document.querySelectorAll('#instRows tr');
  const instPrefix = 'I';
  rows.forEach((row, idx) => {
    const amt  = parseFloat(row.querySelector('.inst-amt').value) || 0;
    const date = row.querySelector('.inst-date').value;
    const note = row.querySelector('.inst-note').value;
    if (amt > 0) {
      DB.add('installments', {
        id:        DB.nextId('installments', instPrefix),
        studentId: id,
        num:       idx + 1,
        amount:    amt,
        dueDate:   date,
        paidDate:  '',
        method:    '',
        note,
        status:    'pending'
      });
    }
  });

  closeModal('modal-student');
  renderStudentsTable(activeGrade);
  renderDashboard();
  showToast('✅ تم حفظ الطالب: ' + name);
}

// ===== PRINT STUDENT FORM =====
function printStudentForm() {
  const name   = document.getElementById('sName').value || '—';
  const branch = document.getElementById('sBranch').options[document.getElementById('sBranch').selectedIndex].text;
  const grade  = document.getElementById('sGrade').options[document.getElementById('sGrade').selectedIndex].text;
  const phone1 = document.getElementById('sPhone1').value || '—';
  const phone2 = document.getElementById('sPhone2').value || '—';
  const dob    = document.getElementById('sDob').value || '—';
  const start  = document.getElementById('sStart').value || '—';
  const fees   = document.getElementById('sFees').value || '0';
  const disc   = document.getElementById('sDiscount').value || '0';
  const net    = document.getElementById('sNet').value || '0';
  const notes  = document.getElementById('sNotes').value || '—';
  const code   = document.getElementById('sId').value || '—';

  // collect installment rows
  const instRows = Array.from(document.querySelectorAll('#instRows tr'));
  const instHtml = instRows.map((r, i) => {
    const amt  = r.querySelector('.inst-amt')?.value || '0';
    const date = r.querySelector('.inst-date')?.value || '—';
    const note = r.querySelector('.inst-note')?.value || '';
    return `<tr>
      <td>${i+1}</td><td>${parseFloat(amt).toFixed(3)} د.ك</td>
      <td>${date.replace(/-/g,'/')}</td><td>${note||'—'}</td><td>⏳ قادم</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>استمارة تسجيل — ${name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;direction:rtl;font-size:13px}
      h2{color:#1a9e6a;border-bottom:2px solid #1a9e6a;padding-bottom:8px;margin-bottom:16px}
      h3{color:#1a9e6a;margin:18px 0 8px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      td,th{border:1px solid #ccc;padding:9px 12px;text-align:right}
      th{background:#f0f0f0;width:35%;font-weight:600}
      .info-table th{width:35%}
      .inst-table th{background:#e8f5ee}
      .sig{display:flex;justify-content:space-between;margin-top:40px}
      .sig div{text-align:center;flex:1}
      .sig-line{border-bottom:1px solid #333;width:150px;margin:0 auto 6px}
      @media print{.no-print{display:none}}
    </style></head><body>
    <h2>🌟 Personality Kids — استمارة تسجيل طالب</h2>

    <h3>📋 بيانات الطالب</h3>
    <table class="info-table">
      <tr><th>الكود</th><td><b>${code}</b></td><th>تاريخ التسجيل</th><td>${new Date().toLocaleDateString('ar-KW')}</td></tr>
      <tr><th>الاسم الكامل</th><td colspan="3"><b>${name}</b></td></tr>
      <tr><th>الفرع</th><td>${branch}</td><th>المرحلة</th><td>${grade}</td></tr>
      <tr><th>هاتف ولي الأمر 1</th><td>${phone1}</td><th>هاتف ولي الأمر 2</th><td>${phone2}</td></tr>
      <tr><th>تاريخ الميلاد</th><td>${dob.replace(/-/g,'/')}</td><th>تاريخ المباشرة</th><td>${start.replace(/-/g,'/')}</td></tr>
      <tr><th>ملاحظات</th><td colspan="3">${notes}</td></tr>
    </table>

    <h3>💰 الرسوم والأقساط</h3>
    <table class="info-table">
      <tr><th>الرسوم الإجمالية</th><td>${parseFloat(fees).toFixed(3)} د.ك</td>
          <th>الخصم</th><td>${parseFloat(disc).toFixed(3)} د.ك</td></tr>
      <tr><th>الصافي المستحق</th><td colspan="3"><b style="font-size:15px">${parseFloat(net).toFixed(3)} د.ك</b></td></tr>
    </table>

    <h3>📅 جدول الأقساط</h3>
    <table class="inst-table">
      <thead><tr><th>#</th><th>المبلغ</th><th>تاريخ الاستحقاق</th><th>ملاحظة</th><th>الحالة</th></tr></thead>
      <tbody>${instHtml || '<tr><td colspan="5" style="text-align:center;color:#999">لا توجد أقساط</td></tr>'}</tbody>
    </table>

    <div class="sig">
      <div><div class="sig-line"></div><div>توقيع ولي الأمر</div></div>
      <div><div class="sig-line"></div><div>توقيع الإدارة</div></div>
      <div><div class="sig-line"></div><div>الختم الرسمي</div></div>
    </div>
    <br><button class="no-print" onclick="window.print()">🖨️ طباعة</button>
    </body></html>`);
  win.document.close();
}

// ===== OPEN STUDENT INSTALLMENTS =====
function openStudentInstallments(studentId) {
  const s     = DB.all('students').find(x => x.id === studentId);
  const insts = DB.all('installments').filter(i => i.studentId === studentId);
  if (!s) return;

  const rows = insts.map(i => {
    const overdue   = i.status === 'pending' && daysUntil(i.dueDate) < 0;
    const isPartial = i.status === 'partial';
    const statusBadge = i.status === 'paid'
      ? '<span class="badge badge-green">مدفوع</span>'
      : isPartial ? '<span class="badge badge-blue">جزئي</span>'
      : overdue ? '<span class="badge badge-red">متأخر</span>'
      : '<span class="badge badge-orange">قادم</span>';

    const partialInfo = isPartial
      ? `<br><small style="color:var(--accent)">مدفوع: ${fmtKD(i.partialPaid||0)} / متبقي: ${fmtKD(i.amount-(i.partialPaid||0))}</small>`
      : '';

    const receiptBtn = i.receiptImg
      ? `<button class="btn btn-outline btn-sm" onclick="viewReceipt('${i.id}')" title="عرض الإيصال">🧾</button>`
      : '';

    const linkBtn = i.payLink
      ? `<a href="${i.payLink}" target="_blank" class="btn btn-outline btn-sm" title="رابط الدفع">🔗</a>`
      : '';

    const canPay = i.status === 'pending' || i.status === 'partial';
    return `<tr>
      <td>${i.num}</td>
      <td>${fmtKD(i.amount)}${partialInfo}</td>
      <td>${fmtDate(i.dueDate)}</td>
      <td>${fmtDate(i.paidDate)}</td>
      <td>${i.method || '—'}</td>
      <td>${statusBadge}</td>
      <td style="white-space:nowrap">
        ${canPay ? `<button class="btn btn-primary btn-sm" onclick="payInstallment('${i.id}','${studentId}')">💳 دفع</button>` : ''}
        ${receiptBtn}${linkBtn}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">لا توجد أقساط</td></tr>`;

  const html = `
  <div id="modal-installments" class="modal-overlay open">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">📋 أقساط — ${s.name}</div>
        <button class="modal-close" onclick="closeModal('modal-installments')">✕</button>
      </div>
      <div class="modal-body">
        ${(()=>{
          const refList = DB.all('refunds').filter(r => r.studentId === studentId);
          const totalRefunded = refList.reduce((sum,r)=>sum+(parseFloat(r.amount)||0),0);
          const netCollected  = s.paid - totalRefunded;
          const refundBlock   = totalRefunded > 0 ? `
          <div style="background:#f3f0ff;padding:10px 16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:11px;color:#8b5cf6">المرتجع</div>
            <div style="font-weight:800;color:#8b5cf6">${fmtKD(totalRefunded)}</div>
          </div>
          <div style="background:#e8f8f0;padding:10px 16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:11px;color:var(--primary)">المحصّل الفعلي</div>
            <div style="font-weight:800;color:var(--primary)">${fmtKD(netCollected)}</div>
          </div>` : '';
          return `
        <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
          <div style="background:var(--primary-light);padding:10px 16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">الصافي</div>
            <div style="font-weight:800;color:var(--primary)">${fmtKD(s.net)}</div>
          </div>
          <div style="background:var(--info-light);padding:10px 16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">المدفوع</div>
            <div style="font-weight:800;color:var(--info)">${fmtKD(s.paid)}</div>
          </div>
          <div style="background:var(--danger-light);padding:10px 16px;border-radius:8px;flex:1;text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">المتبقي</div>
            <div style="font-weight:800;color:var(--danger)">${fmtKD(s.net - s.paid)}</div>
          </div>
          ${refundBlock}
        </div>`;
        })()}
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>المبلغ</th><th>الاستحقاق</th><th>تاريخ الدفع</th><th>طريقة الدفع</th><th>الحالة</th><th>إجراء</th></tr></thead>
            <tbody id="instDetailRows">${rows}</tbody>
          </table>
        </div>

        <!-- REFUNDS SECTION -->
        <div style="margin-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:#8b5cf6">↩️ المرتجعات</div>
            <button class="btn btn-outline btn-sm" style="color:#8b5cf6;border-color:#8b5cf6" onclick="openRefundModal('${studentId}')">➕ إضافة مرتجع</button>
          </div>
          <div id="refundsSection">${buildRefundsHtml(studentId)}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="addQuickInstallment('${studentId}')">➕ إضافة قسط</button>
        <button class="btn btn-outline" onclick="printInstallmentsPDF('${studentId}')">🖨️ طباعة PDF</button>
        <button class="btn btn-outline" onclick="closeModal('modal-installments')">إغلاق</button>
      </div>
    </div>
  </div>`;

  document.getElementById('modals').innerHTML = html;
}

function addQuickInstallment(studentId) {
  const s = DB.all('students').find(x => x.id === studentId);
  if (!s) return;
  const remaining = s.net - s.paid;

  const div = document.createElement('div');
  div.innerHTML = `
    <div id="modal-quick-inst" class="modal-overlay open">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <div class="modal-title">➕ إضافة قسط — ${s.name}</div>
          <button class="modal-close" onclick="document.getElementById('modal-quick-inst').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>المبلغ (د.ك)</label>
              <input type="number" id="qiAmt" step="0.001" min="0" value="${remaining > 0 ? remaining.toFixed(3) : ''}"
                style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            </div>
            <div class="form-group">
              <label>تاريخ الاستحقاق</label>
              <input type="date" id="qiDate" value="${new Date().toISOString().split('T')[0]}"
                style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            </div>
          </div>
          <div class="form-group">
            <label>ملاحظة</label>
            <input type="text" id="qiNote" placeholder="اختياري"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modal-quick-inst').remove()">إلغاء</button>
          <button class="btn btn-primary" onclick="saveQuickInstallment('${studentId}')">💾 حفظ القسط</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modals').appendChild(div.firstElementChild);
}

function saveQuickInstallment(studentId) {
  const amt  = parseFloat(document.getElementById('qiAmt').value) || 0;
  const date = document.getElementById('qiDate').value;
  const note = document.getElementById('qiNote').value.trim();

  if (!amt || amt <= 0) { showToast('⚠️ أدخل مبلغ صحيح'); return; }

  const existingInsts = DB.all('installments').filter(i => i.studentId === studentId);
  const nextNum = existingInsts.length + 1;

  const inst = {
    id:        DB.nextId('installments', 'I'),
    studentId,
    num:       nextNum,
    amount:    amt,
    dueDate:   date,
    paidDate:  '',
    method:    '',
    note,
    status:    'pending'
  };

  DB.add('installments', inst);
  document.getElementById('modal-quick-inst').remove();
  openStudentInstallments(studentId);
  showToast('✅ تم إضافة القسط');
}

// ===== PAY INSTALLMENT =====
function payInstallment(instId, studentId) {
  const inst = DB.all('installments').find(i => i.id === instId);
  if (!inst) return;

  const methodHtml = `
    <div id="modal-pay" class="modal-overlay open">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <div class="modal-title">💳 تسجيل دفعة — قسط ${inst.num}</div>
          <button class="modal-close" onclick="document.getElementById('modal-pay').remove()">✕</button>
        </div>
        <div class="modal-body">

          <div style="background:var(--bg-secondary,#f7f7f5);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px">
            <span style="color:var(--text-muted)">المبلغ الكامل للقسط:</span>
            <b style="color:var(--primary)">${fmtKD(inst.amount)}</b>
            ${inst.partialPaid > 0 ? `<span style="margin-right:10px;color:var(--accent)"> | المدفوع جزئياً: ${fmtKD(inst.partialPaid)}</span>` : ''}
          </div>

          <div class="form-group">
            <label>نوع الدفع</label>
            <div class="pay-method" style="margin-bottom:10px">
              <div class="pay-chip selected" onclick="selPayType(this,'full')">💯 دفع كامل</div>
              <div class="pay-chip" onclick="selPayType(this,'partial')">✂️ دفع جزئي</div>
            </div>
          </div>

          <div class="form-group" id="partialAmtGroup" style="display:none">
            <label>المبلغ المدفوع (د.ك) *</label>
            <input type="number" id="payPartialAmt" step="0.001" min="0.001"
              max="${inst.amount - (inst.partialPaid||0)}"
              placeholder="0.000" class="form-control"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            <small style="color:var(--text-muted)">الحد الأقصى: ${fmtKD(inst.amount - (inst.partialPaid||0))}</small>
          </div>

          <div class="form-group">
            <label>طريقة الدفع</label>
            <div class="pay-method" id="payMethodChips">
              <div class="pay-chip selected" onclick="selPay(this)">💵 نقدي</div>
              <div class="pay-chip" onclick="selPay(this)">📱 برنامج</div>
              <div class="pay-chip" onclick="selPay(this)">💳 كي نت</div>
              <div class="pay-chip" onclick="selPay(this,true)">🔗 رابط/QR</div>
            </div>
          </div>

          <div class="form-group" id="linkGroup" style="display:none">
            <label>رابط الدفع أو رمز QR</label>
            <input type="url" id="payLink" class="form-control"
              placeholder="https://..." style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>

          <div class="form-group">
            <label>تاريخ الدفع</label>
            <input type="date" id="payDate" value="${new Date().toISOString().split('T')[0]}"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>

          <div class="form-group">
            <label>رقم السند</label>
            <input type="text" id="payVoucherNo" placeholder="اختياري"
              style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
          </div>

          <div class="form-group">
            <label>إيصال / صورة الدفع</label>
            <input type="file" id="payReceipt" accept="image/*"
              style="display:block;width:100%;font-size:12px" onchange="previewPayReceipt(this)">
            <div id="payReceiptPreview" style="margin-top:8px"></div>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modal-pay').remove()">إلغاء</button>
          <button class="btn btn-primary" onclick="confirmPay('${instId}','${studentId}')">✅ تأكيد الدفع</button>
        </div>
      </div>
    </div>`;

  const div = document.createElement('div');
  div.innerHTML = methodHtml;
  document.getElementById('modals').appendChild(div.firstElementChild);
}

function selPayType(el, type) {
  el.closest('.pay-method').querySelectorAll('.pay-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('partialAmtGroup').style.display = type === 'partial' ? '' : 'none';
}

function selPay(el, hasLink) {
  el.closest('#payMethodChips').querySelectorAll('.pay-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('linkGroup').style.display = hasLink ? '' : 'none';
}

function previewPayReceipt(input) {
  const prev = document.getElementById('payReceiptPreview');
  if (!input.files || !input.files[0]) { prev.innerHTML = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border)">`;
  };
  reader.readAsDataURL(input.files[0]);
}

function confirmPay(instId, studentId) {
  const methodEl  = document.querySelector('#payMethodChips .pay-chip.selected');
  const method    = methodEl ? methodEl.textContent.trim() : 'نقدي';
  const date      = document.getElementById('payDate').value;
  const link      = document.getElementById('payLink')?.value?.trim() || '';
  const isPartial = document.querySelector('#modal-pay .pay-chip.selected')?.textContent.includes('جزئي') ||
                    document.getElementById('partialAmtGroup')?.style.display !== 'none';

  const inst    = DB.all('installments').find(i => i.id === instId);
  const student = DB.all('students').find(s => s.id === studentId);
  if (!inst || !student) return;

  // read receipt image
  const fileInput = document.getElementById('payReceipt');
  const file = fileInput?.files?.[0];

  function applyPayment(receiptData) {
    const partialAmt = parseFloat(document.getElementById('payPartialAmt')?.value) || 0;
    const prevPartial = inst.partialPaid || 0;

    let newPaid, newStatus, newPartial;
    if (document.getElementById('partialAmtGroup')?.style.display !== 'none' && partialAmt > 0) {
      // partial mode
      newPartial = prevPartial + partialAmt;
      newPaid = student.paid + partialAmt;
      newStatus = newPartial >= inst.amount ? 'paid' : 'partial';
    } else {
      // full payment
      const remaining = inst.amount - prevPartial;
      newPartial = inst.amount;
      newPaid = student.paid + remaining;
      newStatus = 'paid';
    }

    // Core fields — confirmed to exist in Supabase installments schema
    DB.update('installments', instId, {
      status:   newStatus,
      paidDate: date,
      method
    });
    DB.update('students', studentId, { paid: Math.min(newPaid, student.net) });

    // Extra fields — update cache only (columns may not exist in Supabase)
    const extras = { partialPaid: newPartial, payLink: link, receiptImg: receiptData || '', receiptName: file?.name || '', voucherNo: document.getElementById('payVoucherNo')?.value?.trim() || '' };
    const extSnake = {};
    for (const [k,v] of Object.entries(extras)) extSnake[TO_SNAKE[k]||k] = v;
    if (typeof CACHE !== 'undefined') {
      CACHE['installments'] = (CACHE['installments']||[]).map(i => i.id === instId ? {...i, ...extSnake} : i);
    }

    document.getElementById('modal-pay').remove();
    openStudentInstallments(studentId);
    showToast(newStatus === 'paid' ? '✅ تم تسجيل الدفع بالكامل' : `✅ دفع جزئي: ${fmtKD(newPartial)}`);
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = e => applyPayment(e.target.result);
    reader.readAsDataURL(file);
  } else {
    applyPayment('');
  }
}

// ===== PRINT INSTALLMENTS PDF =====
function printInstallmentsPDF(studentId) {
  const s     = DB.all('students').find(x => x.id === studentId);
  const insts = DB.all('installments').filter(i => i.studentId === studentId);
  if (!s) return;

  const rows = insts.map(i => {
    const statusTxt = i.status === 'paid' ? '✅ مدفوع'
      : i.status === 'partial' ? `🔵 جزئي (${fmtKD(i.partialPaid||0)})`
      : daysUntil(i.dueDate) < 0 ? '🔴 متأخر' : '⏳ قادم';
    return `<tr>
      <td>${i.num}</td>
      <td>${fmtKD(i.amount)}</td>
      <td>${fmtDate(i.dueDate)}</td>
      <td>${fmtDate(i.paidDate)}</td>
      <td>${i.method || '—'}</td>
      <td>${i.payLink ? `<a href="${i.payLink}">🔗 رابط</a>` : '—'}</td>
      <td>${i.receiptName || '—'}</td>
      <td>${statusTxt}</td>
    </tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>أقساط ${s.name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;direction:rtl;font-size:13px}
      h2{color:#1a9e6a;margin-bottom:4px}
      .info{display:flex;gap:20px;margin-bottom:16px;font-size:12px;color:#555}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:8px;text-align:right}
      th{background:#f0f0f0;font-weight:600}
      @media print{button{display:none}}
    </style></head><body>
    <h2>🌟 Personality Kids — خطة أقساط</h2>
    <div class="info">
      <span><b>الطالب:</b> ${s.name}</span>
      <span><b>الفرع:</b> ${BRANCHES[s.branch].name}</span>
      <span><b>الصافي:</b> ${fmtKD(s.net)}</span>
      <span><b>المدفوع:</b> ${fmtKD(s.paid)}</span>
      <span><b>المتبقي:</b> ${fmtKD(s.net - s.paid)}</span>
    </div>
    <table>
      <thead><tr><th>#</th><th>المبلغ</th><th>الاستحقاق</th><th>تاريخ الدفع</th><th>الطريقة</th><th>رابط</th><th>إيصال</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <br><button onclick="window.print()">🖨️ طباعة</button>
    </body></html>`);
  win.document.close();
}

// ===== VIEW RECEIPT IMAGE =====
function viewReceipt(instId) {
  const inst = DB.all('installments').find(i => i.id === instId);
  if (!inst || !inst.receiptImg) { showToast('لا توجد صورة إيصال'); return; }
  const win = window.open('', '_blank', 'width=600,height=700');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>إيصال الدفع</title>
    <style>body{margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5}
    h3{color:#1a9e6a}img{max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15)}</style></head>
    <body><h3>🧾 إيصال الدفع — قسط ${inst.num}</h3>
    <p style="color:#666">الطريقة: ${inst.method||'—'} | التاريخ: ${fmtDate(inst.paidDate)}</p>
    <img src="${inst.receiptImg}" alt="إيصال">
    <br><button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#1a9e6a;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨️ طباعة</button>
    </body></html>`);
  win.document.close();
}

// ===== HELPER =====
function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// ===== EDIT STUDENT =====
function openEditStudent(id) {
  const s = DB.all('students').find(st => st.id === id);
  if (!s) { showToast('⚠️ الطالب غير موجود'); return; }

  const existingInst = DB.all('installments').filter(i => i.studentId === id);

  const instRowsHtml = existingInst.map((inst, idx) => `
    <tr data-inst-id="${inst.id}">
      <td style="padding:6px 10px;color:var(--text-muted)">${idx + 1}</td>
      <td style="padding:4px 6px">
        <input type="number" class="inst-input inst-amt" value="${inst.amount}" step="0.001" min="0"
          style="width:110px" oninput="updateInstTotal()">
      </td>
      <td style="padding:4px 6px">
        <input type="date" class="inst-input inst-date" value="${inst.dueDate}">
      </td>
      <td style="padding:4px 6px">
        <input type="text" class="inst-input inst-note" value="${inst.note||''}" placeholder="اختياري" style="width:120px">
      </td>
      <td style="padding:4px 6px;text-align:center">
        ${inst.status === 'paid'
          ? '<span style="color:var(--primary);font-size:12px">✅ مدفوع</span>'
          : `<button onclick="this.closest('tr').remove();updateInstTotal()"
               style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:15px">🗑</button>`
        }
      </td>
    </tr>`).join('');

  const html = `
  <div id="modal-edit-student" class="modal-overlay open">
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title">✏️ تعديل بيانات الطالب</div>
        <button class="modal-close" onclick="closeModal('modal-edit-student')">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-row">
          <div class="form-group">
            <label>الكود</label>
            <input type="text" id="esId" value="${s.id}" readonly>
          </div>
          <div class="form-group">
            <label>اسم الطالب *</label>
            <input type="text" id="esName" value="${s.name}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>المرحلة *</label>
            <select id="esGrade">
              ${getGrades().map(g=>`<option value="${g.id}" ${g.id===s.grade?'selected':''}>${g.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>الفرع *</label>
            <select id="esBranch" ${currentUser?.role !== 'admin' ? 'disabled' : ''}>
              ${Object.entries(BRANCHES).filter(([k])=>k!=='all').map(([k,v])=>
                `<option value="${k}" ${k===s.branch?'selected':''}>${v.name}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>هاتف ولي الأمر 1</label>
            <input type="tel" id="esPhone1" value="${s.phone1||''}">
          </div>
          <div class="form-group">
            <label>هاتف ولي الأمر 2</label>
            <input type="tel" id="esPhone2" value="${s.phone2||''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>تاريخ الميلاد</label>
            <input type="date" id="esDob" value="${s.dob||''}">
          </div>
          <div class="form-group">
            <label>تاريخ المباشرة *</label>
            <input type="date" id="esStart" value="${s.startDate||''}">
          </div>
        </div>

        <div id="esEveningFields" style="display:${isEveningBranch(s.branch)?'block':'none'}">
          <hr style="margin:14px 0;border-color:var(--border)">
          <div style="font-size:13px;font-weight:700;color:#8b5cf6;margin-bottom:12px">🌙 بيانات اشتراك المسائي</div>
          <div class="form-row">
            <div class="form-group">
              <label>نوع الاشتراك</label>
              <select id="esSubType" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
                <option value="monthly" ${(s.subscriptionType||'monthly')==='monthly'?'selected':''}>📅 شهري</option>
                <option value="weekly"  ${s.subscriptionType==='weekly'?'selected':''}>🗓 أسبوعي</option>
                <option value="daily"   ${s.subscriptionType==='daily'?'selected':''}>☀️ يومي</option>
              </select>
            </div>
            <div class="form-group">
              <label>تاريخ انتهاء الاشتراك</label>
              <input type="date" id="esSubEnd" value="${s.subscriptionEnd||''}" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            </div>
          </div>
        </div>

        <hr style="margin:14px 0;border-color:var(--border)">
        <div style="font-size:13px;font-weight:700;color:var(--primary-dark);margin-bottom:12px">💰 الرسوم والأقساط</div>

        <div class="form-row-3">
          <div class="form-group">
            <label>الرسوم الإجمالية (د.ك) *</label>
            <input type="number" id="esFees" value="${s.fees}" step="0.001" oninput="calcEditNet()">
          </div>
          <div class="form-group">
            <label>الخصم (د.ك)</label>
            <input type="number" id="esDiscount" value="${s.discount||0}" step="0.001" oninput="calcEditNet()">
          </div>
          <div class="form-group">
            <label>الصافي (د.ك)</label>
            <input type="number" id="esNet" value="${s.net||s.fees}" readonly>
          </div>
        </div>

        <div class="form-group">
          <label>سبب الخصم</label>
          <input type="text" id="esDiscountReason" value="${s.discountReason||''}">
        </div>

        <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;margin-bottom:10px">📅 الأقساط الحالية</div>
          <div class="table-wrap" id="editInstTableWrap">
            <table>
              <thead><tr>
                <th>#</th>
                <th>المبلغ (د.ك)</th>
                <th>تاريخ الاستحقاق</th>
                <th>ملاحظة</th>
                <th></th>
              </tr></thead>
              <tbody id="instRows">${instRowsHtml}</tbody>
              <tfoot>
                <tr style="background:#f8f9fa">
                  <td colspan="2" style="padding:8px 10px;font-weight:700">
                    المجموع: <span id="instTotal" style="color:var(--primary)">0.000 د.ك</span>
                  </td>
                  <td colspan="3" style="padding:8px 10px">
                    <span id="instDiff" style="font-size:11px"></span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addInstRow()">➕ إضافة قسط</button>
        </div>

        <div class="form-group">
          <label>ملاحظات</label>
          <textarea id="esNotes" rows="2">${s.notes||''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal('modal-edit-student')">إلغاء</button>
        <button class="btn btn-primary" onclick="saveEditStudent('${id}')">💾 حفظ التعديلات</button>
      </div>
    </div>
  </div>`;

  document.getElementById('modals').innerHTML = html;
  updateInstTotal();

  // toggle evening fields when branch changes
  document.getElementById('esBranch').addEventListener('change', function() {
    document.getElementById('esEveningFields').style.display = isEveningBranch(this.value) ? 'block' : 'none';
  });
}

function calcEditNet() {
  const fees = parseFloat(document.getElementById('esFees').value) || 0;
  const disc = parseFloat(document.getElementById('esDiscount').value) || 0;
  const net  = Math.max(0, fees - disc);
  document.getElementById('esNet').value = net.toFixed(3);
  updateInstTotal();
}

function saveEditStudent(id) {
  const name  = document.getElementById('esName').value.trim();
  const phone1= document.getElementById('esPhone1').value.trim();
  const fees  = parseFloat(document.getElementById('esFees').value) || 0;

  if (!name)  { showToast('⚠️ أدخل اسم الطالب'); return; }
  if (!fees)  { showToast('⚠️ أدخل الرسوم'); return; }

  const students = DB.all('students');
  const idx = students.findIndex(st => st.id === id);
  if (idx === -1) { showToast('⚠️ الطالب غير موجود'); return; }

  // Update student record
  const esBranch = document.getElementById('esBranch').value;
  const esIsEvening = isEveningBranch(esBranch);
  const updated = {
    ...students[idx],
    name,
    branch:           esBranch,
    grade:            document.getElementById('esGrade').value,
    phone1,
    phone2:           document.getElementById('esPhone2').value.trim(),
    dob:              document.getElementById('esDob').value,
    startDate:        document.getElementById('esStart').value,
    joinDate:         students[idx].joinDate || document.getElementById('esStart').value,
    fees,
    discount:         parseFloat(document.getElementById('esDiscount').value) || 0,
    net:              parseFloat(document.getElementById('esNet').value) || fees,
    discountReason:   document.getElementById('esDiscountReason').value,
    notes:            document.getElementById('esNotes').value,
    subscriptionType: esIsEvening ? (document.getElementById('esSubType')?.value || students[idx].subscriptionType || 'monthly') : students[idx].subscriptionType,
    subscriptionEnd:  esIsEvening ? (document.getElementById('esSubEnd')?.value || students[idx].subscriptionEnd || '') : students[idx].subscriptionEnd,
  };
  students[idx] = updated;
  // Persist student update to Supabase (only columns that exist in the schema)
  DB.update('students', id, {
    name,
    branch:           esBranch,
    grade:            updated.grade,
    phone1:           updated.phone1,
    phone2:           updated.phone2,
    dob:              updated.dob,
    startDate:        updated.startDate,
    joinDate:         updated.joinDate,
    fees:             updated.fees,
    discount:         updated.discount,
    net:              updated.net,
    notes:            updated.notes,
    subscriptionType: updated.subscriptionType,
    subscriptionEnd:  updated.subscriptionEnd,
  });

  // Update installments: delete removed ones, update/insert the rest
  const allInst = DB.all('installments');
  const originalStudentInst = allInst.filter(i => i.studentId === id);
  const remainingOther = allInst.filter(i => i.studentId !== id);

  const rows = document.querySelectorAll('#instRows tr');
  const newInst = [];
  const seenIds = new Set();

  rows.forEach((row, rowIdx) => {
    const instId = row.getAttribute('data-inst-id');
    const amt    = parseFloat(row.querySelector('.inst-amt').value) || 0;
    const date   = row.querySelector('.inst-date').value;
    const note   = row.querySelector('.inst-note').value;

    if (instId) {
      // existing installment — update values
      const existing = allInst.find(i => i.id === instId);
      if (existing) {
        seenIds.add(instId);
        const updInst = { ...existing, amount: amt, dueDate: date, note };
        newInst.push(updInst);
        DB.update('installments', instId, { amount: amt, dueDate: date, note });
      }
    } else if (amt > 0) {
      // new installment row
      const ni = {
        id:        DB.nextId('installments', 'I'),
        studentId: id,
        num:       rowIdx + 1,
        amount:    amt,
        dueDate:   date,
        paidDate:  '',
        method:    '',
        note,
        status:    'pending'
      };
      newInst.push(ni);
      DB.add('installments', ni);
    }
  });

  // Delete installments that were removed from the DOM (unpaid only)
  originalStudentInst
    .filter(i => i.status !== 'paid' && !seenIds.has(i.id))
    .forEach(i => DB.remove('installments', i.id));

  // Update cache
  CACHE['installments'] = [...remainingOther, ...newInst].map(i => {
    const out = {};
    for (const [k, v] of Object.entries(i)) out[TO_SNAKE[k] || k] = v;
    return out;
  });

  closeModal('modal-edit-student');
  renderStudentsTable(activeGrade);
  renderDashboard?.();
  showToast('✅ تم حفظ التعديلات: ' + name);
}

// ===== REFUNDS =====
function buildRefundsHtml(studentId) {
  const refunds = DB.all('refunds').filter(r => r.studentId === studentId);
  if (!refunds.length) {
    return `<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:13px">لا توجد مرتجعات</div>`;
  }
  const total = refunds.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const rows = refunds.map(r => `
    <tr>
      <td style="padding:8px 10px">${fmtDate(r.date)}</td>
      <td style="padding:8px 10px;font-weight:700;color:#8b5cf6">${fmtKD(r.amount)}</td>
      <td style="padding:8px 10px">${r.reason || '—'}</td>
      <td style="padding:8px 10px;text-align:center">
        ${r.attachmentImg
          ? `<button class="btn btn-outline btn-sm" onclick="viewRefundAttachment('${r.id}')">📎 عرض</button>`
          : '<span style="color:var(--text-muted);font-size:12px">—</span>'}
      </td>
      <td style="padding:8px 10px;text-align:center">
        <button onclick="deleteRefund('${r.id}','${studentId}')"
          style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px">🗑</button>
      </td>
    </tr>`).join('');

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f3f0ff">
          <th style="padding:8px 10px;text-align:right;font-weight:600">التاريخ</th>
          <th style="padding:8px 10px;text-align:right;font-weight:600">المبلغ</th>
          <th style="padding:8px 10px;text-align:right;font-weight:600">السبب</th>
          <th style="padding:8px 10px;text-align:center;font-weight:600">المرفق</th>
          <th style="padding:8px 10px"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f3f0ff">
          <td colspan="5" style="padding:8px 10px;font-weight:700;color:#8b5cf6">
            إجمالي المرتجعات: ${fmtKD(total)}
          </td>
        </tr>
      </tfoot>
    </table>`;
}

function openRefundModal(studentId) {
  const s = DB.all('students').find(st => st.id === studentId);
  if (!s) return;

  const div = document.createElement('div');
  div.innerHTML = `
    <div id="modal-refund" class="modal-overlay open">
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <div class="modal-title">↩️ إضافة مرتجع — ${s.name}</div>
          <button class="modal-close" onclick="document.getElementById('modal-refund').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>المبلغ المرتجع (د.ك) *</label>
              <input type="number" id="refAmount" step="0.001" min="0" placeholder="0.000">
            </div>
            <div class="form-group">
              <label>تاريخ الإرجاع *</label>
              <input type="date" id="refDate" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="form-group">
            <label>سبب الإرجاع</label>
            <input type="text" id="refReason" placeholder="اختياري">
          </div>
          <div class="form-group">
            <label>مرفق (صورة الإيصال)</label>
            <input type="file" id="refAttachment" accept="image/*,application/pdf"
              style="padding:6px;border:1.5px solid var(--border);border-radius:8px;width:100%">
            <div id="refAttachPreview" style="margin-top:8px"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('modal-refund').remove()">إلغاء</button>
          <button class="btn btn-primary" style="background:#8b5cf6;border-color:#8b5cf6" onclick="saveRefund('${studentId}')">💾 حفظ المرتجع</button>
        </div>
      </div>
    </div>`;

  document.getElementById('modals').appendChild(div.firstElementChild);

  // preview attachment
  document.getElementById('refAttachment').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const prev = document.getElementById('refAttachPreview');
      if (file.type.startsWith('image/')) {
        prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:6px">`;
      } else {
        prev.innerHTML = `<span style="font-size:12px;color:var(--text-muted)">📄 ${file.name}</span>`;
      }
      prev._data = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveRefund(studentId) {
  const amount = parseFloat(document.getElementById('refAmount').value) || 0;
  const date   = document.getElementById('refDate').value;
  const reason = document.getElementById('refReason').value.trim();
  const prev   = document.getElementById('refAttachPreview');

  if (!amount || amount <= 0) { showToast('\u26a0\ufe0f \u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a \u0635\u062d\u064a\u062d'); return; }
  if (!date) { showToast('\u26a0\ufe0f \u0623\u062f\u062e\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e'); return; }

  const refund = {
    id:            DB.nextId('refunds', 'R'),
    studentId,
    amount,
    date,
    reason,
    attachmentImg: prev?._data || ''
  };

  DB.add('refunds', refund);
  document.getElementById('modal-refund').remove();
  renderStudentsTable(activeGrade);
  showToast('\u2705 \u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0645\u0631\u062a\u062c\u0639');
}

function deleteRefund(refundId, studentId) {
  if (!confirm('\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0631\u062a\u062c\u0639\u061f')) return;
  DB.remove('refunds', refundId);
  renderStudentsTable(activeGrade);
  showToast('\ud83d\uddd1 \u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0631\u062a\u062c\u0639');
}

function viewRefundAttachment(refundId) {
  const r = DB.all('refunds').find(x => x.id === refundId);
  if (!r || !r.attachmentImg) { showToast('\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0631\u0641\u0642'); return; }
  const win = window.open('', '_blank', 'width=600,height=700');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>\u0645\u0631\u0641\u0642 \u0627\u0644\u0645\u0631\u062a\u062c\u0639</title>
    <style>body{margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5}
    h3{color:#8b5cf6}img{max-width:100%;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15)}</style></head>
    <body><h3>\ud83d\udcce \u0645\u0631\u0641\u0642 \u0627\u0644\u0645\u0631\u062a\u062c\u0639</h3>
    <img src="${r.attachmentImg}" alt="\u0645\u0631\u0641\u0642">
    <br><button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer">\ud83d\udda8\ufe0f \u0637\u0628\u0627\u0639\u0629</button>
    </body></html>`);
  win.document.close();
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// ===== EXCEL IMPORT =====
const BRANCH_NAME_MAP = {
  'اشبيلية':          'esh',
  'الصليبخات':        'sol',
  'المطلاع':          'mat',
  'اشبيلية مسائي':   'esh_e',
  'الصليبخات مسائي': 'sol_e',
  'المطلاع مسائي':   'mat_e'
};
const SUB_TYPE_MAP = {
  'شهري':'monthly', 'monthly':'monthly',
  'أسبوعي':'weekly', 'weekly':'weekl