import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  const env = {
    ...loadEnv(mode, projectRoot, ''),
    ...loadEnv(mode, process.cwd(), ''),
  };
  const adminBase = env.ADMIN_BASE || '/admin/';
  const adminPort = Number(env.ADMIN_PORT || 6007);
  const adminHost = env.ADMIN_HOST || '0.0.0.0';
  // const backendApiUrl = env.BACKEND_API_URL || 'https://xn--5mqs1ehx3beeb.cn';
  const backendApiUrl = env.BACKEND_API_URL || 'http://127.0.0.1:6002';

  return {
    base: adminBase,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    server: {
      host: adminHost,
      port: adminPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendApiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
