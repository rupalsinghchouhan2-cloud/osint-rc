import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-ext',
    emptyOutDir: true,
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'qrcode', 'jspdf', 'html2canvas-pro'],
      output: {
        paths: {
          react: 'https://esm.sh/react@18.3.1',
          'react/jsx-runtime': 'https://esm.sh/react@18.3.1/jsx-runtime',
          'react-dom/client': 'https://esm.sh/react-dom@18.3.1/client?external=react',
          qrcode: 'https://esm.sh/qrcode@1.5.4',
          jspdf: 'https://esm.sh/jspdf@2.5.2',
          'html2canvas-pro': 'https://esm.sh/html2canvas-pro@1.5.11',
        },
      },
    },
  },
})
