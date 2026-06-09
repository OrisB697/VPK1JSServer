import pool from './database';

const initSQL = `
    CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_name VARCHAR(100) NOT NULL,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
        priority INT CHECK (priority >= 1 AND priority <= 5) DEFAULT 3,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO projects (project_name, description) 
    SELECT 'Веб-сайт', 'Разработка корпоративного сайта'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE project_name = 'Веб-сайт');

    INSERT INTO projects (project_name, description) 
    SELECT 'Мобильное приложение', 'Приложение для заказа еды'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE project_name = 'Мобильное приложение');

    INSERT INTO projects (project_name, description) 
    SELECT 'Домашний проект', 'Ремонт в квартире'
    WHERE NOT EXISTS (SELECT 1 FROM projects WHERE project_name = 'Домашний проект');

    INSERT INTO tasks (title, description, status, priority, project_id) 
    SELECT 'Создать дизайн', 'Нарисовать макеты главной страницы', 'todo', 5, id
    FROM projects WHERE project_name = 'Веб-сайт'
    AND NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Создать дизайн');

    INSERT INTO tasks (title, description, status, priority, project_id) 
    SELECT 'Написать бэкенд', 'API на Express', 'in_progress', 4, id
    FROM projects WHERE project_name = 'Веб-сайт'
    AND NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Написать бэкенд');
`;

export async function initDatabase(): Promise<void> {
    try {
        await pool.query(initSQL);
        console.log('База данных инициализирована');
    } catch (error) {
        console.error('Ошибка инициализации БД:', error);
        throw error;
    }
}