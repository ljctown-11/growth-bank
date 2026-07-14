// features/mascot.js — 手绘内联 SVG 吉祥物「蝴蝶」（单文件、无外部依赖、无 DOM）
// 由原「小蜜蜂」重写为「蝴蝶」（P1-1）。公开契约严格保留：
//   <svg class="mascot mascot-${key} ${p.anim}">、mascot-tree/success/empty/encourage 类名、
//   mascot-sway/pop/blink 动画类、success 的 ★、empty 的 rotate(-8 ...) 一律不变。
// 配色全部走 --butterfly-* CSS 变量，无硬编码 hex。

// 放置位 → 动画 class + 表情
const PLACEMENTS = {
  tree:      { anim: 'mascot-sway',  expr: 'smile', tilt: false }, // 成长树旁常驻向导
  success:   { anim: 'mascot-pop',   expr: 'star',  tilt: false }, // 打卡成功弹层
  empty:     { anim: 'mascot-blink', expr: 'flat',  tilt: true  }, // 空状态歪头温和
  encourage: { anim: 'mascot-sway',  expr: 'smile', tilt: false }, // 鼓励弹层微笑
};

// ===== 蝴蝶 SVG（替代小蜜蜂）=====
export function butterflySVG(){
  return `<g class="butterfly">
    <!-- 身体 -->
    <ellipse cx="50" cy="58" rx="4" ry="15" fill="var(--butterfly-body)" stroke="var(--butterfly-stroke)" stroke-width="1.6"/>
    <!-- 触角 -->
    <path d="M48 46 Q43 34 39 30" fill="none" stroke="var(--butterfly-stroke)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M52 46 Q57 34 61 30" fill="none" stroke="var(--butterfly-stroke)" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="39" cy="30" r="2.2" fill="var(--butterfly-dot)"/>
    <circle cx="61" cy="30" r="2.2" fill="var(--butterfly-dot)"/>
    <!-- 上翅 -->
    <g class="bf-wing bf-wing-up">
      <path d="M46 52 Q18 30 20 54 Q24 68 46 60 Z" fill="var(--butterfly-wing)" stroke="var(--butterfly-stroke)" stroke-width="1.6" opacity="0.92"/>
      <path d="M54 52 Q82 30 80 54 Q76 68 54 60 Z" fill="var(--butterfly-wing)" stroke="var(--butterfly-stroke)" stroke-width="1.6" opacity="0.92"/>
    </g>
    <!-- 下翅 -->
    <g class="bf-wing bf-wing-down">
      <path d="M47 60 Q28 66 30 80 Q41 86 50 68 Z" fill="var(--butterfly-wing)" stroke="var(--butterfly-stroke)" stroke-width="1.6" opacity="0.86"/>
      <path d="M53 60 Q72 66 70 80 Q59 86 50 68 Z" fill="var(--butterfly-wing)" stroke="var(--butterfly-stroke)" stroke-width="1.6" opacity="0.86"/>
    </g>
    <!-- 翅斑 -->
    <circle cx="31" cy="54" r="3.2" fill="var(--butterfly-dot)" opacity="0.7"/>
    <circle cx="69" cy="54" r="3.2" fill="var(--butterfly-dot)" opacity="0.7"/>
  </g>`;
}

// 表情（按放置位）：success 星眼 + 张嘴、empty 温和睡眼 + 浅笑、tree/encourage 弯弯笑眼 + 微笑
function butterflyFace(key){
  if(key === 'success'){
    return `<text x="40" y="50" font-size="14" text-anchor="middle" fill="var(--butterfly-stroke)">★</text>` +
           `<text x="60" y="50" font-size="14" text-anchor="middle" fill="var(--butterfly-stroke)">★</text>` +
           `<path d="M40 64 Q50 76 60 64 Z" fill="var(--badge-gloss)" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linejoin="round"/>`;
  }
  if(key === 'empty'){
    return `<path d="M34 50 q6 6 12 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>` +
           `<path d="M54 50 q6 6 12 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>` +
           `<path d="M43 64 q7 5 14 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  // tree / encourage：弯弯笑眼 + 微笑
  return `<path d="M34 50 q6 -6 12 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>` +
         `<path d="M54 50 q6 -6 12 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>` +
         `<path d="M42 62 q8 8 16 0" fill="none" stroke="var(--butterfly-stroke)" stroke-width="2.4" stroke-linecap="round"/>`;
}

/**
 * 渲染吉祥物内联 SVG 字符串。
 * @param {'tree'|'success'|'empty'|'encourage'} placement
 * @param {{mood?:string, size?:number, stage?:number}} [opts]
 * @returns {string} 含 <svg ... class="mascot-..."> 的字符串；非法 placement 回退 'tree'
 */
export function renderMascot(placement, opts){
  opts = opts || {};
  const key = PLACEMENTS[placement] ? placement : 'tree';
  const p = PLACEMENTS[key];
  const size = opts.size || 64;
  const tilt = p.tilt ? ' transform="rotate(-8 50 54)"' : '';

  return `<svg class="mascot mascot-${key} ${p.anim}" width="${size}" height="${size}" viewBox="0 0 100 108" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="蝴蝶吉祥物">
  <g${tilt}>
    ${butterflySVG()}
    ${butterflyFace(key)}
  </g>
</svg>`;
}
