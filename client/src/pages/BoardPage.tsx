import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Board, Task } from '../types';
import * as api from '../services/api';
import Layout from '../components/Layout/Layout';
import KanbanBoard from '../components/Board/KanbanBoard';
import styles from './Board.module.css';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchBoard = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getBoard(Number(id));
      setBoard(data.board);
      setTasks(data.board.tasks ?? []);
      setTitleValue(data.board.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (!board || !titleValue.trim() || titleValue.trim() === board.title) {
      setTitleValue(board?.title ?? '');
      return;
    }
    try {
      const data = await api.updateBoard(board.id, titleValue.trim());
      setBoard(data.board);
      setTitleValue(data.board.title);
    } catch (err) {
      console.error('Failed to update board title:', err);
      setTitleValue(board.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setTitleValue(board?.title ?? '');
      setEditingTitle(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
        </div>
      </Layout>
    );
  }

  if (error || !board) {
    return (
      <Layout>
        <div className={styles.errorState}>
          <h2 className={styles.errorTitle}>Board not found</h2>
          <p>{error || 'The board you are looking for does not exist.'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            ←
          </button>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              className={styles.titleInput}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h1
              className={styles.boardTitle}
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
            >
              {board.title}
            </h1>
          )}
        </div>

        <KanbanBoard
          boardId={board.id}
          tasks={tasks}
          onTasksChange={setTasks}
        />
      </div>
    </Layout>
  );
}
