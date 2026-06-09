const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            correct_answer TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS user_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            user_answer TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )
    `);

    db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
        if (err) {
            console.error('Ошибка проверки пользователей:', err);
            return;
        }
        
        if (row && row.count === 0) {
            const adminPass = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT INTO users (login, password, is_admin) VALUES (?, ?, ?)`, 
                ['admin', adminPass, 1], (err) => {
                    if (err) console.error('Ошибка создания админа:', err);
                    else console.log('Админ создан');
                });
            
            const userPass = bcrypt.hashSync('user123', 10);
            db.run(`INSERT INTO users (login, password, is_admin) VALUES (?, ?, ?)`, 
                ['user', userPass, 0], (err) => {
                    if (err) console.error('Ошибка создания пользователя:', err);
                    else console.log('Пользователь создан');
                });
        }
    });

    db.get(`SELECT COUNT(*) as count FROM questions`, (err, row) => {
        if (err) {
            console.error('Ошибка проверки вопросов:', err);
            return;
        }
        
        if (row && row.count === 0) {
            const questions = [
                { text: 'Сколько будет 2 + 2?', correct: '4' },
                { text: 'Столица Франции?', correct: 'Париж' },
                { text: 'Какой цвет у неба в ясный день?', correct: 'Голубой' }
            ];
            const stmt = db.prepare(`INSERT INTO questions (text, correct_answer) VALUES (?, ?)`);
            questions.forEach(q => {
                stmt.run(q.text, q.correct, (err) => {
                    if (err) console.error('Ошибка добавления вопроса:', err);
                });
            });
            stmt.finalize();
            console.log('Вопросы созданы');
        }
    });
});

console.log('База данных инициализирована');

module.exports = db;