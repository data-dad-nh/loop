import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo at https://<username>.github.io/<repo-name>/
// so the app has to know its own base path. Update REPO_NAME to match
// whatever you name the GitHub repository (e.g. "loop-app"). 
const REPO_NAME = 'loop'

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
})
