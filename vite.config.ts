import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { selectFirebaseClientConfig } from './src/config/selectFirebaseClientConfig';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, ['VITE_', 'GEMINI_API_KEY']);
  const firebase = selectFirebaseClientConfig(env);
  const isDevTarget = env.VITE_APP_ENV === 'development';
  const moduleId = '\0tone-translator:firebase-client-config';

  return {
    // Only the selected Firebase configuration is made available to the browser.
    envPrefix: [],
    // The legacy source archive in public/ includes the PROD configuration.
    publicDir: isDevTarget ? false : 'public',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'tone-translator-firebase-config',
        enforce: 'pre',
        resolveId(id) {
          if (id === '../config/firebaseClientConfig') return moduleId;
        },
        load(id) {
          if (id === moduleId) return `export default ${JSON.stringify(firebase)};`;
        },
        transformIndexHtml() {
          return [{
            tag: 'meta',
            attrs: { name: 'tt-app-environment', content: env.VITE_APP_ENV },
            injectTo: 'head',
          }];
        },
      },
    ],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio environment.
      hmr: false,
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**',
          '**/firebase-applet-config.json', '**/tone-translator-source.zip'],
      },
    },
  };
});
