const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'style')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'dfg987dfgs9s9g7d8yijh29d9g9',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        
        if (roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).send('Доступ запрещен');
        }
    };
};

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { login, password } = req.body;
    const usersData = readUsersData();
    
    const user = usersData.users.find(
        u => u.login === login && u.password === password
    );
    
    if (user) {
        req.session.user = {
            id: user.id,
            login: user.login,
            role: user.role
        };
        
        if (user.role === 'teacher') {
            res.redirect('/');
        } else {
            res.redirect('/');
        }
    } else {
        res.render('login', { error: 'Неверный логин или пароль' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/login');
    });
});

app.get('/', checkRole(['teacher', 'student']), (req, res) => {
    res.render('index', { data: readJsonData() });
});

app.post('/submit', checkRole(['teacher', 'student']), (req, res) => {
    const answers = req.body;
    saveDataToJson(answers);
    res.render('submit');
});

app.post('/direction', checkRole(['teacher']), (req, res) => {
    res.render('direction', { data: readJsonDataDirection() });
});

app.post('/textplaces', checkRole(['teacher']), (req, res) => {
    res.render('textplaces', { data: readJsonDataDirection() });
});

function readUsersData() {
    const filePath = path.join(__dirname, 'res/users.json');
    const rawFile = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(rawFile);
}

function readJsonDataDirection() {
    const dirName = path.join(__dirname, 'res/answers.json');
    const fileName = fs.readFileSync(dirName, 'utf-8');
    const data = JSON.parse(fileName);
    return data;
}

function readJsonData() {
    const dirName = path.join(__dirname, 'res/question.json');
    const rawFile = fs.readFileSync(dirName, 'utf-8');
    const data = JSON.parse(rawFile);
    return data;
}

function saveDataToJson(answers) {
    const dirPath = path.join(__dirname, 'res');
    const filePath = path.join(dirPath, 'answers.json');

    const answerWithTimestamp = {
        timestamp: new Date().toISOString(),
        answers: answers
    };
    
    let existingAnswers = [];
    
    if (fs.existsSync(filePath)) {
        const rawFile = fs.readFileSync(filePath, 'utf-8');
        try {
            existingAnswers = JSON.parse(rawFile);
        } catch (error) {
            console.error('Ошибка чтения answers.json:', error);
            existingAnswers = [];
        }
    }
    
    existingAnswers.push(answerWithTimestamp);
    fs.writeFileSync(filePath, JSON.stringify(existingAnswers, null, 2), 'utf-8');
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});