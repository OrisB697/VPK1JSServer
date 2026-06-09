import { query } from '../config/database';
import { Task, TaskWithProject, TaskFilters, TaskStatus } from '../types';

export async function getAllTasks(filters?: TaskFilters): Promise<TaskWithProject[]> {
    let sql = `
        SELECT t.*, p.project_name 
        FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE 1=1
    `;
    const params: any[] = [];
    
    if (filters?.status) {
        sql += ` AND t.status = $${params.length + 1}`;
        params.push(filters.status);
    }
    
    if (filters?.project_id) {
        sql += ` AND t.project_id = $${params.length + 1}`;
        params.push(filters.project_id);
    }
    
    sql += ` ORDER BY t.priority DESC, t.created_at DESC`;
    
    return query<TaskWithProject>(sql, params);
}

export async function getTaskById(id: number): Promise<TaskWithProject | null> {
    const tasks = await query<TaskWithProject>(
        `SELECT t.*, p.project_name 
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.id = $1`,
        [id]
    );
    return tasks[0] || null;
}

export async function createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const result = await query<Task>(
        `INSERT INTO tasks (title, description, status, priority, project_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [task.title, task.description, task.status, task.priority, task.project_id]
    );
    return result[0];
}

export async function updateTaskStatus(id: number, newStatus: TaskStatus): Promise<Task | null> {
    const result = await query<Task>(
        `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *`,
        [newStatus, id]
    );
    return result[0] || null;
}

export async function getAllProjects(): Promise<{ id: number; project_name: string }[]> {
    return query('SELECT id, project_name FROM projects ORDER BY project_name');
}