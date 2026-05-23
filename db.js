// ============================================================
// DB.JS — Supabase data layer
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
// Supabase API helper
// ============================================================
const SB = {
  async req(method, table, body = null, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
    const res = await fetch(url, {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      },
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  },

  async get(table, params = '')    { return this.req('GET',    table, null, params); },
  async post(table, body)          { return this.req('POST',   table, body); },
  async patch(table, body, params) { return this.req('PATCH',  table, body, params); },
  async delete(table, params)      { return this.req('DELETE', table, null, params); }
};

// ============================================================
// DB — same interface as before but talks to Supabase
// ============================================================
const DB = {
  // map collection names to table names
  _table(key) {
    const map = {
      users: 'users', students: 'students', installments: 'installments',
      employees: 'employees', leaves: 'leaves', supplies: 'supplies',
      clothes: 'clothes', licenses: 'licenses'
    };
    return map[key] || key;
  },

  // Read all rows
  async all(key) {
    try {
      return await SB.get(this._table(key), '?order=id');
    } catch(e) {
      console.error('DB.all error:', e);
      return [];
    }
  },

  // Add row
  async add(key, item) {
    try {
      // convert camelCase keys to snake_case for DB
      const row = toSnake(item);
      await SB.post(this._table(key), row);
    } catch(e) {
      console.error('DB.add error:', e);
      throw e;
    }
  },

  // Update row by id
  async update(key, id, changes) {
    try {
      const row = toSnake(changes);
      await SB.patch(this._table(key), row, `?id=eq.${id}`);
    } catch(e) {
      console.error('DB.update error:', e);
      throw e;
    }
  },

  // Delete row by id
  async remove(key, id) {
    try {
      await SB.delete(this._table(key), `?id=eq.${id}`);
    } catch(e) {
      console.error('DB.remove error:', e);
      throw e;
    }
  },

  // Settings (key-value store)
  async get(key) {
    try {
      const rows = await SB.get('settings', `?key=eq.${key}`);
      return rows.length ? rows[0].value : null;
    } catch(e) { return null; }
  },

  async set(key, val) {
    try {
      await SB.req('POST', 'settings',
        { key, value: val },
        ''
      );
    } catch {
      try {
        await SB.patch('settings', { value: val }, `?key=eq.${key}`);
      } catch(e) { console.error('DB.set error:', e); }
    }
  },

  // Generate next id
  nextId(prefix, arr) {
    if (!arr || !arr.length) return prefix + '001';
    const nums = arr.map(i => parseInt((i.id || '').replace(prefix,'')) || 0);
    return prefix + String(Math.max(...nums) + 1).padStart(3, '0');
  },

  async init() {
    // Supabase already has data — nothing to init
    console.log('✅ Supabase connected');
  },

  async reset() {
    if (!confirm('تحذير: سيتم حذف جميع البيانات!')) return;
    // delete all rows from each table
    for (const t of ['installments','leaves','students','employees','supplies','clothes','licenses']) {
      await SB.delete(t, '?id=neq.impossible');
    }
    showToast('✅ تم مسح البيانات');
    location.reload();
  }
};

// ============================================================
// snake_case converter (JS camelCase → DB snake_case)
// ============================================================
function toSnake(obj) {
  const map = {
    studentId: 'student_id', empId: 'emp_id', empName: 'emp_name',
    dueDate: 'due_date', paidDate: 'paid_date', startDate: 'start_date',
    fromDate: 'from_date', toDate: 'to_date', contractStart: 'contract_start',
    contractEnd: 'contract_end', contractType: 'contract_type',
    annualLeave: 'annual_leave', receiveDate: 'receive_date',
    expiryDate: 'expiry_date', issueDate: 'issue_date',
    minQty: 'min_qty', idNo: 'id_no', phone1: 'phone1', phone2: 'phone2',
    lastLogin: 'last_login'
  };
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] || k] = v;
  }
  return result;
}

// toCamel for reading from DB
function toCamel(obj) {
  const map = {
    student_id: 'studentId', emp_id: 'empId', emp_name: 'empName',
    due_date: 'dueDate', paid_date: 'paidDate', start_date: 'startDate',
    from_date: 'fromDate', to_date: 'toDate', contract_start: 'contractStart',
    contract_end: 'contractEnd', contract_type: 'contractType',
    annual_leave: 'annualLeave', receive_date: 'receiveDate',
    expiry_date: 'expiryDate', issue_date: 'issueDate',
    min_qty: 'minQty', id_no: 'idNo', last_login: 'lastLogin'
  };
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[map[k] || k] = v;
  }
  return result;
}

// ============================================================
// Helpers (same as before)
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
  const remaining = s.net - s.paid;
  if (remaining <= 0)   return { label:'مكتمل',      cls:'badge-green'  };
  if (s.paid === 0)     return { label:'لم يُسدَّد', cls:'badge-red'    };
  return                       { label:'جزئي',        cls:'badge-orange' };
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
