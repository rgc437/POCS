import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

function getCookie(cookieHeader: string | undefined, name: string) {
  return cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3000';
  const basicId = env.BASIC_AUTH_ID || crypto.randomUUID().replaceAll('-', '');

  const apiProxy: ProxyOptions = {
    target: apiTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest, request) => {
        if (!request.url?.startsWith('/api/protected')) {
          return;
        }

        const token = getCookie(request.headers.cookie, 'sample_session');
        if (token) {
          proxyRequest.setHeader(
            'Authorization',
            `Basic ${basicId}, Bearer ${token}`,
          );
        }
      });
    },
  };

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [react()],
    server: {
      cors: {
        origin: env.REACT_CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
      },
      proxy: { '/api': apiProxy },
    },
    preview: {
      proxy: { '/api': apiProxy },
    },
  };
});
