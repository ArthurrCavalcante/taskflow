import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isOverlay?: boolean;
}

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function TaskCard({ task, onClick, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardClasses = [
    styles.taskCard,
    styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`],
    isDragging ? styles.dragging : '',
    isOverlay ? styles.dragOverlay : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badgeClass = [
    styles.priorityBadge,
    styles[`badge${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`],
  ].join(' ');

  // In overlay mode, don't attach sortable refs
  if (isOverlay) {
    return (
      <div className={cardClasses}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{task.title}</span>
          <span className={styles.dragHandle}>⠿</span>
        </div>
        {task.description && (
          <p className={styles.cardDescription}>{task.description}</p>
        )}
        <div className={styles.cardFooter}>
          <span className={badgeClass}>
            <span className={styles.priorityDot} />
            {priorityLabels[task.priority]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClasses}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{task.title}</span>
        <span className={styles.dragHandle}>⠿</span>
      </div>
      {task.description && (
        <p className={styles.cardDescription}>{task.description}</p>
      )}
      <div className={styles.cardFooter}>
        <span className={badgeClass}>
          <span className={styles.priorityDot} />
          {priorityLabels[task.priority]}
        </span>
      </div>
    </div>
  );
}
