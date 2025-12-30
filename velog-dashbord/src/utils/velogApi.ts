// 개발 환경에서는 프록시 사용, 프로덕션에서는 직접 API 호출
const ENDPOINT = import.meta.env.DEV 
  ? "/api/velog"
  : "https://v2cdn.velog.io/graphql";

const POSTS_QUERY = `
query Posts($cursor: ID, $username: String, $temp_only: Boolean, $tag: String, $limit: Int) {
  posts(cursor: $cursor, username: $username, temp_only: $temp_only, tag: $tag, limit: $limit) {
    id
    title
    tags
    released_at
    __typename
  }
}
`;

const GET_STATS_QUERY = `
query GetStats($post_id: ID!) {
  getStats(post_id: $post_id) {
    total
    __typename
  }
}
`;

const USER_QUERY = `
query User($username: String!) {
  user(username: $username) {
    id
    username
    profile {
      display_name
      thumbnail
    }
  }
}
`;

function sanitizeCookie(cookie: string): string {
  if (!cookie) return '';
  let cleaned = cookie.trim();
  cleaned = cleaned.replace(/^cookie:\s*/i, '');
  return cleaned;
}

/**
 * 쿠키 문자열에서 특정 쿠키 값을 추출
 */
function parseCookieValue(cookieString: string, name: string): string | null {
  if (!cookieString) return null;
  
  const sanitized = sanitizeCookie(cookieString);
  const regex = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const match = sanitized.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * 쿠키 문자열 전체에서 필요한 토큰들을 자동으로 추출
 */
export function parseCookies(cookieString: string): {
  accessToken: string | null;
  refreshToken: string | null;
  velog: string | null;
  fullCookie: string;
} {
  const sanitized = sanitizeCookie(cookieString);
  
  return {
    accessToken: parseCookieValue(cookieString, 'access_token'),
    refreshToken: parseCookieValue(cookieString, 'refresh_token'),
    velog: parseCookieValue(cookieString, 'velog'),
    fullCookie: sanitized,
  };
}

function buildCookieHeader(accessToken: string, refreshToken?: string): string {
  const cookies: string[] = [];
  if (accessToken) cookies.push(`access_token=${accessToken}`);
  if (refreshToken) cookies.push(`refresh_token=${refreshToken}`);
  return cookies.join('; ');
}

async function gql(cookie: string, bodyObj: any) {
  const cleanCookie = sanitizeCookie(cookie);
  
  // 개발 환경(프록시 사용)과 프로덕션 환경(직접 호출) 구분
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "accept": "application/json",
  };

  if (import.meta.env.DEV) {
    // 개발 환경: 프록시를 통해 요청 (커스텀 헤더로 cookie 전달)
    // 브라우저에서 cookie 헤더를 직접 설정할 수 없으므로 커스텀 헤더 사용
    headers["x-velog-cookie"] = cleanCookie;
  } else {
    // 프로덕션 환경: 직접 API 호출 (서버 환경에서는 cookie 설정 가능)
    headers["origin"] = "https://velog.io";
    headers["referer"] = "https://velog.io/";
    headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
    headers["cookie"] = cleanCookie;
  }
  
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyObj),
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected content-type: ${contentType}. Response: ${text.slice(0, 200)}`);
  }

  const json = JSON.parse(text);

  // HTTP 에러 체크
  if (!res.ok) {
    const errorMsg = json.errors?.[0]?.message || JSON.stringify(json.errors || json).slice(0, 400);
    throw new Error(`HTTP ${res.status}: ${errorMsg}`);
  }

  // GraphQL 에러 체크 (200 응답이어도 errors 배열이 있을 수 있음)
  if (json.errors && json.errors.length > 0) {
    const firstError = json.errors[0];
    const errorCode = firstError.extensions?.code;
    const errorMessage = firstError.message || JSON.stringify(json.errors);
    
    // NO_PERMISSION 오류는 특별히 처리 (에러로 던지지 않고 null 반환은 호출자가 처리)
    if (errorCode === 'NO_PERMISSION' || errorMessage.includes('not yours') || errorMessage.includes('This post is not yours')) {
      const error: any = new Error(errorMessage);
      error.code = 'NO_PERMISSION';
      error.graphqlErrors = json.errors;
      throw error;
    }
    
    throw new Error(errorMessage);
  }

  return json;
}

export async function fetchUser(username: string, accessToken: string, refreshToken?: string) {
  const cookie = buildCookieHeader(accessToken, refreshToken);
  const payload = {
    operationName: "User",
    variables: { username },
    query: USER_QUERY
  };
  const json = await gql(cookie, payload);
  return json?.data?.user || null;
}

export async function fetchAllPosts(username: string, accessToken: string, refreshToken?: string, tag?: string) {
  const cookie = buildCookieHeader(accessToken, refreshToken);
  const limit = 100;
  let cursor = null;
  const all = [];

  while (true) {
    const payload = {
      operationName: "Posts",
      variables: { username, cursor, limit, temp_only: false, tag: tag || null },
      query: POSTS_QUERY
    };
    const json = await gql(cookie, payload);
    const posts = json?.data?.posts ?? [];
    if (!posts.length) break;
    all.push(...posts);
    cursor = posts[posts.length - 1].id;
    if (posts.length < limit) break;
  }
  return all;
}

export async function fetchStatsTotal(postId: string, accessToken: string, refreshToken?: string): Promise<number | null> {
  try {
    const cookie = buildCookieHeader(accessToken, refreshToken);
    const payload = {
      operationName: "GetStats",
      variables: { post_id: postId },
      query: GET_STATS_QUERY
    };
    const json = await gql(cookie, payload);
    
    // data.getStats가 null인 경우 (권한 없음 등)
    if (!json?.data?.getStats) {
      return null;
    }
    
    return json.data.getStats.total ?? null;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    // GraphQL errors 배열에서 "This post is not yours" 또는 NO_PERMISSION 확인
    if (errorMsg.includes("NO_PERMISSION") || 
        errorMsg.includes("not yours") || 
        errorMsg.includes("This post is not yours")) {
      return null;
    }
    throw error;
  }
}

export async function fetchPostsWithStats(
  username: string, 
  accessToken: string, 
  refreshToken?: string,
  tag?: string,
  onProgress?: (current: number, total: number) => void
) {
  const posts = await fetchAllPosts(username, accessToken, refreshToken, tag);
  const postsWithStats: any[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const views = await fetchStatsTotal(post.id, accessToken, refreshToken);
    
    postsWithStats.push({
      ...post,
      views: views || 0,
      date: post.released_at || null
    });

    if (onProgress) {
      onProgress(i + 1, posts.length);
    }
  }

  return postsWithStats;
}
