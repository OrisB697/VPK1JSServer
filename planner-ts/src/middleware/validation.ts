import { Request, Response, NextFunction } from 'express';
import { TaskStatus } from '../types';

export function validatePriority(req: Request, res: Response, next: NextFunction): void {
    const priority = parseInt(req.body.priority);
    
    if (isNaN(priority) || priority < 1 || priority > 5) {
        res.status(400).send('Приоритет должен быть числом от 1 до 5');
        return;
    }
    
    req.body.priority = priority;
    next();
}

export function validateTaskStatus(req: Request, res: Response, next: NextFunction): void {
    const { newStatus } = req.body;
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
    
    if (!newStatus || !validStatuses.includes(newStatus as TaskStatus)) {
        res.status(400).send('Неверный статус задачи');
        return;
    }
    
    next();
}