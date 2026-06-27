// ============================================================
// APP-MESSAGES.JS — WhatsApp bulk messages + Auto-reply
// ============================================================

const MSG_TEMPLATES = {
  reminder: 'عزيزي ولي الأمر،\nنود إعلامكم بأن القسط المستحق لم يتم سداده.\nنرجو التكرم بالسداد في أقرب وقت.\nمع تحيات Personality Kids 🌟',
  absent:   'عزيزي ولي الأمر،\nنُحيطكم علماً بغياب {الاسم} اليوم.\nنأمل أن يكون بصحة وعافية.\nPersonality Kids 💚',
  event:    'يسعدنا دعوتكم لحضور {الفعالية}.\nننتظر مشاركتكم الكريمة 🎉\nPersonality Kids',
  holiday:  'عزيزي ولي الأمر،\nنُعلمكم بإجازة الروضة بمناسبة {المناسبة}.\nنتمنى لكم إجازة سعيدة 🌸'
};

let selectedPhones = new Set();
let mediaFiles     = [];

// ===== MESSAGES PAGE =====
function renderMessages() {
  const students = filterByBranch(DB.all('students'));

  document.getElementById('messagesContent').innerHTML = `
    <!-- Left: compose -->
    <div class="card">
      <div class="card-title">✍️ إعداد وإرسال رسالة جماعية</div>

      <div class="form-row">
        <div class="form-group"><label>الفرع</label>
          <select id="msgBranch" onchange="filterMsgContacts()">
            <option value="all">كل الفروع</option>
            <option value="esh">اشبيلية</option>
            <option value="sol">الصليبخات</option>
            <option value="mat">المطلاع</option>
          </select>
        </div>
        <div class="form-group"><label>المرحلة</label>
          <select id="msgGrade" onchange="filterMsgContacts()">
            <option value="all">كل المراحل</option>
            <option value="nursery">حضانة</option>
            <option value="KG1">KG1</option>
            <option value="KG2">KG2</option>
          </select>
        </div>
      </div>

      <div class="form-group"><label>قوالب سريعة</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="useTpl('reminder')">📅 تذكير قسط</button>
          <button class="btn btn-outline btn-sm" onclick="useTpl('absent')">📋 غياب</button>
          <button class="btn btn-outline btn-sm" onclick="useTpl('event')">🎉 فعالية</button>
          <button class="btn btn-outline btn-sm" onclick="useTpl('holiday')">🏖️ إجازة</button>
        </div>
      </div>

      <div class="form-group">
        <label>نص الرسالة</label>
        <textarea id="msgText" rows="5" placeholder="اكتب نص الرسالة..."
          oninput="document.getElementById('msgCharCount').textContent=this.value.length+' حرف'"></textarea>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span id="msgCharCount" style="font-size:11px;color:var(--text-muted)">0 حرف</span>
          <span id="msgSelCount" style="font-size:11px;color:var(--text-muted)">0 محدد</span>
        </div>
      </div>

      <div class="form-group">
        <label>إرفاق صور / فيديوهات</label>
        <div class="upload-zone" onclick="document.getElementById('msgMedia').click()">
          📎 اضغط لرفع صور أو فيديوهات
          <div style="font-size:11px;margin-top:4px">JPG, PNG, MP4 — حتى 50MB</div>
        </div>
        <input type="file" id="msgMedia" style="display:none" accept="image/*,video/*" multiple
          onchange="previewMsgMedia(this)">
        <div id="msgMediaPreview" class="media-preview"></div>
      </div>

      <div class="form-group" style="margin-bottom:10px">
        <label style="margin-bottom:4px">📱 الرقم المرسل (مشرف الفرع)</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="msgSenderNumber" class="form-control" placeholder="965XXXXXXXX"
            style="flex:1" oninput="updateSenderDisplay()">
          <button class="btn btn-outline btn-sm" onclick="loadBranchSenderNumber()" title="تحميل رقم الفرع المحدد">🔄 تحميل</button>
        </div>
        <div id="msgSenderInfo" style="font-size:11px;color:var(--text-muted);margin-top:3px"></div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="selectAllMsg(true)">✅ تحديد الكل</button>
        <button class="btn btn-outline btn-sm" onclick="selectAllMsg(false)">☐ إلغاء الكل</button>
        <button class="btn btn-info btn-sm" onclick="selectLateOnly()">⏰ المتأخرين فقط</button>
      </div>

      <button class="btn btn-primary" style="width:100%" onclick="sendBulkMsg()">
        📤 إرسال عبر واتساب (<span id="msgSendCount">0</span>)
      </button>
      <div id="msgProgressWrap" style="display:none;margin-top:10px">
        <div class="progress-bar"><div class="progress-fill" id="msgBar" style="width:0%;transition:width .4s"></div></div>
        <div id="msgProgressText" style="text-align:center;font-size:12px;margin-top:6px;color:var(--text-muted)"></div>
      </div>
    </div>

    <!-- Right: contacts -->
    <div class="card">
      <div class="card-title">
        📋 أولياء الأمور
        <span id="contactBadge" class="badge badge-green" style="margin-right:4px">${students.length}</span>
      </div>
      <div id="msgContactsList" style="max-height:500px;overflow-y:auto"></div>
    </div>`;

  renderMsgContacts(students);
  // تحميل رقم الفرع الافتراضي بعد رسم الصفحة
  setTimeout(loadBranchSenderNumber, 50);
}

function renderMsgContacts(list) {
  selectedPhones.clear();
  document.getElementById('msgContactsList').innerHTML = list.map(s => {
    const st   = studentStatus(s);
    const avatar = s.name[0];
    return `<div class="contact-item" onclick="toggleMsgContact('${s.id}',this)">
      <input type="checkbox" id="msgChk${s.id}" onchange="updateMsgCount()">
      <div class="contact-avatar">${avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.phone1}${s.phone2?' · '+s.phone2:''}</div>
      </div>
      <span class="badge ${st.cls}">${st.label}</span>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted)">لا توجد جهات اتصال</div>';

  document.getElementById('contactBadge').textContent = list.length;
}

function toggleMsgContact(id, row) {
  if (event.target.type === 'checkbox') return;
  const chk = document.getElementById('msgChk' + id);
  chk.checked = !chk.checked;
  updateMsgCount();
}

function updateMsgCount() {
  const n = document.querySelectorAll('#msgContactsList input[type=checkbox]:checked').length;
  document.getElementById('msgSelCount').textContent  = n + ' محدد';
  document.getElementById('msgSendCount').textContent = n;
}

function selectAllMsg(val) {
  document.querySelectorAll('#msgContactsList input[type=checkbox]').forEach(c => c.checked = val);
  updateMsgCount();
}

function selectLateOnly() {
  document.querySelectorAll('#msgContactsList input[type=checkbox]').forEach(c => c.checked = false);
  DB.all('students').filter(s => studentStatus(s).label === 'جزئي' || studentStatus(s).label === 'لم يُسدَّد')
    .forEach(s => { const c = document.getElementById('msgChk' + s.id); if (c) c.checked = true; });
  updateMsgCount();
}

function useTpl(key) {
  document.getElementById('msgText').value = MSG_TEMPLATES[key];
  document.getElementById('msgCharCount').textContent = MSG_TEMPLATES[key].length + ' حرف';
}

function previewMsgMedia(input) {
  const wrap = document.getElementById('msgMediaPreview');
  Array.from(input.files).forEach(file => {
    mediaFiles.push(file);
    const div = document.createElement('div');
    div.className = 'media-thumb-wrap';
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.className = 'media-thumb';
      img.src = URL.createObjectURL(file);
      div.appendChild(img);
    } else {
      div.innerHTML = '<div class="media-thumb" style="background:#222;display:flex;align-items:center;justify-content:center;font-size:22px">▶️</div>';
    }
    const rm = document.createElement('button');
    rm.className = 'media-remove';
    rm.textContent = '✕';
    rm.onclick = () => { div.remove(); mediaFiles = mediaFiles.filter(f => f !== file); };
    div.appendChild(rm);
    wrap.appendChild(div);
  });
  input.value = '';
}

function loadBranchSenderNumber() {
  const branchEl = document.getElementById('msgBranch');
  const branch   = branchEl ? branchEl.value : 'all';
  const s        = DB.get('nurserySettings') || {};
  const branchWa = s.branchWaNumbers || {};
  const senderEl = document.getElementById('msgSenderNumber');
  const infoEl   = document.getElementById('msgSenderInfo');
  if (!senderEl) return;

  // حاول رقم الفرع المحدد، ثم رقم المشرف الحالي، ثم الرقم الرئيسي
  let num = '';
  let label = '';
  if (branch !== 'all' && branchWa[branch]) {
    num   = branchWa[branch];
    label = `رقم فرع ${BRANCHES[branch]?.name || branch}`;
  } else if (currentUser?.branch && currentUser.branch !== 'all' && branchWa[currentUser.branch]) {
    num   = branchWa[currentUser.branch];
    label = `رقم فرعك (${BRANCHES[currentUser.branch]?.name || currentUser.branch})`;
  } else if (s.waNumber) {
    num   = s.waNumber;
    label = 'الرقم الرئيسي للروضة';
  }

  senderEl.value = num;
  if (infoEl) infoEl.textContent = label ? `📍 ${label}` : 'لم يُضبط رقم — أدخله يدوياً أو احفظه في الإعدادات';
}

function updateSenderDisplay() {
  const infoEl = document.getElementById('msgSenderInfo');
  if (infoEl) infoEl.textContent = '✏️ رقم مخصص';
}

function filterMsgContacts() {
  const branch = document.getElementById('msgBranch').value;
  const grade  = document.getElementById('msgGrade').value;
  let list = DB.all('students');
  if (branch !== 'all') list = list.filter(s => s.branch === branch);
  if (grade  !== 'all') list = list.filter(s => s.grade  === grade);
  renderMsgContacts(list);
  loadBranchSenderNumber();
}

function sendBulkMsg() {
  const msg        = document.getElementById('msgText').value.trim();
  const senderNum  = (document.getElementById('msgSenderNumber')?.value || '').replace(/\D/g,'');
  const checked    = document.querySelectorAll('#msgContactsList input[type=checkbox]:checked');

  if (!msg)            { showToast('⚠️ اكتب نص الرسالة أولاً'); return; }
  if (!checked.length) { showToast('⚠️ حدد مستلماً واحداً على الأقل'); return; }
  if (!senderNum)      { showToast('⚠️ أدخل رقم واتساب المرسل أولاً'); return; }

  // جمع أرقام المستلمين
  const students = DB.all('students');
  const phones = [];
  checked.forEach(chk => {
    const sid = chk.id.replace('msgChk','');
    const st  = students.find(s => s.id === sid);
    if (!st) return;
    [st.phone1, st.phone2].forEach(p => {
      if (p) {
        const clean = p.replace(/\D/g,'');
        if (clean && !phones.includes(clean)) phones.push(clean);
      }
    });
  });

  if (!phones.length) { showToast('⚠️ لا توجد أرقام هاتف للمستلمين المحددين'); return; }

  const total = phones.length;
  const wrap  = document.getElementById('msgProgressWrap');
  const bar   = document.getElementById('msgBar');
  const txt   = document.getElementById('msgProgressText');
  wrap.style.display = 'block';
  bar.style.width    = '0%';

  const encodedMsg = encodeURIComponent(msg);
  let done = 0;

  function sendNext() {
    if (done >= total) {
      txt.textContent = `✅ تم فتح ${total} محادثة واتساب`;
      showToast(`✅ تم فتح ${total} محادثة واتساب`);
      setTimeout(() => { wrap.style.display='none'; bar.style.width='0%'; }, 5000);
      return;
    }
    const phone = phones[done];
    done++;
    bar.style.width = (done / total * 100) + '%';
    txt.textContent = `جارٍ الفتح… ${done} من ${total}`;

    // فتح واتساب ويب للرقم المستلم (الإرسال يكون من الحساب المفتوح على المتصفح)
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;
    window.open(url, '_blank');

    // تأخير ثانيتين بين كل رسالة لتجنب الحجب
    setTimeout(sendNext, 2000);
  }

  // تنبيه المستخدم
  showToast(`📱 سيُفتح واتساب ويب ${total} مرة — تأكد من تسجيل الدخول برقم ${senderNum}`);
  setTimeout(sendNext, 800);
}

// ===== AUTO-REPLY PAGE =====
function renderAutoreply() {
  const rules = DB.get('autoReplyRules') || defaultRules();

  document.getElementById('autoreplyContent').innerHTML = `
    <!-- Left: rules -->
    <div>
      <div class="card">
        <div class="card-title">🤖 قواعد الرد التلقائي</div>
        <div class="alert alert-info">ℹ️ يُرسَل الرد تلقائياً عند استقبال رسالة واتساب على رقم الروضة</div>
        <div id="replyRulesContainer"></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary" onclick="saveAutoRules()">💾 حفظ القواعد</button>
          <button class="btn btn-outline" onclick="addAutoRule()">➕ قاعدة جديدة</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🚫 أرقام مستثناة</div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <input type="tel" id="excludeInput" placeholder="965XXXXXXXX"
            style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">
          <button class="btn btn-danger" onclick="addExcluded()">➕ استثناء</button>
        </div>
        <div id="excludedList" style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="badge badge-gray" style="padding:5px 10px;cursor:pointer"
            onclick="this.remove()">96522001100 ✕</span>
        </div>
      </div>
    </div>

    <!-- Right: stats + log -->
    <div>
      <div class="card">
        <div class="card-title">📊 إحصائيات الشهر</div>
        <div class="grid-2" style="margin-bottom:0">
          <div style="background:var(--primary-light);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:var(--primary)">238</div>
            <div style="font-size:11px;color:var(--text-muted)">رسائل أُرسلت</div>
          </div>
          <div style="background:var(--info-light);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:var(--info)">94%</div>
            <div style="font-size:11px;color:var(--text-muted)">نسبة الاستجابة</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">📜 آخر الردود</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>الرقم</th><th>الوقت</th><th>نوع الرد</th><th>الحالة</th></tr></thead>
            <tbody>
              <tr><td>9655****</td><td>اليوم 14:32</td><td>رد عام</td><td><span class="badge badge-green">✓ أُرسل</span></td></tr>
              <tr><td>9651****</td><td>اليوم 12:15</td><td>كلمة: رسوم</td><td><span class="badge badge-green">✓ أُرسل</span></td></tr>
              <tr><td>9664****</td><td>أمس 23:47</td><td>خارج الدوام</td><td><span class="badge badge-green">✓ أُرسل</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  renderAutoRules(rules);
}

function defaultRules() {
  return [
    { id:'R1', name:'رد عام', keywords:'', enabled:true,
      text:'مرحباً بك في Personality Kids 🌟\nسيتم الرد عليك خلال أوقات الدوام.\nللاستفسار العاجل: 22001100' },
    { id:'R2', name:'كلمات مفتاحية: رسوم', keywords:'رسوم,قسط,دفع', enabled:true,
      text:'للاستفسار عن الرسوم والأقساط، يرجى التواصل مع مشرفة الفرع أو زيارتنا خلال أوقات الدوام 📞' }
  ];
}

function renderAutoRules(rules) {
  document.getElementById('replyRulesContainer').innerHTML = rules.map((r,i) => `
    <div class="reply-rule" id="rule-${r.id}">
      <div class="reply-rule-header">
        <div style="font-weight:700;font-size:13px">📩 ${r.name}</div>
        <label class="toggle">
          <input type="checkbox" ${r.enabled?'checked':''} onchange="toggleAutoRule('${r.id}',this)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="form-group">
        <label>الكلمات المفتاحية (فارغ = رد على الجميع)</label>
        <input type="text" value="${r.keywords}" placeholder="كلمة1, كلمة2"
          style="padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;width:100%;font-size:12px">
      </div>
      <div class="form-group">
        <label>نص الرد</label>
        <textarea rows="3"
          style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;font-family:inherit"
          >${r.text}</textarea>
      </div>
      <div class="form-group">
        <label>إرفاق صورة / ملف (اختياري)</label>
        <div class="upload-zone" style="padding:10px;font-size:12px">📎 رفع ملف</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeAutoRule('${r.id}')">🗑 حذف القاعدة</button>
    </div>`).join('');
}

function toggleAutoRule(id, chk) {
  const rule = document.getElementById('rule-'+id);
  if (rule) rule.style.opacity = chk.checked ? '1' : '0.5';
}

function addAutoRule() {
  const rules = DB.get('autoReplyRules') || defaultRules();
  const newId = 'R' + Date.now();
  rules.push({ id: newId, name: 'قاعدة جديدة', keywords:'', enabled:true, text:'' });
  DB.set('autoReplyRules', rules);
  renderAutoRules(rules);
}

function removeAutoRule(id) {
  const rules = (DB.get('autoReplyRules') || defaultRules()).filter(r => r.id !== id);
  DB.set('autoReplyRules', rules);
  renderAutoRules(rules);
}

function saveAutoRules() {
  DB.set('autoReplyRules', DB.get('autoReplyRules') || defaultRules());
  showToast('✅ تم حفظ قواعد الرد التلقائي');
}

function addExcluded() {
  const num = document.getElementById('excludeInput').value.trim();
  if (!num) return;
  const span = document.createElement('span');
  span.className = 'badge badge-gray';
  span.style.cssText = 'padding:5px 10px;cursor:pointer';
  span.textContent = num + ' ✕';
  span.onclick = () => span.remove();
  document.getElementById('excludedList').appendChild(span);
  document.getElementById('excludeInput').value = '';
  showToast('تم استثناء: ' + num);
}
