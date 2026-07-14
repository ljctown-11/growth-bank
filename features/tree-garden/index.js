// features/tree-garden/index.js — 挂载出口（供 main.js / render.js 统一 import）
export { mountGrowthTreePage, onTaskChecked, onTaskUnchecked, refreshGrowthTree } from './page.js';
export { pourWater, revokeEffortWater, getWaterStreak } from './water.js';
export { renderTreeCanvas, mountTreeCanvases, TREE_RENDERER } from './tree-canvas.js';
