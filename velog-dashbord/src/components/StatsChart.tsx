import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PostWithStats } from '../types/velog';
import './StatsChart.css';

interface StatsChartProps {
  posts: PostWithStats[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function StatsChart({ posts }: StatsChartProps) {
  // 월별 통계
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { views: number; count: number }>();
    
    posts.forEach(post => {
      if (!post.date) return;
      const date = new Date(post.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthMap.get(monthKey) || { views: 0, count: 0 };
      monthMap.set(monthKey, {
        views: existing.views + (post.views || 0),
        count: existing.count + 1
      });
    });
    
    return Array.from(monthMap.entries())
      .map(([key, value]) => ({
        month: key.split('-')[1] + '월',
        views: value.views,
        count: value.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // 최근 12개월
  }, [posts]);

  // 태그별 통계
  const tagData = useMemo(() => {
    const tagMap = new Map<string, { views: number; count: number }>();
    
    posts.forEach(post => {
      if (!post.tags || post.tags.length === 0) return;
      post.tags.forEach(tag => {
        const existing = tagMap.get(tag) || { views: 0, count: 0 };
        tagMap.set(tag, {
          views: existing.views + (post.views || 0),
          count: existing.count + 1
        });
      });
    });
    
    return Array.from(tagMap.entries())
      .map(([tag, value]) => ({
        name: tag,
        views: value.views,
        count: value.count
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8); // 상위 8개 태그
  }, [posts]);

  // Top 포스트
  const topPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(post => ({
        title: post.title || '(제목 없음)',
        views: post.views || 0
      }));
  }, [posts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="stats-charts">
      <div className="chart-row">
        <div className="chart-card">
          <h3>월별 조회수</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.875rem' }}
              />
              <YAxis 
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.875rem' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="var(--color-primary)" 
                strokeWidth={3}
                dot={{ fill: 'var(--color-primary)', r: 4 }}
                name="조회수"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>월별 포스트 수</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="month" 
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.875rem' }}
              />
              <YAxis 
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.875rem' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="count" 
                fill="var(--color-info)"
                name="포스트 수"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>태그별 조회수 (상위 8개)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tagData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="views"
              >
                {tagData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>인기 포스트 TOP 10</h3>
          <div className="top-posts-list">
            {topPosts.map((post, index) => (
              <div key={index} className="top-post-item">
                <div className="post-rank" style={{ 
                  background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]} 0%, ${COLORS[(index + 1) % COLORS.length]} 100%)` 
                }}>
                  {index + 1}
                </div>
                <div className="post-info">
                  <div className="post-title">{post.title}</div>
                  <div className="post-views">{post.views.toLocaleString()} 조회</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsChart;
