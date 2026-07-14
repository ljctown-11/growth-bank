// vitest.config.js — 纯函数 node 跑、DOM 相关 jsdom 跑
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 默认 DOM 环境（render / mascot / MediaRecorder mock 需要）
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
});
