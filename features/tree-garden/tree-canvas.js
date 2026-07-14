// features/tree-garden/tree-canvas.js — Canvas 2D 分形树引擎（B 方案）
//
// 设计要点（与 SVG 版 tree-svg.js 对齐，但用 <canvas> 实时绘制 + 粒子动画）：
//  - 配色全走 CSS 变量 --tree-trunk / --tree-leaf / --tree-soil / --tree-flower /
//    --tree-fruit / --gold；Canvas 经 resolveTreeColors 解析，无头/未定义时回退调色板。
//  - 坐标系：骨架/粒子在虚拟 100×100（原点左下 (0,0)，右上 (100,100)，土堆中心 ~y=92），
//    与 SVG viewBox 对齐；draw* 按 box{cssW,cssH} 以 mapPoint 映射（等比缩放 + 居中；
//    ⑤ 自动缩放时改用 fit 变换，使树整体落入目标区域避免溢出）。
//  - DPR 封装：仅 setupHiDPICanvas 做高清缩放，其余绘制在 CSS 像素坐标系。
//  - 纯函数与 DOM/canvas 解耦：buildTreeSkeleton / buildCanopyFoliage / buildPineTower /
//    generatePetals / createParticleSystem / step 不碰 DOM/canvas，便于 QA mock 测试；
//    绘制函数接受注入的 ctx。
//  - 冠层"团"效果（③）：buildCanopyFoliage 基于骨架枝条节点撒半透明叶团，drawCanopy 叠加。
//  - 松树 A 方案（②）：drawPineTower 分形针叶塔逻辑完整保留（供 svg 模式回退与单测契约）；
//    canvas 模式下的四物种（pine/apple/sakura/orange）均走「手绘位图精灵图」路线
//    （tree-sprite.js 的 drawTreeSprite），按 stage 0–4 绘制对应 PNG；松树保留松针/松果飘落物
//    （物种隔离：松树绝不飘花瓣，其它物种绝不飘松针/松果）。
//  - 粒子动画：常驻轻量 rAF，仅 idx>=3 激活；花瓣/果实 maxCount 上限 30–40；出界回收至树冠（不消失）。
//  - 多棵同时渲染：每棵树独立 ParticleSystem，模块 registry 按 canvas 隔离，互不干扰。

import { SPECIES } from './inventory.js';
import { scoreToTreeStage } from './water.js';
import { STATE } from '../../core/state.js';
// 四物种手绘位图精灵图（canvas 模式）路线；svg 模式仍走 tree-svg.js。
import { drawTreeSprite, getTreeSprite, onTreeSpriteLoad, getSpriteBounds } from './tree-sprite.js';

// ===== 唯一开关 =====
// 'canvas'（默认）→ 用 Canvas 引擎；改 'svg' 回退到 tree-svg.js 的 renderTreeStage。
export const TREE_RENDERER = 'canvas';

// ===== 走精灵图路线的物种（pine 已验收，现扩展 apple/sakura/orange 接入同一管线）=====
// 这四个物种在 canvas 模式下一律绘制手绘位图精灵图，而非分形骨架；其余（理论上无）走分形回退。
export const SPRITE_SPECIES = ['pine', 'apple', 'sakura', 'orange'];

// ===== 四物种参数（弧度）=====
export const SPECIES_TREE_PARAMS = {
  pine: {
    angle: 0.28, angleVar: 0.10, lenRatio: 0.78, maxDepth: 8, canopy: 'spire',
    leafKind: 'needle', flowerStage: 3, flowerColorVar: '--tree-fruit',
    fruitStage: 4, fruitKind: 'cone', fruitColorVar: '--tree-fruit',
  },
  apple: {
    angle: 0.49, angleVar: 0.17, lenRatio: 0.74, maxDepth: 5, canopy: 'round',
    leafKind: 'round', flowerStage: 3, flowerColorVar: '--tree-flower',
    fruitStage: 4, fruitKind: 'dot', fruitColorVar: '--tree-fruit',
  },
  sakura: {
    angle: 0.45, angleVar: 0.21, lenRatio: 0.76, maxDepth: 5, canopy: 'round',
    leafKind: 'round', flowerStage: 3, flowerColorVar: '--tree-flower',
    fruitStage: 4, fruitKind: 'cherry', fruitColorVar: '--tree-fruit',
  },
  orange: {
    angle: 0.59, angleVar: 0.16, lenRatio: 0.72, maxDepth: 5, canopy: 'wide',
    leafKind: 'round', flowerStage: 3, flowerColorVar: '--tree-flower',
    fruitStage: 4, fruitKind: 'bigdot', fruitColorVar: '--tree-citrus',  // 橘子果实=黄橙色（需求④，不再用红色 --tree-fruit）
  },
};

// ===== 回退调色板（无头/未定义 CSS 变量时使用）=====
export const TREE_FALLBACK_COLORS = {
  '--tree-trunk': '#7a5230',
  '--tree-leaf': '#3f9d4f',
  '--tree-soil': '#8d6e4a',
  '--tree-flower': '#ffb7c5',
  '--tree-fruit': '#ff5a5f',
  '--tree-citrus': '#ffa726',  // 橘子/橙子果实黄橙色（需求④）
  '--gold': '#f4c430',
};

// 参与解析的 CSS 变量集合
const COLOR_VARS = [
  '--tree-trunk', '--tree-leaf', '--tree-soil',
  '--tree-flower', '--tree-fruit', '--tree-citrus', '--gold',
];

// 模块级 registry：canvas → Controller，用于 resize 防抖后批量 redraw 与各树隔离。
const registry = new Map();
let _resizeBound = false;

// =====================================================================
// 工具：物种归一化 / stage→递归深度 / 坐标夹紧 / 虚拟→屏幕映射
// =====================================================================

/**
 * 把任意 species 归一化为已知物种（未知一律按 pine 处理，同 SVG 版）。
 * @param {string} species
 * @returns {'pine'|'apple'|'sakura'|'orange'}
 */
function normalizeSpecies(species) {
  return SPECIES.includes(species) ? species : 'pine';
}

/**
 * stageIdx → 递归深度映射（通用，松整体更密）。
 *  idx0(种子)→0（仅画嫩芽，不递归）
 *  idx1(发芽)→max(1, round(maxDepth*0.25))
 *  idx2(长叶)→round(maxDepth*0.5)
 *  idx3(开花)→round(maxDepth*0.78)
 *  idx4(繁茂)→maxDepth（最密）
 * @param {number} idx 0–4
 * @param {number} maxDepth 该物种最大深度
 * @returns {number}
 */
function stageToDepth(idx, maxDepth) {
  if (idx <= 0) return 0;
  if (idx === 1) return Math.max(1, Math.round(maxDepth * 0.25));
  if (idx === 2) return Math.round(maxDepth * 0.5);
  if (idx === 3) return Math.round(maxDepth * 0.78);
  return maxDepth;
}

/**
 * 把虚拟 100×100 坐标映射到 box 的 CSS 像素。
 *  - 未传 tf：等比缩放 + 居中（避免非正方形画布变形），等价于旧行为。
 *  - 传入 tf（⑤自动缩放）：直接套用 fit 变换 [offX + x*scale, offY + y*scale]。
 * @param {{cssW:number, cssH:number}} box
 * @param {number} x 虚拟 x [0,100]
 * @param {number} y 虚拟 y [0,100]
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换（可选）
 * @returns {[number, number]} [screenX, screenY]（CSS 像素）
 */
function mapPoint(box, x, y, tf) {
  if (tf) return [tf.offX + x * tf.scale, tf.offY + y * tf.scale];
  const scale = Math.min(box.cssW, box.cssH) / 100;
  const offX = (box.cssW - 100 * scale) / 2;
  const offY = (box.cssH - 100 * scale) / 2;
  return [offX + x * scale, offY + y * scale];
}

/**
 * 取当前虚拟→屏幕缩放系数（供线宽/尺寸等比放大）。与 mapPoint 约定一致。
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} [tf]
 * @returns {number}
 */
function mapScale(box, tf) {
  return tf ? tf.scale : Math.min(box.cssW, box.cssH) / 100;
}

/**
 * 将坐标夹紧到虚拟 100×100 空间 [0,100]，保证骨架/粒子坐标不越界
 * （越界坐标经 mapPoint 映射后会溢出画布边界被裁切，违反显式规格）。
 * @param {number} v
 * @returns {number}
 */
const clamp = (v) => Math.max(0, Math.min(100, v));

// =====================================================================
// DPR / 响应式
// =====================================================================

/**
 * 设置 HiDPI 画布：canvas.width/height = css*dpr，并 ctx.setTransform(dpr,0,0,dpr,0,0)，
 * 使后续绘制均在 CSS 像素坐标系。返回 2D ctx（jsdom 下可能返回 null）。
 * @param {HTMLCanvasElement} canvas
 * @param {number} cssW CSS 宽度（像素）
 * @param {number} cssH CSS 高度（像素）
 * @returns {CanvasRenderingContext2D|null}
 */
export function setupHiDPICanvas(canvas, cssW, cssH) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio)
    ? window.devicePixelRatio
    : 1;
  const w = Math.max(1, Math.round((cssW || 100) * dpr));
  const h = Math.max(1, Math.round((cssH || 100) * dpr));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (ctx) {
    try {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } catch (e) {
      /* 某些环境 setTransform 不可用时忽略，退化为 1:1 */
    }
  }
  return ctx || null;
}

// =====================================================================
// 颜色解析
// =====================================================================

/**
 * 解析 --tree-* / --gold 等 CSS 变量颜色；getComputedStyle 取不到时回退调色板；
 * opts.colors 可逐变量覆盖（便于测试与主题定制）。
 * @param {Element} [ref] 用于 getComputedStyle 的元素（通常为 canvas 或其父节点）
 * @param {{colors?: Object<string,string>}} [opts]
 * @returns {Object<string,string>} 变量名 → 颜色字符串（含回退）
 */
export function resolveTreeColors(ref, opts = {}) {
  const colors = {};
  let style = null;
  if (ref && typeof getComputedStyle === 'function') {
    try { style = getComputedStyle(ref); } catch (e) { style = null; }
  }
  const overrides = (opts && opts.colors) || {};
  for (const v of COLOR_VARS) {
    let val = null;
    if (style) {
      try {
        const got = style.getPropertyValue(v);
        if (got != null) {
          const t = String(got).trim();
          if (t) val = t;
        }
      } catch (e) { /* ignore */ }
    }
    if (overrides[v]) val = overrides[v];
    colors[v] = val || TREE_FALLBACK_COLORS[v];
  }
  return colors;
}

/**
 * 颜色明暗微调（不硬编码 hex 之外的任何值）：基于 resolveTreeColors 解析出的基色，
 * 按比例 amt∈[-1,1] 增加/减少亮度，返回 rgb()/rgba() 字符串。
 * 支持 #rgb / #rrggbb / rgb() / rgba()；无法解析时原样返回（不抛错）。
 * @param {string} color 基色
 * @param {number} amt 亮度增量（正=变亮，负=变暗），0 原样
 * @returns {string}
 */
function shadeColor(color, amt) {
  if (!amt) return color;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  const rm = /^rgba?\(([^)]+)\)$/i.exec(color || '');
  if (rm) {
    const parts = rm[1].split(',').map((s) => parseFloat(s));
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    const a = parts[3] != null ? parts[3] : 1;
    return `rgba(${f(parts[0])},${f(parts[1])},${f(parts[2])},${a})`;
  }
  return color;
}

// =====================================================================
// 骨架构建（纯函数，虚拟 100×100 递归）— 保持既有测试契约不变
// =====================================================================

/**
 * 在某末端枝 tip 处追加叶/花/果标记节点。
 * @param {Array} nodes 输出节点数组
 * @param {number} x tip 虚拟 x
 * @param {number} y tip 虚拟 y
 * @param {object} p SPECIES_TREE_PARAMS 项
 * @param {number} idx stageIdx 0–4
 * @param {()=>number} rng [0,1) 随机
 */
function addFoliage(nodes, x, y, p, idx, rng) {
  // 叶：idx>=2 起（长叶）；越繁茂越多
  if (idx >= 2) {
    const nLeaves = idx >= 4 ? 3 : (idx >= 3 ? 2 : 1);
    for (let i = 0; i < nLeaves; i++) {
      const dx = (rng() - 0.5) * 8;
      const dy = (rng() - 0.5) * 8;
      nodes.push({
        x1: x, y1: y, x2: clamp(x + dx), y2: clamp(y + dy),
        width: 2 + rng() * 1.5, depth: 99, kind: 'leaf',
        colorVar: '--tree-leaf', leafKind: p.leafKind,
      });
    }
  }
  // 花：idx>=flowerStage（默认 3）
  if (idx >= p.flowerStage) {
    const dx = (rng() - 0.5) * 6;
    const dy = (rng() - 0.5) * 6;
      nodes.push({
        x1: x, y1: y, x2: clamp(x + dx), y2: clamp(y + dy),
        width: 2.6, depth: 99, kind: 'flower',
        colorVar: p.flowerColorVar,
      });
  }
  // 果：idx>=fruitStage（默认 4）
  if (idx >= p.fruitStage) {
    const dx = (rng() - 0.5) * 6;
    const dy = (rng() - 0.5) * 6;
      nodes.push({
        x1: x, y1: y, x2: clamp(x + dx), y2: clamp(y + dy),
        width: p.fruitKind === 'bigdot' ? 3.4 : (p.fruitKind === 'cone' ? 3 : 2.4),
        depth: 99, kind: 'fruit',
        colorVar: p.fruitColorVar, fruitKind: p.fruitKind,
      });
  }
}

/**
 * 递归分形枝条。
 * @param {Array} nodes 输出节点数组
 * @param {number} x 起点虚拟 x
 * @param {number} y 起点虚拟 y
 * @param {number} angle 当前生长方向（弧度，标准数学角；-PI/2 为向上）
 * @param {number} length 本段长度
 * @param {number} width 本段线宽
 * @param {number} depth 当前递归深度
 * @param {number} maxDepth 目标最大深度
 * @param {object} p 物种参数
 * @param {number} idx stageIdx
 * @param {()=>number} rng 随机
 */
function recurse(nodes, x, y, angle, length, width, depth, maxDepth, p, idx, rng) {
  // 夹紧到 [0,100]：深阶段树冠可能溢出虚拟空间，拉回边界内（树形基本不变）
  const x2 = clamp(x + Math.cos(angle) * length);
  const y2 = clamp(y + Math.sin(angle) * length);
  const kind = depth === 0 ? 'trunk' : (depth <= 1 ? 'branch' : 'twig');
  nodes.push({
    x1: x, y1: y, x2, y2,
    width: Math.max(0.6, width), depth, kind, colorVar: '--tree-trunk',
  });

  if (depth >= maxDepth) {
    addFoliage(nodes, x2, y2, p, idx, rng);
    return;
  }

  // 二叉主分形（角度带抖动）
  const baseAngle = p.angle + (rng() - 0.5) * 2 * p.angleVar;
  recurse(nodes, x2, y2, angle - baseAngle, length * p.lenRatio, width * 0.72, depth + 1, maxDepth, p, idx, rng);
  recurse(nodes, x2, y2, angle + baseAngle, length * p.lenRatio, width * 0.72, depth + 1, maxDepth, p, idx, rng);

  // 圆冠/宽冠在 depth>=1 时加一根近直立中央枝，使树冠更饱满（松塔形不加，保持瘦高）
  if (depth >= 1 && p.canopy !== 'spire') {
    recurse(nodes, x2, y2, angle + (rng() - 0.5) * 0.15, length * p.lenRatio * 0.92, width * 0.7, depth + 1, maxDepth, p, idx, rng);
  }
}

/**
 * 构建虚拟 100×100 空间的树骨架（纯函数，无 DOM/canvas）。
 * 返回 BranchNode[]：{x1,y1,x2,y2,width,depth,kind,colorVar[,leafKind][,fruitKind]}。
 * 注意：本函数仅产出枝条/叶/花/果节点，冠层"团"（③）由独立的 buildCanopyFoliage 生成，
 * 松树塔形（②）由 buildPineTower 生成——保持本函数契约（seed=3 节点、四物种差异等）不变。
 * @param {'pine'|'apple'|'sakura'|'orange'|string} species 未知按 pine 处理
 * @param {number} stageIdx 0–4（种子/发芽/长叶/开花/繁茂）
 * @param {object} params SPECIES_TREE_PARAMS 中对应项（缺省按 species 自动取）
 * @param {{rng?: ()=>number}} [opts] 可注入随机
 * @returns {Array} BranchNode[]
 */
export function buildTreeSkeleton(species, stageIdx, params, opts = {}) {
  const sp = normalizeSpecies(species);
  const p = params || SPECIES_TREE_PARAMS[sp] || SPECIES_TREE_PARAMS.pine;
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  const rng = opts.rng || Math.random;
  const nodes = [];
  const baseX = 50;
  const baseY = 92; // 土堆中心

  // 种子阶段：仅嫩芽（小茎 + 两片小叶），不递归（① 刻意留白，所有物种一致）
  if (idx === 0) {
    nodes.push({ x1: baseX, y1: baseY, x2: baseX, y2: baseY - 14, width: 2.4, depth: 0, kind: 'trunk', colorVar: '--tree-trunk' });
    nodes.push({ x1: baseX, y1: baseY - 12, x2: baseX - 9, y2: baseY - 20, width: 2, depth: 1, kind: 'leaf', colorVar: '--tree-leaf', leafKind: 'round' });
    nodes.push({ x1: baseX, y1: baseY - 12, x2: baseX + 9, y2: baseY - 20, width: 2, depth: 1, kind: 'leaf', colorVar: '--tree-leaf', leafKind: 'round' });
    return nodes;
  }

  const maxDepth = stageToDepth(idx, p.maxDepth);
  const trunkLen = sp === 'pine' ? 24 : 22;
  const trunkWidth = sp === 'pine' ? 4 : 4.5;
  recurse(nodes, baseX, baseY, -Math.PI / 2, trunkLen, trunkWidth, 0, maxDepth, p, idx, rng);
  return nodes;
}

// =====================================================================
// 冠层"团"效果（③）：基于骨架枝条撒半透明叶团（纯函数，独立 builder）
// =====================================================================

/**
 * 基于 buildTreeSkeleton 产出的枝条节点，计算枝条覆盖的冠层区域，在该区域内撒一批
 * 半透明叶团（每个叶团 = {x,y,r,colorVar,opacity}，虚拟 100×100 空间），层叠出蓬松的"团"。
 *  - 圆冠(apple/sakura)/宽冠(orange)：叶团集中在枝条上半部团状区域；松(pine)不走此体系（见 buildPineTower）。
 *  - 叶团数量随 stageIdx 递增（idx1 少、idx4 多且密）；opacity 用半透明叠加（0.5–0.8）制造层次。
 *  - 发芽(idx1)/长叶(idx2) 共用同一套画法，仅叶团数量/尺寸递减（发芽≈长叶的 40% 体量，①）。
 *  - 返回节点数组，坐标必须 clamp 到 [0,100] 且各叶团整体不越界（按 r 反向夹紧中心）。
 * @param {Array} skeleton buildTreeSkeleton 的输出 BranchNode[]
 * @param {'pine'|'apple'|'sakura'|'orange'|string} species
 * @param {number} stageIdx 0–4
 * @param {object} params SPECIES_TREE_PARAMS 中对应项
 * @param {{rng?: ()=>number}} [opts] 可注入随机
 * @returns {Array<{x:number,y:number,r:number,colorVar:string,opacity:number}>}
 */
export function buildCanopyFoliage(skeleton, species, stageIdx, params, opts = {}) {
  const sp = normalizeSpecies(species);
  const p = params || SPECIES_TREE_PARAMS[sp] || SPECIES_TREE_PARAMS.pine;
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  const rng = opts.rng || Math.random;
  const clumps = [];
  if (sp === 'pine') return clumps; // ③ 松走塔形，不在此叶团体系内
  if (idx <= 0) return clumps; // 种子无冠层（① 留白）

  // 候选中心：枝条上半部节点（非 trunk 且 y2<84），团集中在树冠区
  const tips = Array.isArray(skeleton)
    ? skeleton.filter((n) => n.kind !== 'trunk' && n.y2 < 84)
    : [];
  if (!tips.length) return clumps;

  // 叶团数量随 idx 递增；发芽(idx1)≈长叶(idx2) 的 40% 体量（数量/尺寸双减）
  const countByIdx = { 1: 9, 2: 22, 3: 38, 4: 58 };
  const count = countByIdx[idx] || 10;
  const baseRByIdx = { 1: 4.0, 2: 5.2, 3: 6.2, 4: 7.4 };
  const baseR = baseRByIdx[idx] || 5;
  const canopy = p.canopy; // 'round' | 'wide'（松为 spire，不走此分支）
  const spread = canopy === 'wide' ? 9 : 7;

  for (let i = 0; i < count; i++) {
    const t = tips[Math.floor(rng() * tips.length)];
    const cx = clamp(t.x2);
    const cy = clamp(t.y2);
    const ox = (rng() - 0.5) * spread * 2;
    const oy = (rng() - 0.5) * spread * 1.4;
    const r = Math.max(2, baseR * (0.7 + rng() * 0.6));
    // 反向夹紧中心，保证整团（含半径）落在 [0,100]
    const fx = Math.max(r + 0.5, Math.min(100 - r - 0.5, clamp(cx + ox)));
    const fy = Math.max(r + 0.5, Math.min(100 - r - 0.5, clamp(cy + oy)));
    clumps.push({
      x: fx,
      y: fy,
      r,
      colorVar: '--tree-leaf',
      opacity: 0.5 + rng() * 0.3, // 0.5–0.8
    });
  }
  return clumps;
}

// =====================================================================
// 松树分层针叶塔（②）：原地重绘，不换物种、不动数据
// =====================================================================

/**
 * 构建松树的分层针叶塔（纯函数，虚拟 100×100）。
 * 自下而上 3–5 层收窄的三角形/梯形塔（层间略微重叠），塔底接短树干；
 * 阶段越高层数越多/越饱满（idx1=2 层小塔，idx4=5 层满塔）。
 * 叶团/塔层坐标经 clamp，整体受 ⑤ 自动缩放约束。
 * @param {'pine'|string} species 仅 pine 使用（其余物种不会调用）
 * @param {number} stageIdx 0–4（0 返回空：松树种子走 buildTreeSkeleton 嫩芽）
 * @param {object} params SPECIES_TREE_PARAMS.pine
 * @param {{rng?: ()=>number}} [opts] 可注入随机
 * @returns {Array<{cx:number,yb:number,yt:number,wb:number,wt:number,colorVar:string,opacity:number}>}
 *   每层一个梯形（wb=底半宽，wt=顶半宽；yb=底 y，yt=顶 y）。
 */
export function buildPineTower(species, stageIdx, params, opts = {}) {
  const sp = normalizeSpecies(species);
  if (sp !== 'pine') return [];
  const p = params || SPECIES_TREE_PARAMS.pine;
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  const rng = opts.rng || Math.random;
  if (idx <= 0) return []; // 种子：不走塔形

  const n = Math.min(5, idx + 1);          // 层数：2..5
  const baseY = 92;                         // 塔底贴土堆
  const towerH = 38 + idx * 9;              // 总高：idx1=47 → idx4=74
  const layerH = towerH / n;
  const maxW = 15 + idx * 2.2;              // 底半宽：idx1≈17 → idx4≈24
  const narrow = 0.16 + 0.02 * idx;         // 层间收窄系数

  const layers = [];
  for (let i = 0; i < n; i++) {
    const yb = baseY - i * layerH;
    const yt = baseY - (i + 1) * layerH * 1.12; // 略重叠（>layerH 使层间咬合）
    const wb = maxW * (1 - i * narrow);
    const wt = wb * (1 - narrow) * 0.92;        // 上一层更窄
    layers.push({
      cx: 50,
      yb: clamp(yb),
      yt: clamp(yt),
      wb: Math.max(4, wb),
      wt: Math.max(2, wt),
      colorVar: p.colorVar || '--tree-leaf',
      opacity: 0.92,
    });
  }
  return layers;
}

// =====================================================================
// 绘制：骨架 / 土堆 / 叶 / 花 / 果 / 冠层 / 塔（接受注入 ctx）
// =====================================================================

/**
 * 画土堆（与 SVG 版对齐：cx50 cy92 rx30 ry7）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{cssW:number, cssH:number}} box
 * @param {Object<string,string>} colors
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换
 */
function drawSoil(ctx, box, colors, tf) {
  const [cx, cy] = mapPoint(box, 50, 92, tf);
  const scale = mapScale(box, tf);
  const rx = 30 * scale;
  const ry = 7 * scale;
  ctx.fillStyle = colors['--tree-soil'] || TREE_FALLBACK_COLORS['--tree-soil'];
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 画单片叶。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x 屏幕 x
 * @param {number} y 屏幕 y
 * @param {number} size 尺寸（CSS 像素）
 * @param {string} color 填充色
 * @param {string} [leafKind] 'round' | 'needle'
 */
function drawLeaf(ctx, x, y, size, color, leafKind) {
  ctx.fillStyle = color;
  if (leafKind === 'needle') {
    // 针叶：细长椭圆，垂直取向
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.4, size * 0.32), Math.max(0.6, size * 1.1), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 圆叶：小圆
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, size * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 画一朵花（花瓣团 + 金黄花心）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} color
 * @param {string} gold 花心色
 */
function drawFlower(ctx, x, y, size, color, gold) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.6, size * 0.6), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold || TREE_FALLBACK_COLORS['--gold'];
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.3, size * 0.25), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 画一颗果实（松果=竖直椭圆；其余=圆，bigdot 更大）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} color
 * @param {string} [fruitKind] 'cone' | 'dot' | 'cherry' | 'bigdot'
 */
function drawFruit(ctx, x, y, size, color, fruitKind) {
  ctx.fillStyle = color;
  if (fruitKind === 'cone') {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, size * 0.4), Math.max(0.8, size * 0.95), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, size * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 把骨架画到注入的 ctx（纯函数：仅调用 ctx 绘制 API，不创建/查询 DOM）。
 * 坐标按 box{cssW,cssH} + 可选 tf 等比缩放并居中。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} skeleton BranchNode[]
 * @param {Object<string,string>} colors resolveTreeColors 的返回
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换
 */
export function drawSkeleton(ctx, skeleton, colors, box, tf) {
  if (!ctx || !Array.isArray(skeleton) || !skeleton.length) return;
  const gold = colors['--gold'] || TREE_FALLBACK_COLORS['--gold'];
  const s = mapScale(box, tf);
  for (const n of skeleton) {
    const c = colors[n.colorVar] || '#8a8a8a';
    if (n.kind === 'leaf') {
      const [x2, y2] = mapPoint(box, n.x2, n.y2, tf);
      drawLeaf(ctx, x2, y2, n.width * s, c, n.leafKind);
    } else if (n.kind === 'flower') {
      const [x2, y2] = mapPoint(box, n.x2, n.y2, tf);
      drawFlower(ctx, x2, y2, n.width * s, c, gold);
    } else if (n.kind === 'fruit') {
      const [x2, y2] = mapPoint(box, n.x2, n.y2, tf);
      drawFruit(ctx, x2, y2, n.width * s, c, n.fruitKind);
    } else {
      const [x1, y1] = mapPoint(box, n.x1, n.y1, tf);
      const [x2, y2] = mapPoint(box, n.x2, n.y2, tf);
      ctx.strokeStyle = c;
      ctx.lineWidth = Math.max(0.5, n.width * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

/**
 * 把冠层叶团画到注入的 ctx（半透明 fill 叠加，层叠出蓬松"团"）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} foliage buildCanopyFoliage 的输出
 * @param {Object<string,string>} colors resolveTreeColors 的返回
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换
 */
export function drawCanopy(ctx, foliage, colors, box, tf) {
  if (!ctx || !Array.isArray(foliage) || !foliage.length) return;
  const s = mapScale(box, tf);
  for (const c of foliage) {
    const [x, y] = mapPoint(box, c.x, c.y, tf);
    const r = Math.max(1, c.r * s);
    const color = colors[c.colorVar] || TREE_FALLBACK_COLORS[c.colorVar] || '#3f9d4f';
    ctx.save();
    ctx.globalAlpha = c.opacity != null ? c.opacity : 0.7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 把松树分层针叶塔画到注入的 ctx（②）。塔底短树干 + 逐层「锯齿边缘 / 垂直渐变 / 放射针簇」，
 * 让松树像真实松枝塔（分层针叶、明暗层次、边缘针叶毛刺感），而非光滑实心绿锥。
 * 仅调用注入的 ctx 绘制 API，不创建/查询 DOM，便于 QA mock 测试。
 * 注：createLinearGradient 在 QA mock 下可能返回 undefined，故渐变创建做了防御性回退纯色。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} tower buildPineTower 的输出（每层一个梯形：cx/yb/yt/wb/wt/colorVar/opacity）
 * @param {Object<string,string>} colors resolveTreeColors 的返回
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换
 */
export function drawPineTower(ctx, tower, colors, box, tf) {
  if (!ctx || !Array.isArray(tower) || !tower.length) return;
  const s = mapScale(box, tf);
  const leaf = colors['--tree-leaf'] || TREE_FALLBACK_COLORS['--tree-leaf'];
  const trunk = colors['--tree-trunk'] || TREE_FALLBACK_COLORS['--tree-trunk'];
  const rng = Math.random;

  // 短树干（塔底 y=92 到第一层底 yb）
  const yb0 = tower[0].yb;
  const [tx0, ty0] = mapPoint(box, 50 - 2.4, 92, tf);
  const [tx1, ty1] = mapPoint(box, 50 + 2.4, 92, tf);
  const [tx2, ty2] = mapPoint(box, 50 + 1.6, yb0, tf);
  const [tx3, ty3] = mapPoint(box, 50 - 1.6, yb0, tf);
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.lineTo(tx3, ty3);
  ctx.closePath();
  ctx.fill();

  /**
   * 生成一条斜边的锯齿凸点：把 (x0,y0)→(x1,y1) 切成 3–5 段，每段中部沿「外法线」向外凸出，
   * 模拟松枝层边缘的参差枝梢（不再是光滑直线）。返回不含端点的内部凸点序列（由调用方连接端点）。
   * @param {number} x0,y0 斜边起点（层底角，虚拟→屏幕已映射）
   * @param {number} x1,y1 斜边终点（层顶角）
   * @param {number} side -1=左缘（向外取左向法线）/+1=右缘（向外取右向法线）
   * @param {number} sc 屏幕缩放系数
   * @param {()=>number} rnd [0,1) 随机
   * @returns {Array<[number,number]>} 内部凸点 [screenX, screenY]
   */
  const pineScallop = (x0, y0, x1, y1, side, sc, rnd) => {
    const nSeg = 3 + Math.floor(rnd() * 3); // 3–5 段起伏
    const dx = x1 - x0, dy = y1 - y0;
    // 外法线：左缘 side<0 取 (dy,-dx)，右缘 side>0 取 (-dy,dx)；均指向锥体外部
    const nx = side < 0 ? dy : -dy;
    const ny = side < 0 ? -dx : dx;
    const nl = Math.hypot(nx, ny) || 1;
    const pts = [];
    for (let k = 1; k <= nSeg; k++) {
      const t = (k - 0.5) / nSeg;             // 段中点：严格落在 (0,1) 内
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const bump = (1.2 + rnd() * 1.8) * sc;  // 向外凸出量（屏幕 px）
      pts.push([bx + (nx / nl) * bump, by + (ny / nl) * bump]);
    }
    return pts;
  };

  /**
   * 沿一条斜边向外下方放射密集针簇（针叶毛刺边缘）。
   * @param {number} x0,y0 斜边起点（层底角）
   * @param {number} x1,y1 斜边终点（层顶角）
   * @param {number} side -1=左缘 /+1=右缘
   * @param {number} sc 屏幕缩放系数
   * @param {string} base 基色（--tree-leaf 解析值）
   * @param {()=>number} rnd [0,1) 随机
   */
  const drawNeedles = (x0, y0, x1, y1, side, sc, base, rnd) => {
    const count = 12 + Math.floor(rnd() * 7); // 12–18 根/侧
    const dx = x1 - x0, dy = y1 - y0;
    const sign = side < 0 ? -1 : 1;           // 向外（左缘 -1 / 右缘 +1）
    ctx.save();
    ctx.strokeStyle = shadeColor(base, -0.2);  // 略深绿针叶
    ctx.lineWidth = Math.max(0.5, 0.7 * sc);
    ctx.lineCap = 'round';
    for (let k = 0; k < count; k++) {
      const t = (k + 0.15 + rnd() * 0.7) / count; // 沿斜边均匀+抖动采样
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const droop = 0.6 + rnd() * 0.5;         // 下垂角（≈31°–47° 低于水平）
      const nl = Math.hypot(sign, droop) || 1;
      const nx = sign / nl, ny = droop / nl;
      const len = (2.5 + rnd() * 1.5) * sc;     // 2.5–4*s px
      ctx.globalAlpha = 0.55 + rnd() * 0.15;    // 0.55–0.7
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + nx * len, py + ny * len);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 逐层由底向上绘制（层间略微重叠咬合，半透明叠加出纵深）
  for (const L of tower) {
    const [blx, bly] = mapPoint(box, L.cx - L.wb, L.yb, tf);
    const [brx, bry] = mapPoint(box, L.cx + L.wb, L.yb, tf);
    const [tlx, tly] = mapPoint(box, L.cx - L.wt, L.yt, tf);
    const [trx, tryy] = mapPoint(box, L.cx + L.wt, L.yt, tf);

    // 锯齿边缘：左右斜边各切 3–5 段向外凸
    const left = pineScallop(blx, bly, tlx, tly, -1, s, rng);
    const right = pineScallop(brx, bry, trx, tryy, +1, s, rng);

    // 垂直渐变填充（顶浅底深），模拟受光层次；QA mock 无 gradient 时回退纯色
    let layerFill = leaf;
    try {
      const grad = ctx.createLinearGradient(0, tly, 0, bly);
      if (grad && typeof grad.addColorStop === 'function') {
        grad.addColorStop(0, shadeColor(leaf, 0.18));   // 层顶受光：浅绿
        grad.addColorStop(1, shadeColor(leaf, -0.16));  // 层底背光：深绿
        layerFill = grad;
      }
    } catch (e) { /* 无头环境忽略，回退 leaf 纯色 */ }

    // 填充层体：底左 → 左锯齿 → 顶左 → 顶右 → 右锯齿(逆) → 底右 → 闭合
    ctx.save();
    ctx.globalAlpha = L.opacity != null ? L.opacity : 0.92;
    ctx.fillStyle = layerFill;
    ctx.beginPath();
    ctx.moveTo(blx, bly);
    for (const p of left) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(tlx, tly);
    ctx.lineTo(trx, tryy);
    for (let k = right.length - 1; k >= 0; k--) ctx.lineTo(right[k][0], right[k][1]);
    ctx.lineTo(brx, bry);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 层底「托」阴影：沿底边的暗色细描边，制造层间 shelf 立体分隔（≈1–2px 视觉缝隙感）
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = shadeColor(leaf, -0.35);
    ctx.lineWidth = Math.max(0.6, 1.0 * s);
    ctx.beginPath();
    ctx.moveTo(blx, bly);
    ctx.lineTo(brx, bry);
    ctx.stroke();
    ctx.restore();

    // 放射针簇：左右斜边各 12–18 根向外下垂短线
    drawNeedles(blx, bly, tlx, tly, -1, s, leaf, rng);
    drawNeedles(brx, bry, trx, tryy, +1, s, leaf, rng);

    // 体积阴影：层中心偏下加一点深绿块，增强立体感
    const [scx, scy] = mapPoint(box, L.cx, (L.yb + L.yt) / 2 + (L.yb - L.yt) * 0.18, tf);
    const shr = (L.wb * 0.32) * s;
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = shadeColor(leaf, -0.4);
    ctx.beginPath();
    ctx.ellipse(scx, scy, shr, shr * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// =====================================================================
// 粒子系统（纯函数）
// =====================================================================

/**
 * 生成一个粒子（花瓣或果实）。新增 rot/flutter/shade 字段供真实花瓣形飘摆与明暗变化（④）。
 * petalStyle 区分跨物种花瓣形态（⑤）：sakura=粉色窄瓣 / apple=白粉圆瓣红心 / orange=白瓣大黄心
 * @param {()=>number} r [0,1) 随机
 * @param {object} p 物种参数
 * @param {string} sp 归一化物种
 * @param {number} idx stageIdx
 * @param {boolean} [atCanopy] true=在树冠顶部生成（回收用）
 * @param {{topY:number,bottomY:number,centerX:number,halfWidth:number}} [bounds] 树冠包围盒（动态出生区）
 * @returns {object} Particle
 */
function makeParticle(r, p, sp, idx, atCanopy, bounds) {
  // 繁茂(stage4) 100% 落果实，不再混入粉色花瓣（需求②④）；开花(stage3) 仍只飘花瓣
  const isFruit = idx >= 4;
  // 樱花果实=樱桃，同样高概率（不再压低）
  const effectiveIsFruit = isFruit;

  // 跨物种花瓣风格区分
  let petalStyle = 'default';
  if (!effectiveIsFruit) {
    if (sp === 'sakura') petalStyle = 'sakura';     // 粉色五瓣花形
    else if (sp === 'orange') petalStyle = 'orange'; // 白瓣+大黄花心
    else if (sp === 'apple') petalStyle = 'apple';   // 白粉圆瓣+小红心
    else petalStyle = 'default';
  }

  // 动态出生区：有 bounds 时跟随树冠；无 bounds 时走原有固定区间
  let x, y;
  if (bounds) {
    const margin = bounds.halfWidth * 0.85;
    x = bounds.centerX - margin + r() * (margin * 2);
    y = atCanopy
      ? (bounds.topY + r() * Math.min(8, bounds.bottomY - bounds.topY))
      : (bounds.topY + 5 + r() * (bounds.bottomY - bounds.topY - 10));
  } else {
    x = 20 + r() * 60;
    y = atCanopy ? (18 + r() * 8) : (18 + r() * 60);
  }

  const shades = [-0.12, 0, 0.12];
  return {
    x, y,
    vx: (r() - 0.5) * 4,
    vy: 0.5 + r() * 1,   // 下落初速减半（需求④，仅非松树；松树用 makePineParticle 已独立）
    size: effectiveIsFruit
      ? (sp === 'apple' ? 3.6 : (p.fruitKind === 'bigdot' ? 2.6 : 1.8))  // 苹果果实 2× 大（需求③）
      : (sp === 'sakura' ? 1.6 : (sp === 'orange' ? 2.2 : 2)),
    kind: effectiveIsFruit ? 'fruit' : 'petal',
    colorVar: effectiveIsFruit ? p.fruitColorVar : p.flowerColorVar,
    fruitKind: effectiveIsFruit ? p.fruitKind : null,  // 果实类型（樱桃画柄用）
    life: 4 + r() * 4,
    rot: r() * Math.PI * 2,
    flutter: 0.6 + r() * 1.4,
    shade: shades[Math.floor(r() * shades.length)],
    stage: idx,
    species: sp,  // 原始物种 key（回收 respawn 时据此重建，避免退化成松树风格）
    petalStyle,   // 跨物种花瓣风格
  };
}

/**
 * 生成一个松树专属粒子（松针或偶发松果）。松针=细长绿色针状（随时间旋转下落），
 * 松果=小棕色椭圆（偶发）。绝不使用樱花瓣(petal)形状——这是「松树结松果不飘花瓣」的硬约束。
 * @param {()=>number} r [0,1) 随机
 * @returns {object} Particle（kind: 'needle' | 'cone'）
 */
/**
 * 松树真实锥形轮廓（虚拟 100 坐标系，树根贴 y=92）。
 * 数值由实测 5 张透明 PNG 的 alpha 包围盒反推：树在图内居中，stage3/4 树根半宽≈37–38、
 * 树尖接近 y=9~14。粒子仅 stage>=3 激活，故重点定 3/4。
 */
export const PINE_CONE = {
  3: { topY: 14, baseHalf: 37 },
  4: { topY: 9,  baseHalf: 38 },
};

/**
 * 取某 stage 对应的锥形轮廓（树尖虚拟 y 与树根半宽）。
 * stage 3/4 用实测 PINE_CONE 表；其余档走原兜底公式（stage 0–2 无粒子，不会被用到）。
 * @param {number} stage 0–4
 * @returns {{topY:number, baseHalf:number}}
 */
function pineConeFor(stage) {
  if (PINE_CONE[stage]) return PINE_CONE[stage];
  const topY = 92 - (38 + stage * 9);   // 兜底（stage 0–2 无粒子，不会被用到）
  const baseHalf = 15 + stage * 2.2;
  return { topY, baseHalf };
}

/**
 * 生成一个松树专属粒子（松针或偶发松果）。松针=细长绿色针状（随时间旋转下落），
 * 松果=小棕色椭圆（偶发）。绝不使用樱花瓣(petal)形状——这是「松树结松果不飘花瓣」的硬约束。
 * 粒子坐标生成自松树锥形轮廓内（树根 (50,92)、树尖 (50,topY)，宽度自底向顶收拢），
 * 并携带 stage 字段供 respawn/spawn 复用，使回收后的粒子仍落在树身内而非凭空出现在空中。
 * @param {()=>number} r [0,1) 随机
 * @param {number} [idx] 当前松树成长阶段 0–4（缺省 0），决定锥形轮廓高低与半宽
 * @returns {object} Particle（kind: 'needle' | 'cone'，附 stage 字段）
 */
function makePineParticle(r, idx) {
  const stage = Math.max(0, Math.min(4, idx || 0));
  const isCone = r() < 0.12; // 偶发松果（低概率），绝大多数是松针
  // 松树锥形轮廓内生成：树根 (50,92)、树尖 (50,topY)，宽度自底向顶收拢
  const { topY, baseHalf } = pineConeFor(stage);
  const y = topY + r() * (88 - topY);     // 树冠高度内随机（不越土堆线 92）
  const t = (y - topY) / Math.max(1, 88 - topY); // 0=树尖, 1=树根
  const halfW = baseHalf * t * 1.03;      // 按真实树宽，略放宽确保「不偏小」
  const x = 50 + (r() - 0.5) * 2 * halfW; // 树宽内随机（树居中，轴=50）
  return {
    x, y,
    vx: (r() - 0.5) * 3,
    vy: 0.5 + r() * 1, // 松针初速减半，配合重力减半实现整体 0.5× 飘落
    size: isCone ? 2.6 : 1.3, // 松针变细（针基础值 1.7→1.3），配合 drawParticles needle 分支收窄
    kind: isCone ? 'cone' : 'needle',
    species: 'pine',          // 关键：让 spawn()/回收正确识别松树，绝不退化成红花瓣
    petalStyle: null,
    // 松果用树干棕（--tree-trunk）、松针用叶绿（--tree-leaf），均走 resolveTreeColors 解析
    colorVar: isCone ? '--tree-trunk' : '--tree-leaf',
    life: 4 + r() * 4,
    rot: r() * Math.PI * 2,            // 初始旋转角（松针旋转下落）
    flutter: 0.6 + r() * 1.4,          // 摆动相位/速度
    shade: [-0.12, 0, 0.12][Math.floor(r() * 3)], // 明暗档（-/+0.12 / 0）
    stage, // 供 respawn/spawn 复用，保证回收链路不断裂
  };
}

/**
 * 生成松树初始粒子数组（纯函数）。与 generatePetals 平行、严格物种隔离：
 * 松树只飘松针/松果，绝不用花瓣（petal）。
 * 仅 idx>=3 才有意义（与现有一致：开花及以上激活粒子）。
 * @param {{species:string, grade:5|10, water:number}} tree 只需 species（取参数）
 * @param {number} stageIdx 0–4
 * @param {()=>number} [rng] 默认 Math.random
 * @returns {Array} Particle[]（kind 仅 'needle' | 'cone'）
 */
export function generatePineParticles(tree, stageIdx, rng = Math.random) {
  const r = rng || Math.random;
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  if (idx < 3) return []; // 仅开花及以上激活粒子
  const count = idx >= 4 ? 14 : 10; // 飘落数量减半
  const out = [];
  for (let i = 0; i < count; i++) out.push(makePineParticle(r, idx));
  return out;
}

/**
 * 生成初始粒子数组（纯函数）。
 * 仅 idx>=3 才有意义：idx3→花瓣；idx4→花瓣 + 部分果实（均在树冠区散布）。
 * @param {{species:string, grade:5|10, water:number}} tree 只需 species（取参数）
 * @param {number} stageIdx 0–4
 * @param {()=>number} [rng] 默认 Math.random
 * @returns {Array} Particle[]
 */
export function generatePetals(tree, stageIdx, rng = Math.random) {
  const r = rng || Math.random;
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  if (idx < 3) return []; // 仅开花及以上激活粒子
  const sp = normalizeSpecies(tree && tree.species);
  const p = SPECIES_TREE_PARAMS[sp] || SPECIES_TREE_PARAMS.pine;
  const count = idx >= 4 ? 30 : 24;
  const out = [];
  for (let i = 0; i < count; i++) out.push(makeParticle(r, p, sp, idx, false));
  return out;
}

/**
 * 创建粒子系统（纯函数）。
 * @param {Array} petals generatePetals 的初始粒子
 * @param {{maxCount?:number, g?:number, wind?:number, canopyBounds?:object, species?:string, stageIdx?:number}} [opts]
 *   maxCount: 上限 30–40（默认 36）；g: 重力（默认 18）；wind: 风力幅度（默认 6）
 *   canopyBounds: 树冠包围盒（来自 getSpriteBounds），用于动态出生区跟随树冠
 *   species / stageIdx: 初始粒子为空时（点击触发），spawn() 据此生成对应物种粒子
 * @returns {{particles:Array, maxCount:number, step:(dt:number,g?:number,gWind?:number)=>void, isDone:()=>boolean, spawn:()=>number}}
 */
export function createParticleSystem(petals, opts = {}) {
  const particles = Array.isArray(petals) ? petals.slice() : [];
  const maxCount = opts.maxCount || 36;
  const g0 = opts.g != null ? opts.g : 18;
  const wind0 = opts.wind != null ? opts.wind : 6;
  const bounds = opts.canopyBounds || null; // 树冠包围盒（动态出生区）
  const sysSpecies = normalizeSpecies(opts.species);   // 空系统兜底物种
  const sysStage = Math.max(0, Math.min(4, Number(opts.stageIdx) || 0)); // 空系统兜底阶段

  // 点一次飘一次：粒子落地/出界/寿命耗尽即移除，不自动续生（需求②⑤）。
  // 系统清空后，需再次点击/触摸 canvas 才重新 spawn。
  function step(dt, g, gWind) {
    const gg = (g != null) ? g : g0;
    const ww = (gWind != null) ? gWind : wind0;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += gg * dt;
      p.vx += ww * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      // 出界或寿命耗尽 → 移除（点一次飘一次，不自动续生）
      if (p.life <= 0 || p.y > 100 || p.x < -4 || p.x > 104) particles.splice(i, 1);
    }
  }

  function spawn() {
    if (particles.length >= maxCount) return particles.length;
    // 物种隔离：优先用现有粒子推断；系统为空（点击首次触发）时用 opts.species/stageIdx
    const ref = particles[0];
    const sp = ref ? ref.species : sysSpecies;
    const idx = ref ? ref.stage : sysStage;
    const pineLike = sp === 'pine';
    particles.push(pineLike
      ? makePineParticle(Math.random, idx)
      : makeParticle(Math.random, SPECIES_TREE_PARAMS[sp] || SPECIES_TREE_PARAMS.pine, sp, idx, true, bounds));
    return particles.length;
  }

  function isDone() {
    return particles.length === 0;
  }

  return { particles, maxCount, step, isDone, spawn };
}

/**
 * 把粒子画到注入的 ctx（纯函数）。
 *  - fruit 类：保持现有圆点/樱桃画法（按 colorVar 上色）。
 *  - petal 类（④）：真实花瓣形（带缺口的椭圆，贝塞尔两段弧），按 rot 旋转 + 随帧 flutter 飘摆，
 *    颜色在基色基础上按 shade 做明暗变化（不硬编码 hex）。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} particles Particle[]
 * @param {Object<string,string>} colors
 * @param {{cssW:number, cssH:number}} box
 * @param {{scale:number, offX:number, offY:number}} [tf] 自动缩放变换
 * @param {number} [time] 动画时间（秒），用于 flutter 飘摆；缺省 0（不摆动）
 */
export function drawParticles(ctx, particles, colors, box, tf, time) {
  if (!ctx || !Array.isArray(particles) || !particles.length) return;
  const s = mapScale(box, tf);
  const t = time || 0;
  for (const p of particles) {
    const [x, y] = mapPoint(box, p.x, p.y, tf);
    const color = colors[p.colorVar] || '#ffb7c5';
    const sz = Math.max(0.5, p.size * s);
    if (p.kind === 'fruit') {
      if (p.fruitKind === 'cherry') {
        // 樱花果实=樱桃：画一小段绿柄 + 红圆（需求②）
        ctx.strokeStyle = '#6b8e3a';
        ctx.lineWidth = Math.max(0.5, sz * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - sz);
        ctx.lineTo(x + sz * 0.35, y - sz * 2.2);
        ctx.stroke();
      }
      // 圆冠物种果实：圆点（apple/orange/sakura/cherry）
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'needle') {
      // 松针：细长绿色椭圆，随时间旋转下落（松树专属飘落物，绝不用花瓣形）
      const rot = (p.rot || 0) + t * (p.flutter || 1) * 0.8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = shadeColor(color, p.shade || 0);
      const len = sz * 3.0;                 // 更长更飘
      const wid = Math.max(0.3, sz * 0.16); // 明显变细（约减半）
      ctx.beginPath();
      ctx.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === 'cone') {
      // 松果：小棕色椭圆（松树偶发飘落物）
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.6, sz * 0.5), Math.max(1, sz * 0.95), 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 跨物种花瓣：按 petalStyle 画不同形态
      const style = p.petalStyle || 'default';
      const rot = (p.rot || 0) + Math.sin(t * (p.flutter || 1)) * 0.4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = shadeColor(color, p.shade || 0);

      if (style === 'sakura') {
        // 樱花：粉色窄长花瓣（缺口椭圆更窄更长），size较小
        const r = sz * 1.3;
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.bezierCurveTo(r * 0.7, r * 0.2, r * 0.4, -r * 0.9, 0, -r);
        ctx.bezierCurveTo(-r * 0.4, -r * 0.9, -r * 0.7, r * 0.2, 0, r);
        ctx.closePath();
        ctx.fill();
      } else if (style === 'orange') {
        // 橙子：白瓣 + 显眼金黄色大花心
        const r = sz * 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);   // 圆形白瓣
        ctx.fill();
        // 大黄花心
        ctx.fillStyle = colors['--gold'] || '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.4, r * 0.55), 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'apple') {
        // 苹果：白粉圆瓣 + 红色小花心（模拟苹果花萼）
        const r = sz * 1.05;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);   // 近圆形白粉瓣
        ctx.fill();
        // 红心
        ctx.fillStyle = '#DC3545';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.3, r * 0.3), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // default：原有真实花瓣形（带缺口的椭圆）
        const r = sz * 1.1;
        ctx.beginPath();
        ctx.moveTo(0, r);
        ctx.bezierCurveTo(r * 0.95, r * 0.25, r * 0.55, -r * 0.85, 0, -r);
        ctx.bezierCurveTo(-r * 0.55, -r * 0.85, -r * 0.95, r * 0.25, 0, r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// =====================================================================
// ⑤ 自动缩放：计算绘制节点包围盒 + fit 变换（防繁茂溢出画布）
// =====================================================================

/**
 * 计算所有绘制节点的虚拟空间包围盒（骨架 + 冠层叶团 + 松树塔），用于 fit 缩放。
 * 注意：不含飘落粒子（粒子为瞬时态，不应约束树体缩放）。
 * @param {Array} skeleton
 * @param {Array} foliage buildCanopyFoliage 输出
 * @param {Array} tower buildPineTower 输出
 * @returns {{minX:number,maxX:number,minY:number,maxY:number}}
 */
export function computeDrawBounds(skeleton, foliage, tower) {
  let minX = 100, maxX = 0, minY = 100, maxY = 0;
  const acc = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  if (Array.isArray(skeleton)) {
    for (const n of skeleton) { acc(n.x1, n.y1); acc(n.x2, n.y2); }
  }
  if (Array.isArray(foliage)) {
    for (const c of foliage) { acc(c.x - c.r, c.y - c.r); acc(c.x + c.r, c.y + c.r); }
  }
  if (Array.isArray(tower)) {
    for (const L of tower) {
      acc(L.cx - L.wb, L.yb); acc(L.cx + L.wb, L.yb);
      acc(L.cx - L.wt, L.yt); acc(L.cx + L.wt, L.yt);
    }
  }
  if (minX > maxX) { minX = 0; maxX = 100; minY = 0; maxY = 100; }
  return { minX, maxX, minY, maxY };
}

/**
 * 由包围盒求等比 fit 变换：把树体缩放并居中到目标区域（顶部留 ~topMargin% 余量，
 * 底部贴土堆线，两侧留 sideMargin%），缩放系数上限为"自然映射"（min 边 /100），
 * 故小树不会被迫放大、繁茂大树自动缩小防溢出。
 * @param {{cssW:number, cssH:number}} box
 * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds
 * @param {{topMargin?:number, bottomMargin?:number, sideMargin?:number}} [opts] 百分比
 * @returns {{scale:number, offX:number, offY:number}}
 */
export function computeFitTransform(box, bounds, opts = {}) {
  const mT = opts.topMargin != null ? opts.topMargin : 12;
  const mB = opts.bottomMargin != null ? opts.bottomMargin : 4;
  const mL = opts.sideMargin != null ? opts.sideMargin : 10;
  const cw = Math.max(1, bounds.maxX - bounds.minX);
  const ch = Math.max(1, bounds.maxY - bounds.minY);
  const availW = box.cssW * (1 - (mL / 100) * 2);
  const availH = box.cssH * (1 - (mT + mB) / 100);
  const natural = Math.min(box.cssW, box.cssH) / 100;
  // 等比适配：取宽/高方向较小者，且不超过自然映射（防放大）
  let scale = Math.min(availW / cw, availH / ch, natural);
  if (!(scale > 0) || !Number.isFinite(scale)) scale = natural;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const regionCx = box.cssW / 2;
  const regionCy = box.cssH * (mT + (100 - mT - mB) / 2) / 100;
  const offX = regionCx - cx * scale;
  const offY = regionCy - cy * scale;
  return { scale, offX, offY };
}

// =====================================================================
// 主入口：renderTreeCanvas / mountTreeCanvases / 控制器
// =====================================================================

/**
 * 把一棵树渲染到 <canvas>。
 * @param {Element} container 容器（opts.canvas 未提供时，会在其中创建并追加 canvas）
 * @param {{id:string, species:string, grade:5|10, water:number}} tree 树对象
 * @param {{canvas?:HTMLCanvasElement, rng?:()=>number, maxCount?:number, gravity?:number, wind?:number}} [opts]
 * @returns {{canvas:HTMLCanvasElement, redraw:()=>void, destroy:()=>void}} Controller
 */
export function renderTreeCanvas(container, tree, opts = {}) {
  const canvas = opts.canvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!canvas) {
    // 极端无 DOM 环境：返回空控制器，保证 import/调用不抛错
    return { canvas: null, redraw() {}, destroy() {} };
  }
  if (!opts.canvas) {
    if (container && container.appendChild) container.appendChild(canvas);
    canvas.className = 'gt-tree-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${tree && tree.species ? tree.species : 'tree'} 成长树`);
  }

  let destroyed = false;
  let rafId = null;
  let skeleton = [];
  let foliage = null;
  let tower = null;
  let bounds = null;
  let system = null;
  let colors = null;
  let cssW = 100;
  let cssH = 100;
  let lastT = 0;
  let hasCtx = false;
  let lastW = -1;
  let lastH = -1;
  let cachedCtx = null;
  let built = false;        // 骨架/塔/叶团是否构建过（resize 只重画不重建）
  let currentSp = 'pine';   // 当前物种（决定走塔形还是骨架+冠层）
  let currentStage = 0;     // 当前阶段序号（松树精灵图按 stage 取 PNG）
  let animT = 0;            // 动画时间（秒），供花瓣 flutter 与松树摇摆

  const rng = opts.rng || Math.random;

  function measure() {
    const cw = (typeof canvas.clientWidth === 'number' && canvas.clientWidth > 0)
      ? canvas.clientWidth
      : (canvas.parentElement && canvas.parentElement.clientWidth) || 100;
    const ch = (typeof canvas.clientHeight === 'number' && canvas.clientHeight > 0)
      ? canvas.clientHeight
      : (canvas.parentElement && canvas.parentElement.clientHeight) || 100;
    cssW = cw > 0 ? cw : 100;
    cssH = ch > 0 ? ch : 100;
  }

  function compute() {
    const sp = normalizeSpecies(tree && tree.species);
    currentSp = sp;
    const params = SPECIES_TREE_PARAMS[sp] || SPECIES_TREE_PARAMS.pine;
    const info = scoreToTreeStage((tree && tree.water) || 0, (tree && tree.grade) || 5);
    const idx = info.idx;
    currentStage = idx; // 记录阶段（松树精灵图按 stage 取 PNG）

    if (SPRITE_SPECIES.includes(sp)) {
      // 四物种统一走「手绘位图精灵图」路线：不构建分形骨架/塔，固定 bounds 保证切档不跳动。
      // 飘落物按物种隔离：松树只飘松针/松果（generatePineParticles），其余飘花瓣/果实（generatePetals），
      // 绝不串味（松树不飘花瓣、其它物种不飘松针/松果）。
      skeleton = [];
      tower = null;
      foliage = null;
      bounds = { minX: 0, maxX: 100, minY: 0, maxY: 92 }; // 固定；切档不跳动
      currentStage = idx;
      const canopyBounds = getSpriteBounds(sp, idx); // 树冠包围盒（动态出生区）
      // 初始不生成粒子；改为点击/触摸树才飘落（需求②）。
      // 传 species/stageIdx 让空系统在首次点击时也能正确生成对应物种粒子。
      system = idx >= 3 ? createParticleSystem([], {
        maxCount: opts.maxCount || 36,
        g: opts.gravity != null ? opts.gravity : undefined,
        wind: opts.wind != null ? opts.wind : undefined,
        canopyBounds,
        species: sp,
        stageIdx: idx,
      }) : null;
      built = true;
    } else {
      // ①③ 分形回退（未知物种 / 非精灵图物种）：骨架 + 冠层叶团（发芽/长叶共用同一套冠层画法）
      skeleton = buildTreeSkeleton(sp, idx, params, { rng });
      foliage = buildCanopyFoliage(skeleton, sp, idx, params, { rng });
      tower = null;
      bounds = computeDrawBounds(skeleton, foliage, tower);
      system = idx >= 3 ? createParticleSystem(generatePetals(tree, idx, rng), {
        maxCount: opts.maxCount || 36,
        g: opts.gravity != null ? opts.gravity : undefined,
        wind: opts.wind != null ? opts.wind : undefined,
      }) : null;
      built = true;
    }
  }

  function ensureCtx() {
    if (cssW === lastW && cssH === lastH && cachedCtx) return cachedCtx;
    cachedCtx = setupHiDPICanvas(canvas, cssW, cssH);
    lastW = cssW;
    lastH = cssH;
    return cachedCtx;
  }

  function drawScene(ctx, box, col, tf) {
    ctx.clearRect(0, 0, box.cssW, box.cssH);
    drawSoil(ctx, box, col, tf);
    if (SPRITE_SPECIES.includes(currentSp) && TREE_RENDERER === 'canvas') {
      // 四物种统一精灵图路线：树身做轻微摇摆（基于动画时间的微小正弦旋转/位移，±1.2°、周期 ~4s），
      // 但摇摆从长叶(stage>=2)才开始；种子/发芽整棵树始终绘制（不晃但画）。
      // 飘落物在 ctx.restore() 之后单独绘制，不随树身摇摆（轨迹不歪、移动端不晕）。
      ctx.save();
      const [px, py] = mapPoint(box, 50, 92, tf); // 摇摆支点：土堆中心 (50,92)，树根咬死土堆
      const swayActive = currentStage >= 2;       // 从长叶(stage2)开始摇摆
      if (swayActive) {
        const phase = animT * (Math.PI * 2 / 4);    // 周期 ~4s
        const sway = (1.2 * Math.PI / 180) * Math.sin(phase); // ±1.2°
        const shift = 0;                            // 取消水平位移（结构断言用），树根绕土堆中心旋转
        ctx.translate(px + shift, py);
        ctx.rotate(sway);
        ctx.translate(-px, -py);
      }
      drawTreeSprite(ctx, currentSp, currentStage, box, tf, bounds); // 始终绘制（种子/发芽不晃但画）
      ctx.restore();
      if (system) drawParticles(ctx, system.particles, col, box, tf, animT);
    } else if (currentSp === 'pine' && tower) {
      // ② 松树塔形（svg 模式回退分支保留：含短树干），不走分形骨架
      drawPineTower(ctx, tower, col, box, tf);
      if (system) drawParticles(ctx, system.particles, col, box, tf, animT);
    } else {
      drawSkeleton(ctx, skeleton, col, box, tf);
      if (foliage) drawCanopy(ctx, foliage, col, box, tf);
      if (system) drawParticles(ctx, system.particles, col, box, tf, animT);
    }
  }

  function redraw() {
    if (destroyed) return;
    measure();
    const ctx = ensureCtx();
    if (!ctx) { hasCtx = false; return; }
    hasCtx = true;
    if (!built) compute();
    colors = resolveTreeColors(canvas, opts);
    // ⑤ 每次重画按当前 box 重新求 fit 变换（bounds 已由骨架决定、缓存，无需重建）
    const tf = computeFitTransform({ cssW, cssH }, bounds, {
      topMargin: 12, bottomMargin: 4, sideMargin: 10,
    });
    drawScene(ctx, { cssW, cssH }, colors, tf);
  }

  function loop(t) {
    if (destroyed) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    animT = t / 1000;
    if (system) {
      // 下落速度减半（需求④）：松树原本就 0.5×，现其它三树种也统一 0.5×。
      const baseG = opts.gravity != null ? opts.gravity : 18;
      const g = baseG * 0.5;                 // 全部物种重力减半（松树本就 9，现 9；其它 18→9）
      // 风力同样减半，且仅作用于非松树（松树保持原风力手感）
      const baseWind = opts.wind != null ? opts.wind : 6;
      const windAmp = currentSp === 'pine' ? baseWind : baseWind * 0.5;
      const windPhase = (t / 1000) * 0.6;
      const gWind = windAmp * Math.sin(windPhase);
      system.step(dt, g, gWind);
    }
    redraw();
    rafId = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame(loop) : null;
  }

  function destroy() {
    destroyed = true;
    if (unregisterSprite) unregisterSprite();
    if (typeof canvas !== 'undefined' && canvas && canvas.removeEventListener) {
      try { canvas.removeEventListener('pointerdown', onTreePointerDown); } catch (e) { /* ignore */ }
    }
    if (rafId != null && typeof cancelAnimationFrame === 'function') {
      try { cancelAnimationFrame(rafId); } catch (e) { /* ignore */ }
    }
    rafId = null;
    registry.delete(canvas);
  }

  // 需求②：点击/触摸树才飘落。每次产生 3~5 个粒子（松树仍走松针/松果）。
  function onTreePointerDown(e) {
    if (destroyed || !system) return;
    const n = 3 + Math.floor(rng() * 3); // 3,4,5
    for (let i = 0; i < n; i++) system.spawn();
    if (e && e.stopPropagation) e.stopPropagation(); // 避免冒泡到页面层的「选树」点击
  }

  // 初始化
  compute();
  redraw();
  if (typeof canvas !== 'undefined' && canvas && canvas.addEventListener) {
    canvas.addEventListener('pointerdown', onTreePointerDown);
  }
  if (hasCtx && system && typeof requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(loop);
  }

  // 精灵图：预取图片并在加载完成后补绘首帧（异步加载不阻塞首帧绘制）。
  let unregisterSprite = null;
  if (SPRITE_SPECIES.includes(currentSp) && TREE_RENDERER === 'canvas') {
    try {
      getTreeSprite(currentSp, currentStage);
      unregisterSprite = onTreeSpriteLoad(() => { if (!destroyed) redraw(); });
    } catch (e) { /* 无 Image 环境忽略 */ }
  }

  ensureResizeHandler();
  const controller = { canvas, redraw, destroy };
  registry.set(canvas, controller);
  return controller;
}

/**
 * 防抖 resize：窗口尺寸变化后，对 registry 中所有 Controller 调 redraw（旧 canvas 已随 DOM 销毁则跳过）。
 */
function ensureResizeHandler() {
  if (_resizeBound || typeof window === 'undefined') return;
  _resizeBound = true;
  let timer = null;
  const onResize = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const ctrl of registry.values()) {
        try { ctrl.redraw(); } catch (e) { /* ignore */ }
      }
    }, 120);
  };
  window.addEventListener('resize', onResize);
}

/**
 * 在 root 内查找 .gt-tree-canvas，按 data-tree-id 从 STATE.growthTree.activeTrees 取树初始化。
 * 每次重挂前清理已脱离文档的旧 Controller（避免 rAF 泄漏）。
 * @param {Element} root 通常为 #mtab-tree
 */
export function mountTreeCanvases(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  // 清理已脱离文档的控制器
  const detached = [];
  for (const [cv, ctrl] of registry) {
    if (!cv || !cv.isConnected) detached.push([cv, ctrl]);
  }
  for (const [cv, ctrl] of detached) {
    try { ctrl.destroy(); } catch (e) { /* ignore */ }
    registry.delete(cv);
  }
  // 挂载当前 canvas
  const canvases = root.querySelectorAll('.gt-tree-canvas');
  canvases.forEach((cv) => {
    const id = cv.dataset ? cv.dataset.treeId : null;
    if (!id || !STATE.growthTree) return;
    const tree = STATE.growthTree.activeTrees.find((t) => t.id === id);
    if (!tree) return;
    renderTreeCanvas(cv, tree, { canvas: cv });
  });
}
