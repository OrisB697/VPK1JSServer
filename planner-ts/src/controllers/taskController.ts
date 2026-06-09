import { Request, Response } from 'express';
import * as taskService from '../services/taskService';
import { TaskStatus, TaskFilters } from '../types';

export async function getTasks(req: Request, res: Response): Promise<void> {
    const filters: TaskFilters = {};
    
    const status = req.query.status;
    if (status && typeof status === 'string') {
        filters.status = status as TaskStatus;
    }
    
    const projectIdParam = req.query.project_id;
    if (projectIdParam && typeof projectIdParam === 'string') {
        const projectId = parseInt(projectIdParam);
        if (!isNaN(projectId)) {
            filters.project_id = projectId;
        }
    }
    
    const [tasks, projects] = await Promise.all([
        taskService.getAllTasks(filters),
        taskService.getAllProjects()
    ]);
    
    res.render('pages/tasks', {
        title: 'Список задач',
        tasks,
        projects,
        currentStatus: filters.status || '',
        currentProjectId: filters.project_id || ''
    });
}

export async function getTaskById(req: Request, res: Response): Promise<void> {
    const idParam = req.params.id;
    if (Array.isArray(idParam)) {
        res.status(400).send('Неверный формат ID');
        return;
    }
    
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
        res.status(404).send('Задача не найдена');
        return;
    }
    
    const task = await taskService.getTaskById(id);
    
    if (!task) {
        res.status(404).send('Задача не найдена');
        return;
    }
    
    res.render('pages/task-detail', {
        title: task.title,
        task
    });
}

export async function showNewTaskForm(req: Request, res: Response): Promise<void> {
    const projects = await taskService.getAllProjects();
    
    res.render('pages/new-task', {
        title: 'Новая задача',
        projects
    });
}

export async function createTask(req: Request, res: Response): Promise<void> {
    const { title, description, priority, project_id } = req.body;
    
    await taskService.createTask({
        title,
        description: description || null,
        status: 'todo' as TaskStatus,
        priority: parseInt(priority),
        project_id: parseInt(project_id)
    });
    
    res.redirect('/tasks');
}

export async function changeTaskStatus(req: Request, res: Response): Promise<void> {
    const idParam = req.params.id;
    if (Array.isArray(idParam)) {
        res.status(400).send('Неверный формат ID');
        return;
    }
    
    const id = parseInt(idParam);
    const { newStatus } = req.body;
    
    if (isNaN(id)) {
        res.status(404).send('Задача не найдена');
        return;
    }
    
    await taskService.updateTaskStatus(id, newStatus as TaskStatus);
    res.redirect('/tasks');
}