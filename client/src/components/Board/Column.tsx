import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import styles from './Column.module.css';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
}

const columnConfig: Record<TaskStatus, { title: string; dotClass: string }> = {
  todo: { title: 'To Do', dotClass: styles.statusTodo },
  in_progress: { title: 'In Progress', dotClass: styles.statusInProgress },
  done: { title: 'Done', dotClass: styles.statusDone },
};

export default function Column({ status, tasks, onAddTask, onEditTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: 'column', status },
  });

  const config = columnConfig[status];
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <span className={`${styles.statusDot} ${config.dotClass}`} />
          {config.title}
        </div>
        <span className={styles.count}>{tasks.length}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`${styles.taskList} ${isOver ? styles.taskListOver : ''}`}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onEditTask(task)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        className={styles.addTaskBtn}
        onClick={() => onAddTask(status)}
      >
        + Add Task
      </button>
    </div>
  );
}
