import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className={styles.header}>
      <Link to="/dashboard" className={styles.logo}>
        <span className={styles.logoIcon}>◆</span>
        TaskFlow
      </Link>

      {user && (
        <div className={styles.userSection}>
          <div className={styles.avatar}>{user.name.charAt(0)}</div>
          <span className={styles.userName}>{user.name}</span>
          <button className={styles.logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
