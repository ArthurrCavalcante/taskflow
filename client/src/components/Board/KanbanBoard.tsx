import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import * as api from '../../services/api';
import Column from './Column';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import styles from './KanbanBoard.module.css';

interface KanbanBoardProps {
  boardId: number;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export default function KanbanBoard({ boardId, tasks, onTasksChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined); // undefined = closed, null = new
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });
    // Sort each group by order
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return grouped;
  }, [tasks]);

  const findTaskById = useCallback(
    (id: number): Task | undefined => tasks.find((t) => t.id === id),
    [tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id as number);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const activeTaskData = findTaskById(activeId);
    if (!activeTaskData) return;

    // Determine the target status
    let targetStatus: TaskStatus | null = null;

    if (over.data.current?.type === 'column') {
      targetStatus = over.data.current.status as TaskStatus;
    } else if (over.data.current?.type === 'task') {
      const overTask = over.data.current.task as Task;
      targetStatus = overTask.status;
    }

    if (!targetStatus || activeTaskData.status === targetStatus) return;

    // Move task to the new column
    const updatedTasks = tasks.map((t) =>
      t.id === activeId ? { ...t, status: targetStatus } : t
    );
    onTasksChange(updatedTasks);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as number;
    const activeTask = findTaskById(activeId);
    if (!activeTask) return;

    let targetStatus: TaskStatus = activeTask.status;

    if (over.data.current?.type === 'column') {
      targetStatus = over.data.current.status as TaskStatus;
    } else if (over.data.current?.type === 'task') {
      const overTask = over.data.current.task as Task;
      targetStatus = overTask.status;
    }

    // Get the tasks in the target column (already updated by dragOver)
    const columnTasks = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.order - b.order);

    // If dropping on another task, reorder within column
    const overId = over.id as number;
    if (over.data.current?.type === 'task' && overId !== activeId) {
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const updatedWithOrder = reordered.map((t, i) => ({ ...t, order: i }));

        // Update local state
        const newTasks = tasks.map((t) => {
          const updated = updatedWithOrder.find((u) => u.id === t.id);
          return updated || t;
        });
        onTasksChange(newTasks);

        // Persist to API
        try {
          await api.reorderTasks(
            updatedWithOrder.map((t) => ({ id: t.id, status: t.status, order: t.order }))
          );
        } catch (err) {
          console.error('Failed to reorder tasks:', err);
        }
        return;
      }
    }

    // Just moved to a new column (no reorder within), update orders
    const updatedColumnTasks = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i }));

    const newTasks = tasks.map((t) => {
      const updated = updatedColumnTasks.find((u) => u.id === t.id);
      return updated || t;
    });
    onTasksChange(newTasks);

    // Persist to API
    try {
      await api.reorderTasks(
        updatedColumnTasks.map((t) => ({ id: t.id, status: t.status, order: t.order }))
      );
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
    }
  };

  const handleAddTask = (status: TaskStatus) => {
    setDefaultStatus(status);
    setModalTask(null); // null = creating new
  };

  const handleEditTask = (task: Task) => {
    setModalTask(task);
  };

  const handleSaveTask = async (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
  }) => {
    if (modalTask) {
      // Editing existing task
      const res = await api.updateTask(modalTask.id, data);
      onTasksChange(tasks.map((t) => (t.id === modalTask.id ? res.task : t)));
    } else {
      // Creating new task
      const res = await api.createTask({
        ...data,
        boardId,
      });
      onTasksChange([...tasks, res.task]);
    }
  };

  const handleDeleteTask = async () => {
    if (!modalTask) return;
    await api.deleteTask(modalTask.id);
    onTasksChange(tasks.filter((t) => t.id !== modalTask.id));
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.board}>
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          defaultStatus={defaultStatus}
          onSave={handleSaveTask}
          onDelete={modalTask ? handleDeleteTask : undefined}
          onClose={() => setModalTask(undefined)}
        />
      )}
    </>
  );
}
