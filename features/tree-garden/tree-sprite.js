// features/tree-garden/tree-sprite.js — 手绘位图精灵图（Sprite）渲染
//
// 设计动机：成长树原有 Canvas 分形（松树像"笋子"）与 SVG 矢量两种渲染路线用户都不满意，
// 决定改用「手绘位图精灵图」路线。先做了松树一种并验收通过，现把 apple / sakura / orange
// 三物种也接入同一套精灵图管线（四物种统一走 canvas 模式的精灵图路线）。
//
// 本文件是精灵图管线的唯一实现，对四物种通用：
//  - 每个物种有自己的 SPRITE_PATHS / BASE_FRAC / STAGE_FILL 常量；
//  - 通用函数 getTreeSprite(species, stageIdx) / drawTreeSprite(ctx, species, stageIdx, box, tf, bounds)
//    按 species 路由到对应常量与绘制逻辑（fill-height 撑满 + BASE_FRAC 贴底；seed 走 region-based *0.7）。
//  - 兼容导出 drawPineSprite / getPineSprite / onPineSpriteLoad 仍保留（内部复用通用逻辑，行为零变化），
//    以免旧测试与旧调用方中断。
//
// 关键约定（与 tree-canvas.js 对齐）：
//  - 坐标系沿用虚拟 100×100（原点左下、右上 (100,100)，土堆中心 ~y=92），与 SVG viewBox 一致；
//    精灵图按传入的 fit 变换 tf 等比缩放、水平居中、底部贴土堆线（y=92），不溢出画布。
//  - 图片异步加载：首帧若图尚未加载完成，drawImage 在浏览器会抛 InvalidStateError，
//    这里用 try/catch 吞掉（首帧可能空白，待 onload 触发重绘）；记录型 mock ctx 下不抛、正常记录。
//  - 无 Image 环境（如极端无头）下 getTreeSprite 返回 null，drawTreeSprite 安全跳过绘制。

// =====================================================================
// 松树（pine）— 原有常量，保留兼容
// =====================================================================

// 5 档成长阶段对应的精灵图路径（按顺序 stage 0..4）。
//   pine-0 → 种子   pine-1 → 发芽   pine-2 → 长叶   pine-3 → 年轻松树   pine-4 → 成熟松树
export const PINE_SPRITE_PATHS = [
  'assets/tree-sprites/pine/pine-0.webp',
  'assets/tree-sprites/pine/pine-1.webp',
  'assets/tree-sprites/pine/pine-2.webp',
  'assets/tree-sprites/pine/pine-3.webp',
  'assets/tree-sprites/pine/pine-4.webp',
];

// 各档精灵图「可见树底」在图高中的比例（实测 5 张透明 PNG 的 alpha 包围盒反推）。
export const PINE_BASE_FRAC = [0.651, 0.732, 0.903, 0.942, 0.942];

// =====================================================================
// 苹果树（apple）— 新增
// =====================================================================

export const APPLE_SPRITE_PATHS = [
  'assets/tree-sprites/apple/apple-0.webp',
  'assets/tree-sprites/apple/apple-1.webp',
  'assets/tree-sprites/apple/apple-2.webp',
  'assets/tree-sprites/apple/apple-3.webp',
  'assets/tree-sprites/apple/apple-4.webp',
];

// 各档「可见树底」比例（量自透明 PNG 的 alpha 包围盒；越靠后越小=底部透明留白越多）
export const APPLE_BASE_FRAC = [0.9944, 0.9954, 0.9967, 0.9967, 0.9971]; // 真实树底行（与松树同算法），根部精确落到 y=92 椭圆中心

// 目标画布高度占比（索引 1–4；stage1 发芽略缩，stage2-4 撑满画布）
export const APPLE_STAGE_FILL = [null, 0.495, 0.6375, 0.72, 0.68]; // 发芽×3/4、长叶×3/4、开花×4/5、繁茂×4/5

// 树干底部 x 质心占图宽比例（用于横向居中：把树干对齐土堆椭圆中心 x=50）
export const APPLE_BASE_CX_FRAC = [0.4906, 0.5000, 0.5186, 0.4956, 0.4859];

// =====================================================================
// 樱花树（sakura）— 新增
// =====================================================================

export const SAKURA_SPRITE_PATHS = [
  'assets/tree-sprites/sakura/sakura-0.webp',
  'assets/tree-sprites/sakura/sakura-1.webp',
  'assets/tree-sprites/sakura/sakura-2.webp',
  'assets/tree-sprites/sakura/sakura-3.webp',
  'assets/tree-sprites/sakura/sakura-4.webp',
];

export const SAKURA_BASE_FRAC = [0.9914, 0.9955, 0.9971, 0.997, 0.9971]; // 真实树底行（与松树同算法）

export const SAKURA_STAGE_FILL = [null, 0.495, 0.6375, 0.72, 0.68];

// 树干底部 x 质心占图宽比例
export const SAKURA_BASE_CX_FRAC = [0.4848, 0.4892, 0.4902, 0.5206, 0.5131];

// =====================================================================
// 橙子树（orange）— 新增
// =====================================================================

export const ORANGE_SPRITE_PATHS = [
  'assets/tree-sprites/orange/orange-0.webp',
  'assets/tree-sprites/orange/orange-1.webp',
  'assets/tree-sprites/orange/orange-2.webp',
  'assets/tree-sprites/orange/orange-3.webp',
  'assets/tree-sprites/orange/orange-4.webp',
];

export const ORANGE_BASE_FRAC = [0.9946, 0.8972, 0.9968, 0.997, 0.994]; // [1]去掉发芽图左下角种子后重测的真实树底行

export const ORANGE_STAGE_FILL = [null, 0.495, 0.6375, 0.72, 0.68];

// 树干底部 x 质心占图宽比例
export const ORANGE_BASE_CX_FRAC = [0.4496, 0.5093, 0.5122, 0.4804, 0.5113];

// =====================================================================
// 四物种精灵图配置表（通用函数按 species 路由）
// =====================================================================

/**
 * 物种 → 精灵图配置。
 *  - paths: stage 0..4 的 PNG 路径
 *  - baseFrac: 各档「可见树底」比例（贴土堆线用）
 *  - stageFill: 各档目标画布高度占比（stage 0 为 null，走 region-based 逻辑）
 * @type {Object<string, {paths: string[], baseFrac: number[], stageFill: (number|null)[]}>}
 */
const SPRITE_SPECIES_CONFIG = {
  pine: {
    paths: PINE_SPRITE_PATHS,
    baseFrac: PINE_BASE_FRAC,
    stageFill: [null, 0.96, 0.88, 0.90, 0.92], // 发芽放大1.5×(0.64→0.96)，其余沿用验收通过数值
    baseCxFrac: [0.4937, 0.4956, 0.5015, 0.4760, 0.4969], // 松树base_cx（接近0.5，偏移量极小）
    seedScale: 1.4, // 松树种子放大2倍（相对默认 0.7）
  },
  apple: {
    paths: APPLE_SPRITE_PATHS,
    baseFrac: APPLE_BASE_FRAC,
    stageFill: APPLE_STAGE_FILL,
    baseCxFrac: APPLE_BASE_CX_FRAC,
    seedScale: 0.4667, // 其他三树种种子缩小为 2/3（0.7×2/3）
  },
  sakura: {
    paths: SAKURA_SPRITE_PATHS,
    baseFrac: SAKURA_BASE_FRAC,
    stageFill: SAKURA_STAGE_FILL,
    baseCxFrac: SAKURA_BASE_CX_FRAC,
    seedScale: 0.4667,
  },
  orange: {
    paths: ORANGE_SPRITE_PATHS,
    baseFrac: ORANGE_BASE_FRAC,
    stageFill: ORANGE_STAGE_FILL,
    baseCxFrac: ORANGE_BASE_CX_FRAC,
    seedScale: 0.4667,
  },
};

// 模块级 Image 缓存：species -> { stageIdx -> HTMLImageElement | null }
const _cache = {};

// 图片加载完成后的重绘监听器集合（用于异步加载后补绘首帧）。提供注销避免泄漏。
const _loadListeners = new Set();

/**
 * 把任意 species 归一化为已知精灵图物种（未知一律按 pine 处理，同 SVG / canvas 版约定）。
 * @param {string} species
 * @returns {'pine'|'apple'|'sakura'|'orange'}
 */
function normalizeSpriteSpecies(species) {
  return SPRITE_SPECIES_CONFIG[species] ? species : 'pine';
}

/**
 * 把 stageIdx 夹紧到 [0, len-1]，非法输入回退 0。
 * @param {number} stageIdx
 * @param {number} len 路径数组长度
 * @returns {number}
 */
function clampStageIdx(stageIdx, len) {
  return Math.max(0, Math.min(len - 1, Number(stageIdx) || 0));
}

/**
 * 注册一个在任意精灵图加载完成后触发的回调（用于首帧补绘）。
 * 与 onPineSpriteLoad 共享同一监听器集合：任意物种图片加载都会通知所有监听方。
 * @param {() => void} cb
 * @returns {() => void} 注销函数
 */
export function onTreeSpriteLoad(cb) {
  _loadListeners.add(cb);
  return () => { _loadListeners.delete(cb); };
}

/**
 * 兼容导出：松树精灵图加载完成回调（内部复用通用 onTreeSpriteLoad）。
 * @param {() => void} cb
 * @returns {() => void} 注销函数
 */
export function onPineSpriteLoad(cb) {
  return onTreeSpriteLoad(cb);
}

/**
 * 取某物种某阶段的精灵图（懒加载 + 按物种缓存）。
 * 非浏览器环境（无 Image 全局）返回 null；调用方仍应能正常绘制（drawTreeSprite 对空图做防御）。
 * @param {string} species 物种 key（pine/apple/sakura/orange；其它按 pine 处理）
 * @param {number} stageIdx 0–4
 * @returns {HTMLImageElement|null}
 */
export function getTreeSprite(species, stageIdx) {
  const sp = normalizeSpriteSpecies(species);
  const paths = SPRITE_SPECIES_CONFIG[sp].paths;
  const idx = clampStageIdx(stageIdx, paths.length);
  if (!_cache[sp]) _cache[sp] = {};
  if (Object.prototype.hasOwnProperty.call(_cache[sp], idx)) return _cache[sp][idx];
  let img = null;
  try {
    if (typeof Image !== 'undefined') {
      img = new Image();
      img.src = paths[idx];
      img.onload = () => {
        for (const cb of _loadListeners) {
          try { cb(); } catch (e) { /* 单个监听异常不影响其余 */ }
        }
      };
    }
  } catch (e) {
    img = null;
  }
  _cache[sp][idx] = img;
  return img;
}

/**
 * 兼容导出：取松树某阶段的精灵图（内部复用通用 getTreeSprite）。
 * @param {number} stageIdx 0–4
 * @returns {HTMLImageElement|null}
 */
export function getPineSprite(stageIdx) {
  return getTreeSprite('pine', stageIdx);
}

/**
 * 进页预加载：进入成长树页面时立即触发当前阶段精灵图下载（把「用到才懒加载」提前到进页时开始），
 * 与 getTreeSprite 等价（内部即调用它），返回该 Image 元素供调用方按需使用。
 * 仅「提前开始下载」，不触发浇水 / 阶段动画。
 * @param {string} species 物种 key（pine/apple/sakura/orange；其它按 pine 处理）
 * @param {number} stageIdx 0–4
 * @returns {HTMLImageElement|null}
 */
export function preloadTreeSprite(species, stageIdx) {
  return getTreeSprite(species, stageIdx);
}

/**
 * 注册「某物种某阶段精灵图加载完成」回调（进页预加载配套骨架屏用）。
 *  - 若所需图片已缓存且已加载完成（complete 且 naturalWidth>0），立即同步触发 cb 并直接返回；
 *  - 否则注册到 _loadListeners（与 onTreeSpriteLoad 共用同一集合），待任意精灵图 onload 后
 *    检查本图是否就绪，就绪则触发 cb 并自我注销（避免监听器泄漏）。
 * @param {string} species 物种 key
 * @param {number} stageIdx 0–4
 * @param {() => void} cb 加载完成回调（用于去掉 .gt-tree-loading 占位类）
 * @returns {() => void} 注销函数
 */
export function whenSpriteLoaded(species, stageIdx, cb) {
  const sp = normalizeSpriteSpecies(species);
  const cfg = SPRITE_SPECIES_CONFIG[sp];
  const idx = clampStageIdx(stageIdx, cfg.paths.length);
  const cached = _cache[sp] && _cache[sp][idx];
  // 已缓存且已加载完成：立即同步回调（如二次进页、图片已就绪）
  if (cached && cached.complete && cached.naturalWidth > 0) {
    try { cb(); } catch (e) { /* 单个回调异常不影响其余 */ }
    return () => {};
  }
  // 否则注册到 _loadListeners，待任意精灵图 onload 后检查本图是否就绪
  const off = onTreeSpriteLoad(() => {
    const img = (_cache[sp] && _cache[sp][idx]) || null;
    if (img && img.complete && img.naturalWidth > 0) {
      try { cb(); } catch (e) { /* 单个回调异常不影响其余 */ }
      off(); // 触发一次后自我注销，避免泄漏
    }
  });
  return off;
}

/**
 * 把某阶段精灵图绘制到注入的 ctx（**放大填充**、居中、底部贴土堆线）。
 *  - stage 0（种子）：保持原 region-based fill-height 逻辑，再按物种 seedScale 缩放
 *    （松树放大2倍=1.4，其他三树种缩小为2/3≈0.467）；dy 用对应物种 BASE_FRAC[0] 把「可见树底」精确压到 y=92。
 *  - stage 1–4：按「目标画布高度占比」(stageFill) 定尺寸，撑满画布、不溢出上沿；
 *    底部贴土堆线 y=92（宽图做宽度安全 clamp），水平以画布中心 x=50 居中。
 *  - 图片未加载完成（img 为空或 naturalWidth=0）时 drawImage 在浏览器会抛错，这里 try/catch 吞掉；
 *    记录型 mock ctx 下不抛，正常记录调用（便于单测断言走 drawImage 路线）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} species 物种 key
 * @param {number} stageIdx 0–4
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} tf 自动缩放变换
 * @param {{minX:number, maxX:number, minY:number, maxY:number}} bounds 精灵图落位包围盒（虚拟 100×100 空间）
 */
export function drawTreeSprite(ctx, species, stageIdx, box, tf, bounds) {
  if (!ctx) return;
  const sp = normalizeSpriteSpecies(species);
  const cfg = SPRITE_SPECIES_CONFIG[sp];
  const img = getTreeSprite(sp, stageIdx);
  const iw = (img && img.naturalWidth) ? img.naturalWidth : 100;
  const ih = (img && img.naturalHeight) ? img.naturalHeight : 100;

  // stage 0（种子）：region-based fill-height *0.7（各物种一致，沿用松树已验收的种子逻辑）
  if (stageIdx === 0) {
    const b = bounds || { minX: 0, maxX: 100, minY: 0, maxY: 92 };
    const [bx0, by0] = mapPointLocal(box, b.minX, b.minY, tf); // 包围盒左上
    const [bx1, by1] = mapPointLocal(box, b.maxX, b.maxY, tf); // 包围盒右下
    const regionW = Math.max(1, bx1 - bx0);
    const regionH = Math.max(1, by1 - by0);
    const scaleByH = (regionH / ih) * 0.95 * (cfg.seedScale != null ? cfg.seedScale : 0.7); // 纵向填满 95% 再按物种 seedScale 缩放
    const scaleByW = (regionW / iw) * 1.05;      // 宽度允许微溢（5%）
    const scale = Math.min(scaleByH, scaleByW);   // 取较小者保证不严重溢出
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = bx0 + (regionW - dw) / 2; // 水平居中
    const dy = by1 - dh * cfg.baseFrac[0]; // 可见树底贴土堆线（去透明留白）
    try {
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch (e) {
      /* 图片未加载完成：浏览器 drawImage 抛 InvalidStateError，首帧跳过，待 onload 重绘 */
    }
    return;
  }

  // stage 1–4：直接按「目标画布高度占比」定尺寸，撑满画布、不溢出上沿；
  // 底部贴土堆线 y=92，水平以画布中心 x=50 居中（与旧逻辑一致）。
  const fill = cfg.stageFill[stageIdx] || 0.85;
  const targetH = box.cssH * fill;     // 目标绘制高度（CSS 像素）
  const scale = targetH / ih;          // 由高度反推等比缩放（树高>宽，纵向撑满即饱满）
  const dw = iw * scale;
  const dh = ih * scale;
  const [cx, soilY] = mapPointLocal(box, 50, 92, tf); // 画布中心 x=50，土堆线 y=92
  const dx = cx - dw / 2;              // 水平居中（以画布中心为基准）
  // 横向居中修正：base_cx 是树干底部可见像素 x 质心占比，(0.5-base_cx)*dw 把「树干」对齐 x=50
  const baseCx = (cfg.baseCxFrac && cfg.baseCxFrac[stageIdx] != null) ? cfg.baseCxFrac[stageIdx] : 0.5;
  const dxCorrected = dx + (0.5 - baseCx) * dw;
  // dy 用该物种 BASE_FRAC[stageIdx] 把「可见树底」精确压到土堆线 y=92（去透明留白）。
  const dy = soilY - dh * cfg.baseFrac[stageIdx];
  try {
    ctx.drawImage(img, dxCorrected, dy, dw, dh);
  } catch (e) {
    /* 图片未加载完成：浏览器 drawImage 抛 InvalidStateError，首帧跳过，待 onload 重绘 */
  }
}

/**
 * 兼容导出：绘制松树某阶段精灵图（内部复用通用 drawTreeSprite，行为零变化）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} stageIdx 0–4
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} tf 自动缩放变换
 * @param {{minX:number, maxX:number, minY:number, maxY:number}} [bounds] 精灵图落位包围盒
 */
export function drawPineSprite(ctx, stageIdx, box, tf, bounds) {
  return drawTreeSprite(ctx, 'pine', stageIdx, box, tf, bounds);
}

// 局部复用 tree-canvas 的 mapPoint 约定（避免循环依赖，独立实现同一映射）：
// 未传 tf 时等比缩放 + 居中；传 tf 时直接套用 fit 变换。
function mapPointLocal(box, x, y, tf) {
  if (tf) return [tf.offX + x * tf.scale, tf.offY + y * tf.scale];
  const scale = Math.min(box.cssW, box.cssH) / 100;
  const offX = (box.cssW - 100 * scale) / 2;
  const offY = (box.cssH - 100 * scale) / 2;
  return [offX + x * scale, offY + y * scale];
}

/**
 * 取某物种某阶段精灵图的虚拟 100×100 包围盒（供粒子系统计算出生区）。
 * 返回值基于 stageFill / baseFrac 反推，不依赖实际图片加载。
 * @param {string} species 物种 key（pine/apple/sakura/orange）
 * @param {number} stageIdx 0–4
 * @returns {{topY:number, bottomY:number, centerX:number, halfWidth:number}|null}
 */
export function getSpriteBounds(species, stageIdx) {
  const sp = normalizeSpriteSpecies(species);
  const cfg = SPRITE_SPECIES_CONFIG[sp];
  if (!cfg) return null;
  const idx = clampStageIdx(stageIdx, cfg.paths.length);

  const bottomY = 92; // 土堆线，固定
  // 树顶 y：由撑满高度反推（stageFill 决定树在画布中的高度占比）
  const fill = cfg.stageFill[idx] || 0.85;
  const topY = bottomY - 100 * fill;

  // 树半宽：近似估算（stage 越大越宽）
  // 飘落范围需覆盖整棵树（含外展枝叶），故开花/繁茂放宽到 34/40（需求③）
  let halfWidth;
  if (idx <= 1) halfWidth = 6 + idx * 4;       // seed/sprout: 窄
  else if (idx === 2) halfWidth = 18;            // leaf: 中等
  else halfWidth = 34 + (idx - 3) * 6;           // bloom=34 / lush=40：覆盖整棵树冠

  // 水平中心：土堆中心 x=50 经 base_cx 修正后树干也对齐此处
  const baseCx = (cfg.baseCxFrac && cfg.baseCxFrac[idx] != null) ? cfg.baseCxFrac[idx] : 0.5;
  // centerX 是"树的视觉中心"在虚拟坐标系中的 x 值
  // 绘制时 dxCorrected = cx - dw/2 + (0.5-fcx)*dw → 树心对齐 cx=50
  const centerX = 50;

  return { topY, bottomY, centerX, halfWidth };
}
