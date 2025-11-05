import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-table',
      '@tiptap/extension-table-row',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-code-block-lowlight',
      '@tiptap/extension-highlight',
      '@tiptap/extension-text-align',
      '@tiptap/extension-typography',
    ],
  },
  server: {
    fs: {
      strict: false
    }
  }
});
