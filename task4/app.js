// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'style')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Мидлвар для проверки авторизации
const checkAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Мидлвар для проверки администратора
const checkAdmin = (req, res, next) => {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.status(403).send('Доступ запрещен. Только для администратора.');
    }
    next();
};

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ========== РЕГИСТРАЦИЯ ==========
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
        return res.render('register', { error: 'Логин и пароль обязательны' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (login, password, is_admin) VALUES (?, ?, ?)`, [login, hashedPassword, 0], (err) => {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.render('register', { error: 'Пользователь с таким логином уже существует' });
            }
            return res.render('register', { error: 'Ошибка при создании пользователя' });
        }
        res.redirect('/login');
    });
});

// ========== ЛОГИН ==========
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { login, password } = req.body;
    db.get(`SELECT * FROM users WHERE login = ?`, [login], (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Неверный логин или пароль' });
        }
        if (bcrypt.compareSync(password, user.password)) {
            req.session.user = {
                id: user.id,
                login: user.login,
                is_admin: user.is_admin === 1
            };
            res.redirect('/');
        } else {
            res.render('login', { error: 'Неверный логин или пароль' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ========== ОСНОВНАЯ СТРАНИЦА ==========
app.get('/', checkAuth, (req, res) => {
    db.all(`SELECT * FROM questions`, (err, questions) => {
        if (err) return res.status(500).send('Ошибка загрузки вопросов');
        res.render('index', { questions });
    });
});

app.post('/submit-test', checkAuth, (req, res) => {
    const answers = req.body;
    const userId = req.session.user.id;

    db.all(`SELECT * FROM questions`, (err, questions) => {
        if (err) return res.status(500).send('Ошибка');

        let correctCount = 0;
        const stmt = db.prepare(`INSERT INTO user_answers (user_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)`);

        for (const question of questions) {
            const userAnswer = answers[`q_${question.id}`] || '';
            const isCorrect = (userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) ? 1 : 0;
            if (isCorrect) correctCount++;
            stmt.run(userId, question.id, userAnswer, isCorrect);
        }
        stmt.finalize();

        res.render('result', { correctCount, total: questions.length });
    });
});

// ========== АДМИНКА ==========
app.get('/admin/questions', checkAuth, checkAdmin, (req, res) => {
    db.all(`SELECT * FROM questions`, (err, questions) => {
        if (err) return res.status(500).send('Ошибка');
        res.render('admin_questions', { questions });
    });
});

app.post('/admin/questions/add', checkAuth, checkAdmin, (req, res) => {
    const { text, correct_answer } = req.body;
    if (!text || !correct_answer) return res.redirect('/admin/questions');
    db.run(`INSERT INTO questions (text, correct_answer) VALUES (?, ?)`, [text, correct_answer], (err) => {
        res.redirect('/admin/questions');
    });
});

app.post('/admin/questions/delete/:id', checkAuth, checkAdmin, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM questions WHERE id = ?`, [id], (err) => {
        res.redirect('/admin/questions');
    });
});

// ========== СТАТИСТИКА ==========
app.get('/admin/users-stats', checkAuth, checkAdmin, (req, res) => {
    const query = `
        SELECT 
            u.id,
            u.login,
            COUNT(DISTINCT ua.question_id) as total_answers,
            SUM(ua.is_correct) as correct_answers,
            ROUND(CAST(SUM(ua.is_correct) AS FLOAT) / COUNT(DISTINCT ua.question_id) * 100, 2) as percentage
        FROM users u
        LEFT JOIN user_answers ua ON u.id = ua.user_id
        GROUP BY u.id
    `;
    db.all(query, (err, usersStats) => {
        if (err) return res.status(500).send('Ошибка статистики');
        res.render('admin_stats', { usersStats });
    });
});

// ========== ПРОСМОТР ВСЕХ ОТВЕТОВ ==========
app.get('/admin/all-answers', checkAuth, checkAdmin, (req, res) => {
    const query = `
        SELECT 
            u.login,
            q.text as question_text,
            ua.user_answer,
            ua.is_correct,
            ua.timestamp
        FROM user_answers ua
        JOIN users u ON ua.user_id = u.id
        JOIN questions q ON ua.question_id = q.id
        ORDER BY ua.timestamp DESC
    `;
    db.all(query, (err, answers) => {
        if (err) return res.status(500).send('Ошибка');
        res.render('admin_all_answers', { answers });
    });
});

app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});