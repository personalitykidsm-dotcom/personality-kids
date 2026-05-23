// ============================================================
// DB.JS  —  localStorage data layer + sample seed data
// ============================================================

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

// ---- seed data ----
const SEED = {
  users: [
    { id:'admin', name:'المدير العام',      branch:'all', avatar:'م', pin:'1234', role:'admin',      lastLogin:'' },
    { id:'esh',   name:'مشرفة اشبيلية',    branch:'esh', avatar:'ش', pin:'1234', role:'supervisor', lastLogin:'' },
    { id:'sol',   name:'مشرفة الصليبخات',  branch:'sol', avatar:'ص', pin:'1234', role:'supervisor', lastLogin:'' },
    { id:'mat',   name:'مشرفة المطلاع',    branch:'mat', avatar:'م', pin:'1234', role:'supervisor', lastLogin:'' }
  ],
  students: [
    { id:'S001', name:'أحمد محمد الرشيد',   branch:'esh', grade:'KG1',     phone1:'96550001', phone2:'96550002', dob:'2020-03-15', startDate:'2023-09-01', fees:1200, discount:0, net:1200, paid:900  },
    { id:'S002', name:'سارة علي الكندري',   branch:'sol', grade:'KG2',     phone1:'96550003', phone2:'',         dob:'2019-07-22', startDate:'2023-09-01', fees:1200, discount:0, net:1200, paid:1200 },
    { id:'S003', name:'فهد ناصر العازمي',   branch:'mat', grade:'nursery', phone1:'96550005', phone2:'96550006', dob:'2021-01-10', startDate:'2024-01-01', fees:900,  discount:0, net:900,  paid:300  },
    { id:'S004', name:'نورة سعد المطيري',   branch:'esh', grade:'KG1',     phone1:'96551001', phone2:'',         dob:'2020-06-20', startDate:'2023-09-01', fees:1200, discount:100, net:1100, paid:1100 },
    { id:'S005', name:'خالد عبدالله العنزي',branch:'sol', grade:'KG2',     phone1:'96552001', phone2:'96552002', dob:'2019-11-05', startDate:'2023-09-01', fees:1200, discount:0, net:1200, paid:600  },
    { id:'S006', name:'هدى محمد الشمري',    branch:'mat', grade:'nursery', phone1:'96553001', phone2:'',         dob:'2021-04-18', startDate:'2024-01-01', fees:900,  discount:0, net:900,  paid:0    }
  ],
  installments: [
    { id:'I001', studentId:'S001', num:1, amount:300, dueDate:'2023-10-01', paidDate:'2023-10-03', method:'نقدي',   status:'paid'    },
    { id:'I002', studentId:'S001', num:2, amount:300, dueDate:'2023-12-01', paidDate:'2023-12-05', method:'كي نت', status:'paid'    },
    { id:'I003', studentId:'S001', num:3, amount:300, dueDate:'2024-02-01', paidDate:'2024-02-02', method:'نقدي',   status:'paid'    },
    { id:'I004', studentId:'S001', num:4, amount:300, dueDate:'2024-04-01', paidDate:'',           method:'',       status:'pending' },
    { id:'I005', studentId:'S002', num:1, amount:1200,dueDate:'2023-10-01', paidDate:'2023-10-01', method:'برنامج', status:'paid'    },
    { id:'I006', studentId:'S003', num:1, amount:300, dueDate:'2024-02-01', paidDate:'2024-02-10', method:'نقدي',   status:'paid'    },
    { id:'I007', studentId:'S003', num:2, amount:300, dueDate:'2024-04-01', paidDate:'',           method:'',       status:'pending' },
    { id:'I008', studentId:'S003', num:3, amount:300, dueDate:'2024-06-01', paidDate:'',           method:'',       status:'pending' }
  ],
  employees: [
    { id:'E001', name:'سلمى أحمد الرشيدي',  role:'معلمة KG1',    branch:'esh', nationality:'كويتية', phone:'96560001', idNo:'281010001', salary:450, allowance:50,  contractStart:'2022-09-01', contractEnd:'2026-08-31', contractType:'دوام كامل', annualLeave:30, status:'active'  },
    { id:'E002', name:'منيرة خالد العتيبي', role:'معلمة حضانة',  branch:'mat', nationality:'مصرية',  phone:'96560002', idNo:'',          salary:400, allowance:30,  contractStart:'2023-01-15', contractEnd:'2025-06-14', contractType:'دوام كامل', annualLeave:21, status:'active'  },
    { id:'E003', name:'نوف سعد المطيري',    role:'مشرفة',         branch:'sol', nationality:'كويتية', phone:'96560003', idNo:'289050012', salary:500, allowance:80,  contractStart:'2021-09-01', contractEnd:'2025-08-31', contractType:'دوام كامل', annualLeave:30, status:'leave'   },
    { id:'E004', name:'هدى عبدالله الشمري', role:'معلمة KG2',    branch:'esh', nationality:'كويتية', phone:'96560004', idNo:'290030045', salary:450, allowance:50,  contractStart:'2023-09-01', contractEnd:'2026-08-31', contractType:'دوام كامل', annualLeave:30, status:'active'  },
    { id:'E005', name:'فاطمة علي الكندري',  role:'إدارية',        branch:'esh', nationality:'كويتية', phone:'96560005', idNo:'285070033', salary:380, allowance:20,  contractStart:'2020-06-01', contractEnd:'2025-05-31', contractType:'دوام كامل', annualLeave:30, status:'active'  },
    { id:'E006', name:'ريم محمد العنزي',    role:'معلمة KG1',    branch:'sol', nationality:'كويتية', phone:'96560006', idNo:'292010067', salary:450, allowance:50,  contractStart:'2023-09-01', contractEnd:'2026-08-31', contractType:'دوام كامل', annualLeave:30, status:'active'  },
    { id:'E007', name:'أمل سعيد الهاجري',  role:'معلمة حضانة',  branch:'mat', nationality:'أردنية', phone:'96560007', idNo:'',          salary:380, allowance:30,  contractStart:'2024-01-01', contractEnd:'2025-12-31', contractType:'مؤقت',      annualLeave:14, status:'active'  },
    { id:'E008', name:'دانة فهد الرشيد',   role:'محاسبة',        branch:'esh', nationality:'كويتية', phone:'96560008', idNo:'288040091', salary:550, allowance:60,  contractStart:'2021-03-01', contractEnd:'2026-02-28', contractType:'دوام كامل', annualLeave:30, status:'active'  }
  ],
  leaves: [
    { id:'L001', empId:'E001', empName:'سلمى أحمد الرشيدي',  branch:'esh', type:'سنوية',  from:'2025-02-01', to:'2025-02-10', days:10, status:'pending' },
    { id:'L002', empId:'E002', empName:'منيرة خالد العتيبي', branch:'mat', type:'مرضية',  from:'2025-01-18', to:'2025-01-20', days:3,  status:'approved'},
    { id:'L003', empId:'E003', empName:'نوف سعد المطيري',    branch:'sol', type:'أمومة',  from:'2025-01-10', to:'2025-04-10', days:90, status:'approved'}
  ],
  supplies: [
    { id:'P001', name:'صابون يدين',    unit:'علبة',  branch:'esh', qty:8,  receiveDate:'2024-11-01', expiryDate:'2025-06-01' },
    { id:'P002', name:'مناديل',        unit:'كرتون', branch:'sol', qty:20, receiveDate:'2024-12-15', expiryDate:'2025-12-15' },
    { id:'P003', name:'معقم يدين',     unit:'زجاجة', branch:'mat', qty:3,  receiveDate:'2024-12-20', expiryDate:'2025-03-20' },
    { id:'P004', name:'بالونات تزيين', unit:'علبة',  branch:'esh', qty:15, receiveDate:'2025-01-01', expiryDate:'2026-01-01' }
  ],
  clothes: [
    { id:'C001', name:'تيشيرت صيفي', size:'3 سنوات', branch:'esh', qty:12, minQty:5  },
    { id:'C002', name:'بنطلون',      size:'4 سنوات', branch:'mat', qty:5,  minQty:10 },
    { id:'C003', name:'جاكيت شتوي', size:'5 سنوات', branch:'sol', qty:8,  minQty:5  }
  ],
  licenses: [
    { id:'LC001', name:'ترخيص فرع الصليبخات التجاري', authority:'وزارة التجارة', licNo:'KW-2021-0445', branch:'sol', issueDate:'2022-02-15', expiryDate:'2025-02-15' },
    { id:'LC002', name:'ترخيص فرع اشبيلية التعليمي',  authority:'وزارة التربية', licNo:'MOE-2023-1120', branch:'esh', issueDate:'2023-09-01', expiryDate:'2026-08-31' },
    { id:'LC003', name:'ترخيص الصحة — المطلاع',       authority:'وزارة الصحة',   licNo:'MOH-2022-0078', branch:'mat', issueDate:'2022-01-10', expiryDate:'2025-01-10' }
  ]
};

// ============================================================
// DB object — read / write localStorage
// ============================================================
const DB = {
  _key: k => 'nursery4_' + k,

  get(key) {
    try { return JSON.parse(localStorage.getItem(this._key(key))); } catch { return null; }
  },

  set(key, val) {
    localStorage.setItem(this._key(key), JSON.stringify(val));
  },

  // Read a collection
  all(key) { return this.get(key) || []; },

  // Save whole collection
  save(key, arr) { this.set(key, arr); },

  // Add item (push + save)
  add(key, item) {
    const arr = this.all(key);
    arr.push(item);
    this.save(key, arr);
  },

  // Update item by id
  update(key, id, changes) {
    const arr = this.all(key).map(i => i.id === id ? Object.assign({}, i, changes) : i);
    this.save(key, arr);
  },

  // Delete item by id
  remove(key, id) {
    this.save(key, this.all(key).filter(i => i.id !== id));
  },

  // Generate next id: prefix + zero-padded number
  nextId(key, prefix) {
    const arr = this.all(key);
    const nums = arr.map(i => parseInt(i.id.replace(prefix,'')) || 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return prefix + String(next).padStart(3, '0');
  },

  // Load seed data only if collection is empty
  init() {
    Object.entries(SEED).forEach(([key, data]) => {
      if (!this.get(key)) this.save(key, data);
    });
  },

  // Wipe everything (for dev/reset)
  reset() {
    Object.keys(SEED).forEach(k => localStorage.removeItem(this._key(k)));
    this.init();
  }
};

// ============================================================
// Helpers
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
  if (remaining <= 0)   return { label:'مكتمل', cls:'badge-green' };
  if (s.paid === 0)     return { label:'لم يُسدَّد', cls:'badge-red' };
  return                       { label:'جزئي',   cls:'badge-orange' };
}

function empStatus(e) {
  if (e.status === 'active') return { label:'نشط',    cls:'badge-green' };
  if (e.status === 'leave')  return { label:'إجازة',  cls:'badge-blue'  };
  return                            { label:'غير نشط',cls:'badge-red'   };
}

function licenseStatus(l) {
  const d = daysUntil(l.expiryDate);
  if (d < 0)   return { label:'منتهي',        cls:'badge-red',    card:'lc-danger'  };
  if (d < 60)  return { label:'ينتهي قريباً', cls:'badge-orange', card:'lc-warning' };
  return               { label:'ساري',         cls:'badge-green',  card:'lc-good'    };
}
