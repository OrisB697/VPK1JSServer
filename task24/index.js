const fs = require('fs').promises;
const path = require('path');
const commandLineArgs = require('command-line-args');

const KB = 1024;
const MB = 1024 * 1024;
const SMALL_LIMIT = KB; 
const MEDIUM_LIMIT = MB;

const optionDefinitions = [
    { name: 'path', type: String, defaultOption: true }
];


function getCategory(size) {
    if (size < SMALL_LIMIT) return 'small';
    if (size < MEDIUM_LIMIT) return 'medium';
    return 'large';
}

async function organizeFiles() {
    try {
        const options = commandLineArgs(optionDefinitions);
        
        if (!options.path) {
            console.error('Ошибка: укажите путь к папке');
            return;
        }

        const targetPath = path.resolve(options.path);
        
        try {
            await fs.access(targetPath);
        } catch {
            console.error(`Ошибка: папка "${targetPath}" не существует`);
            return;
        }

        const categories = ['small', 'medium', 'large'];
        for (const category of categories) {
            const categoryPath = path.join(targetPath, category);
            try {
                await fs.mkdir(categoryPath, { recursive: true });
            } catch (err) {
                console.error(`Ошибка при создании папки ${category}:`, err.message);
            }
        }

        const files = await fs.readdir(targetPath);
        
        for (const file of files) {
            const filePath = path.join(targetPath, file);
            
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) continue;

            const category = getCategory(stat.size);
            const destPath = path.join(targetPath, category, file);

            await fs.rename(filePath, destPath);
            console.log(`Перемещен: ${file} (${stat.size} байт) -> ${category}/`);
        }

        console.log('\nСортировка завершена!');

    } catch (err) {
        console.error('Произошла ошибка:', err.message);
    }
}

organizeFiles();