// ============================================================
// APP-LICENSES.JS  —  License management
// ============================================================

function renderLicenses() {
  const cont = document.getElementById('page-licenses');
  if (!cont) return;

  // Licenses are admin-only
  if (currentUser?.role !== 'admin') {
    cont.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <h3 style="color:var(--danger)">صلاحية مقيدة</h3>
      <p style="color:var(--text-muted)">التراخيص متاحة للمدير العام فقط</p>
    </div>`;
    return;
  }

  const licenses = DB.all('licenses');

  cont.innerHTML = `
    <div class="filter-bar" style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="openAddLicense()">➕ إضافة ترخيص</button>
      <button class="btn btn-outline" onclick="exportLicensesExcel()">📥 Excel</button>
      <button class="btn btn-outline" onclick="printLicensesReport()">🖨️ طباعة</button>
    </div>
    <div id="licenseCards" class="license-grid"></div>

    <!-- Add/Edit License Modal -->
    <div class="modal-overlay" id="licModal">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <h3 id="licModalTitle">إضافة ترخيص</h3>
          <button class="modal-close" onclick="closeModal('licModal')">✕</button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="licId">
          <div class="form-group">
            <label>اسم الترخيص *</label>
            <input id="licName" class="form-control" placeholder="مثال: ترخيص وزارة التربية">
          </div>
          <div class="form-group">
            <label>الجهة المصدرة</label>
            <input id="licIssuer" class="form-control" placeholder="وزارة التربية والتعليم">
          </div>
          <div class="form-group">
            <label>الفرع</label>
            <select id="licBranch" class="form-control">
              <option value="all">كل الفروع</option>
              <option value="esh">اشبيلية</option>
              <option value="sol">الصليبخات</option>
              <option value="mat">المطلاع</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>تاريخ الإصدار</label>
              <input id="licIssueDate" class="form-control" type="date">
            </div>
            <div class="form-group">
              <label>تاريخ الانتهاء *</label>
              <input id="licExpiry" class="form-control" type="date" onchange="calcLicDays()">
            </div>
          </div>
          <div class="form-group">
            <label>ملاحظات</label>
            <textarea id="licNotes" class="form-control" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
          </div>
          <div id="licDaysInfo" style="margin-top:8px;font-weight:600;font-size:14px"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveLicense()">💾 حفظ</button>
          <button class="btn btn-outline" onclick="closeModal('licModal')">إلغاء</button>
        </div>
      </div>
    </div>

    <!-- Reminder Modal -->
    <div class="modal-overlay" id="reminderModal">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h3>إعدادات التذكير</h3>
          <button class="modal-close" onclick="closeModal('reminderModal')">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-muted);margin-bottom:16px">اختر متى تريد استلام تذكيرات انتهاء التراخيص:</p>
          <div id="reminderOptions">
            ${[90,60,30,14,7].map(d => `
              <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer">
                <input type="checkbox" id="rem${d}" ${getReminderDays().includes(d)?'checked':''}>
                <span>قبل <b>${d}</b> يوم</span>
              </label>`).join('')}
          </div>
          <hr>
          <p style="font-size:13px;color:var(--text-muted)">سيتم إرسال التذكيرات عبر WhatsApp إلى المسؤول المعتمد.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="saveReminderSettings()">💾 حفظ الإعدادات</button>
          <button class="btn btn-outline" onclick="closeModal('reminderModal')">إلغاء</button>
        </div>
      </div>
    </div>
  `;

  renderLicenseCards();
}

function getReminderDays() {
  return DB.get('licenseReminderDays') || [30, 7];
}

function renderLicenseCards() {
  const licenses = filterByBranch(DB.all('licenses'));
  const cont = document.getElementById('licenseCards');
  if (!cont) return;

  if (!licenses.length) {
    cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">لا توجد تراخيص مضافة</div>`;
    return;
  }

  cont.innerHTML = licenses.map(l => {
    const st = licenseStatus(l);
    const d  = daysUntil(l.expiryDate);
    const daysText = d < 0
      ? `منتهي منذ ${Math.abs(d)} يوم`
      : d === 0 ? 'ينتهي اليوم!'
      : `ينتهي خلال ${d} يوم`;

    return `
      <div class="license-card ${st.card}">
        <div class="lc-header">
          <span class="lc-icon">${d < 0 ? '🔴' : d < 30 ? '🟡' : '🟢'}</span>
          <span class="badge ${st.cls}">${st.label}</span>
        </div>
        <div class="lc-name">${l.name}</div>
        <div class="lc-issuer">${l.issuer || '—'}</div>
        <div class="lc-branch"><span class="badge ${BRANCHES[l.branch]?.badge||'badge-gray'}">${BRANCHES[l.branch]?.name||l.branch}</span></div>
        <div class="lc-dates">
          <div><span style="color:var(--text-muted)">إصدار:</span> ${fmtDate(l.issueDate)||'—'}</div>
          <div><span style="color:var(--text-muted)">انتهاء:</span> <b>${fmtDate(l.expiryDate)}</b></div>
        </div>
        <div class="lc-days ${d<0?'text-danger':d<30?'text-warning':'text-success'}">${daysText}</div>
        ${l.notes ? `<div class="lc-notes">${l.notes}</div>` : ''}
        <div class="lc-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditLicense('${l.id}')">✏️ تعديل</button>
          <button class="btn btn-outline btn-sm" onclick="sendLicenseReminder('${l.id}')">📲 تذكير</button>
          <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="deleteLicense('${l.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');

  // Summary bar
  const all = DB.all('licenses');
  const expired  = all.filter(l => daysUntil(l.expiryDate) < 0).length;
  const expiring = all.filter(l => { const d=daysUntil(l.expiryDate); return d>=0&&d<60; }).length;
  const good     = all.length - expired - expiring;

  const summary = document.createElement('div');
  summary.style.cssText = 'grid-column:1/-1;display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px';
  summary.innerHTML = `
    <div class="stat-card" style="flex:1;min-width:160px">
      <div class="stat-icon">📜</div>
      <div><div class="stat-value" style="color:var(--primary)">${all.length}</div><div class="stat-label">إجمالي التراخيص</div></div>
    </div>
    <div class="stat-card" style="flex:1;min-width:160px">
      <div class="stat-icon">✅</div>
      <div><div class="stat-value" style="color:var(--primary)">${good}</div><div class="stat-label">سارية</div></div>
    </div>
    <div class="stat-card" style="flex:1;min-width:160px">
      <div class="stat-icon">⚠️</div>
      <div><div class="stat-value" style="color:var(--accent)">${expiring}</div><div class="stat-label">تنتهي قريباً</div></div>
    </div>
    <div class="stat-card" style="flex:1;min-width:160px">
      <div class="stat-icon">🔴</div>
      <div><div class="stat-value" style="color:var(--danger)">${expired}</div><div class="stat-label">منتهية</div></div>
    </div>
    <button class="btn btn-outline" style="align-self:center" onclick="openModal('reminderModal')">🔔 إعدادات التذكير</button>
  `;
  cont.prepend(summary);
}

function calcLicDays() {
  const expiry = document.getElementById('licExpiry').value;
  const info   = document.getElementById('licDaysInfo');
  if (!expiry) { info.textContent = ''; return; }
  const d = daysUntil(expiry);
  if (d < 0)
    info.innerHTML = `<span style="color:var(--danger)">⚠️ هذا التاريخ قد مضى منذ ${Math.abs(d)} يوم</span>`;
  else if (d < 30)
    info.innerHTML = `<span style="color:var(--accent)">⚠️ ينتهي خلال ${d} يوم فقط!</span>`;
  else
    info.innerHTML = `<span style="color:var(--primary)">✅ ينتهي بعد ${d} يوم</span>`;
}

function openAddLicense() {
  document.getElementById('licModalTitle').textContent = 'إضافة ترخيص';
  document.getElementById('licId').value = '';
  ['licName','licIssuer','licNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('licIssueDate').value = '';
  document.getElementById('licExpiry').value = '';
  document.getElementById('licBranch').value = currentBranch !== 'all' ? currentBranch : 'all';
  document.getElementById('licDaysInfo').textContent = '';
  openModal('licModal');
}

function openEditLicense(id) {
  const l = DB.all('licenses').find(x => x.id === id);
  if (!l) return;
  document.getElementById('licModalTitle').textContent = 'تعديل ترخيص';
  document.getElementById('licId').value      = l.id;
  document.getElementById('licName').value    = l.name;
  document.getElementById('licIssuer').value  = l.issuer || '';
  document.getElementById('licBranch').value  = l.branch || 'all';
  document.getElementById('licIssueDate').value = l.issueDate || '';
  document.getElementById('licExpiry').value  = l.expiryDate;
  document.getElementById('licNotes').value   = l.notes || '';
  calcLicDays();
  openModal('licModal');
}

function saveLicense() {
  const name   = document.getElementById('licName').value.trim();
  const expiry = document.getElementById('licExpiry').value;
  if (!name || !expiry) { showToast('❌ اسم الترخيص وتاريخ الانتهاء مطلوبان'); return; }

  const data = {
    name,
    issuer:     document.getElementById('licIssuer').value.trim(),
    branch:     document.getElementById('licBranch').value,
    issueDate:  document.getElementById('licIssueDate').value,
    expiryDate: expiry,
    notes:      document.getElementById('licNotes').value.trim()
  };

  const id = document.getElementById('licId').value;
  if (id) DB.update('licenses', id, data);
  else    DB.add('licenses', { id: DB.nextId('licenses','LIC'), ...data });

  closeModal('licModal');
  showToast('✅ تم حفظ الترخيص');
  renderLicenseCards();
}

function deleteLicense(id) {
  if (!confirm('هل تريد حذف هذا الترخيص؟')) return;
  DB.remove('licenses', id);
  showToast('🗑️ تم الحذف');
  renderLicenseCards();
}

function sendLicenseReminder(id) {
  const l = DB.all('licenses').find(x => x.id === id);
  if (!l) return;
  const d = daysUntil(l.expiryDate);
  const msg = d < 0
    ? `تنبيه: ترخيص "${l.name}" منتهي منذ ${Math.abs(d)} يوم. يرجى التجديد فوراً.`
    : `تذكير: ترخيص "${l.name}" ينتهي خلال ${d} يوم بتاريخ ${fmtDate(l.expiryDate)}.`;
  showToast('📲 تم إرسال التذكير: ' + l.name);
  console.log('[WhatsApp Reminder]', msg);
}

function saveReminderSettings() {
  const days = [90,60,30,14,7].filter(d => document.getElementById('rem'+d)?.checked);
  DB.set('licenseReminderDays', days);
  closeModal('reminderModal');
  showToast('✅ تم حفظ إعدادات التذكير');
}

function exportLicensesExcel() {
  const rows = DB.all('licenses').map(l => {
    const st = licenseStatus(l);
    return {
      'اسم الترخيص':  l.name,
      'الجهة المصدرة': l.issuer || '—',
      'الفرع':         BRANCHES[l.branch]?.name || l.branch,
      'تاريخ الإصدار': fmtDate(l.issueDate) || '—',
      'تاريخ الانتهاء': fmtDate(l.expiryDate),
      'الأيام المتبقية': daysUntil(l.expiryDate),
      'الحالة':         st.label,
      'ملاحظات':        l.notes || ''
    };
  });
  xlsxExport(rows, 'licenses');
}

function printLicensesReport() {
  const rows = DB.all('licenses').map(l => {
    const st = licenseStatus(l);
    const d  = daysUntil(l.expiryDate);
    return [l.name, l.issuer||'—', BRANCHES[l.branch]?.name||l.branch,
            fmtDate(l.expiryDate), d < 0 ? `منتهي (${Math.abs(d)} يوم)` : `${d} يوم`, st.label];
  });
  printReport('تقرير التراخيص',
    ['اسم الترخيص','الجهة المصدرة','الفرع','تاريخ الانتهاء','المتبقي','الحالة'], rows);
}
