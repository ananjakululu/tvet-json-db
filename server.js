require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8000;
const DB_FILE = path.join(__dirname, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this'; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- SECURITY CONFIGURATION ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again later.' }
});

// --- Middleware Setup ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://*", "http://*"],
            connectSrc: ["'self'", "https://api.openai.com"] 
        },
    },
}));

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Serve static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- CBC Default Data Structure ---
const DEFAULT_LEARNING_AREAS = [
    { id: 'pp_lang', name: 'Language Activities', code: 'PP-LA', applicableLevels: ['PP1', 'PP2'], units: [] },
    { id: 'pp_math', name: 'Mathematics Activities', code: 'PP-MA', applicableLevels: ['PP1', 'PP2'], units: [] },
    { id: 'pp_creative', name: 'Creative Activities', code: 'PP-CA', applicableLevels: ['PP1', 'PP2'], units: [] },
    { id: 'pp_env', name: 'Environmental Activities', code: 'PP-EA', applicableLevels: ['PP1', 'PP2'], units: [] },
    { id: 'lp_lit', name: 'Literacy Activities', code: 'LP-LIT', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'], units: [] },
    { id: 'lp_math', name: 'Mathematics', code: 'LP-MATH', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'], units: [] },
    { id: 'lp_env', name: 'Environmental Activities', code: 'LP-EA', applicableLevels: ['Grade 1', 'Grade 2', 'Grade 3'], units: [] },
    { id: 'ms_eng', name: 'English', code: 'MS-ENG', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'], units: [] },
    { id: 'ms_kis', name: 'Kiswahili', code: 'MS-KIS', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'], units: [] },
    { id: 'ms_math', name: 'Mathematics', code: 'MS-MATH', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'], units: [] },
    { id: 'ms_sci', name: 'Science & Technology', code: 'MS-SCI', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'], units: [] },
    { id: 'ms_ss', name: 'Social Studies', code: 'MS-SS', applicableLevels: ['Grade 4', 'Grade 5', 'Grade 6'], units: [] },
    { id: 'js_eng', name: 'English', code: 'JS-ENG', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] },
    { id: 'js_kis', name: 'Kiswahili', code: 'JS-KIS', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] },
    { id: 'js_math', name: 'Mathematics', code: 'JS-MATH', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] },
    { id: 'js_sci', name: 'Integrated Science', code: 'JS-SCI', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] },
    { id: 'js_ss', name: 'Social Studies', code: 'JS-SS', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] },
    { id: 'js_pretech', name: 'Pre-Technical Studies', code: 'JS-PT', applicableLevels: ['Grade 7', 'Grade 8', 'Grade 9'], units: [] }
];

// --- Database Helpers ---
async function initializeDefaultDB() {
    console.log('[INFO] Initializing new CBC Database...');
    const adminPass = 'admin123'; 
    const teacherPass = 'teacher123';
    
    const hashedAdminPass = await bcrypt.hash(adminPass, 10);
    const hashedTeacherPass = await bcrypt.hash(teacherPass, 10);
    
    const initialData = { 
        students: [], 
        exams: [], 
        finance: [], 
        staff: [], 
        inventory: [], 
        learningAreas: DEFAULT_LEARNING_AREAS, 
        settings: { 
            schoolName: "Tande Primary & JSS", 
            motto: "Excellence in Learning",
            email: "info@tande.ac.ke",
            phone: "0712345678"
        },
        users: [
            { id: 'u1', email: 'admin@school.com', passwordHash: hashedAdminPass, role: 'admin', name: 'Admin User' },
            { id: 'u2', email: 'teacher@school.com', passwordHash: hashedTeacherPass, role: 'teacher', name: 'Mr. Teacher' }
        ]
    };
    await saveDB(initialData);
    return initialData;
}

async function loadDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        if (!data || data.trim() === '') return await initializeDefaultDB();
        const db = JSON.parse(data);

        // Migration Logic
        if (!db.learningAreas) { db.learningAreas = DEFAULT_LEARNING_AREAS; await saveDB(db); }
        if (!db.users) {
            const adminPass = 'admin123'; 
            const hashedPassword = await bcrypt.hash(adminPass, 10);
            db.users = [{ id: 'u1', email: 'admin@school.com', passwordHash: hashedPassword, role: 'admin', name: 'Admin User' }];
            await saveDB(db);
        }
        return db;
    } catch (err) {
        if (err.code === 'ENOENT' || err instanceof SyntaxError) return await initializeDefaultDB();
        throw err;
    }
}

async function saveDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
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
//   PAGE ROUTES
// ==========================================================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// ==========================================================================
//   AUTHENTICATION ROUTES
// ==========================================================================

app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await loadDB();
        const user = db.users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        res.json({ 
            success: true, 
            token, 
            user: { id: user.id, email: user.email, role: user.role, name: user.name } 
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const db = await loadDB();

        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: 'User already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(36),
            email, name,
            passwordHash: hashedPassword,
            role: 'teacher'
        };

        db.users.push(newUser);
        await saveDB(db);
        res.status(201).json({ success: true, message: 'Account created!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// ==========================================================================
//   RESTful RESOURCE ROUTES (Matching script.js expectations)
//   These mimic json-server behavior: GET reads, POST replaces array
// ==========================================================================

// --- STUDENTS ---
app.get('/students', authenticateToken, async (req, res) => {
    const db = await loadDB();
    res.json(db.students || []);
});
app.post('/students', authenticateToken, async (req, res) => {
    const db = await loadDB();
    db.students = req.body; // Script.js sends the whole array
    await saveDB(db);
    res.json(db.students);
});

// --- STAFF ---
app.get('/staff', authenticateToken, async (req, res) => {
    const db = await loadDB();
    res.json(db.staff || []);
});
app.post('/staff', authenticateToken, async (req, res) => {
    const db = await loadDB();
    db.staff = req.body;
    await saveDB(db);
    res.json(db.staff);
});

// --- EXAMS ---
app.get('/exams', authenticateToken, async (req, res) => {
    const db = await loadDB();
    res.json(db.exams || []);
});
app.post('/exams', authenticateToken, async (req, res) => {
    const db = await loadDB();
    db.exams = req.body;
    await saveDB(db);
    res.json(db.exams);
});

// --- SETTINGS ---
app.get('/settings', authenticateToken, async (req, res) => {
    const db = await loadDB();
    res.json(db.settings || {});
});
app.post('/settings', authenticateToken, requireRole('admin'), async (req, res) => {
    const db = await loadDB();
    db.settings = req.body;
    await saveDB(db);
    res.json(db.settings);
});

// --- LEARNING AREAS ---
app.get('/learningAreas', authenticateToken, async (req, res) => {
    const db = await loadDB();
    res.json(db.learningAreas || []);
});
app.post('/learningAreas', authenticateToken, async (req, res) => {
    const db = await loadDB();
    db.learningAreas = req.body;
    await saveDB(db);
    res.json(db.learningAreas);
});

// ==========================================================================
//   LEGACY / BACKUP ROUTES
// ==========================================================================

// API: Get Full DB (Legacy - for reference if needed)
app.get('/api/db', authenticateToken, async (req, res) => {
    try {
        const db = await loadDB();
        const safeDb = { ...db, users: db.users.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })) };
        res.json(safeDb);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load database' });
    }
});

// API: AI Chat
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
                    { role: 'system', content: `You are an assistant for ${context.schoolName}.` }, 
                    { role: 'user', content: query }
                ] 
            })
        });
        
        if (!response.ok) throw new Error('AI API Error');
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process AI request' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`[OK] Server running at http://localhost:${PORT}`);
    console.log(`[INFO] Default Admin: admin@school.com / admin123`);
    console.log(`[INFO] Default Teacher: teacher@school.com / teacher123`);
});
