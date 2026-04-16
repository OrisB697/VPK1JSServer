const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Пути к файлам
const questionsPath = path.join(__dirname, '../config/questions.json');
const feedbackPath = path.join(__dirname, '../data/feedback.json');

// Инициализация файла с отзывами
function initFeedbackFile() {
    if (!fs.existsSync(path.join(__dirname, '../data'))) {
        fs.mkdirSync(path.join(__dirname, '../data'));
    }
    if (!fs.existsSync(feedbackPath)) {
        fs.writeFileSync(feedbackPath, JSON.stringify([], null, 2));
    }
}

// Загрузка вопросов
function loadQuestions() {
    const data = fs.readFileSync(questionsPath, 'utf8');
    return JSON.parse(data).questions;
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

// Главная страница с формой обратной связи
router.get('/feedback', (req, res) => {
    const questions = loadQuestions();
    res.render('index', { 
        questions: questions,
        title: 'Форма обратной связи'
    });
});

// Обработка отправки формы
router.post('/submit-feedback', (req, res) => {
    try {
        const questions = loadQuestions();
        const answers = {};
        
        // Сбор ответов
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
        
        // Сохранение отзыва
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
router.get('/dashboard', (req, res) => {
    const feedbacks = loadFeedback();
    const ratings = [];
    let totalRating = 0;
    let ratingCount = 0;
    
    // Подсчет средней оценки
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
    
    // Статистика по оценкам
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
router.get('/all-feedback', (req, res) => {
    const feedbacks = loadFeedback();
    // Сортировка по дате (новые сверху)
    feedbacks.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.render('all-feedback', {
        title: 'Все отзывы',
        feedbacks: feedbacks
    });
});

// API для получения данных в JSON (для дополнительных возможностей)
router.get('/api/feedback', (req, res) => {
    const feedbacks = loadFeedback();
    res.json(feedbacks);
});

router.get('/api/stats', (req, res) => {
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

initFeedbackFile();

module.exports = router;