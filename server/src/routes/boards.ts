import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All board routes require authentication
router.use(authMiddleware);

// GET /api/boards - List all boards for the current user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await prisma.board.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ boards });
  } catch (error) {
    console.error('List boards error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/boards - Create a new board
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Board title is required.' });
      return;
    }

    const board = await prisma.board.create({
      data: {
        title: title.trim(),
        userId: req.userId!,
        tasks: {
          create: [
            {
              title: 'Welcome to your new board!',
              description: 'This is an example task. You can edit or delete it.',
              status: 'todo',
              priority: 'low',
              order: 0,
            },
            {
              title: 'Drag tasks between columns',
              description: 'Move tasks from To Do to In Progress to Done.',
              status: 'in_progress',
              priority: 'medium',
              order: 0,
            },
            {
              title: 'Completed tasks go here',
              description: 'Once a task is finished, move it to the Done column.',
              status: 'done',
              priority: 'high',
              order: 0,
            },
          ],
        },
      },
      include: {
        tasks: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    res.status(201).json({ board });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/boards/:id - Get a specific board with all tasks
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = parseInt(req.params.id as string);

    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID.' });
      return;
    }

    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId: req.userId,
      },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found.' });
      return;
    }

    res.json({ board });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/boards/:id - Update board title
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = parseInt(req.params.id as string);
    const { title } = req.body;

    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID.' });
      return;
    }

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Board title is required.' });
      return;
    }

    // Verify ownership
    const existingBoard = await prisma.board.findFirst({
      where: { id: boardId, userId: req.userId },
    });

    if (!existingBoard) {
      res.status(404).json({ error: 'Board not found.' });
      return;
    }

    const board = await prisma.board.update({
      where: { id: boardId },
      data: { title: title.trim() },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    res.json({ board });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/boards/:id - Delete board and all its tasks
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardId = parseInt(req.params.id as string);

    if (isNaN(boardId)) {
      res.status(400).json({ error: 'Invalid board ID.' });
      return;
    }

    // Verify ownership
    const existingBoard = await prisma.board.findFirst({
      where: { id: boardId, userId: req.userId },
    });

    if (!existingBoard) {
      res.status(404).json({ error: 'Board not found.' });
      return;
    }

    // Cascade delete will remove all tasks automatically
    await prisma.board.delete({
      where: { id: boardId },
    });

    res.json({ message: 'Board deleted successfully.' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
