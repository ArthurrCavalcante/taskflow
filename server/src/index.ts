import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import boardRoutes from './routes/boards';
import taskRoutes from './routes/tasks';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`TaskFlow API running on port ${PORT}`);
});

export default app;
