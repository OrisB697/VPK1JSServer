const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Пути к файлам
const questionsPath = path.join(__dirname, 'config/questions.json');
const feedbackPath = path.join(__dirname, 'data/feedback.json');

// Инициализация файла с отзывами
function initFeedbackFile() {
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'));
    }
    if (!fs.existsSync(feedbackPath)) {
        fs.writeFileSync(feedbackPath, JSON.stringify([], null, 2));
    }
}

// Загрузка вопросов
function loadQuestions() {
    try {
        const data = fs.readFileSync(questionsPath, 'utf8');
        return JSON.parse(data).questions;
    } catch (error) {
        console.error('Ошибка загрузки вопросов:', error);
        return [];
    }
}

// Загрузка отзывов
function loadFeedback() {
    try {
        const data = fs.readFileSync(feedbackPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Сохранение отзыва
function saveFeedback(feedback) {
    const feedbacks = loadFeedback();
    feedbacks.push({
        ...feedback,
        id: Date.now(),
        date: new Date().toISOString()
    });
    fs.writeFileSync(feedbackPath, JSON.stringify(feedbacks, null, 2));
}

// Маршруты (все в одном файле, без отдельного роутера)

// Главная страница с формой обратной связи
app.get('/feedback', (req, res) => {
    const questions = loadQuestions();
    res.render('index', { 
        questions: questions,
        title: 'Форма обратной связи'
    });
});

// Обработка отправки формы
app.post('/submit-feedback', (req, res) => {
    try {
        const questions = loadQuestions();
        const answers = {};
        
        questions.forEach(question => {
            const answer = req.body[`question_${question.id}`];
            if (answer && answer.trim()) {
                answers[question.id] = {
                    question: question.question,
                    answer: question.type === 'rating' ? parseInt(answer) : answer.trim(),
                    type: question.type
                };
            }
        });
        
        saveFeedback({
            answers: answers,
            timestamp: new Date().toISOString()
        });
        
        res.render('success', { 
            title: 'Спасибо за отзыв!',
            message: 'Ваш отзыв успешно сохранен. Спасибо за обратную связь!'
        });
    } catch (error) {
        console.error('Ошибка при сохранении отзыва:', error);
        res.status(500).render('error', {
            title: 'Ошибка',
            message: 'Произошла ошибка при сохранении отзыва'
        });
    }
});

// Дашборд преподавателя
app.get('/dashboard', (req, res) => {
    const feedbacks = loadFeedback();
    const ratings = [];
    let totalRating = 0;
    let ratingCount = 0;
    
    feedbacks.forEach(feedback => {
        Object.values(feedback.answers).forEach(answer => {
            if (answer.type === 'rating' && typeof answer.answer === 'number') {
                ratings.push(answer.answer);
                totalRating += answer.answer;
                ratingCount++;
            }
        });
    });
    
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    
    const ratingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    ratings.forEach(rating => {
        ratingDistribution[rating]++;
    });
    
    res.render('dashboard', {
        title: 'Дашборд преподавателя',
        totalFeedbacks: feedbacks.length,
        averageRating: averageRating,
        ratingDistribution: ratingDistribution,
        totalRatings: ratingCount
    });
});

// Страница со всеми отзывами
app.get('/all-feedback', (req, res) => {
    const feedbacks = loadFeedback();
    feedbacks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.render('all-feedback', {
        title: 'Все отзывы',
        feedbacks: feedbacks
    });
});

// Перенаправление с корневого пути на /feedback
app.get('/', (req, res) => {
    res.redirect('/feedback');
});

// API для получения данных в JSON
app.get('/api/feedback', (req, res) => {
    const feedbacks = loadFeedback();
    res.json(feedbacks);
});

app.get('/api/stats', (req, res) => {
    const feedbacks = loadFeedback();
    const stats = {
        total: feedbacks.length,
        averageRating: 0,
        ratings: []
    };
    
    let totalRating = 0;
    let ratingCount = 0;
    
    feedbacks.forEach(feedback => {
        Object.values(feedback.answers).forEach(answer => {
            if (answer.type === 'rating') {
                totalRating += answer.answer;
                ratingCount++;
                stats.ratings.push(answer.answer);
            }
        });
    });
    
    stats.averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    
    res.json(stats);
});

// Инициализация
initFeedbackFile();

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Страница обратной связи: http://localhost:${PORT}/feedback`);
    console.log(`Дашборд преподавателя: http://localhost:${PORT}/dashboard`);
    console.log(`Все отзывы: http://localhost:${PORT}/all-feedback`);
});