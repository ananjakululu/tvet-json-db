require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
// 1. Import SQLite
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this'; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 2. Initialize Database (Creates 'school.db' file)
// Check if running on Render (Linux) or Local
const dbPath = process.env.RENDER ? '/opt/render/project/data/school.db' : 'school.db';
const db = new Database(dbPath);

// ==========================================================================
//   DATABASE MIGRATION (RUNS ON STARTUP)
// ==========================================================================
console.log('[DB] Checking for schema updates...');
try {
    // Add 'department' column
    db.exec(`ALTER TABLE users ADD COLUMN department TEXT DEFAULT 'General';`);
    console.log('[DB] Migration: Added column `department` to users.');
} catch (err) {
    // Column likely already exists, ignore error
}

try {
    // Add 'isActive' column
    db.exec(`ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;`);
    console.log('[DB] Migration: Added column `isActive` to users.');
} catch (err) {
    // Column likely already exists, ignore error
}

// Create 'auditLogs' table
db.exec(`
    CREATE TABLE IF NOT EXISTS auditLogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        userName TEXT,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
console.log('[DB] Migration: Checked table `auditLogs`.');

// 3. Create Tables (Schema)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        passwordHash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        dob TEXT,
        idNumber TEXT,
        phone TEXT,
        grade TEXT,
        stream TEXT,
        reg TEXT,
        photo TEXT,
        guardianName TEXT,
        guardianPhone TEXT,
        guardianRel TEXT,
        upiNumber TEXT,
        prevSchool TEXT,
        entryLevel TEXT,
        yearCompleted TEXT,
        nemisNumber TEXT,
        disability TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT,
        department TEXT,
        phone TEXT,
        tscNumber TEXT,
        photo TEXT,
        subjects TEXT
    );

    CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        studentId TEXT,
        subjectId TEXT,
        score INTEGER,
        term TEXT,
        year INTEGER,
        comments TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        schoolName TEXT,
        motto TEXT,
        email TEXT,
        phone TEXT,
        schoolCode TEXT,
        academicYear TEXT,
        currentTerm TEXT,
        level TEXT,
        category TEXT,
        address TEXT,
        hoiName TEXT,
        hoiTitle TEXT,
        hoiTsc TEXT,
        hoiPhone TEXT,
        hoiEmail TEXT,
        logo TEXT,
        stamp TEXT,
        hoiSignature TEXT,
        ctSignature TEXT
    );

    CREATE TABLE IF NOT EXISTS learningAreas (
        id TEXT PRIMARY KEY,
        name TEXT,
        code TEXT,
        applicableLevels TEXT -- Stored as JSON string
    );
`);

// 4. Initialize Default Data (Seeding)
const DEFAULT_LEARNING_AREAS = [
    { id: 'pp_lang', name: 'Language Activities', code: 'PP-LA', applicableLevels: ['PP1', 'PP2'] },
    { id: 'pp_math', name: 'Mathematics Activities', code: 'PP-MA', applicableLevels: ['PP1', 'PP2'] },
    { id: 'pp_creative', name: 'Creative Activities', code: 'PP-CA', applicableLevels: ['PP1', 'PP2'] },
    { id: 'pp_env', name: 'Environmental Activities', code: 'PP-EA', applicableLevels: ['PP1', 'PP2'] },
    { id: 'lp_lit', name: 'Literacy Activities', code: 'LP-LIT', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'] },
    { id: 'lp_math', name: 'Mathematics', code: 'LP-MATH', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'] },
    { id: 'lp_env', name: 'Environmental Activities', code: 'LP-EA', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'] },
    { id: 'ms_eng', name: 'English', code: 'MS-ENG', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { id: 'ms_kis', name: 'Kiswahili', code: 'MS-KIS', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { id: 'ms_math', name: 'Mathematics', code: 'MS-MATH', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { id: 'ms_sci', name: 'Science & Technology', code: 'MS-SCI', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { id: 'ms_ss', name: 'Social Studies', code: 'MS-SS', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
    { id: 'js_eng', name: 'English', code: 'JS-ENG', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
    { id: 'js_kis', name: 'Kiswahili', code: 'JS-KIS', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
    { id: 'js_math', name: 'Mathematics', code: 'JS-MATH', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
    { id: 'js_sci', name: 'Integrated Science', code: 'JS-SCI', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
    { id: 'js_ss', name: 'Social Studies', code: 'JS-SS', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
    { id: 'js_pretech', name: 'Pre-Technical Studies', code: 'JS-PT', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'] }
];

const seedDatabase = () => {
    // 1. Seed Admin
    const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@school.com');
    if (!admin) {
        const hashedPass = bcrypt.hashSync('admin123', 10);
        const insert = db.prepare('INSERT INTO users (id, email, name, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run('u1', 'admin@school.com', 'System Admin', 'admin', 'Administration', hashedPass);
        console.log('[DB] Default Admin created (admin@school.com / admin123).');
    }

    // 2. Seed HOI (Head of Institution)
    const hoi = db.prepare('SELECT * FROM users WHERE email = ?').get('hoi@school.com');
    if (!hoi) {
        const hashedPass = bcrypt.hashSync('hoi123', 10);
        const insert = db.prepare('INSERT INTO users (id, email, name, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run('u2', 'hoi@school.com', 'Head Teacher', 'hoi', 'Administration', hashedPass);
        console.log('[DB] Default HOI created (hoi@school.com / hoi123).');
    }

    // 3. Seed Exam Officer
    const examOfficer = db.prepare('SELECT * FROM users WHERE email = ?').get('exam@school.com');
    if (!examOfficer) {
        const hashedPass = bcrypt.hashSync('exam123', 10);
        const insert = db.prepare('INSERT INTO users (id, email, name, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run('u3', 'exam@school.com', 'Exam Officer', 'exam_officer', 'Exams', hashedPass);
        console.log('[DB] Default Exam Officer created (exam@school.com / exam123).');
    }

    // Seed Learning Areas
    const laCount = db.prepare('SELECT COUNT(*) as c FROM learningAreas').get().c;
    if (laCount === 0) {
        const insert = db.prepare('INSERT INTO learningAreas (id, name, code, applicableLevels) VALUES (?, ?, ?, ?)');
        const insertMany = db.transaction((items) => {
            for(const item of items) {
                insert.run(item.id, item.name, item.code, JSON.stringify(item.applicableLevels));
            }
        });
        insertMany(DEFAULT_LEARNING_AREAS);
        console.log('[DB] Default Learning Areas seeded.');
    }

    // Seed Settings
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) {
        const insert = db.prepare(`INSERT INTO settings (id, schoolName, motto, email, phone, schoolCode, academicYear, currentTerm, level, category, address) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        insert.run("Tande Primary & JSS", "Excellence in Learning", "info@tande.ac.ke", "0712345678", "123456", "2024", "Term 1", "Primary & JSS", "Public", "P.O. Box 123, Nairobi");
        console.log('[DB] Default Settings seeded.');
    }
};

seedDatabase();

// --- SECURITY CONFIGURATION ---
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const loginLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================================
//   AUTH MIDDLEWARE & HELPERS
// ==========================================================================

// Helper to log actions
const logAction = (userId, userName, action, details) => {
    try {
        const stmt = db.prepare('INSERT INTO auditLogs (userId, userName, action, details) VALUES (?, ?, ?, ?)');
        stmt.run(userId, userName, action, details);
    } catch (e) { console.error("Logging failed", e); }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        
        // ROBUST CHECK: Fetch fresh user data from DB to check isActive
        const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        if (!dbUser) return res.status(403).json({ error: 'User not found.' });
        
        // Check if account is active
        if (dbUser.isActive !== 1) {
            return res.status(403).json({ error: 'Account suspended. Contact Admin.' });
        }

        req.user = dbUser; // Attach fresh user data
        next();
    });
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
        next();
    };
};

// ==========================================================================
//   AUTHENTICATION ROUTES
// ==========================================================================

app.post('/api/login', loginLimiter, (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        if (user.isActive !== 1) {
            return res.status(403).json({ success: false, message: 'Account suspended. Contact Admin.' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        
        // Log Login
        logAction(user.id, user.name, 'LOGIN', `Logged in from ${req.ip}`);
        
        res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department } });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/signup', (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(400).json({ success: false, message: 'User already exists.' });
        const hashedPassword = bcrypt.hashSync(password, 10);
        // Default signup is 'General' department
        const insert = db.prepare('INSERT INTO users (id, email, name, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run(Date.now().toString(), email, name, 'teacher', 'General', hashedPassword);
        res.status(201).json({ success: true, message: 'Account created!' });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed' });
    }
});

// ==========================================================================
//   RESTful RESOURCE ROUTES
// ==========================================================================

// --- STUDENTS ---
app.get('/students', authenticateToken, (req, res) => {
    const students = db.prepare('SELECT * FROM students').all();
    res.json(students);
});

app.post('/students', authenticateToken, requireRole('hoi', 'admin'), (req, res) => {
    const studentColumns = ['id', 'name', 'gender', 'dob', 'idNumber', 'phone', 'grade', 'stream', 'reg', 'photo', 'guardianName', 'guardianPhone', 'guardianRel', 'upiNumber', 'prevSchool', 'entryLevel', 'yearCompleted', 'nemisNumber', 'disability'];
    const mapStudentData = (dataArray) => dataArray.map(item => studentColumns.map(col => item[col]));
    const insert = db.prepare(`INSERT INTO students (${studentColumns.join(', ')}) VALUES (${studentColumns.map(() => '?').join(', ')})`);

    try {
        const deleteMany = db.prepare(`DELETE FROM students`);
        const insertMany = db.transaction((items) => {
            deleteMany.run();
            const rowsToInsert = mapStudentData(items);
            for (const row of rowsToInsert) {
                insert.run(...row);
            }
        });
        insertMany(req.body);
        
        logAction(req.user.id, req.user.name, 'UPDATE_STUDENTS', `Updated ${req.body.length} student records.`);
        res.json(req.body);
    } catch (err) {
        console.error("Student Save Error:", err);
        res.status(500).json({ error: 'DB Error', details: err.message });
    }
});

// --- STAFF ---
app.get('/staff', authenticateToken, (req, res) => {
    const staff = db.prepare('SELECT * FROM staff').all();
    res.json(staff);
});

app.post('/staff', authenticateToken, requireRole('hoi', 'admin'), (req, res) => {
    const staffColumns = ['id', 'name', 'email', 'role', 'department', 'phone', 'tscNumber', 'photo', 'subjects'];
    const mapStaffData = (dataArray) => dataArray.map(item => staffColumns.map(col => item[col]));
    const insert = db.prepare(`INSERT INTO staff (${staffColumns.join(', ')}) VALUES (${staffColumns.map(() => '?').join(', ')})`);

    try {
        const deleteMany = db.prepare(`DELETE FROM staff`);
        const insertMany = db.transaction((items) => {
            deleteMany.run();
            const rowsToInsert = mapStaffData(items);
            for (const row of rowsToInsert) {
                insert.run(...row);
            }
        });
        insertMany(req.body);
        
        logAction(req.user.id, req.user.name, 'UPDATE_STAFF', `Updated ${req.body.length} staff records.`);
        res.json(req.body);
    } catch (err) {
        console.error("Staff Save Error:", err);
        res.status(500).json({ error: 'DB Error', details: err.message });
    }
});

// --- EXAMS ---
app.get('/exams', authenticateToken, (req, res) => {
    const exams = db.prepare('SELECT * FROM exams').all();
    res.json(exams);
});

app.post('/exams', authenticateToken, requireRole('exam_officer', 'hoi', 'admin'), (req, res) => {
    const examColumns = ['id', 'studentId', 'subjectId', 'score', 'term', 'year', 'comments'];
    const mapExamData = (dataArray) => dataArray.map(item => examColumns.map(col => item[col]));
    const insert = db.prepare(`INSERT INTO exams (${examColumns.join(', ')}) VALUES (${examColumns.map(() => '?').join(', ')})`);

    try {
        const deleteMany = db.prepare(`DELETE FROM exams`);
        const insertMany = db.transaction((items) => {
            deleteMany.run();
            const rowsToInsert = mapExamData(items);
            for (const row of rowsToInsert) {
                insert.run(...row);
            }
        });
        insertMany(req.body);
        
        logAction(req.user.id, req.user.name, 'UPDATE_EXAMS', `Updated ${req.body.length} exam records.`);
        res.json(req.body);
    } catch (err) {
        console.error("Exams Save Error:", err);
        res.status(500).json({ error: 'DB Error', details: err.message });
    }
});

// --- SETTINGS ---
app.get('/settings', authenticateToken, (req, res) => {
    let settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) settings = { id: 1 };
    res.json(settings);
});

app.post('/settings', authenticateToken, requireRole('admin'), (req, res) => {
    const data = req.body;
    data.id = 1;
    const upsert = db.prepare(`
        INSERT INTO settings (id, schoolName, motto, email, phone, schoolCode, academicYear, currentTerm, level, category, address, hoiName, hoiTitle, hoiTsc, hoiPhone, hoiEmail, logo, stamp, hoiSignature, ctSignature) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            schoolName=excluded.schoolName, motto=excluded.motto, email=excluded.email, phone=excluded.phone,
            schoolCode=excluded.schoolCode, academicYear=excluded.academicYear, currentTerm=excluded.currentTerm,
            level=excluded.level, category=excluded.category, address=excluded.address,
            hoiName=excluded.hoiName, hoiTitle=excluded.hoiTitle, hoiTsc=excluded.hoiTsc,
            hoiPhone=excluded.hoiPhone, hoiEmail=excluded.hoiEmail, logo=excluded.logo,
            stamp=excluded.stamp, hoiSignature=excluded.hoiSignature, ctSignature=excluded.ctSignature
    `);

    try {
        upsert.run(
            data.id, data.schoolName, data.motto, data.email, data.phone, data.schoolCode, 
            data.academicYear, data.currentTerm, data.level, data.category, data.address, 
            data.hoiName, data.hoiTitle, data.hoiTsc, data.hoiPhone, data.hoiEmail, 
            data.logo, data.stamp, data.hoiSignature, data.ctSignature
        );
        logAction(req.user.id, req.user.name, 'UPDATE_SETTINGS', 'Updated school settings.');
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Settings failed' });
    }
});

// --- LEARNING AREAS ---
app.get('/learningAreas', authenticateToken, (req, res) => {
    const areas = db.prepare('SELECT * FROM learningAreas').all();
    res.json(areas.map(a => ({ ...a, applicableLevels: JSON.parse(a.applicableLevels) })));
});

app.post('/learningAreas', authenticateToken, (req, res) => {
    const laColumns = ['id', 'name', 'code', 'applicableLevels'];
    const mapLAData = (dataArray) => {
        return dataArray.map(item => {
            return laColumns.map(col => col === 'applicableLevels' ? JSON.stringify(item[col]) : item[col]);
        });
    };
    const insert = db.prepare(`INSERT INTO learningAreas (${laColumns.join(', ')}) VALUES (${laColumns.map(() => '?').join(', ')})`);

    try {
        const deleteMany = db.prepare(`DELETE FROM learningAreas`);
        const insertMany = db.transaction((items) => {
            deleteMany.run();
            const rowsToInsert = mapLAData(items);
            for (const row of rowsToInsert) {
                insert.run(...row);
            }
        });
        insertMany(req.body);
        logAction(req.user.id, req.user.name, 'UPDATE_LEARNING_AREAS', 'Updated curriculum.');
        res.json(req.body);
    } catch (err) {
        console.error("Learning Areas Save Error:", err);
        res.status(500).json({ error: 'DB Error', details: err.message });
    }
});

// ==========================================================================
//   BACKUP / RESTORE ROUTES
// ==========================================================================

// SECURE: Only Admin and HOI can download the full database
app.get('/api/db', authenticateToken, requireRole('admin', 'hoi'), (req, res) => {
    try {
        const data = {
            students: db.prepare('SELECT * FROM students').all(),
            staff: db.prepare('SELECT * FROM staff').all(),
            exams: db.prepare('SELECT * FROM exams').all(),
            settings: db.prepare('SELECT * FROM settings WHERE id=1').get() || {},
            learningAreas: db.prepare('SELECT * FROM learningAreas').all().map(a => ({ ...a, applicableLevels: JSON.parse(a.applicableLevels) })),
        };
        logAction(req.user.id, req.user.name, 'BACKUP_DB', 'Downloaded full database backup.');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

app.post('/api/restore', authenticateToken, requireRole('admin'), (req, res) => {
    const safeReplace = (table, data, columns) => {
        if (!data || !Array.isArray(data)) return;
        const insert = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`);
        const mappedData = data.map(item => columns.map(col => item[col] ?? '')); 
        const transaction = db.transaction((items) => {
            db.prepare(`DELETE FROM ${table}`).run();
            for (const row of items) {
                insert.run(...row);
            }
        });
        transaction(mappedData);
    };

    const restoreTransaction = db.transaction(() => {
        const { students, staff, exams, settings, learningAreas } = req.body;

        if (learningAreas) {
            const laCols = ['id', 'name', 'code', 'applicableLevels'];
            const mappedLA = learningAreas.map(item => ({
                ...item,
                applicableLevels: typeof item.applicableLevels === 'string' ? item.applicableLevels : JSON.stringify(item.applicableLevels)
            }));
            safeReplace('learningAreas', mappedLA, laCols);
        }

        if (settings) {
            const settingsCols = ['id', 'schoolName', 'motto', 'email', 'phone', 'schoolCode', 'academicYear', 'currentTerm', 'level', 'category', 'address', 'hoiName', 'hoiTitle', 'hoiTsc', 'hoiPhone', 'hoiEmail', 'logo', 'stamp', 'hoiSignature', 'ctSignature'];
            const s = { ...settings, id: 1 }; 
            const insert = db.prepare(`INSERT INTO settings (${settingsCols.join(', ')}) VALUES (${settingsCols.map(() => '?').join(', ')}) ON CONFLICT(id) DO UPDATE SET ${settingsCols.slice(1).map(col => `${col}=excluded.${col}`).join(', ')}`);
            const row = settingsCols.map(col => s[col] ?? '');
            db.prepare(`DELETE FROM settings`).run();
            insert.run(...row);
        }

        const studentCols = ['id', 'name', 'gender', 'dob', 'idNumber', 'phone', 'grade', 'stream', 'reg', 'photo', 'guardianName', 'guardianPhone', 'guardianRel', 'upiNumber', 'prevSchool', 'entryLevel', 'yearCompleted', 'nemisNumber', 'disability'];
        safeReplace('students', students, studentCols);

        const staffCols = ['id', 'name', 'email', 'role', 'department', 'phone', 'tscNumber', 'photo', 'subjects'];
        safeReplace('staff', staff, staffCols);

        const examCols = ['id', 'studentId', 'subjectId', 'score', 'term', 'year', 'comments'];
        safeReplace('exams', exams, examCols);
    });

    try {
        restoreTransaction();
        logAction(req.user.id, req.user.name, 'RESTORE_DB', 'Restored database from backup.');
        res.json({ success: true, message: 'Database restored successfully!' });
    } catch (err) {
        console.error("Restore Error:", err);
        res.status(500).json({ error: 'Restore failed. No changes were made.', details: err.message });
    }
});

// ==========================================================================
//   USER MANAGEMENT ROUTES (Robust Features)
// ==========================================================================

// DEACTIVATE USER
app.post('/api/users/:id/deactivate', authenticateToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('UPDATE users SET isActive = 0 WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
        logAction(req.user.id, req.user.name, 'DEACTIVATE_USER', `Deactivated user ID: ${id}`);
        res.json({ success: true, message: 'User deactivated.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

// ACTIVATE USER
app.post('/api/users/:id/activate', authenticateToken, requireRole('admin'), (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare('UPDATE users SET isActive = 1 WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
        logAction(req.user.id, req.user.name, 'ACTIVATE_USER', `Activated user ID: ${id}`);
        res.json({ success: true, message: 'User activated.' });
    } else {
        res.status(404).json({ success: false, message: 'User not found.' });
    }
});

// VIEW AUDIT LOGS
app.get('/api/logs', authenticateToken, requireRole('admin'), (req, res) => {
    const logs = db.prepare('SELECT * FROM auditLogs ORDER BY timestamp DESC LIMIT 50').all();
    res.json(logs);
});

// ==========================================================================
//   AI CHAT ROUTE
// ==========================================================================
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    const { query, context } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'AI Service Unconfigured' });
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ 
                model: 'gpt-3.5-turbo', 
                messages: [
                    { role: 'system', content: `You are an assistant for ${context?.schoolName || 'the school'}.` }, 
                    { role: 'user', content: query }
                ] 
            })
        });
        if (!response.ok) throw new Error('AI API Error');
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

// ==========================================================================
//   EMERGENCY RESET ROUTE
// ==========================================================================
app.get('/api/reset-admin', (req, res) => {
    try {
        console.log("[EMERGENCY] Resetting Admin user...");
        const hashedPass = bcrypt.hashSync('admin123', 10);
        // We explicitly set department and isActive to handle the new schema
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO users (id, email, name, role, department, isActive, passwordHash) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run('u1', 'admin@school.com', 'System Admin', 'admin', 'Administration', 1, hashedPass);
        res.json({ 
            success: true, 
            message: 'Admin user has been reset.', 
            note: 'Login with admin@school.com / admin123' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`[OK] Server running at http://localhost:${PORT}`);
    console.log(`[INFO] Default Admin: admin@school.com / admin123`);
});
