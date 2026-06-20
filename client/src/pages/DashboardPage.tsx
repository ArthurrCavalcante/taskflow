import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Board } from '../types';
import * as api from '../services/api';
import Layout from '../components/Layout/Layout';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchBoards = useCallback(async () => {
    try {
      const data = await api.getBoards();
      setBoards(data.boards);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    setCreating(true);
    try {
      const data = await api.createBoard(newBoardTitle.trim());
      setBoards((prev) => [...prev, data.board]);
      setNewBoardTitle('');
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this board? All tasks will be lost.')) {
      return;
    }

    try {
      await api.deleteBoard(boardId);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Boards</h1>
          <Button onClick={() => setShowModal(true)} size="sm">
            + New Board
          </Button>
        </div>

        {boards.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h2 className={styles.emptyTitle}>No boards yet</h2>
            <p className={styles.emptyDescription}>
              Create your first board to start organizing your tasks with a beautiful Kanban workflow.
            </p>
            <Button onClick={() => setShowModal(true)}>Create Your First Board</Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {boards.map((board) => (
              <div
                key={board.id}
                className={styles.boardCard}
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <div className={styles.boardCardHeader}>
                  <h3 className={styles.boardTitle}>{board.title}</h3>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteBoard(board.id, e)}
                    aria-label="Delete board"
                  >
                    🗑
                  </button>
                </div>
                <div className={styles.boardMeta}>
                  <span className={styles.taskCount}>
                    {board._count?.tasks ?? 0} tasks
                  </span>
                  <span className={styles.boardDate}>
                    {formatDate(board.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            <div
              className={styles.newBoardCard}
              onClick={() => setShowModal(true)}
            >
              <span className={styles.newBoardIcon}>+</span>
              <span className={styles.newBoardText}>New Board</span>
            </div>
          </div>
        )}

        {showModal && (
          <Modal title="Create New Board" onClose={() => setShowModal(false)}>
            <form className={styles.modalForm} onSubmit={handleCreateBoard}>
              <Input
                label="Board Title"
                placeholder="e.g. Product Launch, Sprint 12..."
                value={newBoardTitle}
                onChange={(e: any) => setNewBoardTitle((e.target as HTMLInputElement).value)}
                autoFocus
              />
              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={creating}>
                  Create Board
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
