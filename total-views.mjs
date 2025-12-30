const ENDPOINT = "https://v2cdn.velog.io/graphql";

// ANSI 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  orange: '\x1b[38;5;208m',
};

const POSTS_QUERY = `
query Posts($cursor: ID, $username: String, $temp_only: Boolean, $tag: String, $limit: Int) {
  posts(cursor: $cursor, username: $username, temp_only: $temp_only, tag: $tag, limit: $limit) {
    id
    title
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

// 쿠키 정제 함수
function sanitizeCookie(cookie) {
  if (!cookie) return '';
  let cleaned = cookie.trim();
  // "cookie:" 접두사 제거
  cleaned = cleaned.replace(/^cookie:\s*/i, '');
  return cleaned;
}

// 프로그레스 바 출력
function drawProgressBar(current, total, barLength = 30) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round((current / total) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

// 색상이 있는 텍스트 출력
function colorLog(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

async function gql(cookie, bodyObj) {
  const cleanCookie = sanitizeCookie(cookie);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "*/*",
      "cookie": cleanCookie
    },
    body: JSON.stringify(bodyObj),
  });
  const json = await res.json();
  
  // GraphQL 에러 처리
  if (json.errors && json.errors.length > 0) {
    const firstError = json.errors[0];
    const errorMsg = firstError?.message || JSON.stringify(json.errors).slice(0, 400);
    throw new Error(errorMsg);
  }
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }
  
  return json;
}

async function fetchAllPosts(username, cookie) {
  const limit = 100;
  let cursor = null;
  const all = [];
  let page = 1;

  process.stdout.write(`${colors.cyan}📋 포스트 목록을 가져오는 중...${colors.reset}`);
  
  while (true) {
    const payload = {
      operationName: "Posts",
      variables: { username, cursor, limit, temp_only: false, tag: null },
      query: POSTS_QUERY
    };
    const json = await gql(cookie, payload);
    const posts = json?.data?.posts ?? [];
    if (!posts.length) break;
    all.push(...posts);
    process.stdout.write(`\r${colors.cyan}📋 포스트 목록을 가져오는 중... ${all.length}개 발견${colors.reset}`);
    cursor = posts[posts.length - 1].id;
    if (posts.length < limit) break;
    page++;
  }
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  
  return all;
}

async function fetchStatsTotal(postId, cookie, postTitle = "") {
  try {
    const payload = {
      operationName: "GetStats",
      variables: { post_id: postId },
      query: GET_STATS_QUERY
    };
    const json = await gql(cookie, payload);
    return json?.data?.getStats?.total ?? 0;
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes("NO_PERMISSION") || errorMsg.includes("not yours")) {
      return null; // 권한 없음은 null로 반환
    }
    throw error;
  }
}

async function getCookieFromInput() {
  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  colorLog('📋 쿠키 가져오기 가이드', 'bright');
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  colorLog('【방법 1 - 가장 추천】 GraphQL 요청에서 쿠키 가져오기:', 'yellow');
  console.log(`  ${colors.dim}1.${colors.reset} F12 (개발자 도구) 열기`);
  console.log(`  ${colors.dim}2.${colors.reset} Network 탭 선택`);
  console.log(`  ${colors.dim}3.${colors.reset} 필터에 'graphql' 입력`);
  console.log(`  ${colors.dim}4.${colors.reset} Velog 페이지 새로고침 (F5)`);
  console.log(`  ${colors.dim}5.${colors.reset} graphql 요청 클릭 → Headers 탭`);
  console.log(`  ${colors.dim}6.${colors.reset} Request Headers에서 'cookie:' 헤더의 ${colors.bright}전체 값${colors.reset} 복사\n`);
  
  colorLog('【방법 2】 일반 요청에서 쿠키 가져오기:', 'yellow');
  console.log(`  ${colors.dim}1.${colors.reset} F12 → Network 탭 → 페이지 새로고침`);
  console.log(`  ${colors.dim}2.${colors.reset} velog.io 도메인의 요청 클릭`);
  console.log(`  ${colors.dim}3.${colors.reset} Headers 탭 → Request Headers → 'cookie:' 헤더 복사\n`);
  
  colorLog('⚠️  중요:', 'red');
  console.log(`  ${colors.bright}•${colors.reset} 쿠키에 인증 정보(access_token, refresh_token 등)가 포함되어야 합니다`);
  console.log(`  ${colors.bright}•${colors.reset} Network 탭의 'cookie:' 헤더를 복사하는 것이 가장 확실합니다`);
  console.log(`  ${colors.bright}•${colors.reset} 'cookie:' 접두사가 포함되어 있어도 자동으로 처리됩니다\n`);
  
  process.stdout.write(`${colors.cyan}${colors.bright}쿠키 문자열을 붙여넣어주세요: ${colors.reset}`);
  
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const cookie = data.toString().trim();
      process.stdout.write('\n');
      resolve(cookie);
    });
  });
}

async function main() {
  const username = process.argv[2];
  const showDetails = process.argv.includes('--details') || process.argv.includes('-d');
  
  if (!username) {
    console.log(`\n${colors.cyan}${colors.bright}Velog 총 조회수 자동 수집 도구${colors.reset}`);
    console.log(`\n${colors.bright}사용법:${colors.reset}`);
    console.log(`  node total-views.mjs <velog_username> [옵션]\n`);
    console.log(`${colors.bright}옵션:${colors.reset}`);
    console.log(`  -d, --details    포스트별 조회수 상세 표시\n`);
    console.log(`${colors.bright}예시:${colors.reset}`);
    console.log(`  node total-views.mjs myusername`);
    console.log(`  node total-views.mjs myusername --details\n`);
    process.exit(1);
  }

  // 쿠키 입력
  const cookieHeader = await getCookieFromInput();
  
  if (!cookieHeader || cookieHeader.length < 10) {
    colorLog('\n❌ 유효한 쿠키를 가져오지 못했습니다.', 'red');
    process.exit(1);
  }

  const cleanCookie = sanitizeCookie(cookieHeader);

  // 쿠키 검증
  const hasAccessToken = cleanCookie.includes('access_token');
  const hasRefreshToken = cleanCookie.includes('refresh_token');
  const hasVelog = cleanCookie.includes('velog');
  
  colorLog('\n🔍 쿠키 검증 중...', 'cyan');
  console.log(`  ${hasAccessToken ? colors.green + '✅' : colors.yellow + '⚠️'}  access_token${colors.reset}`);
  console.log(`  ${hasRefreshToken ? colors.green + '✅' : colors.yellow + '⚠️'}  refresh_token${colors.reset}`);
  console.log(`  ${hasVelog ? colors.green + '✅' : colors.yellow + '⚠️'}  velog 쿠키${colors.reset}`);
  
  if (!hasAccessToken && !hasRefreshToken && !hasVelog) {
    colorLog('\n⚠️  경고: 쿠키에 인증 정보가 보이지 않습니다.', 'yellow');
    colorLog('   Network 탭에서 "Cookie:" 헤더를 다시 확인해주세요.', 'yellow');
    process.stdout.write(`\n${colors.yellow}계속 진행하시겠습니까? (y/n): ${colors.reset}`);
    const answer = await new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    if (answer !== 'y' && answer !== 'yes') {
      colorLog('\n취소되었습니다.', 'dim');
      process.exit(0);
    }
  }

  // 포스트 목록 가져오기
  colorLog(`\n📊 @${username}의 포스트를 가져오는 중...`, 'cyan');
  let posts;
  try {
    posts = await fetchAllPosts(username, cleanCookie);
  } catch (error) {
    colorLog('\n❌ 포스트 목록을 가져오는데 실패했습니다.', 'red');
    console.log(`${colors.dim}   오류: ${error.message}${colors.reset}`);
    colorLog('   쿠키가 만료되었거나 잘못되었을 수 있습니다.', 'yellow');
    colorLog('   Network 탭에서 최신 쿠키를 다시 복사해주세요.', 'yellow');
    process.exit(1);
  }
  
  if (!posts || posts.length === 0) {
    colorLog('\n📭 포스트를 찾을 수 없습니다.', 'yellow');
    process.exit(0);
  }
  
  colorLog(`\n✅ ${posts.length}개의 포스트를 찾았습니다!\n`, 'green');

  // 조회수 수집
  colorLog('📈 조회수 수집 중...\n', 'cyan');
  
  let sum = 0;
  let processed = 0;
  let failed = 0;
  let noPermission = 0;
  const postStats = [];
  const startTime = Date.now();

  for (const p of posts) {
    try {
      const views = await fetchStatsTotal(p.id, cleanCookie, p.title);
      
      if (views === null) {
        noPermission++;
        postStats.push({ id: p.id, title: p.title, views: null, error: 'NO_PERMISSION' });
      } else {
        const viewsNum = Number(views) || 0;
        sum += viewsNum;
        postStats.push({ id: p.id, title: p.title, views: viewsNum });
      }
      
      processed++;
      const progress = drawProgressBar(processed, posts.length);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r${colors.cyan}${progress}${colors.reset} ${colors.dim}(${processed}/${posts.length}) ${elapsed}초${colors.reset}`);
      
    } catch (error) {
      failed++;
      postStats.push({ id: p.id, title: p.title, views: null, error: error.message });
      processed++;
      const progress = drawProgressBar(processed, posts.length);
      process.stdout.write(`\r${colors.cyan}${progress}${colors.reset} ${colors.dim}(${processed}/${posts.length})${colors.reset}`);
    }
  }
  
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = postStats.filter(p => p.views !== null && !p.error).length;
  const avgViews = successCount > 0 ? Math.round(sum / successCount) : 0;

  // 결과 출력
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  colorLog('📊 통계 결과', 'bright');
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`${colors.bright}👤 사용자:${colors.reset} @${username}`);
  console.log(`${colors.bright}📝 전체 포스트:${colors.reset} ${posts.length}개`);
  console.log(`${colors.bright}✅ 성공:${colors.reset} ${colors.green}${successCount}개${colors.reset}`);
  
  if (noPermission > 0) {
    console.log(`${colors.bright}⚠️  권한 없음:${colors.reset} ${colors.yellow}${noPermission}개${colors.reset}`);
  }
  
  if (failed > 0) {
    console.log(`${colors.bright}❌ 오류:${colors.reset} ${colors.red}${failed}개${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`  ${colors.bright}📊 총 조회수:${colors.reset} ${colors.green}${colors.bright}${sum.toLocaleString()}${colors.reset}`);
  console.log(`  ${colors.bright}📈 평균 조회수:${colors.reset} ${colors.cyan}${colors.bright}${avgViews.toLocaleString()}${colors.reset}`);
  console.log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  console.log(`\n${colors.dim}처리 시간: ${elapsedTime}초${colors.reset}\n`);

  // 상세 정보 표시
  if (showDetails) {
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    colorLog('📋 포스트별 조회수', 'bright');
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
    
    // 조회수 순으로 정렬
    const sorted = postStats
      .filter(p => p.views !== null && !p.error)
      .sort((a, b) => (b.views || 0) - (a.views || 0));
    
    sorted.forEach((post, index) => {
      const rank = (index + 1).toString().padStart(2, ' ');
      const views = post.views?.toLocaleString().padStart(10, ' ') || 'N/A'.padStart(10, ' ');
      const title = post.title || '(제목 없음)';
      const maxTitleLength = 50;
      const displayTitle = title.length > maxTitleLength 
        ? title.substring(0, maxTitleLength - 3) + '...' 
        : title;
      
      console.log(`  ${colors.dim}${rank}.${colors.reset} ${colors.cyan}${views.padStart(10)}${colors.reset} 조회  ${displayTitle}`);
    });
    
    // 권한 없음 포스트 표시
    const noPermPosts = postStats.filter(p => p.error === 'NO_PERMISSION');
    if (noPermPosts.length > 0) {
      console.log(`\n${colors.yellow}⚠️  권한 없음 포스트 (${noPermPosts.length}개):${colors.reset}`);
      noPermPosts.forEach((post, index) => {
        console.log(`  ${colors.dim}${(index + 1).toString().padStart(2, ' ')}.${colors.reset} ${post.title || '(제목 없음)'}`);
      });
    }
    
    // 오류 포스트 표시
    const errorPosts = postStats.filter(p => p.error && p.error !== 'NO_PERMISSION');
    if (errorPosts.length > 0) {
      console.log(`\n${colors.red}❌ 오류 발생 포스트 (${errorPosts.length}개):${colors.reset}`);
      errorPosts.forEach((post, index) => {
        console.log(`  ${colors.dim}${(index + 1).toString().padStart(2, ' ')}.${colors.reset} ${post.title || '(제목 없음)'} - ${colors.dim}${post.error}${colors.reset}`);
      });
    }
    
    console.log('');
  }

  // 경고 메시지
  if (noPermission > 0 || failed > 0) {
    console.log(`${colors.yellow}💡 팁:${colors.reset}`);
    if (noPermission > 0) {
      console.log(`  • 권한 오류가 발생한 포스트가 있습니다. 쿠키를 다시 확인해주세요.`);
    }
    if (failed > 0) {
      console.log(`  • 일부 포스트에서 오류가 발생했습니다. 네트워크 연결을 확인해주세요.`);
    }
    console.log(`  • 전체 쿠키를 포함하여 다시 시도해보세요.\n`);
  }
}

main().catch(e => {
  colorLog('\n[ERROR]', 'red');
  console.error(e);
  process.exit(1);
});
