export interface Post {
  id: string;
  title: string;
  tags?: string[];
  createdAt?: string;
  __typename?: string;
}

export interface PostStats {
  total: number;
  __typename?: string;
}

export interface PostWithStats extends Post {
  views: number;
  date?: string;
}

export interface User {
  username: string;
  profile?: {
    display_name?: string;
    thumbnail?: string;
  };
}

export interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}
