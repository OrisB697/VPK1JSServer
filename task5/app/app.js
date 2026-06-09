const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'style')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

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

app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', (req, res) => {
    const { login, password } = req.body;
    
    if (!login || !password) {
        return res.render('register', { error: 'Логин и пароль обязательны' });
    }
    
    if (password.length < 4) {
        return res.render('register', { error: 'Пароль должен быть не менее 4 символов' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (login, password, is_admin) VALUES (?, ?, ?)`, 
        [login, hashedPassword, 0], 
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.render('register', { error: 'Пользователь с таким логином уже существует' });
                }
                return res.render('register', { error: 'Ошибка при создании пользователя' });
            }
            res.redirect('/login');
        }
    );
});

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
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect('/login');
    });
});

app.get('/', checkAuth, (req, res) => {
    db.all(`SELECT * FROM questions`, (err, questions) => {
        if (err) {
            console.error('Ошибка загрузки вопросов:', err);
            return res.status(500).send('Ошибка загрузки вопросов');
        }
        res.render('index', { questions: questions || [] });
    });
});

app.post('/submit-test', checkAuth, (req, res) => {
    const answers = req.body;
    const userId = req.session.user.id;
    
    db.all(`SELECT * FROM questions`, (err, questions) => {
        if (err) {
            console.error('Ошибка загрузки вопросов:', err);
            return res.status(500).send('Ошибка');
        }
        
        if (!questions || questions.length === 0) {
            return res.status(500).send('Нет вопросов в базе данных');
        }
        
        let correctCount = 0;
        let processed = 0;
        
        questions.forEach((question) => {
            const userAnswer = answers[`q_${question.id}`] || '';
            const isCorrect = (userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) ? 1 : 0;
            if (isCorrect) correctCount++;
            
            db.run(`INSERT INTO user_answers (user_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)`,
                [userId, question.id, userAnswer, isCorrect],
                (err) => {
                    if (err) console.error('Ошибка сохранения ответа:', err);
                    processed++;
                    
                    if (processed === questions.length) {
                        res.render('result', { correctCount, total: questions.length });
                    }
                }
            );
        });
    });
});

app.get('/admin/questions', checkAuth, checkAdmin, (req, res) => {
    db.all(`SELECT * FROM questions ORDER BY id`, (err, questions) => {
        if (err) {
            console.error('Ошибка загрузки вопросов:', err);
            return res.status(500).send('Ошибка');
        }
        res.render('admin_questions', { questions: questions || [] });
    });
});

app.post('/admin/questions/add', checkAuth, checkAdmin, (req, res) => {
    const { text, correct_answer } = req.body;
    if (!text || !correct_answer) {
        return res.redirect('/admin/questions');
    }
    
    db.run(`INSERT INTO questions (text, correct_answer) VALUES (?, ?)`, 
        [text, correct_answer], 
        (err) => {
            if (err) console.error('Ошибка добавления вопроса:', err);
            res.redirect('/admin/questions');
        }
    );
});

app.post('/admin/questions/delete/:id', checkAuth, checkAdmin, (req, res) => {
    const id = req.params.id;
    
    db.run(`DELETE FROM user_answers WHERE question_id = ?`, [id], (err) => {
        if (err) console.error('Ошибка удаления ответов:', err);
        
        db.run(`DELETE FROM questions WHERE id = ?`, [id], (err) => {
            if (err) console.error('Ошибка удаления вопроса:', err);
            res.redirect('/admin/questions');
        });
    });
});

app.get('/admin/users-stats', checkAuth, checkAdmin, (req, res) => {
    const query = `
        SELECT 
            u.id,
            u.login,
            COUNT(DISTINCT ua.question_id) as total_answers,
            SUM(ua.is_correct) as correct_answers,
            ROUND(CAST(SUM(ua.is_correct) AS FLOAT) / NULLIF(COUNT(DISTINCT ua.question_id), 0) * 100, 2) as percentage
        FROM users u
        LEFT JOIN user_answers ua ON u.id = ua.user_id
        GROUP BY u.id
        ORDER BY percentage DESC
    `;
    
    db.all(query, (err, usersStats) => {
        if (err) {
            console.error('Ошибка статистики:', err);
            return res.status(500).send('Ошибка статистики');
        }
        res.render('admin_stats', { usersStats: usersStats || [] });
    });
});

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
        LIMIT 100
    `;
    
    db.all(query, (err, answers) => {
        if (err) {
            console.error('Ошибка загрузки ответов:', err);
            return res.status(500).send('Ошибка');
        }
        res.render('admin_all_answers', { answers: answers || [] });
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const startServer = (port) => {
    const server = app.listen(port, '0.0.0.0')
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Порт ${port} занят, пробую порт ${port + 1}...`);
                startServer(port + 1);
            } else {
                console.error('Ошибка сервера:', err);
                process.exit(1);
            }
        })
        .on('listening', () => {
            console.log(`Сервер запущен: http://localhost`);
            console.log(`Health check: http://localhost/health`);
        });
};

// Запускаем сервер
startServer(PORT);