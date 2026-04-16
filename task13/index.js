const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function addidPer(num) {
    let steps = 0;
    
    while (num > 9) {
        let sum = 0;
        const numStr = num.toString();
        
        for (let i = 0; i < numStr.length; i++) {
            sum += parseInt(numStr[i], 10);
        }
        
        num = sum;
        steps++;
        console.log(`Шаг ${steps}: ${sum}`);
    }
    
    return steps;
}

rl.question('Введите число: ', (answer) => {
    const inputNumber = parseInt(answer, 10);

    if (isNaN(inputNumber)) {
        console.log('Ошибка: введите корректное число.');
    } else {
        const result = addidPer(inputNumber);
        console.log(`\nАддитивная устойчивость: ${result}`);
    }

    rl.close();
});