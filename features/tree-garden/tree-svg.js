// features/tree-garden/tree-svg.js — 伪 3D 分层树（纯字符串，无 DOM）
// renderTreeStage(species, grade, stageIdx) 返回含 <g> 分层的 SVG：
//   tree-trunk → tree-branch → tree-leaf → tree-flower → tree-fruit（z 序）
// 4 物种树形明显不同（松=塔形分层针叶 / 苹果·樱花·橙子=圆冠差异化）；
// 多图层树叶（深浅渐变，靠不同 opacity 的 var(--tree-leaf) 叠出层次）、树干纹理/年轮感；
// 各阶段（seed→发芽→长叶→开花→繁茂）视觉递进明显；繁茂态加果实点缀（呼应收获）。
// 配色全走 --tree-* / --fruit-* / --gold 变量，无硬编码 hex。

import { SPECIES } from './inventory.js';

// 圆冠（苹果/樱花/橙子）多图层叶团：3 层 circle 不同 opacity 叠出深浅
function roundCanopy(){
  return `<g class="tree-leaf">
    <circle cx="50" cy="44" r="26" fill="var(--tree-leaf)" opacity="0.5"/>
    <circle cx="32" cy="52" r="16" fill="var(--tree-leaf)" opacity="0.8"/>
    <circle cx="68" cy="52" r="16" fill="var(--tree-leaf)" opacity="0.8"/>
    <circle cx="50" cy="58" r="18" fill="var(--tree-leaf)" opacity="1"/>
    <circle cx="44" cy="38" r="9" fill="var(--tree-leaf)" opacity="0.95"/>
  </g>`;
}

// 松树塔形针叶（3 层三角，不同 opacity 叠出层次）
function pineCanopy(){
  return `<g class="tree-leaf">
    <polygon points="50,18 30,46 70,46" fill="var(--tree-leaf)" opacity="0.5"/>
    <polygon points="50,30 34,56 66,56" fill="var(--tree-leaf)" opacity="0.8"/>
    <polygon points="50,42 27,72 73,72" fill="var(--tree-leaf)" opacity="1"/>
  </g>`;
}

// 圆冠树枝（自树干伸入叶团，带年轮/纹理感）
function roundBranches(){
  return `<g class="tree-branch">
    <path d="M50 60 Q40 50 33 46" fill="none" stroke="var(--tree-trunk)" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 60 Q60 50 67 46" fill="none" stroke="var(--tree-trunk)" stroke-width="3" stroke-linecap="round"/>
    <path d="M50 62 Q50 54 50 50" fill="none" stroke="var(--tree-trunk)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 56 Q44 52 40 50" fill="none" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round"/>
  </g>`;
}

// 松树树干（细高 + 纹理横线）
function pineTrunk(){
  return `<g class="tree-trunk">
    <rect x="47" y="62" width="6" height="30" rx="2" fill="var(--tree-trunk)" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.4"/>
    <line x1="48" y1="70" x2="52" y2="70" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.5"/>
    <line x1="48" y1="78" x2="52" y2="78" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.5"/>
    <line x1="48" y1="86" x2="52" y2="86" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.5"/>
  </g>`;
}

// 圆冠树干（带年轮纹理）
function roundTrunk(){
  return `<g class="tree-trunk">
    <rect x="46" y="58" width="8" height="34" rx="3" fill="var(--tree-trunk)" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.4"/>
    <path d="M50 62 q-3 6 0 12 q3 6 0 12 q-3 6 0 8" fill="none" stroke="var(--tree-soil)" stroke-width="1" stroke-opacity="0.45"/>
  </g>`;
}

// 开花：5 瓣花（樱花更密，苹果/橙子较疏）；中心用 --gold
function blossoms(count, seed){
  const pts = [];
  for(let i = 0; i < count; i++){
    const a = (i / count) * Math.PI * 2 + (seed || 0);
    const cx = 50 + Math.cos(a) * 18;
    const cy = 44 + Math.sin(a) * 14;
    pts.push(`<g class="tree-flower"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="var(--tree-flower)"/><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.2" fill="var(--gold)"/></g>`);
  }
  return pts.join('');
}

// 松果（针叶树的花/果，繁茂点缀）
function pineCones(){
  return `<g class="tree-flower"><ellipse cx="50" cy="14" rx="5" ry="10" fill="var(--tree-fruit)"/></g>
          <g class="tree-fruit"><ellipse cx="34" cy="42" rx="4" ry="8" fill="var(--tree-fruit)"/><ellipse cx="66" cy="42" rx="4" ry="8" fill="var(--tree-fruit)"/></g>`;
}

// 苹果/橙子/樱花 果实（圆形 + 小叶；物种间靠位置/数量/形状区分）
function roundFruits(species){
  if(species === 'sakura'){
    // 樱花小樱桃：成串小圆（繁茂点缀）
    return `<g class="tree-fruit">
      <circle cx="40" cy="46" r="4.5" fill="var(--tree-fruit)"/>
      <circle cx="58" cy="42" r="4.5" fill="var(--tree-fruit)"/>
      <circle cx="50" cy="58" r="4.5" fill="var(--tree-fruit)"/>
      <path d="M40 46 q4 -8 10 -10" fill="none" stroke="var(--tree-leaf)" stroke-width="1.4"/>
    </g>`;
  }
  if(species === 'orange'){
    // 橙子：较大圆 + 叶（宽冠）
    return `<g class="tree-fruit">
      <circle cx="42" cy="48" r="7" fill="var(--tree-fruit)"/>
      <circle cx="60" cy="44" r="7" fill="var(--tree-fruit)"/>
      <circle cx="52" cy="60" r="7" fill="var(--tree-fruit)"/>
      <path d="M42 41 q4 -6 10 -6" fill="none" stroke="var(--tree-leaf)" stroke-width="1.6" stroke-linecap="round"/>
    </g>`;
  }
  // apple：圆 + 凹顶小叶
  return `<g class="tree-fruit">
    <circle cx="42" cy="48" r="7" fill="var(--tree-fruit)"/>
    <circle cx="60" cy="44" r="7" fill="var(--tree-fruit)"/>
    <circle cx="52" cy="60" r="7" fill="var(--tree-fruit)"/>
    <path d="M51 53 q1 -6 6 -7" fill="none" stroke="var(--tree-leaf)" stroke-width="1.6" stroke-linecap="round"/>
  </g>`;
}

/**
 * 渲染某物种某阶段的分层树 SVG 字符串。
 * @param {'pine'|'apple'|'sakura'|'orange'} species
 * @param {5|10} grade 档位（仅影响进度阈值，不影响树形）
 * @param {number} stageIdx 0–4（种子/发芽/长叶/开花/繁茂）
 * @returns {string} 含 <svg> 与 tree-trunk/branch/leaf/flower/fruit 分层 <g>
 */
export function renderTreeStage(species, grade, stageIdx){
  const sp = SPECIES.includes(species) ? species : 'pine';
  const idx = Math.max(0, Math.min(4, Number(stageIdx) || 0));
  const isPine = sp === 'pine';

  const soil = `<ellipse class="tree-soil" cx="50" cy="92" rx="30" ry="7" fill="var(--tree-soil)"/>`;

  // 种子阶段：仅土 + 嫩芽（无花无果）
  if(idx === 0){
    return `<svg class="gt-tree-svg gt-tree-${sp}" data-species="${sp}" data-grade="${grade}" data-stage="0" viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${sp}种子">
      ${soil}
      <g class="tree-trunk"><path d="M50 90 Q48 78 50 70 Q52 78 50 90 Z" fill="var(--tree-trunk)"/></g>
      <g class="tree-leaf"><path d="M50 72 q-9 -5 -11 -14 q11 3 11 14 Z" fill="var(--tree-leaf)"/><path d="M50 72 q9 -5 11 -14 q-11 3 -11 14 Z" fill="var(--tree-leaf)"/></g>
    </svg>`;
  }

  const trunk = isPine ? pineTrunk() : roundTrunk();
  let branch = '';
  let leaf = isPine ? pineCanopy() : roundCanopy();
  let flower = '';
  let fruit = '';

  if(idx >= 2){
    branch = isPine ? '' : roundBranches();
  }
  if(idx >= 3){
    flower = isPine
      ? pineCones()
      : blossoms(sp === 'sakura' ? 6 : 4, sp === 'apple' ? 0.4 : 1.2);
  }
  if(idx >= 4){
    fruit = isPine ? pineCones() : roundFruits(sp);
  }

  return `<svg class="gt-tree-svg gt-tree-${sp}" data-species="${sp}" data-grade="${grade}" data-stage="${idx}" viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${sp}树${idx}阶段">
    ${soil}
    ${trunk}
    ${branch}
    ${leaf}
    ${flower}
    ${fruit}
  </svg>`;
}
