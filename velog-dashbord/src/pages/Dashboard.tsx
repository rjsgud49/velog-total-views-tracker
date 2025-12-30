import { useState, useEffect } from 'react';
import type { PostWithStats } from '../types/velog';
import { fetchPostsWithStats } from '../utils/velogApi';
import ActivityCalendar from '../components/ActivityCalendar';
import StatsChart from '../components/StatsChart';
import './Dashboard.css';

function Dashboard() {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  
  const username = localStorage.getItem('velog_username') || '';
  const accessToken = localStorage.getItem('velog_access_token') || '';
  const refreshToken = localStorage.getItem('velog_refresh_token') || '';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTag === '') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => 
        post.tags?.includes(selectedTag)
      ));
    }
  }, [posts, selectedTag]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPostsWithStats(
        username,
        accessToken,
        refreshToken || undefined,
        undefined,
        (current, total) => setProgress({ current, total })
      );
      setPosts(data);
      setFilteredPosts(data);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모든 태그 추출
  const allTags = Array.from(
    new Set(posts.flatMap(post => post.tags || []))
  ).sort();

  // 통계 계산
  const stats = {
    totalPosts: filteredPosts.length,
    totalViews: filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0),
    avgViews: filteredPosts.length > 0 
      ? Math.round(filteredPosts.reduce((sum, post) => sum + (post.views || 0), 0) / filteredPosts.length)
      : 0,
    maxViews: Math.max(...filteredPosts.map(p => p.views || 0), 0),
    postsWithStats: filteredPosts.filter(p => p.views > 0).length
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">
          <h2>데이터를 불러오는 중...</h2>
          {progress.total > 0 && (
            <p>
              진행 중... {progress.current}/{progress.total} 포스트 처리됨
            </p>
          )}
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <button onClick={loadData} className="btn-retry">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 통계 카드 */}
      <div className="stats-cards">
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-primary)' }}>
          <div className="stat-content">
            <div className="stat-label">전체 포스트</div>
            <div className="stat-value">{stats.totalPosts.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-info)' }}>
          <div className="stat-content">
            <div className="stat-label">총 조회수</div>
            <div className="stat-value">{stats.totalViews.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div className="stat-content">
            <div className="stat-label">평균 조회수</div>
            <div className="stat-value">{stats.avgViews.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <div className="stat-content">
            <div className="stat-label">최고 조회수</div>
            <div className="stat-value">{stats.maxViews.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="tag-filter">
          <h3>태그로 필터링</h3>
          <div className="tags-container">
            <button
              className={`tag-button ${selectedTag === '' ? 'active' : ''}`}
              onClick={() => setSelectedTag('')}
            >
              전체
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-button ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
          {selectedTag && (
            <div className="filter-info">
              <span className="filter-badge">
                #{selectedTag} 태그의 포스트: {filteredPosts.length}개
              </span>
            </div>
          )}
        </div>
      )}

      {/* 활동 캘린더 */}
      <ActivityCalendar posts={filteredPosts} />

      {/* 통계 차트 */}
      {filteredPosts.length > 0 && <StatsChart posts={filteredPosts} />}

      {/* 포스트 목록 */}
      <div className="posts-list">
        <h3>포스트 목록</h3>
        <div className="posts-grid">
          {filteredPosts.length === 0 ? (
            <div className="no-posts">
              {selectedTag ? `"${selectedTag}" 태그의 포스트가 없습니다.` : '포스트가 없습니다.'}
            </div>
          ) : (
            filteredPosts
              .sort((a, b) => (b.views || 0) - (a.views || 0))
              .map((post, index) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <div className="post-rank-badge">#{index + 1}</div>
                    <div className="post-views-badge">{post.views.toLocaleString()} 조회</div>
                  </div>
                  <h4 className="post-title">{post.title || '(제목 없음)'}</h4>
                  {post.tags && post.tags.length > 0 && (
                    <div className="post-tags">
                      {post.tags.map(tag => (
                        <span key={tag} className="post-tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {post.date && (
                    <div className="post-date">
                      {new Date(post.date).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
