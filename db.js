// ============================================================
// DB.JS — Supabase only (no localStorage)
// ============================================================

const SUPABASE_URL = 'https://idtopctbogyaciasftza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdG9wY3Rib2d5YWNpYXNmdHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzE0NTUsImV4cCI6MjA5NTEwNzQ1NX0.DG6e0Fh7oHC5A588Jhupcs6yVb91D_vfKKwN60FUdiQ';

const BRANCHES = {
  all:   { name: 'كل الفروع',        badge: 'badge-gray'   },
  esh:   { name: 'اشبيلية',          badge: 'badge-green'  },
  sol:   { name: 'الصليبخات',        badge: 'badge-blue'   },
  mat:   { name: 'المطلاع',          badge: 'badge-purple' },
  esh_e: { name: 'اشبيلية مسائي',   badge: 'badge-green'  },
  sol_e: { name: 'الصليبخات مسائي', badge: 'badge-blue'   },
  mat_e: { name: 'المطلاع مسائي',   badge: 'badge-purple' }
};

const ROLES_HR = [
  'معلمة KG1','معلمة KG2','معلمة حضانة','مشرفة',
  'إدارية','محاسبة','سائق','عامل نظافة','طباخة','أمن'
];

// ============================================================
// CACHE — in-memory only, loaded from Supabase
// ============================================================
const CACHE = {};

// ============================================================
// SUPABASE REST
// ============================================================
const SB = {
  h(extra={}) {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...extra
    };
  },
  async get(table, query='') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: this.h() });
    if (!r.ok) { console.error('SB.get error:', await r.text()); return []; }
    return r.json();
  },
  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:'POST',
      headers: this.h({'Prefer':'return=minimal'}),
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.text();
      console.error(`SB.post ${table} error:`, err, '| body:', JSON.stringify(body));
      throw new Error(err);
    }
    return {};
  },
  async patch(table, query, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method:'PATCH',
      headers: this.h({'Prefer':'return=minimal'}),
      body: JSON.stringify(body)
    });
    if (!r.ok) { console.error('SB.patch error:', await r.text()); }
  },
  async delete(table, query) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method:'DELETE', headers: this.h()
    });
    if (!r.ok) { console.error('SB.delete error:', await r.text()); }
  },
  async upsert(table, rows) {
    if (!rows || !rows.length) return;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:'POST',
      headers: this.h({'Prefer':'resolution=merge-duplicates,return=minimal'}),
      body: JSON.stringify(rows)
    });
    if (!r.ok) { console.error('SB.upsert error:', table, await r.text()); throw new Error('upsert failed: '+table); }
  }
};

// ============================================================
// COLUMN MAPS
// ============================================================
const TO_SNAKE = {
  studentId:'student_id', empId:'emp_id', empName:'emp_name',
  dueDate:'due_date', paidDate:'paid_date', startDate:'start_date',
  attachmentImg:'attachment_img', discountReason:'discount_reason', voucherNo:'voucher_no',
  enrollStatus:'enroll_status', subscriptionType:'subscription_type',
  subscriptionEnd:'subscription_end', withdrawDate:'withdraw_date', joinDate:'join_date',
  fromDate:'from_date', toDate:'to_date', contractStart:'contract_start',
  contractEnd:'contract_end', contractType:'contract_type',
  annualLeave:'annual_leave', receiveDate:'receive_date',
  expiryDate:'expiry_date', issueDate:'issue_date',
  minQty:'min_qty', idNo:'id_no', lastLogin:'last_login',
  partialPaid:'partial_paid', payLink:'pay_link',
  receiptImg:'receipt_img', receiptName:'receipt_name'
};
const TO_CAMEL = Object.fromEntries(Object.entries(TO_SNAKE).map(([k,v])=>[v,k]));

function toSnake(obj) {
  const out={};
  for(const [k,v] of Object.entries(obj)) out[TO_SNAKE[k]||k]=v;
  return out;
}
function toCamel(obj) {
  const out={};
  for(const [k,v] of Object.entries(obj)) out[TO_CAMEL[k]||k]=v;
  return out;
}

const TABLES = {
  users:'users', students:'students', installments:'installments',
  employees:'employees', leaves:'leaves', supplies:'supplies',
  clothes:'clothes', licenses:'licenses', refunds:'refunds',
  subRevenues:'sub_revenues'
};

// ============================================================
// DB — sync interface backed by Supabase cache
// ============================================================
const DB = {

  all(key) { return (CACHE[key]||[]).map(toCamel); },

  get(key) { return CACHE['s_'+key] ?? null; },

  set(key, val) {
    CACHE['s_'+key] = val;
    SB.post('settings',{key,value:val})
      .catch(()=> SB.patch('settings','key=eq.'+key,{value:val}).catch(()=>{}));
  },

  // Returns a Promise<boolean> — true once the row is confirmed written to
  // Supabase, false if the insert itself failed. Callers that need to insert
  // a *related* row afterwards (e.g. installments referencing a new student)
  // should `await` this first to avoid a race where the child row's
  // foreign key check runs before the parent row is committed.
  add(key, item) {
    const row = toSnake(item);
    CACHE[key] = CACHE[key]||[];
    CACHE[key].push(row);
    return SB.post(TABLES[key]||key, row)
      .then(()=> SB.get(TABLES[key]||key,'order=id')
        .then(rows=>{ CACHE[key]=rows||[]; return true; })
        .catch(()=> true)
      )
      .catch(e=> { console.warn('add err:',e); return false; });
  },

  // Insert multiple rows in a single request (avoids the post+refetch race
  // that can drop rows when add() is called repeatedly in a tight loop)
  // Returns a Promise<boolean> like add() above.
  addBulk(key, items) {
    if (!items || !items.length) return Promise.resolve(true);
    const rows = items.map(toSnake);
    CACHE[key] = CACHE[key]||[];
    rows.forEach(r => CACHE[key].push(r));
    return SB.post(TABLES[key]||key, rows)
      .then(()=> SB.get(TABLES[key]||key,'order=id')
        .then(r=>{ CACHE[key]=r||[]; return true; })
        .catch(()=> true)
      )
      .catch(e=> { console.warn('addBulk err:',e); return false; });
  },

  update(key, id, changes) {
    const row = toSnake(changes);
    CACHE[key] = (CACHE[key]||[]).map(i=> i.id===id ? {...i,...row} : i);
    SB.patch(TABLES[key]||key,'id=eq.'+id, row)
      .then(()=> SB.get(TABLES[key]||key,'order=id')
        .then(rows=>{ CACHE[key]=rows||[]; })
        .catch(()=>{})
      )
      .catch(e=> console.warn('update err:',e));
  },

  remove(key, id) {
    CACHE[key] = (CACHE[key]||[]).filter(i=> i.id!==id);
    SB.delete(TABLES[key]||key,'id=eq.'+id)
      .catch(e=> console.warn('remove err:',e));
  },

  save(key, arr) { CACHE[key] = arr.map(toSnake); },

  nextId(keyOrPrefix, prefixOrKey) {
    // Handle both: nextId('students','S') and nextId('S', students_array)
    let key, prefix;
    if (TABLES[keyOrPrefix]) {
      key = keyOrPrefix; prefix = prefixOrKey;
    } else {
      prefix = keyOrPrefix; key = prefixOrKey;
      // if second arg is array (old style), use it directly
      if (Array.isArray(key)) {
        const nums = key.map(i=> parseInt((i.id||'').replace(prefix,''))||0);
        return prefix + String((nums.length ? Math.max(...nums) : 0)+1).padStart(3,'0');
      }
    }
    const arr = CACHE[key]||[];
    const nums = arr.map(i=> parseInt((i.id||'').replace(prefix,''))||0);
    return prefix + String((nums.length ? Math.max(...nums) : 0)+1).padStart(3,'0');
  },

  async init() {
    showLoadingScreen(true);
    try {
      // Load all tables from Supabase in parallel
      const keys = Object.keys(TABLES);
      const results = await Promise.all(
        keys.map(k=> SB.get(TABLES[k],'order=id').catch(()=>[]))
      );
      keys.forEach((k,i)=>{ CACHE[k] = results[i]||[]; });

      // Load settings
      const settings = await SB.get('settings').catch(()=>[]);
      (settings||[]).forEach(s=>{ CACHE['s_'+s.key]=s.value; });

      console.log('✅ Supabase:', keys.map(k=>`${k}:${(CACHE[k]||[]).length}`).join(', '));

    } catch(e) {
      console.error('❌ Supabase failed:', e);
      showToast('⚠️ تعذر الاتصال بالسيرفر');
    }

    showLoadingScreen(false);

    // Auto-refresh every 10 seconds
    const keys = Object.keys(TABLES);
    setInterval(async ()=>{
      try {
        const results = await Promise.all(
          keys.map(k=> SB.get(TABLES[k],'order=id').catch(()=> CACHE[k]||[]))
        );
        let changed = false;
        keys.forEach((k,i)=>{
          if(JSON.stringify(results[i])!==JSON.stringify(CACHE[k])){
            CACHE[k]=results[i]||[];
            changed=true;
          }
        });
        if(changed && typeof renderCurrentPage==='function') renderCurrentPage();
      } catch(e){}
    }, 10000);

    // Manual refresh button
    if(!document.getElementById('refreshBtn')){
      const btn = document.createElement('button');
      btn.id='refreshBtn';
      btn.className='btn btn-outline';
      btn.style.cssText='font-size:12px;padding:5px 12px;margin-left:8px';
      btn.innerHTML='🔄';
      btn.title='تحديث البيانات';
      btn.onclick=async()=>{
        btn.disabled=true;
        try {
          const keys2=Object.keys(TABLES);
          const res=await Promise.all(keys2.map(k=>SB.get(TABLES[k],'order=id').catch(()=>CACHE[k]||[])));
          keys2.forEach((k,i)=>{ CACHE[k]=res[i]||[]; });
          if(typeof renderCurrentPage==='function') renderCurrentPage();
          showToast('✅ تم التحديث');
        } catch(e){ showToast('❌ فشل التحديث'); }
        btn.disabled=false;
      };
      const tr=document.querySelector('.topbar-right');
      if(tr) tr.prepend(btn);
    }
  },

  reset() {
    if(!confirm('تحذير: سيتم حذف جميع البيانات!')) return;
    if(!confirm('تأكيد نهائي؟')) return;
    Object.keys(TABLES).forEach(k=>{
      CACHE[k]=[];
      SB.delete(TABLES[k],'id=neq.x').catch(()=>{});
    });
    showToast('✅ تم المسح');
    setTimeout(()=>location.reload(),1500);
  }
};

// ============================================================
// LOADING SCREEN
// ============================================================
function showLoadingScreen(show) {
  let el=document.getElementById('loadingScreen');
  if(show && !el){
    el=document.createElement('div');
    el.id='loadingScreen';
    el.style.cssText='position:fixed;inset:0;background:linear-gradient(135deg,#1a5c42,#2ecc8f);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:inherit';
    el.innerHTML='<div style="font-size:48px;margin-bottom:16px">🌟</div><h2 style="margin:0 0 8px">Personality Kids</h2><p style="margin:0;opacity:.8">جارٍ تحميل البيانات...</p>';
    document.body.appendChild(el);
  } else if(!show && el){
    el.style.opacity='0';
    el.style.transition='opacity .4s';
    setTimeout(()=>el.remove(),400);
  }
}

// ============================================================
// HELPERS
// ============================================================
function daysUntil(d){ if(!d) return 9999; return Math.round((new Date(d)-new Date())/86400000); }
function fmtDate(d){ if(!d) return '—'; return d.replace(/-/g,'/'); }
function fmtKD(n){ return parseFloat(n||0).toFixed(3)+' د.ك'; }
const EVENING_BRANCHES = ['esh_e','sol_e','mat_e'];
function isEveningBranch(branch){ return EVENING_BRANCHES.includes(branch); }
const MORNING_BRANCHES = ['esh','sol','mat'];
function isMorningBranch(branch){ return MORNING_BRANCHES.includes(branch); }

// ============================================================
// CONTRACT SETTINGS (per morning branch: categories, discounts, terms)
// ============================================================
function getContractSettings(){
  const def = {};
  MORNING_BRANCHES.forEach(b=>{ def[b] = { categories:{}, discounts:[], terms:'' }; });
  const saved = DB.get('contractSettings') || {};
  // merge to make sure all morning branches exist with proper shape
  MORNING_BRANCHES.forEach(b=>{
    const sb = saved[b] || {};
    def[b] = {
      categories: sb.categories || {},
      discounts:  sb.discounts  || [],
      terms:      sb.terms      || ''
    };
  });
  return def;
}
function saveContractSettings(settings){
  DB.set('contractSettings', settings);
}

// ============================================================
// STUDENT CONTRACT EXTRA DATA (per student — legal/contract fields)
// ============================================================
function getStudentContract(studentId){
  const all = DB.get('studentContracts') || {};
  return all[studentId] || {};
}
function saveStudentContract(studentId, data){
  const all = DB.get('studentContracts') || {};
  all[studentId] = { ...(all[studentId]||{}), ...data };
  DB.set('studentContracts', all);
}

function studentStatus(s){
  // Evening branch: show enrollment status
  if (isEveningBranch(s.branch)) {
    if (s.enrollStatus === 'withdrawn') return {label:'منسحب',  cls:'badge-red'};
    if (s.enrollStatus === 'frozen')    return {label:'مجمّد',   cls:'badge-gray'};
    // check subscription expiry
    if (s.subscriptionEnd) {
      const d = daysUntil(s.subscriptionEnd);
      if (d < 0)  return {label:'منتهي',       cls:'badge-red'};
      if (d <= 5) return {label:`ينتهي ${d}ي`, cls:'badge-orange'};
    }
    return {label:'نشط', cls:'badge-green'};
  }
  // Regular branch
  const refunds = (typeof DB !== 'undefined' ? DB.all('refunds') : []).filter(r => r.studentId === s.id);
  const totalRefunded = refunds.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  if (totalRefunded > 0) return {label:'مرتجع', cls:'badge-purple', refunded: totalRefunded};
  const r=s.net-s.paid;
  if(r<=0)      return {label:'مكتمل',     cls:'badge-green'};
  if(s.paid===0) return {label:'لم يُسدَّد',cls:'badge-red'};
  return               {label:'جزئي',      cls:'badge-orange'};
}

function getExpiringSubscriptions(withinDays=5){
  return DB.all('students').filter(s =>
    isEveningBranch(s.branch) &&
    s.enrollStatus !== 'withdrawn' &&
    s.subscriptionEnd &&
    daysUntil(s.subscriptionEnd) >= 0 &&
    daysUntil(s.subscriptionEnd) <= withinDays
  );
}
function empStatus(e){
  if(e.status==='active') return {label:'نشط',    cls:'badge-green'};
  if(e.status==='leave')  return {label:'إجازة',  cls:'badge-blue'};
  return                         {label:'غير نشط',cls:'badge-red'};
}
function licenseStatus(l){
  const d=daysUntil(l.expiryDate||l.expiry_date);
  if(d<0)  return {label:'منتهي',       cls:'badge-red',   card:'lc-danger'};
  if(d<60) return {label:'ينتهي قريبا',cls:'badge-orange',card:'lc-warning'};
  return          {label:'ساري',        cls:'badge-green', card:'lc-good'};
}
