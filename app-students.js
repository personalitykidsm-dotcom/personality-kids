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
              <input type="number" id="instCount" value="1" min="1" max="24"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                oninput="buildInstRows()">
            </div>
            <div class="form-group" style="margin:0">
              <label>تاريخ القسط الأول (يدوي)</label>
              <input type="date" id="instFirstDate"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="buildInstRows()">
            </div>
            <div class="form-group" style="margin:0">
              <label>بداية القسط الثاني</label>
              <input type="date" id="instStart"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="buildInstRows()">
            </div>
          </div>
          <div class="form-row" style="margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label>الفترة بين الأقساط (من القسط الثاني)</label>
              <select id="instInterval"
                style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%"
                onchange="buildInstRows()">
                <option value="1">كل شهر</option>
                <option value="2">كل شهرين</option>
                <option value="3">كل 3 أشهر</option>
                <option value="6">كل 6 أشهر</option>
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

        ${contractFieldsHtml('s')}

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

  // show evening / contract fields based on selected branch
  function toggleBranchFields() {
    const branch = document.getElementById('sBranch').value;
    document.getElementById('eveningSubscriptionFields').style.display = isEveningBranch(branch) ? '' : 'none';
    const morningDiv = document.getElementById('morningContractFields');
    if (morningDiv) {
      if (isMorningBranch(branch)) {
        morningDiv.style.display = '';
        populateContractSelects(branch, 'sContractCategory', 'sContractDiscount');
      } else {
        morningDiv.style.display = 'none';
        window._contractPlanRows = null;
      }
    }
  }
  branchSel.addEventListener('change', toggleBranchFields);
  toggleBranchFields();
}

// ===== CONTRACT FIELDS (shared HTML for morning branches) =====
function contractFieldsHtml(prefix) {
  return `
        <div id="${prefix==='s' ? 'morningContractFields' : 'esMorningContractFields'}" style="display:none">
          <hr style="margin:14px 0;border-color:var(--border)">
          <div style="font-size:13px;font-weight:700;color:var(--primary-dark);margin-bottom:12px">🧾 بيانات العقد</div>

          <div class="form-row-3">
            <div class="form-group">
              <label>فئة العقد</label>
              <select id="${prefix}ContractCategory" onchange="applyContractCategory('${prefix}')">
                <option value="">— اختر الفئة —</option>
              </select>
            </div>
            <div class="form-group">
              <label>الخصم</label>
              <select id="${prefix}ContractDiscount" onchange="applyContractDiscount('${prefix}')">
                <option value="">بدون خصم</option>
              </select>
            </div>
            <div class="form-group">
              <label>الرسوم المستحقة (د.ك)</label>
              <input type="number" step="0.001" id="${prefix}FeesDue">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label>سبب الخصم (يظهر في العقد)</label>
            <input type="text" id="${prefix}CDiscountNote" placeholder="مثال: خصم الإخوة / خصم خاص...">
          </div>

          <div style="margin-bottom:10px">
            <div style="font-weight:600;font-size:12px;color:var(--primary-dark);margin-bottom:8px">📄 البيانات الإضافية للعقد</div>
            <div>
              <div class="form-row">
                <div class="form-group"><label>الجنسية</label><input type="text" id="${prefix}CNationality"></div>
                <div class="form-group"><label>الرقم المدني للطالب</label><input type="text" id="${prefix}CCivilId"></div>
              </div>
              <div class="form-row-3">
                <div class="form-group"><label>اسم الأب</label><input type="text" id="${prefix}CFatherName"></div>
                <div class="form-group"><label>وظيفة الأب</label><input type="text" id="${prefix}CFatherJob"></div>
                <div class="form-group"><label>هاتف الأب</label><input type="tel" id="${prefix}CFatherPhone"></div>
              </div>
              <div class="form-row-3">
                <div class="form-group"><label>اسم الأم</label><input type="text" id="${prefix}CMotherName"></div>
                <div class="form-group"><label>وظيفة الأم</label><input type="text" id="${prefix}CMotherJob"></div>
                <div class="form-group"><label>هاتف الأم</label><input type="tel" id="${prefix}CMotherPhone"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label>العنوان</label><input type="text" id="${prefix}CAddress"></div>
                <div class="form-group">
                  <label>الحالة الاجتماعية لولي الأمر</label>
                  <select id="${prefix}CMaritalStatus">
                    <option value="married">متزوج</option>
                    <option value="divorced">مطلق</option>
                    <option value="widow">أرمل</option>
                    <option value="single">أعزب</option>
                  </select>
                </div>
              </div>
              <div style="font-size:12px;font-weight:700;margin:10px 0 6px">👥 الأشخاص المصرح لهم بالاستلام</div>
              ${[1,2,3].map(n=>`
              <div class="form-row-3">
                <div class="form-group"><label>الاسم ${n}</label><input type="text" id="${prefix}CAuth${n}Name"></div>
                <div class="form-group"><label>صلة القرابة ${n}</label><input type="text" id="${prefix}CAuth${n}Relation"></div>
                <div class="form-group"><label>الهاتف ${n}</label><input type="tel" id="${prefix}CAuth${n}Phone"></div>
              </div>`).join('')}
              <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                  <input type="checkbox" id="${prefix}CPhotoConsent"> أوافق على التصوير
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                  <input type="checkbox" id="${prefix}CGradConsent"> أوافق على حفل التخرج
                </label>
              </div>
              <div class="form-group" style="margin-top:10px">
                <label>ملاحظات العقد (تظهر تحت جدول الأقساط)</label>
                <textarea id="${prefix}CContractNote" rows="2" style="width:100%;resize:vertical;font-size:12px;padding:6px;border:1px solid var(--border);border-radius:6px"></textarea>
              </div>
            </div>
          </div>
        </div>`;
}

// ===== COLLECT CONTRACT DATA FROM FORM =====
function collectContractData(prefix) {
  const val = (id) => document.getElementById(id)?.value || '';
  const chk = (id) => !!document.getElementById(id)?.checked;
  const catSel  = document.getElementById(prefix + 'ContractCategory');
  const discSel = document.getElementById(prefix + 'ContractDiscount');
  return {
    categoryId:     catSel?.value || '',
    discountId:     discSel?.value !== '' ? discSel?.value : '',
    feesDue:        parseFloat(val(prefix + 'FeesDue')) || 0,
    discountNote:   val(prefix + 'CDiscountNote'),
    nationality:    val(prefix + 'CNationality'),
    civilId:        val(prefix + 'CCivilId'),
    fatherName:     val(prefix + 'CFatherName'),
    fatherJob:      val(prefix + 'CFatherJob'),
    fatherPhone:    val(prefix + 'CFatherPhone'),
    motherName:     val(prefix + 'CMotherName'),
    motherJob:      val(prefix + 'CMotherJob'),
    motherPhone:    val(prefix + 'CMotherPhone'),
    address:        val(prefix + 'CAddress'),
    maritalStatus:  val(prefix + 'CMaritalStatus'),
    auth1Name:      val(prefix + 'CAuth1Name'),
    auth1Relation:  val(prefix + 'CAuth1Relation'),
    auth1Phone:     val(prefix + 'CAuth1Phone'),
    auth2Name:      val(prefix + 'CAuth2Name'),
    auth2Relation:  val(prefix + 'CAuth2Relation'),
    auth2Phone:     val(prefix + 'CAuth2Phone'),
    auth3Name:      val(prefix + 'CAuth3Name'),
    auth3Relation:  val(prefix + 'CAuth3Relation'),
    auth3Phone:     val(prefix + 'CAuth3Phone'),
    photoConsent:   chk(prefix + 'CPhotoConsent'),
    gradConsent:    chk(prefix + 'CGradConsent'),
    contractNote:   val(prefix + 'CContractNote')
  };
}

// ===== FILL CONTRACT DATA INTO FORM (edit modal) =====
function fillContractData(prefix, data) {
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
  setVal(prefix + 'CNationality',   data.nationality);
  setVal(prefix + 'CCivilId',       data.civilId);
  setVal(prefix + 'CFatherName',    data.fatherName);
  setVal(prefix + 'CFatherJob',     data.fatherJob);
  setVal(prefix + 'CFatherPhone',   data.fatherPhone);
  setVal(prefix + 'CMotherName',    data.motherName);
  setVal(prefix + 'CMotherJob',     data.motherJob);
  setVal(prefix + 'CMotherPhone',   data.motherPhone);
  setVal(prefix + 'CAddress',       data.address);
  setVal(prefix + 'CMaritalStatus', data.maritalStatus);
  setVal(prefix + 'CAuth1Name',     data.auth1Name);
  setVal(prefix + 'CAuth1Relation', data.auth1Relation);
  setVal(prefix + 'CAuth1Phone',    data.auth1Phone);
  setVal(prefix + 'CAuth2Name',     data.auth2Name);
  setVal(prefix + 'CAuth2Relation', data.auth2Relation);
  setVal(prefix + 'CAuth2Phone',    data.auth2Phone);
  setVal(prefix + 'CAuth3Name',     data.auth3Name);
  setVal(prefix + 'CAuth3Relation', data.auth3Relation);
  setVal(prefix + 'CAuth3Phone',    data.auth3Phone);
  setChk(prefix + 'CPhotoConsent',  data.photoConsent);
  setChk(prefix + 'CGradConsent',   data.gradConsent);
  setVal(prefix + 'FeesDue',        data.feesDue);
  setVal(prefix + 'CDiscountNote',  data.discountNote);
  setVal(prefix + 'CContractNote',  data.contractNote);
  // category / discount selects (set after options are populated)
  const catSel  = document.getElementById(prefix + 'ContractCategory');
  const discSel = document.getElementById(prefix + 'ContractDiscount');
  if (catSel && data.categoryId)  catSel.value  = data.categoryId;
  if (discSel && data.discountId !== '' && data.discountId !== undefined && data.discountId !== null) discSel.value = data.discountId;
  // lock fees field if a category is already applied (non-admin)
  if (data.categoryId && currentUser?.role !== 'admin') {
    const feesEl = document.getElementById(prefix==='s' ? 'sFees' : 'esFees');
    if (feesEl) feesEl.readOnly = true;
  }
}

// ===== POPULATE CONTRACT SELECTS =====
function populateContractSelects(branch, catSelId, discSelId) {
  const settings = getContractSettings();
  const bd = settings[branch] || { categories:{}, discounts:[] };
  const catSel  = document.getElementById(catSelId);
  const discSel = document.getElementById(discSelId);
  if (catSel) {
    catSel.innerHTML = '<option value="">— اختر الفئة —</option>' +
      Object.entries(bd.categories).map(([id,c]) => `<option value="${id}">${c.label}</option>`).join('');
  }
  if (discSel) {
    discSel.innerHTML = '<option value="">بدون خصم</option>' +
      bd.discounts.map((d,i) => `<option value="${i}">${d.name} (${d.type==='percent' ? d.value+'%' : d.value+' د.ك'})</option>`).join('');
  }
}

// ===== APPLY CONTRACT CATEGORY / DISCOUNT =====
function applyContractCategory(prefix) {
  const branchEl = document.getElementById(prefix==='s' ? 'sBranch' : 'esBranch');
  const branch = branchEl ? branchEl.value : '';
  const settings = getContractSettings();
  const catSel = document.getElementById(prefix + 'ContractCategory');
  const cat = settings[branch]?.categories?.[catSel?.value];
  const feesEl    = document.getElementById(prefix==='s' ? 'sFees' : 'esFees');
  const feesDueEl = document.getElementById(prefix + 'FeesDue');
  const isAdmin = currentUser?.role === 'admin';
  if (cat && feesEl) {
    // الرسوم = العرض السنوي (offerFee), الرسوم المستحقة = totalFee (display-only)
    feesEl.value = (parseFloat(cat.offerFee) || 0).toFixed(3);
    if (feesDueEl) feesDueEl.value = (parseFloat(cat.totalFee) || 0).toFixed(3);
    if (!isAdmin) feesEl.readOnly = true;
  } else if (feesEl && !isAdmin) {
    // category cleared — unlock fees field for non-admin
    feesEl.readOnly = false;
  }
  applyContractDiscount(prefix);
}

function applyContractDiscount(prefix) {
  const branchEl = document.getElementById(prefix==='s' ? 'sBranch' : 'esBranch');
  const branch = branchEl ? branchEl.value : '';
  const settings = getContractSettings();
  const bd = settings[branch] || { categories:{}, discounts:[] };

  const catSel  = document.getElementById(prefix + 'ContractCategory');
  const discSel = document.getElementById(prefix + 'ContractDiscount');
  const feesEl  = document.getElementById(prefix==='s' ? 'sFees' : 'esFees');
  const discEl  = document.getElementById(prefix==='s' ? 'sDiscount' : 'esDiscount');

  const fees = parseFloat(feesEl?.value) || 0;
  let discAmt = 0;
  const d = bd.discounts[parseInt(discSel?.value)];
  if (d) {
    discAmt = d.type === 'percent' ? fees * (parseFloat(d.value)||0) / 100 : (parseFloat(d.value)||0);
  }
  if (discEl) discEl.value = discAmt.toFixed(3);

  // store active discount info for buildInstRows to use
  window._activeDiscount = {
    amount:  discAmt,
    isGold:  !!(d?.name && /ذهب|بطاق.*ذهب|gold/i.test(d.name))
  };

  // load installment plan from the selected category, if any
  const cat = bd.categories?.[catSel?.value];
  if (cat && cat.installments && cat.installments.length) {
    instMode = 'plan';
    window._contractPlanRows = cat.installments.map(r => ({ label: r.label, amount: r.amount }));
  } else {
    instMode = 'equal';
    window._contractPlanRows = null;
  }

  if (prefix === 's') calcNet(); else calcEditNet();
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
  const tbody = document.getElementById('instRows');
  if (!tbody) return;

  // Plan mode: use the installment plan defined on the selected contract category
  if (instMode === 'plan' && window._contractPlanRows && window._contractPlanRows.length) {
    const firstDate = document.getElementById('instFirstDate')?.value || '';
    const startVal  = document.getElementById('instStart').value;
    const months    = parseInt(document.getElementById('instInterval').value) || 1;

    // Apply discount to first (gold card) or last (all others) installment
    const _disc    = window._activeDiscount || { amount: 0, isGold: false };
    const planAmts = window._contractPlanRows.map(r => parseFloat(r.amount) || 0);
    if (_disc.amount > 0) {
      const idx = _disc.isGold ? 0 : planAmts.length - 1;
      planAmts[idx] = Math.max(0, parseFloat((planAmts[idx] - _disc.amount).toFixed(3)));
    }

    let rows = '';
    window._contractPlanRows.forEach((r, i) => {
      // i=0 → تاريخ القسط الأول (يدوي), i>0 → من بداية القسط الثاني + interval
      const date = i === 0 ? firstDate : (startVal ? addMonths(startVal, months * (i - 1)) : '');
      rows += `<tr>
        <td style="padding:6px 10px;color:var(--text-muted)">${i + 1}</td>
        <td style="padding:4px 6px">
          <input type="number" class="inst-input inst-amt" value="${planAmts[i]}" step="0.001" min="0"
            style="width:110px" oninput="updateInstTotal()">
        </td>
        <td style="padding:4px 6px">
          <input type="date" class="inst-input inst-date" value="${date}">
        </td>
        <td style="padding:4px 6px">
          <input type="text" class="inst-input inst-note" value="${r.label || ''}" style="width:120px">
        </td>
        <td style="padding:4px 6px;text-align:center">
          <button onclick="this.closest('tr').remove();updateInstTotal()"
            style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:15px">🗑</button>
        </td>
      </tr>`;
    });
    tbody.innerHTML = rows;
    updateInstTotal();
    return;
  }

  const n         = parseInt(document.getElementById('instCount').value) || 1;
  const firstDate = document.getElementById('instFirstDate')?.value || '';
  const startVal  = document.getElementById('instStart').value;
  const months    = parseInt(document.getElementById('instInterval').value) || 1;
  const net       = parseFloat(document.getElementById('sNet').value) || 0;
  const base      = net > 0 ? parseFloat((net / n).toFixed(3)) : 0;
  const last      = net > 0 ? parseFloat((net - base * (n - 1)).toFixed(3)) : 0;

  let rows = '';
  for (let i = 1; i <= n; i++) {
    const amt  = instMode === 'equal' ? (i === n ? last : base) : base;
    // i=1 → تاريخ القسط الأول (يدوي), i>1 → من بداية القسط الثاني + interval
    const date = i === 1 ? firstDate : (startVal ? addMonths(startVal, months * (i - 2)) : '');
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

  // save contract data (morning branches only)
  if (isMorningBranch(branch)) {
    saveStudentContract(id, collectContractData('s'));
  }

  // save installments (bulk insert — avoids post/refetch race that can drop rows)
  const rows = document.querySelectorAll('#instRows tr');
  const instPrefix = 'I';
  const existingInstNums = (CACHE['installments']||[]).map(i => parseInt((i.id||'').replace(instPrefix,'')) || 0);
  let nextInstNum = (existingInstNums.length ? Math.max(...existingInstNums) : 0) + 1;
  const newInstallments = [];
  rows.forEach((row, idx) => {
    const amt  = parseFloat(row.querySelector('.inst-amt').value) || 0;
    const date = row.querySelector('.inst-date').value;
    const note = row.querySelector('.inst-note').value;
    if (amt > 0) {
      newInstallments.push({
        id:        instPrefix + String(nextInstNum++).padStart(3,'0'),
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
  DB.addBulk('installments', newInstallments);

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

// ===== PRINT CONTRACT (morning branches only) =====
// نص بند الشروط والأحكام الكامل (11 بنداً) + الإقرار والتوقيعات — مطابق لنماذج العقود
function getContractTermsHtml(contractData) {
  const photo = !!contractData.photoConsent;
  const grad  = !!contractData.gradConsent;

  return `
    <div class="terms-block">
      <p><b>أولاً: حجز المقعد</b></p>
      <p>يعتبر دفع رسوم التسجيل أو حجز المقعد موافقة على شروط وأحكام الحضانة، ولا تسترد رسوم الحجز بعد تأكيد التسجيل.</p>

      <p><b>ثانياً: الرسوم الدراسية</b></p>
      <ol>
        <li>يلتزم ولي الأمر بسداد الرسوم الدراسية حسب الخطة المالية المعتمدة.</li>
        <li>العرض السنوي يشمل سداد الرسوم من شهر سبتمبر إلى مارس.</li>
        <li>يمنح شهرا أبريل ومايو مجاناً للملتزمين بالسداد طوال العام.</li>
        <li>عند التأخير أو عدم الالتزام بالسداد يلغى العرض، ويلتزم ولي الأمر بسداد رسوم شهري أبريل ومايو كاملة.</li>
      </ol>

      <p><b>ثالثاً: الحضور والانصراف</b></p>
      <ol>
        <li>يلتزم ولي الأمر بمواعيد الحضور والانصراف.</li>
        <li>لا يتم تسليم الطفل إلا لولي الأمر أو للمخولين المذكورين في العقد.</li>
        <li>في حال تغيير الأشخاص المخولين يجب إشعار الإدارة كتابياً.</li>
      </ol>

      <p><b>رابعاً: المسؤولية</b></p>
      <ol>
        <li>تبدأ مسؤولية الحضانة من لحظة استلام الطفل من ولي الأمر.</li>
        <li>تنتهي مسؤولية الحضانة عند تسليم الطفل لولي الأمر أو للمخول استلامه.</li>
        <li>يتحمل ولي الأمر مسؤولية الطفل أثناء الدخول والخروج وحتى اكتمال إجراءات التسليم والاستلام.</li>
      </ol>

      <p><b>خامساً: الحالة الصحية</b></p>
      <p>يلتزم ولي الأمر بالإفصاح عن أي حالة صحية أو حساسية أو احتياجات خاصة تخص الطفل، وتزويد الحضانة بالتقارير الطبية الخاصة بالطفل مع التوصيات اللازمة.</p>

      <p><b>سادساً: الغياب والحضور</b></p>
      <p>لا يترتب على غياب الطفل أو انقطاعه لأي سبب استرداد أو خصم أي رسوم مستحقة.</p>

      <p><b>سابعاً: الانسحاب من الحضانة</b></p>
      <ol>
        <li>يجب إشعار الإدارة خطياً أو عن طريق إرسال رسالة نصية بانسحاب الطفل من الحضانة.</li>
        <li>لا تسترد الرسوم المدفوعة عن الفترات الدراسية التي بدأت بالفعل.</li>
        <li>تبقى جميع المستحقات المالية واجبة السداد حتى تاريخ الانسحاب.</li>
      </ol>

      <p><b>ثامناً: التصوير والنشر الإعلامي</b></p>
      <p>${photo ? '(✓)' : '(  )'}&nbsp; أوافق على تصوير طفلي واستخدام الصور والمقاطع المرئية في حسابات الحضانة الرسمية.</p>
      <p>${!photo ? '(✓)' : '(  )'}&nbsp; لا أوافق على تصوير طفلي أو نشر صوره أو مقاطعه المرئية.</p>

      <p><b>تاسعاً: المشاركة في حفل التخرج</b></p>
      <p>${grad ? '(✓)' : '(  )'}&nbsp; أوافق على مشاركة طفلي في حفل التخرج والفعاليات الخاصة بالحضانة.</p>
      <p>${!grad ? '(✓)' : '(  )'}&nbsp; لا أوافق على مشاركة طفلي في حفل التخرج والفعاليات الخاصة بالحضانة.</p>

      <p><b>عاشراً: الظروف الطارئة والقوة القاهرة</b></p>
      <p>في حال تعليق الدراسة أو إغلاق الحضانة بسبب قرارات حكومية أو ظروف صحية أو أمنية أو كوارث طبيعية أو أي ظروف خارجة عن إرادة الحضانة، يحق للإدارة اتخاذ الإجراءات المناسبة بما يحقق استمرارية العملية التعليمية والإدارية.</p>

      <p><b>الحادي عشر: الالتزام باللوائح</b></p>
      <p>يقر ولي الأمر بأنه اطلع على جميع الأنظمة واللوائح والسياسات الخاصة بالحضانة ويلتزم بها.</p>
      <p>جميع الخصومات والعروض المقدمة من الحضانة مشروطة باستمرار الطفل حتى نهاية الفترة المتفق عليها والالتزام الكامل بسداد الرسوم، وفي حال الانسحاب أو إيقاف التسجيل قبل انتهاء الفترة المتفق عليها يحق للحضانة إلغاء الخصم واسترداد قيمة الخصومات الممنوحة وإعادة احتساب الرسوم بالسعر الأساسي.</p>
    </div>

    <div class="ack">
      <p><b>الإقرار:</b></p>
      <p>أقر أنا ولي الأمر بأن جميع البيانات المذكورة صحيحة، وأنني قرأت العقد كاملاً ووافقت على جميع بنوده.</p>
    </div>

    <div class="sig2">
      <div>
        <div>اسم ولي الأمر: ______________________</div>
        <div style="margin-top:14px">التوقيع: ______________________</div>
        <div style="margin-top:14px">التاريخ: ___ / ___ / ______</div>
      </div>
      <div>
        <div><b>اعتماد الحضانة</b></div>
        <div style="margin-top:14px">اسم الموظف: ______________________</div>
        <div style="margin-top:14px">التوقيع: ______________________</div>
      </div>
    </div>`;
}

function printContract(studentId) {
  const s = DB.all('students').find(st => st.id === studentId);
  if (!s) { showToast('⚠️ الطالب غير موجود'); return; }
  if (!isMorningBranch(s.branch)) { showToast('⚠️ طباعة العقد متاحة للأفرع الصباحية فقط'); return; }

  const contractData = getStudentContract(studentId);
  const settings = getContractSettings();
  const bd = settings[s.branch] || { categories:{}, discounts:[], terms:'' };
  const cat      = bd.categories?.[contractData.categoryId];
  const discount = bd.discounts?.[parseInt(contractData.discountId)];
  const nursery  = DB.get('nurserySettings') || {};
  const branchName = BRANCHES[s.branch]?.name || s.branch;
  const gradeLabel  = getGrades().find(g => g.id === s.grade)?.label || s.grade || '—';

  const installments = DB.all('installments').filter(i => i.studentId === studentId);
  const instRows = installments.map((inst, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${inst.note || cat?.installments?.[i]?.label || ('قسط ' + (i + 1))}</td>
      <td>${parseFloat(inst.amount || 0).toFixed(3)} د.ك</td>
      <td>${(inst.dueDate || '').replace(/-/g,'/') || '—'}</td>
    </tr>`).join('');

  // الرسوم المستحقة (display-only) — من بيانات العقد إن وجدت، وإلا من فئة العقد
  const totalFee = (contractData.feesDue !== undefined && contractData.feesDue !== '' && contractData.feesDue !== null && !isNaN(parseFloat(contractData.feesDue)))
    ? parseFloat(contractData.feesDue) || 0
    : (cat?.totalFee != null ? cat.totalFee : (s.fees || 0));
  // العرض السنوي — من خانة الرسوم بالطالب (تم تخزينها كالعرض السنوي)
  const offerFee = (s.fees != null ? s.fees : (cat?.offerFee != null ? cat.offerFee : (s.net || 0)));
  const seatFee  = cat?.seatFee  != null ? cat.seatFee  : 0;

  const discountNote = contractData.discountNote || '';
  let discountLine = '—';
  if (discount) {
    const name = discount.name + (discountNote ? ` — ${discountNote}` : '');
    discountLine = discount.type === 'percent'
      ? `${name} (${discount.value}%)`
      : `${name} (${parseFloat(discount.value || 0).toFixed(3)} د.ك)`;
  } else if (s.discount) {
    const reason = discountNote ? ` (${discountNote})` : '';
    discountLine = `${parseFloat(s.discount).toFixed(3)} د.ك${reason}`;
  }

  const maritalLabels = { married:'متزوجان', divorced:'مطلقان', widow:'أرمل / أرملة', single:'أخرى' };
  const yearLabel = nursery.year || '2026/2027';
  const nurseryName = nursery.name || 'Personality Kids';

  // عمر الطفل من تاريخ الميلاد
  let ageLabel = '—';
  if (s.dob) {
    const b = new Date(s.dob);
    const now = new Date();
    if (!isNaN(b.getTime())) {
      let years = now.getFullYear() - b.getFullYear();
      let months = now.getMonth() - b.getMonth();
      if (now.getDate() < b.getDate()) months--;
      if (months < 0) { years--; months += 12; }
      ageLabel = `${years} سنة${months ? ' و ' + months + ' شهر' : ''}`;
    }
  }

  // عنوان العقد حسب الفئة/المرحلة
  const titleSrc = `${cat?.label || ''} ${gradeLabel || ''} ${s.grade || ''}`.toUpperCase();
  let contractTitle = cat?.label || gradeLabel || '—';
  if (titleSrc.includes('KG')) contractTitle = 'KG 1 / KG 2';
  else if (titleSrc.includes('LEVEL') || /\bL[12]\b/.test(titleSrc)) contractTitle = 'Level 1 / Level 2';

  const termsSectionHtml = getContractTermsHtml(contractData);

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>عقد تسجيل — ${s.name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;direction:rtl;font-size:13px;color:#222}
      h2{color:#1a9e6a;text-align:center;border-bottom:2px solid #1a9e6a;padding-bottom:8px;margin-bottom:6px}
      h3{color:#1a9e6a;margin:18px 0 8px}
      .sub{text-align:center;color:#555;margin-bottom:18px;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      td,th{border:1px solid #ccc;padding:8px 10px;text-align:right}
      th{background:#f0f0f0;width:30%;font-weight:600}
      .fee-table th{background:#e8f5ee}
      ol.terms{padding-right:20px;line-height:1.9}
      ol.terms li{margin-bottom:6px}
      .tagline{text-align:center;color:#1a9e6a;font-weight:700;margin-bottom:14px}
      .terms-block p{margin:8px 0;line-height:1.8}
      .terms-block ol{padding-right:24px;line-height:1.9;margin:6px 0}
      .terms-block ol li{margin-bottom:4px}
      .ack{margin-top:18px;background:#f7f7f5;border-radius:8px;padding:10px 14px}
      .sig2{display:flex;justify-content:space-between;gap:30px;margin-top:30px;line-height:2.4}
      .sig2 > div{flex:1}
      @media print{.no-print{display:none}}
    </style></head><body>

    <h2>🌟 ${nurseryName} — عقد تسجيل طفل "${contractTitle}"</h2>
    <div class="sub">الفرع: ${branchName} &nbsp;|&nbsp; المرحلة: ${gradeLabel} &nbsp;|&nbsp; العام الدراسي: ${yearLabel}</div>
    <div class="tagline">هدفنا: طفل قوي ومتعلم</div>

    <h3>أولاً: بند البيانات</h3>
    <table>
      <tr><th>اسم الطالب</th><td><b>${s.name}</b></td><th>الكود</th><td>${s.id}</td></tr>
      <tr><th>تاريخ الميلاد</th><td>${(s.dob||'').replace(/-/g,'/')||'—'}</td><th>العمر</th><td>${ageLabel}</td></tr>
      <tr><th>الجنسية</th><td>${contractData.nationality||'—'}</td><th>الرقم المدني</th><td>${contractData.civilId||'—'}</td></tr>
      <tr><th>اسم الأب</th><td>${contractData.fatherName||'—'}</td><th>هاتف الأب</th><td>${contractData.fatherPhone || s.phone1 || '—'}</td></tr>
      <tr><th>العمل والجهة (الأب)</th><td>${contractData.fatherJob||'—'}</td><th>اسم الأم</th><td>${contractData.motherName||'—'}</td></tr>
      <tr><th>هاتف الأم</th><td>${contractData.motherPhone || s.phone2 || '—'}</td><th>العمل والجهة (الأم)</th><td>${contractData.motherJob||'—'}</td></tr>
      <tr><th>عنوان السكن</th><td colspan="3">${contractData.address||'—'}</td></tr>
      <tr><th>حالة الأم والأب</th><td colspan="3">${maritalLabels[contractData.maritalStatus]||'—'}</td></tr>
    </table>

    <h4 style="margin:10px 0 6px">الأشخاص المخول لهم استلام الطفل</h4>
    <table>
      <thead><tr><th style="width:33%">الاسم</th><th style="width:34%">صلة القرابة</th><th>الهاتف</th></tr></thead>
      <tbody>
        <tr><td>${contractData.auth1Name||'—'}</td><td>${contractData.auth1Relation||'—'}</td><td>${contractData.auth1Phone||'—'}</td></tr>
        <tr><td>${contractData.auth2Name||'—'}</td><td>${contractData.auth2Relation||'—'}</td><td>${contractData.auth2Phone||'—'}</td></tr>
        <tr><td>${contractData.auth3Name||'—'}</td><td>${contractData.auth3Relation||'—'}</td><td>${contractData.auth3Phone||'—'}</td></tr>
      </tbody>
    </table>

    <h3>ثانياً: بند الرسوم والأقساط المجدولة</h3>
    <table class="fee-table">
      <tr><th>الرسوم المستحقة</th><td>${parseFloat(totalFee).toFixed(3)} د.ك</td><th>العرض السنوي</th><td><b>${parseFloat(offerFee).toFixed(3)} د.ك</b></td></tr>
      <tr><th>الخصم</th><td colspan="3">${discountLine}</td></tr>
      <tr><th>الصافي المستحق</th><td colspan="3"><b style="font-size:15px">${parseFloat(s.net || offerFee).toFixed(3)} د.ك</b></td></tr>
    </table>
    <p style="margin:-4px 0 8px">خلال الفترة من سبتمبر (9) إلى مارس (3)، ضمن خطة دفع معتمدة:</p>
    <table class="fee-table">
      <thead><tr><th>#</th><th>البند</th><th>المبلغ</th><th>تاريخ الاستحقاق</th></tr></thead>
      <tbody>${instRows || '<tr><td colspan="4" style="text-align:center;color:#999">لا توجد أقساط</td></tr>'}</tbody>
    </table>
    ${contractData.contractNote ? `<p style="margin:6px 0 12px;font-size:12px;color:#555">${contractData.contractNote}</p>` : ''}

    <h3>ثالثاً: بند الشروط والأحكام</h3>
    ${termsSectionHtml}

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

        ${contractFieldsHtml('es')}

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

  // toggle evening / contract fields when branch changes
  function toggleEditBranchFields() {
    const branch = document.getElementById('esBranch').value;
    document.getElementById('esEveningFields').style.display = isEveningBranch(branch) ? 'block' : 'none';
    const morningDiv = document.getElementById('esMorningContractFields');
    if (morningDiv) {
      if (isMorningBranch(branch)) {
        morningDiv.style.display = '';
        populateContractSelects(branch, 'esContractCategory', 'esContractDiscount');
      } else {
        morningDiv.style.display = 'none';
      }
    }
  }
  document.getElementById('esBranch').addEventListener('change', toggleEditBranchFields);
  toggleEditBranchFields();

  // pre-fill existing contract data (morning branches)
  if (isMorningBranch(s.branch)) {
    fillContractData('es', getStudentContract(id));
  }
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

  // save contract data (morning branches only)
  if (isMorningBranch(esBranch)) {
    saveStudentContract(id, collectContractData('es'));
  }

  // Update installments: delete removed ones, update/insert the rest
  const allInst = DB.all('installments');
  const originalStudentInst = allInst.filter(i => i.studentId === id);
  const remainingOther = allInst.filter(i => i.studentId !== id);

  const rows = document.querySelectorAll('#instRows tr');
  const newInst = [];
  const newInstRows = [];
  const seenIds = new Set();
  const instPrefix = 'I';
  const existingInstNums = allInst.map(i => parseInt((i.id||'').replace(instPrefix,'')) || 0);
  let nextInstNum = (existingInstNums.length ? Math.max(...existingInstNums) : 0) + 1;

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
        id:        instPrefix + String(nextInstNum++).padStart(3,'0'),
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
      newInstRows.push(ni);
    }
  });

  // bulk insert new installments (avoids post/refetch race that can drop rows)
  DB.addBulk('installments', newInstRows);

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
  'اسبوعي':'weekly', 'weekly':'weekly',
  'يومي':'daily',   'daily':'daily'
};

function downloadStudentTemplate() {
  const headers = ['الاسم','الفرع','المرحلة','هاتف 1','هاتف 2','تاريخ الميلاد','تاريخ المباشرة','الرسوم','الخصم','نوع الاشتراك','انتهاء الاشتراك','ملاحظات'];
  const example = ['محمد احمد','اشبيلية مسائي','حضانة','12345678','','2022-01-15','2026-06-01','50','0','شهري','2026-07-01',''];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = headers.map(()=>({wch:18}));
  XLSX.utils.book_append_sheet(wb, ws, 'طلاب');
  XLSX.writeFile(wb, 'قالب_استيراد_طلاب.xlsx');
}

function importStudentsExcel() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.xlsx,.xls,.csv';
  inp.onchange = e => processImportFile(e.target.files[0]);
  inp.click();
}

function processImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'array', cellDates:true});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
    if (!rows.length) { showToast('الملف فارغ'); return; }

    const students = rows.map((r,i) => {
      const name       = (r['الاسم']||'').toString().trim();
      const branchRaw  = (r['الفرع']||'').toString().trim();
      const branch     = BRANCH_NAME_MAP[branchRaw] || branchRaw;
      const gradeRaw   = (r['المرحلة']||'').toString().trim();
      const grade      = gradeRaw.startsWith('KG1')?'KG1':gradeRaw.startsWith('KG2')?'KG2':'nursery';
      const phone1     = (r['هاتف 1']||r['هاتف1']||'').toString().trim();
      const phone2     = (r['هاتف 2']||r['هاتف2']||'').toString().trim();
      const dob        = fmtImportDate(r['تاريخ الميلاد']);
      const startDate  = fmtImportDate(r['تاريخ المباشرة']);
      const fees       = parseFloat(r['الرسوم'])||0;
      const discount   = parseFloat(r['الخصم'])||0;
      const net        = fees - discount;
      const subTypeRaw = (r['نوع الاشتراك']||'').toString().trim();
      const subType    = SUB_TYPE_MAP[subTypeRaw] || (isEveningBranch(branch)?'monthly':'');
      const subEnd     = fmtImportDate(r['انتهاء الاشتراك']);
      const notes      = (r['ملاحظات']||'').toString().trim();
      const errors = [];
      if (!name)   errors.push('الاسم مطلوب');
      if (!branch || !BRANCHES[branch]) errors.push('فرع غير صحيح: '+branchRaw);
      if (!fees)   errors.push('الرسوم مطلوبة');
      return { _row:i+2, name, branch, grade, phone1, phone2, dob, startDate, fees, discount, net, subType, subEnd, notes, errors };
    });

    showImportPreview(students);
  };
  reader.readAsArrayBuffer(file);
}

function fmtImportDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  const s = v.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return s;
}

function showImportPreview(students) {
  const validCount   = students.filter(s=>!s.errors.length).length;
  const invalidCount = students.filter(s=>s.errors.length).length;
  const rows = students.map(s => `
    <tr style="${s.errors.length?'background:#fff3f3':''}">
      <td>${s._row}</td>
      <td>${s.name||'—'}</td>
      <td>${(BRANCHES[s.branch]||{}).name||s.branch||'—'}</td>
      <td>${s.grade==='nursery'?'حضانة':s.grade}</td>
      <td>${s.phone1||'—'}</td>
      <td>${s.startDate||'—'}</td>
      <td>${s.fees}</td>
      <td style="color:var(--danger);font-size:12px">${s.errors.join(', ')}</td>
    </tr>`).join('');

  const html = `
  <div id="modal-import" class="modal-overlay open">
    <div class="modal" style="max-width:900px">
      <div class="modal-header">
        <div class="modal-title">معاينة الاستيراد — ${students.length} طالب</div>
        <button class="modal-close" onclick="document.getElementById('modal-import').remove()">x</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div style="margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <span class="badge badge-green">سيُستورد: ${validCount}</span>
          ${invalidCount?'<span class="badge badge-red">بيانات ناقصة: '+invalidCount+'</span>':''}
        </div>
        <div style="overflow:auto;max-height:400px">
          <table class="data-table" style="font-size:13px">
            <thead><tr>
              <th>#</th><th>الاسم</th><th>الفرع</th><th>المرحلة</th>
              <th>هاتف</th><th>المباشرة</th><th>الرسوم</th><th>ملاحظة</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('modal-import').remove()">إلغاء</button>
        ${validCount ? '<button class="btn btn-primary" onclick="confirmImportStudents()">استيراد '+validCount+' طالب</button>' : ''}
      </div>
    </div>
  </div>`;
  window._importPending = students;
  document.body.insertAdjacentHTML('beforeend', html);
}

function confirmImportStudents(students) {
  if (!students) students = window._importPending || [];
  const valid = students.filter(s => !s.errors || !s.errors.length);
  let count = 0;
  valid.forEach(s => {
    const id = DB.nextId('students', 'S');
    DB.add('students', {
      id,
      name:             s.name,
      branch:           s.branch,
      grade:            s.grade,
      phone1:           s.phone1||'',
      phone2:           s.phone2||'',
      dob:              s.dob||'',
      startDate:        s.startDate||'',
      joinDate:         s.startDate||'',
      fees:             s.fees,
      discount:         s.discount||0,
      net:              s.net||s.fees,
      paid:             0,
      notes:            s.notes||'',
      enrollStatus:     isEveningBranch(s.branch)?'active':'',
      subscriptionType: s.subType||'',
      subscriptionEnd:  s.subEnd||'',
      withdrawDate:     ''
    });
    count++;
  });
  document.getElementById('modal-import').remove();
  showToast('تم استيراد ' + count + ' طالب');
  renderStudentsTable(activeGrade);
}

window.printContract            = printContract;
window.applyContractCategory    = applyContractCategory;
window.applyContractDiscount    = applyContractDiscount;
window.openAddStudent          = openAddStudent;
window.openStudentInstallments = openStudentInstallments;
window.openEditStudent         = openEditStudent;
window.saveEditStudent         = saveEditStudent;
window.openRefundModal         = openRefundModal;
window.saveRefund              = saveRefund;
window.deleteRefund            = deleteRefund;
window.viewRefundAttachment    = viewRefundAttachment;
window.importStudentsExcel     = importStudentsExcel;
window.downloadStudentTemplate = downloadStudentTemplate;
window.confirmImportStudents   = confirmImportStudents;
