import { useState, type FormEvent } from 'react';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import styles from './TaskModal.module.css';

interface TaskModalProps {
  task?: Task | null;
  defaultStatus?: TaskStatus;
  onSave: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function TaskModal({
  task,
  defaultStatus = 'todo',
  onSave,
  onDelete,
  onClose,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!task;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), status, priority });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
      setDeleting(false);
    }
  };

  return (
    <Modal title={isEditing ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
          error={error && !title.trim() ? 'Title is required' : undefined}
          autoFocus
        />

        <Input
          label="Description"
          placeholder="Add more details..."
          value={description}
          onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          textarea
        />

        <div className={styles.selectWrapper}>
          <label className={styles.selectLabel}>Priority</label>
          <select
            className={styles.select}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>

        {isEditing && (
          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>Status</label>
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        {error && <p style={{ color: 'var(--error)', fontSize: '14px' }}>{error}</p>}

        <div
          className={`${styles.actions} ${
            isEditing ? styles.actionsSpaceBetween : ''
          }`}
        >
          {isEditing && onDelete && (
            <Button
              variant="danger"
              type="button"
              onClick={handleDelete}
              loading={deleting}
              size="sm"
            >
              Delete
            </Button>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
