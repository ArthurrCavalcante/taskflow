import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All task routes require authentication
router.use(authMiddleware);

// POST /api/tasks - Create a new task
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, status, priority, boardId } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Task title is required.' });
      return;
    }

    if (!boardId) {
      res.status(400).json({ error: 'Board ID is required.' });
      return;
    }

    // Verify board belongs to the user
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId: req.userId },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found.' });
      return;
    }

    // Determine the order: count of tasks in the target status column
    const taskStatus = status || 'todo';
    const taskCount = await prisma.task.count({
      where: { boardId, status: taskStatus },
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || '',
        status: taskStatus,
        priority: priority || 'medium',
        order: taskCount,
        boardId,
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/tasks/reorder - Batch reorder tasks (drag-and-drop)
// This MUST come before /:id route to avoid matching "reorder" as an id
router.patch('/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      res.status(400).json({ error: 'An array of tasks with id, status, and order is required.' });
      return;
    }

    // Validate all task entries have required fields
    for (const t of tasks) {
      if (typeof t.id !== 'number' || typeof t.status !== 'string' || typeof t.order !== 'number') {
        res.status(400).json({ error: 'Each task must have id (number), status (string), and order (number).' });
        return;
      }
    }

    // Verify all tasks belong to boards owned by the current user
    const taskIds = tasks.map((t: { id: number }) => t.id);
    const existingTasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: { board: { select: { userId: true } } },
    });

    // Check that we found all tasks and they all belong to the user
    if (existingTasks.length !== taskIds.length) {
      res.status(404).json({ error: 'One or more tasks were not found.' });
      return;
    }

    const unauthorized = existingTasks.some(t => t.board.userId !== req.userId);
    if (unauthorized) {
      res.status(403).json({ error: 'You do not have permission to reorder these tasks.' });
      return;
    }

    // Batch update all tasks using a transaction
    await prisma.$transaction(
      tasks.map((t: { id: number; status: string; order: number }) =>
        prisma.task.update({
          where: { id: t.id },
          data: { status: t.status, order: t.order },
        })
      )
    );

    res.json({ message: 'Tasks reordered successfully.' });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/tasks/:id - Update a task
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = parseInt(req.params.id as string);

    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID.' });
      return;
    }

    // Find the task and verify ownership through the board
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { select: { userId: true } } },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (existingTask.board.userId !== req.userId) {
      res.status(403).json({ error: 'You do not have permission to update this task.' });
      return;
    }

    const { title, description, status, priority, order } = req.body;

    // Build update data dynamically (only include provided fields)
    const updateData: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      order?: number;
    } = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (order !== undefined) updateData.order = order;

    // Handle status change (moving between columns)
    if (status !== undefined && status !== existingTask.status) {
      updateData.status = status;

      // Reorder tasks in the source column: shift down tasks that were after the moved task
      await prisma.task.updateMany({
        where: {
          boardId: existingTask.boardId,
          status: existingTask.status,
          order: { gt: existingTask.order },
        },
        data: {
          order: { decrement: 1 },
        },
      });

      // Set order in target column to the end (unless explicitly provided)
      if (order === undefined) {
        const targetColumnCount = await prisma.task.count({
          where: {
            boardId: existingTask.boardId,
            status: status,
          },
        });
        updateData.order = targetColumnCount;
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = parseInt(req.params.id as string);

    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID.' });
      return;
    }

    // Find the task and verify ownership through the board
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { board: { select: { userId: true } } },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (existingTask.board.userId !== req.userId) {
      res.status(403).json({ error: 'You do not have permission to delete this task.' });
      return;
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId },
    });

    // Reorder remaining tasks in the same column
    await prisma.task.updateMany({
      where: {
        boardId: existingTask.boardId,
        status: existingTask.status,
        order: { gt: existingTask.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
