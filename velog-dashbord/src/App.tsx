import { useState, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import './App.css';

function App() {
  // 로컬 스토리지에서 초기 인증 상태 확인
  const getInitialAuth = () => {
    const accessToken = localStorage.getItem('velog_access_token');
    return !!accessToken;
  };

  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuth);
  const [isLoading, setIsLoading] = useState(false);

  useLayoutEffect(() => {
    // 초기 상태는 이미 설정되었으므로 추가 동작 없음
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          } 
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
