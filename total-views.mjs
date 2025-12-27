const ENDPOINT = "https://v2cdn.velog.io/graphql";

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

async function gql(cookie, bodyObj) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "*/*",
      "cookie": cookie
    },
    body: JSON.stringify(bodyObj),
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    throw new Error(JSON.stringify(json.errors || json).slice(0, 400));
  }
  return json;
}

async function fetchAllPosts(username, cookie) {
  const limit = 100;
  let cursor = null;
  const all = [];

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
    cursor = posts[posts.length - 1].id;
    if (posts.length < limit) break;
  }
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
      console.warn(`\n⚠️  권한 없음: "${postTitle || postId}" - 쿠키에 인증 정보가 없거나 만료되었을 수 있습니다.`);
      return 0;
    }
    throw error;
  }
}

async function getCookieFromInput() {
  console.log("\n📋 일반 브라우저(Chrome/Edge 등)에서 Velog에 로그인한 후:");
  console.log("\n【방법 1 - 가장 추천】 GraphQL 요청에서 쿠키 가져오기:");
  console.log("1. F12 (개발자 도구) 열기");
  console.log("2. Network 탭 선택");
  console.log("3. 필터에 'graphql' 입력 (또는 'v2cdn.velog.io' 입력)");
  console.log("4. Velog 페이지에서 통계 페이지나 포스트 목록 새로고침");
  console.log("5. graphql 요청 클릭 → Headers 탭 → Request Headers");
  console.log("6. 'cookie:' 헤더의 전체 값을 복사 (전체 한 줄)");
  console.log("\n【방법 2】 일반 요청에서 쿠키 가져오기:");
  console.log("1. F12 (개발자 도구) 열기");
  console.log("2. Network 탭 선택");
  console.log("3. Velog 페이지 새로고침 (F5)");
  console.log("4. velog.io 도메인의 아무 요청이나 클릭");
  console.log("5. Headers 탭 → Request Headers → 'cookie:' 헤더 복사");
  console.log("\n【방법 3】 Application 탭에서 쿠키 가져오기:");
  console.log("1. F12 (개발자 도구) 열기");
  console.log("2. Application 탭 → Cookies → https://velog.io 선택");
  console.log("3. 모든 쿠키를 '이름=값; ' 형식으로 합치기");
  console.log("   (예: access_token=xxx; refresh_token=yyy; ...)");
  console.log("\n⚠️  중요: 쿠키에 인증 정보가 포함되어야 합니다!");
  console.log("   Network 탭의 'cookie:' 헤더를 복사하는 것이 가장 확실합니다.");
  console.log("\n쿠키 문자열을 붙여넣어주세요:");
  
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const cookie = data.toString().trim();
      resolve(cookie);
    });
  });
}

async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.log("Usage: node total-views.mjs <velog_username>");
    process.exit(1);
  }

  // 쿠키 직접 입력
  const cookieHeader = await getCookieFromInput();
  
  if (!cookieHeader || cookieHeader.length < 10) {
    console.error("❌ 유효한 쿠키를 가져오지 못했습니다.");
    process.exit(1);
  }

  // 쿠키 검증 (인증 관련 쿠키가 있는지 확인)
  const hasAuthCookie = cookieHeader.includes('access_token') || 
                        cookieHeader.includes('refresh_token') ||
                        cookieHeader.includes('velog') ||
                        cookieHeader.includes('token');
  
  if (!hasAuthCookie) {
    console.warn("\n⚠️  경고: 쿠키에 인증 정보가 보이지 않습니다.");
    console.warn("   Network 탭에서 'Cookie:' 헤더를 다시 확인해주세요.");
    console.log("\n계속 진행하시겠습니까? (y/n):");
    const answer = await new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });
    if (answer !== 'y' && answer !== 'yes') {
      console.log("취소되었습니다.");
      process.exit(0);
    }
  }

  // 3) GraphQL로 총 조회수 계산
  console.log(`\n📊 Fetching posts for @${username}...`);
  let posts;
  try {
    posts = await fetchAllPosts(username, cookieHeader);
  } catch (error) {
    console.error("\n❌ 포스트 목록을 가져오는데 실패했습니다.");
    console.error("   쿠키가 만료되었거나 잘못되었을 수 있습니다.");
    console.error("   Network 탭에서 최신 쿠키를 다시 복사해주세요.");
    process.exit(1);
  }
  
  if (!posts || posts.length === 0) {
    console.log("포스트를 찾을 수 없습니다.");
    process.exit(0);
  }
  
  console.log(`Found ${posts.length} posts`);

  let sum = 0;
  let processed = 0;
  let failed = 0;
  
  for (const p of posts) {
    try {
      const v = await fetchStatsTotal(p.id, cookieHeader, p.title);
      sum += Number(v) || 0;
      processed++;
      if (processed % 5 === 0 || processed === posts.length) {
        process.stdout.write(`\r진행 중... ${processed}/${posts.length} 포스트 처리됨`);
      }
    } catch (error) {
      failed++;
      const errorMsg = error.message || String(error);
      if (errorMsg.includes("NO_PERMISSION")) {
        console.warn(`\n⚠️  "${p.title || p.id}" - 권한 없음 (건너뜀)`);
      } else {
        console.warn(`\n⚠️  "${p.title || p.id}" - 오류 발생: ${errorMsg.slice(0, 100)}`);
      }
    }
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r'); // 진행 표시 지우기

  if (failed > 0) {
    console.warn(`\n⚠️  ${failed}개 포스트에서 오류가 발생했습니다.`);
    console.warn("   쿠키를 다시 확인하거나, Network 탭에서 최신 쿠키를 복사해주세요.");
  }

  console.log(`\n✅ @${username} TOTAL VIEWS = ${sum.toLocaleString()}\n`);
}

main().catch(e => {
  console.error("[ERROR]", e);
  process.exit(1);
});

