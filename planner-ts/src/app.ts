import express from 'express';
import path from 'path';
import taskRoutes from './routes/taskRoutes';
import { initDatabase } from './config/init-db';

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'views')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/tasks', taskRoutes);
app.get('/', (req, res) => {
    res.redirect('/tasks');
});

initDatabase();

export default app;