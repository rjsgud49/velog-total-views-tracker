import { useState } from 'react';
import { fetchUser, parseCookies } from '../utils/velogApi';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [fullCookie, setFullCookie] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 쿠키 전체 입력 시 자동으로 토큰 추출
  const handleCookieChange = (cookieValue: string) => {
    setFullCookie(cookieValue);
    
    if (cookieValue) {
      const parsed = parseCookies(cookieValue);
      if (parsed.accessToken) {
        setAccessToken(parsed.accessToken);
      }
      if (parsed.refreshToken) {
        setRefreshToken(parsed.refreshToken);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalAccessToken = accessToken;
      let finalRefreshToken: string | undefined = refreshToken || undefined;

      // 쿠키 전체가 입력되어 있으면 파싱해서 사용
      if (fullCookie && !finalAccessToken) {
        const parsed = parseCookies(fullCookie);
        if (!parsed.accessToken) {
          throw new Error('쿠키에서 access_token을 찾을 수 없습니다.');
        }
        finalAccessToken = parsed.accessToken;
        finalRefreshToken = parsed.refreshToken || undefined;
      }

      if (!finalAccessToken) {
        throw new Error('Access Token 또는 쿠키를 입력해주세요.');
      }

      // 사용자 정보로 인증 테스트
      const user = await fetchUser(username, finalAccessToken, finalRefreshToken);
      
      if (!user) {
        throw new Error('사용자 정보를 가져올 수 없습니다. 토큰을 확인해주세요.');
      }

      // 로컬 스토리지에 저장
      localStorage.setItem('velog_access_token', finalAccessToken);
      if (finalRefreshToken) {
        localStorage.setItem('velog_refresh_token', finalRefreshToken);
      }
      localStorage.setItem('velog_username', username);

      onLogin();
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Velog Analytics</h1>
          <p>Velog 통계를 한눈에 확인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Velog 사용자명</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="myusername"
              required
              disabled={loading}
            />
            <small>@ 기호 없이 사용자명만 입력하세요</small>
          </div>

          <div className="form-group">
            <label htmlFor="fullCookie">쿠키 전체 (권장)</label>
            <textarea
              id="fullCookie"
              value={fullCookie}
              onChange={(e) => handleCookieChange(e.target.value)}
              placeholder="access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; velog=..."
              rows={3}
              disabled={loading}
              style={{ fontFamily: 'Courier New, monospace', fontSize: '0.875rem' }}
            />
            <small>
              Network 탭 → graphql 요청 → Headers → Request Headers → <code>cookie:</code> 헤더의 전체 값을 복사하여 붙여넣으세요.<br />
              토큰이 자동으로 추출됩니다.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="accessToken">Access Token (수동 입력)</label>
            <input
              id="accessToken"
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              disabled={loading || !!fullCookie}
              style={{ fontFamily: 'Courier New, monospace' }}
            />
            <small>
              쿠키 전체를 입력하면 자동으로 채워집니다. 또는 <code>access_token=</code> 뒤의 값만 직접 입력할 수 있습니다.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="refreshToken">Refresh Token (수동 입력, 선택)</label>
            <input
              id="refreshToken"
              type="text"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              disabled={loading || !!fullCookie}
              style={{ fontFamily: 'Courier New, monospace' }}
            />
            <small>
              쿠키 전체를 입력하면 자동으로 채워집니다. 또는 <code>refresh_token=</code> 뒤의 값만 직접 입력할 수 있습니다.
            </small>
          </div>

          {error && (
            <div className="error-message">
              <strong>오류:</strong> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-guide">
          <h3>토큰 가져오는 방법</h3>
          <ol>
            <li>브라우저에서 Velog에 로그인</li>
            <li>F12 (개발자 도구) 열기</li>
            <li>Network 탭 → 필터에 'graphql' 입력</li>
            <li>Velog 페이지 새로고침</li>
            <li>graphql 요청 클릭 → Headers 탭</li>
            <li>Request Headers에서 <code>cookie:</code> 헤더의 전체 값을 복사</li>
            <li>위의 "쿠키 전체" 필드에 붙여넣으면 토큰이 자동으로 추출됩니다</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Login;
