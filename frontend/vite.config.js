import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateViteBuildEnvironment } from '../scripts/validate-vite-env.mjs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  validateViteBuildEnvironment({
    appName: 'Public frontend',
    command,
    env: loadEnv(mode, projectRoot, ''),
    required: [{ name: 'VITE_API_BASE_URL', allowRootRelative: true }],
  })
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  }
})
