import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/velog': {
        target: 'https://v2cdn.velog.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/velog/, '/graphql'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 클라이언트에서 보낸 X-Velog-Cookie 커스텀 헤더를 Cookie 헤더로 변환
            const velogCookie = req.headers['x-velog-cookie'] as string;
            if (velogCookie) {
              proxyReq.setHeader('Cookie', velogCookie);
              // 커스텀 헤더는 제거 (Velog API로 전달하지 않음)
              proxyReq.removeHeader('x-velog-cookie');
            }
            // 필수 헤더 설정
            proxyReq.setHeader('Origin', 'https://velog.io');
            proxyReq.setHeader('Referer', 'https://velog.io/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');
            proxyReq.setHeader('Accept', 'application/json');
            // Content-Type은 body를 파싱하기 전에 설정하면 안 되므로, body 파싱 후 설정
          });
        },
      },
    },
  },
})
