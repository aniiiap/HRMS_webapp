import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite plugin to fix quill-image-resize-module-react ESM interop issue
const fixQuillImageResize = () => {
  return {
    name: 'fix-quill-image-resize',
    transform(code, id) {
      if (id.includes('quill-image-resize-module-react')) {
        return code.replace(
          /Object\.defineProperty\(exports,\s*Symbol\.toStringTag,\s*\{\s*value:\s*'Module'\s*\}\);?/g,
          ''
        );
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), fixQuillImageResize()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // Heavy libs only — avoids circular vendor/react splits while shrinking first paint.
          if (id.includes('recharts')) return 'charts'
          if (id.includes('lucide-react')) return 'icons'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
