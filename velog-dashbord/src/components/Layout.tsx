import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('velog_access_token');
    localStorage.removeItem('velog_refresh_token');
    localStorage.removeItem('velog_username');
    // 로그인 페이지로 이동
    navigate('/login', { replace: true });
  };

  const username = localStorage.getItem('velog_username') || '';

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">velog-total-views-tracker</span>
          </div>
          <div className="nav-right">
            <span className="nav-username">@{username}</span>
            <button onClick={handleLogout} className="btn-logout">
              로그아웃
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
