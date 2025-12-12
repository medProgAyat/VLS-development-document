const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { JSONFileSync } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// تنظیم EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// تنظیمات اولیه پایگاه داده
const dbPath = path.join(__dirname, 'db.json');
const defaultData = {
  requirements: [],
  documentInfo: {
    projectName: 'پروژه نمونه',
    organization: 'سازمان نمونه',
    department: 'دپارتمان فناوری اطلاعات',
    issueDate: new Date().toISOString().split('T')[0],
    lastChangeDate: new Date().toISOString().split('T')[0],
    version: '1.0',
    totalPages: 1
  }
};

// اطمینان از وجود فایل پایگاه داده
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
}

// ایجاد اتصال پایگاه داده
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// تابع برای بارگذاری پایگاه داده
async function loadDatabase() {
  await db.read();
  // اگر داده‌ها وجود ندارند، از داده‌های پیش‌فرض استفاده کن
  if (!db.data) {
    db.data = JSON.parse(JSON.stringify(defaultData));
    await db.write();
  }
}

// بارگذاری اولیه پایگاه داده
loadDatabase().then(() => {
  console.log('پایگاه داده با موفقیت بارگذاری شد');
}).catch(err => {
  console.error('خطا در بارگذاری پایگاه داده:', err);
});

// Middleware برای اطمینان از بارگذاری پایگاه داده
app.use(async (req, res, next) => {
  try {
    await db.read();
    next();
  } catch (error) {
    console.error('خطا در خواندن پایگاه داده:', error);
    res.status(500).send('خطای سرور');
  }
});

// مسیرها
app.get('/', async (req, res) => {
  try {
    res.render('index', { 
      documentInfo: db.data.documentInfo || defaultData.documentInfo,
      requirements: db.data.requirements || [] 
    });
  } catch (error) {
    console.error('خطا در رندر صفحه:', error);
    res.status(500).send('خطای سرور');
  }
});

app.get('/api/requirements', async (req, res) => {
  try {
    res.json(db.data.requirements || []);
  } catch (error) {
    console.error('خطا در دریافت الزامات:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.post('/api/requirements', async (req, res) => {
  try {
    const requirements = db.data.requirements || [];
    
    const newRequirement = {
      id: uuidv4(),
      number: requirements.length + 1,
      requirement: req.body.requirement || '',
      responsible: req.body.responsible || '',
      type: req.body.type || 'need',
      requirementText: req.body.requirementText || req.body.requirement || '',
      priority: req.body.priority || '-',
      lastChange: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    
    requirements.push(newRequirement);
    db.data.requirements = requirements;
    
    // به روز رسانی تاریخ آخرین تغییر سند
    if (db.data.documentInfo) {
      db.data.documentInfo.lastChangeDate = new Date().toISOString().split('T')[0];
    }
    
    await db.write();
    
    res.json(newRequirement);
  } catch (error) {
    console.error('خطا در ایجاد الزام:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.put('/api/requirements/:id', async (req, res) => {
  try {
    const requirements = db.data.requirements || [];
    const index = requirements.findIndex(r => r.id === req.params.id);
    
    if (index !== -1) {
      requirements[index] = {
        ...requirements[index],
        ...req.body,
        lastChange: new Date().toISOString().split('T')[0]
      };
      
      db.data.requirements = requirements;
      
      // به روز رسانی تاریخ آخرین تغییر سند
      if (db.data.documentInfo) {
        db.data.documentInfo.lastChangeDate = new Date().toISOString().split('T')[0];
      }
      
      await db.write();
      res.json(requirements[index]);
    } else {
      res.status(404).json({ error: 'الزام یافت نشد' });
    }
  } catch (error) {
    console.error('خطا در به روز رسانی الزام:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.delete('/api/requirements/:id', async (req, res) => {
  try {
    let requirements = db.data.requirements || [];
    requirements = requirements.filter(r => r.id !== req.params.id);
    
    // به روز رسانی شماره‌ها
    requirements.forEach((req, index) => {
      req.number = index + 1;
    });
    
    db.data.requirements = requirements;
    
    // به روز رسانی تاریخ آخرین تغییر سند
    if (db.data.documentInfo) {
      db.data.documentInfo.lastChangeDate = new Date().toISOString().split('T')[0];
    }
    
    await db.write();
    res.json({ success: true, count: requirements.length });
  } catch (error) {
    console.error('خطا در حذف الزام:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.post('/api/document-info', async (req, res) => {
  try {
    if (!db.data.documentInfo) {
      db.data.documentInfo = defaultData.documentInfo;
    }
    
    db.data.documentInfo = {
      ...db.data.documentInfo,
      ...req.body,
      lastChangeDate: new Date().toISOString().split('T')[0]
    };
    
    await db.write();
    res.json(db.data.documentInfo);
  } catch (error) {
    console.error('خطا در به روز رسانی اطلاعات سند:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// مسیر برای بازنشانی داده‌ها
app.post('/api/reset', async (req, res) => {
  try {
    db.data = JSON.parse(JSON.stringify(defaultData));
    await db.write();
    res.json({ success: true });
  } catch (error) {
    console.error('خطا در بازنشانی داده‌ها:', error);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

app.listen(PORT, () => {
  console.log(`سرور در حال اجرا در http://localhost:${PORT}`);
  console.log('برای مشاهده سند به آدرس بالا مراجعه کنید');
});