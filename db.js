// ============================================================
// DB.JS — Supabase + local cache (sync interface)
// ============================================================

const SUPABASE_URL = 'https://idtopctbogyaciasftza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdG9wY3Rib2d5YWNpYXNmdHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzE0NTUsImV4cCI6MjA5NTEwNzQ1NX0.DG6e0Fh7oHC5A588Jhupcs6yVb91D_vfKKwN60FUdiQ';

const BRANCHES = {
  all: { name: 'كل الفروع',   badge: 'badge-gray'   },
  esh: { name: 'اشبيلية',     badge: 'badge-green'  },
  sol: { name: 'الصليبخات',   badge: 'badge-blue'   },
  mat: { name: 'المطلاع',     badge: 'badge-purple' }
};

const ROLES_HR = [
  'معلمة KG1','معلمة KG2','معلمة حضانة','مشرفة',
  'إدارية','محاسبة','سائق','عامل نظافة','طباخة','أمن'
];

// ============================================================
// LOCAL CACHE — same structure as before
// ============================================================
const CACHE = {};

// ============================================================
// SUPABASE REST helper
// ============================================================
const SB = {
  headers() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  async get(table, query = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: this.headers()
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async patch(table, query, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
  },

  async delete(table, query) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'DELETE', headers: this.headers()
    });
    if (!r.ok) throw new Error(await r.text());
  }
};

// ============================================================
// COLUMN MAP — camelCase JS ↔ snake_case DB
// ============================================================
const TO_SNAKE = {
  studentId:'student_id', empId:'emp_id', empName:'emp_name',
  dueDate:'due_date', paidDate:'paid_date', startDate:'start_date',
  fromDate:'from_date', toDate:'to_date', contractStart:'contract_start',
  contractEnd:'contract_end', contractType:'contract_type',
  annualLeave:'annual_leave', receiveDate:'receive_date',
  expiryDate:'expiry_date', issueDate:'issue_date',
  minQty:'min_qty', idNo:'id_no', lastLogin:'last_login',
  phone1:'phone1', phone2:'phone2'
};

const TO_CAMEL = Object.fromEntries(Object.entries(TO_SNAKE).map(([k,v])=>[v,k]));

function toSnake(obj) {
  const out = {};
  for (const [k,v] of Object.entries(obj)) out[TO_SNAKE[k]||k] = v;
  return out;
}

function toCamel(obj) {
  const out = {};
  for (const [k,v] of Object.entries(obj)) out[TO_CAMEL[k]||k] = v;
  return out;
}

// ============================================================
// TABLE MAP
// ============================================================
const TABLES = {
  users:'users', students:'students', installments:'installments',
  employees:'employees', leaves:'leaves', supplies:'supplies',
  clothes:'clothes', licenses:'licenses'
};

// ============================================================
// DB — synchronous interface backed by cache + async Supabase
// ============================================================
const DB = {

  // Read from cache (sync)
  all(key) {
    return (CACHE[key] || []).map(toCamel);
  },

  // Read single setting (sync)
  get(key) {
    return CACHE['setting_' + key] ?? null;
  },

  // Save setting
  set(key, val) {
    CACHE['setting_' + key] = val;
    // persist to localStorage as backup
    try { localStorage.setItem('pk_setting_' + key, JSON.stringify(val)); } catch(e) {}
    // fire-and-forget to Supabase
    SB.post('settings', { key, value: val })
      .catch(() => SB.patch('settings', 'key=eq.' + key, { value: val }).catch(()=>{}));
  },

  // Add item
  add(key, item) {
    const row = toSnake(item);
    CACHE[key] = CACHE[key] || [];
    CACHE[key].push(row);
    // fire-and-forget
    SB.post(TABLES[key] || key, row).catch(e => console.warn('SB.add error:', e));
  },

  // Update item by id
  update(key, id, changes) {
    const row = toSnake(changes);
    CACHE[key] = (CACHE[key] || []).map(i => i.id === id ? {...i, ...row} : i);
    SB.patch(TABLES[key] || key, 'id=eq.' + id, row).catch(e => console.warn('SB.update error:', e));
  },

  // Remove item by id
  remove(key, id) {
    CACHE[key] = (CACHE[key] || []).filter(i => i.id !== id);
    SB.delete(TABLES[key] || key, 'id=eq.' + id).catch(e => console.warn('SB.remove error:', e));
  },

  // Save whole collection (used by legacy code)
  save(key, arr) {
    CACHE[key] = arr.map(toSnake);
  },

  // Generate next id
  nextId(key, prefix) {
    const arr = CACHE[key] || [];
    const nums = arr.map(i => parseInt((i.id||'').replace(prefix,''))||0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return prefix + String(next).padStart(3, '0');
  },

  // Load all data from Supabase into cache, then boot app
  async init() {
    try {
      showLoadingScreen(true);

      // Load all tables in parallel
      const keys = Object.keys(TABLES);
      const results = await Promise.all(
        keys.map(k => SB.get(TABLES[k], 'order=id').catch(() => []))
      );
      keys.forEach((k, i) => { CACHE[k] = results[i] || []; });

      // Load settings
      const settings = await SB.get('settings').catch(() => []);
      settings.forEach(s => { CACHE['setting_' + s.key] = s.value; });

      // If no users yet, seed demo data
      if (!CACHE.users || !CACHE.users.length) {
        await seedDemoData();
      }

      console.log('✅ Supabase loaded:', keys.map(k => `${k}:${CACHE[k].length}`).join(', '));
      showLoadingScreen(false);

      // Auto-refresh every 30 seconds to sync data from other devices
      setInterval(async () => {
        try {
          const results = await Promise.all(
            keys.map(k => SB.get(TABLES[k], 'order=id').catch(() => CACHE[k] || []))
          );
          keys.forEach((k, i) => { CACHE[k] = results[i] || []; });
          // Re-render current page silently
          if (typeof renderCurrentPage === 'function') renderCurrentPage();
        } catch(e) { console.warn('Auto-refresh failed:', e); }
      }, 30000);

    } catch(e) {
      console.error('Supabase error:', e);
      // fallback to localStorage
      fallbackToLocalStorage();
      showLoadingScreen(false);
    }
  },

  reset() {
    if (!confirm('تحذير: سيتم حذف جميع البيانات!')) return;
    if (!confirm('تأكيد نهائي: سيتم حذف كل شيء!')) return;
    Object.keys(TABLES).forEach(k => {
      CACHE[k] = [];
      SB.delete(TABLES[k], 'id=neq.x').catch(()=>{});
    });
    showToast('✅ تم المسح — جارٍ إعادة التحميل...');
    setTimeout(() => location.reload(), 1500);
  }
};

// ============================================================
// LOADING SCREEN
// ============================================================
function showLoadingScreen(show) {
  let el = document.getElementById('loadingScreen');
  if (show && !el) {
    el = document.createElement('div');
    el.id = 'loadingScreen';
    el.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#1a5c42,#2ecc8f);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:inherit';
    el.innerHTML = '<div style="font-size:48px;margin-bottom:16px">🌟</div><h2 style="margin:0 0 8px">Personality Kids</h2><p style="margin:0;opacity:.8">جارٍ تحميل البيانات...</p><div style="margin-top:20px;width:200px;height:4px;background:rgba(255,255,255,.3);border-radius:2px"><div id="loadBar" style="height:100%;background:#fff;border-radius:2px;width:0;transition:width 2s"></div></div>';
    document.body.appendChild(el);
    setTimeout(() => { const b = document.getElementById('loadBar'); if(b) b.style.width='90%'; }, 100);
  } else if (!show && el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity .4s';
    setTimeout(() => el.remove(), 400);
  }
}

// ============================================================
// SEED DEMO DATA
// ============================================================
async function seedDemoData() {
  const seed = {
    users: [
      { id:'admin', name:'المدير العام',     branch:'all', avatar:'م', pin:'1234', role:'admin',      last_login:'' },
      { id:'esh',   name:'مشرفة اشبيلية',   branch:'esh', avatar:'ش', pin:'1234', role:'supervisor', last_login:'' },
      { id:'sol',   name:'مشرفة الصليبخات', branch:'sol', avatar:'ص', pin:'1234', role:'supervisor', last_login:'' },
      { id:'mat',   name:'مشرفة المطلاع',   branch:'mat', avatar:'م', pin:'1234', role:'supervisor', last_login:'' }
    ],
    students: [
      { id:'S001', name:'أحمد محمد الرشيد',  branch:'esh', grade:'KG1',     phone1:'96550001', phone2:'96550002', dob:'2020-03-15', start_date:'2023-09-01', fees:1200, discount:0, net:1200, paid:900  },
      { id:'S002', name:'سارة علي الكندري',  branch:'sol', grade:'KG2',     phone1:'96550003', phone2:'',         dob:'2019-07-22', start_date:'2023-09-01', fees:1200, discount:0, net:1200, paid:1200 },
      { id:'S003', name:'فهد ناصر العازمي',  branch:'mat', grade:'nursery', phone1:'96550005', phone2:'96550006', dob:'2021-01-10', start_date:'2024-01-01', fees:900,  discount:0, net:900,  paid:300  }
    ]
  };

  for (const [table, rows] of Object.entries(seed)) {
    for (const row of rows) {
      await SB.post(table, row).catch(() => {});
    }
    CACHE[table] = rows;
  }
}

// ============================================================
// FALLBACK — localStorage if Supabase fails
// ============================================================
function fallbackToLocalStorage() {
  console.warn('⚠️ Using localStorage fallback');
  const SEED = {
    users: [
      { id:'admin', name:'المدير العام',     branch:'all', avatar:'م', pin:'1234', role:'admin',      lastLogin:'' },
      { id:'esh',   name:'مشرفة اشبيلية',   branch:'esh', avatar:'ش', pin:'1234', role:'supervisor', lastLogin:'' },
      { id:'sol',   name:'مشرفة الصليبخات', branch:'sol', avatar:'ص', pin:'1234', role:'supervisor', lastLogin:'' },
      { id:'mat',   name:'مشرفة المطلاع',   branch:'mat', avatar:'م', pin:'1234', role:'supervisor', lastLogin:'' }
    ],
    students:[], installments:[], employees:[], leaves:[],
    supplies:[], clothes:[], licenses:[]
  };
  Object.entries(SEED).forEach(([k, def]) => {
    const raw = localStorage.getItem('nursery4_' + k);
    CACHE[k] = raw ? JSON.parse(raw).map(toSnake) : def.map(toSnake);
  });

  // Override DB methods to also write to localStorage
  const origAdd    = DB.add.bind(DB);
  const origUpdate = DB.update.bind(DB);
  const origRemove = DB.remove.bind(DB);
  const origSave   = DB.save.bind(DB);

  DB.add = function(key, item) {
    origAdd(key, item);
    localStorage.setItem('nursery4_' + key, JSON.stringify(CACHE[key]));
  };
  DB.update = function(key, id, changes) {
    origUpdate(key, id, changes);
    localStorage.setItem('nursery4_' + key, JSON.stringify(CACHE[key]));
  };
  DB.remove = function(key, id) {
    origRemove(key, id);
    localStorage.setItem('nursery4_' + key, JSON.stringify(CACHE[key]));
  };
  DB.save = function(key, arr) {
    origSave(key, arr);
    localStorage.setItem('nursery4_' + key, JSON.stringify(CACHE[key]));
  };
}

// ============================================================
// HELPERS
// ============================================================
function daysUntil(dateStr) {
  if (!dateStr) return 9999;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return dateStr.replace(/-/g, '/');
}
function fmtKD(num) {
  return parseFloat(num || 0).toFixed(3) + ' د.ك';
}
function studentStatus(s) {
  const rem = s.net - s.paid;
  if (rem <= 0)    return { label:'مكتمل',      cls:'badge-green'  };
  if (s.paid === 0) return { label:'لم يُسدَّد', cls:'badge-red'    };
  return                   { label:'جزئي',        cls:'badge-orange' };
}
function empStatus(e) {
  if (e.status === 'active') return { label:'نشط',     cls:'badge-green' };
  if (e.status === 'leave')  return { label:'إجازة',   cls:'badge-blue'  };
  return                            { label:'غير نشط', cls:'badge-red'   };
}
function licenseStatus(l) {
  const d = daysUntil(l.expiryDate || l.expiry_date);
  if (d < 0)  return { label:'منتهي',        cls:'badge-red',    card:'lc-danger'  };
  if (d < 60) return { label:'ينتهي قريباً', cls:'badge-orange', card:'lc-warning' };
  return              { label:'ساري',         cls:'badge-green',  card:'lc-good'    };
}
