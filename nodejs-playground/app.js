const express = require('express');
const fs = require('fs');
const path = require('path')
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Статические файлы из папки style
app.use(express.static(path.join(__dirname, 'style')));
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.render('index', { data: readJsonData()});
});

app.post('/submit', (req,res) => {
    const answers = req.body;

    saveDataToJson(answers);

    res.render('submit')
})

app.post('/direction', (req, res) => {
    res.render('direction', {data: readJsonDataDirection()});
})

app.post('/textplaces', (req, res) => {
    res.render('textplaces', {data: readJsonDataDirection()});
})

function readJsonDataDirection()
{
    const dirName = path.join(__dirname, 'res/answers.json');
    const fileName = fs.readFileSync(dirName, 'utf-8');
    const data = JSON.parse(fileName);
    return data;
}

function readJsonData()
{
    const dirName = path.join(__dirname, 'res/question.json');
    const rawFile = fs.readFileSync(dirName, 'utf-8');
    const data = JSON.parse(rawFile);
    return data;
}

function saveDataToJson(answers)
{
    const dirPath = path.join(__dirname, 'res');
    const filePath = path.join(dirPath, 'answers.json');

    const answerWithTimestamp = {
        timestamp: new Date().toISOString(),
        answers: answers
    };
    
    let existingAnswers = [];
    
    // Проверяем, существует ли уже файл с ответами
    if (fs.existsSync(filePath)) {
        const rawFile = fs.readFileSync(filePath, 'utf-8');
        try {
            existingAnswers = JSON.parse(rawFile);
        } catch (error) {
            console.error('Ошибка чтения answers.json:', error);
            existingAnswers = [];
        }
    }
    
    // Добавляем новые ответы к существующим
    existingAnswers.push(answerWithTimestamp);
    
    // Сохраняем обновленный массив в файл
    fs.writeFileSync(filePath, JSON.stringify(existingAnswers, null, 2), 'utf-8');
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});