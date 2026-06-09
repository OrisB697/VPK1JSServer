export interface BaseViewModel {
    title: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Project {
    id: number;
    project_name: string;
    description: string | null;
}

export interface Task {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: number;
    project_id: number;
    created_at: Date;
}

export interface TaskWithProject extends Task {
    project_name: string;
}

export interface TaskFilters {
    status?: TaskStatus;
    project_id?: number;
}

export interface ChangeStatusBody {
    newStatus: TaskStatus;
}