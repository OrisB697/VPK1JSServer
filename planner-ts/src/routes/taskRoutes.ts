import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { validatePriority, validateTaskStatus } from '../middleware/validation';

const router = Router();

router.get('/', taskController.getTasks);
router.get('/new', taskController.showNewTaskForm);
router.post('/', validatePriority, taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.post('/:id/status', validateTaskStatus, taskController.changeTaskStatus);

export default router;