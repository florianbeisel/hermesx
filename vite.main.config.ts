import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
    resolve: {
        // Ensure proper resolution of Electron modules
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Build target for main process
        target: 'node18',
        outDir: '.vite/build',
        // Ensure single output file
        lib: {
            entry: path.resolve(__dirname, 'src/main.ts'),
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        rollupOptions: {
            external: [
                'electron',
                'electron-squirrel-startup',
                'update-electron-app',
                'electron-updater',
                'keytar',
            ],
            output: {
                format: 'cjs',
            },
        },
        // Ensure source maps for debugging
        sourcemap: true,
        // Minification can be disabled for main process
        minify: false,
    },
});
