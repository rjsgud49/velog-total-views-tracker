# Vercel 배포 가이드

## 배포 방법

### 1. GitHub에 저장소 연결

1. [Vercel](https://vercel.com)에 로그인
2. **Add New Project** 클릭
3. GitHub 저장소 선택 또는 import
4. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: `velog-dashbord`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2. 배포 설정

Vercel이 자동으로 감지하지만, 필요시 수동 설정:

- **Framework Preset**: Vite
- **Root Directory**: `velog-dashbord` (루트가 아닌 경우)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. 환경 변수 (선택사항)

현재는 환경 변수가 필요하지 않습니다.

### 4. 배포

1. **Deploy** 버튼 클릭
2. 배포 완료 후 제공되는 URL로 접속

## 프록시 설정

프로덕션 환경에서는 `/api/velog` 요청이 자동으로 Vercel Serverless Function (`/api/proxy`)으로 라우팅됩니다.

이를 통해:
- CORS 문제 해결
- 브라우저에서 쿠키 헤더 직접 설정 불가 문제 해결
- Velog API 요청을 서버 사이드에서 처리

## 로컬 개발

```bash
cd velog-dashbord
npm install
npm run dev
```

개발 환경에서는 Vite의 프록시 설정이 사용됩니다.

## 트러블슈팅

### 빌드 실패 시

1. `package.json`의 `build` 스크립트 확인
2. TypeScript 오류 확인: `npm run build` 로컬 실행
3. Vercel 로그 확인

### API 요청 실패 시

1. 프록시 함수가 정상 작동하는지 확인 (`/api/proxy`)
2. 네트워크 탭에서 요청 헤더 확인
3. `x-velog-cookie` 헤더가 전달되는지 확인
