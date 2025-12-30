import { useState, useMemo } from 'react';
import type { PostWithStats } from '../types/velog';
import './ActivityCalendar.css';

interface ActivityCalendarProps {
  posts: PostWithStats[];
}

function ActivityCalendar({ posts }: ActivityCalendarProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // 사용 가능한 연도 목록 추출
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    posts.forEach(post => {
      if (post.date) {
        const year = new Date(post.date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [posts]);

  // 날짜별 포스트 정보 추출
  const datePostMap = useMemo(() => {
    const map = new Map<string, PostWithStats[]>();
    posts.forEach(post => {
      if (!post.date) return;
      const postDate = new Date(post.date).toISOString().split('T')[0];
      if (!map.has(postDate)) {
        map.set(postDate, []);
      }
      map.get(postDate)!.push(post);
    });
    return map;
  }, [posts]);

  const calendarData = useMemo(() => {
    type DayData = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4; posts: PostWithStats[] };
    const days: DayData[] = [];
    
    // 선택한 연도의 시작일 계산
    const startDate = new Date(selectedYear, 0, 1);
    
    // 연도의 첫날이 무슨 요일인지 확인 (일요일 = 0)
    const startDayOfWeek = startDate.getDay();
    // 캘린더가 월요일부터 시작하도록 조정
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // 연도의 마지막 날짜까지의 일수
    const yearEnd = new Date(selectedYear, 11, 31);
    const daysInYear = Math.ceil((yearEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 전체 날짜 범위 (시작 요일 오프셋 포함)
    const totalDays = offset + daysInYear;
    
    // 연도의 최대 포스트 개수 계산 (비율 계산용)
    let maxCount = 0;
    for (let i = 0; i < daysInYear; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPosts = datePostMap.get(dateStr) || [];
      maxCount = Math.max(maxCount, dayPosts.length);
    }
    maxCount = Math.max(maxCount, 1);
    
    // 전체 날짜 범위의 데이터 생성 (오프셋 포함)
    for (let i = 0; i < totalDays; i++) {
      let date: Date;
      let dateStr: string;
      
      if (i < offset) {
        // 오프셋 기간 (빈 셀)
        date = new Date(startDate);
        date.setDate(date.getDate() - (offset - i));
        dateStr = date.toISOString().split('T')[0];
      } else {
        // 실제 연도 범위
        date = new Date(startDate);
        date.setDate(date.getDate() + (i - offset));
        dateStr = date.toISOString().split('T')[0];
      }
      
      const dayPosts = datePostMap.get(dateStr) || [];
      const count = dayPosts.length;
      
      // 레벨 계산 (0-4)
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0 && i >= offset) {
        const ratio = count / maxCount;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }
      
      days.push({ date: dateStr, count, level, posts: dayPosts });
    }
    
    // 주 단위로 그룹화
    const weeks: DayData[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return weeks;
  }, [posts, selectedYear, datePostMap]);

  const getLevelColor = (level: number): string => {
    switch (level) {
      case 0: return 'var(--bg-tertiary)';
      case 1: return 'rgba(6, 182, 212, 0.3)'; // info
      case 2: return 'rgba(6, 182, 212, 0.5)';
      case 3: return 'rgba(6, 182, 212, 0.7)';
      case 4: return 'var(--color-info)';
      default: return 'var(--bg-tertiary)';
    }
  };

  const selectedYearPosts = posts.filter(p => {
    if (!p.date) return false;
    return new Date(p.date).getFullYear() === selectedYear;
  });

  const handleDayMouseEnter = (e: React.MouseEvent, day: { date: string; count: number; posts: PostWithStats[] }) => {
    if (day.count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredDay({
      date: day.date,
      count: day.count,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleDayMouseLeave = () => {
    setHoveredDay(null);
  };

  return (
    <div className="activity-calendar">
      <div className="calendar-header">
        <h3>활동 캘린더</h3>
        <div className="calendar-controls">
          <div className="year-selector">
            <button 
              className="year-nav-btn"
              onClick={() => setSelectedYear(prev => Math.max(prev - 1, availableYears[availableYears.length - 1] || currentYear))}
              disabled={selectedYear <= (availableYears[availableYears.length - 1] || currentYear)}
            >
              ←
            </button>
            <select 
              className="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
            <button 
              className="year-nav-btn"
              onClick={() => setSelectedYear(prev => Math.min(prev + 1, currentYear))}
              disabled={selectedYear >= currentYear}
            >
              →
            </button>
          </div>
          <div className="calendar-stats">
            <span className="stat-item">
              <span className="stat-label">{selectedYear}년 포스트:</span>
              <span className="stat-value">{selectedYearPosts.length}</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="calendar-container">
        <div className="calendar-grid">
          {/* 요일 레이블 */}
          <div className="day-labels">
            {['월', '수', '금', '일'].map(day => (
              <div key={day} className="day-label">{day}</div>
            ))}
          </div>
          
          {/* 캘린더 그리드 */}
          <div className="weeks-container">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="week">
                {week.map((day, dayIndex) => {
                  const date = new Date(day.date);
                  const isCurrentYear = date.getFullYear() === selectedYear;
                  const isEmpty = !isCurrentYear;
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`day-cell ${isEmpty ? 'empty' : ''}`}
                      style={{ 
                        backgroundColor: isEmpty ? 'transparent' : getLevelColor(day.level),
                        borderColor: day.count > 0 && isCurrentYear ? getLevelColor(day.level) : 'var(--border-color)'
                      }}
                      onMouseEnter={(e) => !isEmpty && handleDayMouseEnter(e, day)}
                      onMouseLeave={handleDayMouseLeave}
                    >
                      {day.count > 0 && isCurrentYear && (
                        <span className="day-count">{day.count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        {/* 범례 */}
        <div className="calendar-legend">
          <span className="legend-label">활동량:</span>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-box" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
              <span>없음</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ backgroundColor: 'rgba(6, 182, 212, 0.3)' }}></div>
              <span>적음</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ backgroundColor: 'rgba(6, 182, 212, 0.5)' }}></div>
              <span>보통</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ backgroundColor: 'rgba(6, 182, 212, 0.7)' }}></div>
              <span>많음</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ backgroundColor: 'var(--color-info)' }}></div>
              <span>매우 많음</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 호버 툴팁 */}
      {hoveredDay && (
        <div 
          className="calendar-tooltip"
          style={{
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="tooltip-date">
            {new Date(hoveredDay.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </div>
          <div className="tooltip-count">
            {hoveredDay.count}개 포스트
          </div>
          {datePostMap.get(hoveredDay.date) && datePostMap.get(hoveredDay.date)!.length > 0 && (
            <div className="tooltip-posts">
              {datePostMap.get(hoveredDay.date)!.slice(0, 5).map((post, idx) => (
                <div key={idx} className="tooltip-post-item">
                  {post.title || '(제목 없음)'}
                </div>
              ))}
              {datePostMap.get(hoveredDay.date)!.length > 5 && (
                <div className="tooltip-post-item more">
                  외 {datePostMap.get(hoveredDay.date)!.length - 5}개...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityCalendar;
