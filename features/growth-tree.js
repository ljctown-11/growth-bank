// features/growth-tree.js — 连续打卡 Streak / 维度徽章（纯函数 + 渲染）
// 注：首页牵牛花藤蔓（renderGrowthVine）与旧「按总积分树区块」（treeSVG/renderGrowthTree）
// 已迁移至独立新文件夹 features/tree-garden/，本文件仅保留 Streak / 徽章 / scoreToStage /
// morningGlorySVG（D 报告卡复用）。成长树新逻辑不复用本文件的 scoreToStage（避免与总积分耦合）。

import { STATE } from '../core/state.js';
import { getDay, calcTotalScore } from '../core/data.js';
import { CATEGORIES, getTodayStr } from '../core/helpers.js';
import { openModal } from '../features/modal.js';

// ===== 纯函数部分 =====

// 成长树阶段（旧：种子/发芽/长叶/开花/繁茂，按总积分；新树已用独立 treeThresholds）
export const STAGES = [
  { name: '种子', threshold: 0 },
  { name: '发芽', threshold: 20 },
  { name: '长叶', threshold: 50 },
  { name: '开花', threshold: 100 },
  { name: '繁茂', threshold: 200 },
];

// 维度徽章阈值（每维累计积分 >= 即点亮）
export const BADGE_THRESHOLD = 30;

/**
 * 总分 → 阶段信息。
 * @param {number} total
 * @returns {{stage:string, idx:number, nextThreshold:number|null, pct:number}}
 * pct 为当前阶段内进度 [0,1]。
 */
export function scoreToStage(total){
  const t = Math.max(0, Number(total) || 0);
  let idx = 0;
  for(let i = 0; i < STAGES.length; i++){
    if(t >= STAGES[i].threshold) idx = i;
  }
  const cur = STAGES[idx];
  const next = STAGES[idx + 1] || null;
  const nextThreshold = next ? next.threshold : null;
  const span = next ? (next.threshold - cur.threshold) : 1;
  const pct = next ? Math.min(1, (t - cur.threshold) / span) : 1;
  return { stage: cur.name, idx, nextThreshold, pct };
}

/**
 * 当前阶段内进度 [0,1]（结果阶段恒为 1）。
 * @param {number} total
 * @returns {number}
 */
export function getStageProgress(total){
  return scoreToStage(total).pct;
}

/**
 * 连续打卡天数。从今天向前扫描「有 >=1 个 done 任务」的日期。
 * @returns {number}
 */
export function getStreak(){
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dsOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hasToday = countDoneOn(dsOf(today)) > 0;
  let cursor = new Date(today);
  if(!hasToday) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for(let i = 0; i < 4000; i++){
    const ds = dsOf(cursor);
    if(countDoneOn(ds) > 0){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// 某日 done 任务数（导出供 tree-garden 复用，如 getStreakSincePlant）
export function countDoneOn(dateStr){
  const day = STATE.daily[dateStr];
  if(!day || !day.tasks) return 0;
  let n = 0;
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) n++;
  }
  return n;
}

/**
 * 计算各维度累计积分（仅计 done 任务）。
 * @param {Record<string, object>} daily
 * @returns {Record<string, number>}
 */
export function computeDimensionScores(daily){
  const scores = {};
  CATEGORIES.forEach(c => { scores[c.title] = 0; });
  if(!daily) return scores;
  for(const ds in daily){
    const day = daily[ds];
    if(!day || !day.tasks) continue;
    for(const tid in day.tasks){
      const te = day.tasks[tid];
      if(te && te.done && te.cat && scores[te.cat] !== undefined){
        scores[te.cat] += (te.pts || 0);
      }
    }
  }
  return scores;
}

/**
 * 某维度是否解锁徽章。
 * @param {string} cat
 * @param {number} score
 * @param {number} [threshold]
 * @returns {boolean}
 */
export function isBadgeUnlocked(cat, score, threshold){
  const th = threshold == null ? BADGE_THRESHOLD : threshold;
  return (Number(score) || 0) >= th;
}

// ===== 报告卡牵牛花（保留：D 报告卡 openSummerSummary 复用）=====
export function morningGlorySVG(size = 96){
  const petals = [];
  for(let i = 0; i < 6; i++){
    const a = (i / 6) * Math.PI * 2;
    const cx = Math.cos(a) * 20;
    const cy = Math.sin(a) * 20;
    const deg = (a * 180 / Math.PI).toFixed(1);
    petals.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="16" ry="10" fill="var(--vine-flower)" opacity="0.9" transform="rotate(${deg} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`);
  }
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-label="牵牛花">
    <path d="M60 116 C58 96 60 74 60 60" stroke="var(--vine-stem)" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M60 96 q24 -4 32 8 q-22 8 -32 -8 Z" fill="var(--vine-leaf)" stroke="var(--vine-stem)" stroke-width="1.5"/>
    <g transform="translate(60,52)">
      ${petals.join('')}
      <circle r="15" fill="var(--vine-flower)"/>
      <circle r="7" fill="var(--gold)"/>
    </g>
  </svg>`;
}

// ===== 渲染部分（Streak / 徽章）=====

/**
 * 渲染连续打卡到 #streakBadge（顶部 pill）与 #streakInfo（日历 Tab），null 安全。
 */
export function renderStreak(){
  const n = getStreak();
  const badge = document.getElementById('streakBadge');
  if(badge) badge.textContent = `🔥 连续 ${n} 天`;
  const info = document.getElementById('streakInfo');
  if(info){
    info.innerHTML = `<div class="streak-num">🔥 ${n}</div><div class="streak-sub">连续打卡天数</div>`;
  }
}

// 维度徽章 5 级阈值（按各维度 60 天预估总量校准：L2=20% / L3=40% / L4=65% / L5=90%）
// 实践力按最慢 1分/天(总量60)校准，保证暑假必解锁 L5
export const BADGE_THRESHOLDS = {
  '学习力': [0, 60, 120, 195, 270],
  '运动力': [0, 60, 120, 195, 270],
  '自控力': [0, 36, 72, 117, 162],
  '探索力': [0, 36, 72, 117, 162],
  '实践力': [0, 12, 24, 39, 54],
};

export function badgeLevel(cat, score){
  const t = BADGE_THRESHOLDS[cat] || [0, 21, 51, 101, 189];
  const s = Number(score) || 0;
  for(let lv = t.length - 1; lv >= 1; lv--){
    if(s >= t[lv]) return lv + 1;
  }
  return 1;
}

/**
 * 位图徽章路径。5 个维度（学习力、运动力、自控力、探索力、实践力）
 * 均提供正方形 WebP 实物徽章（按等级），维度名与文件夹名完全一致。
 * 路径统一为 assets/badges/{维度}/L{level}.webp。
 * @param {string} cat 维度名（与 CATEGORIES.title 一致）
 * @param {1|2|3|4|5} level
 * @returns {string}
 */
export function badgeImagePath(cat, level){
  return `assets/badges/${cat}/L${level}.webp`;
}

// 5 维配色（走 CSS 变量，暗色可见）
const BADGE_COLORS = {
  '学习力': 'var(--badge-learning)',
  '运动力': 'var(--badge-physical)',
  '自控力': 'var(--badge-discipline)',
  '探索力': 'var(--badge-exploration)',
  '实践力': 'var(--badge-practice)',
};

let _badgeUid = 0;

/**
 * 维度抽象图标（书本/球/沙漏/放大镜/手）。
 * @param {string} cat 维度名（与 CATEGORIES.title 一致）
 * @param {string} [color] 图标填充/描边色（默认白，Lv1 用深色以在透明盾牌上可见）
 * @returns {string}
 */
export function badgeIcon(cat, color){
  const c = color || 'var(--badge-gloss)';
  switch(cat){
    case '学习力':
      return `<g class="badge-dim-icon" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round">
        <path d="M22 24 L32 21 L42 24 L42 44 L32 47 L22 44 Z"/>
        <path d="M32 21 L32 47"/>
        <path d="M26 28 H38 M26 33 H38 M26 38 H36" stroke-width="1.4"/>
      </g>`;
    case '运动力':
      return `<g class="badge-dim-icon" fill="none" stroke="${c}" stroke-width="2">
        <circle cx="32" cy="34" r="11"/>
        <path d="M21 34 H43 M32 23 V45 M25 27 L39 41 M39 27 L25 41"/>
      </g>`;
    case '自控力':
      return `<g class="badge-dim-icon" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round">
        <path d="M23 22 H41 L41 24 L32 34 L23 24 Z"/>
        <path d="M23 46 H41 L41 44 L32 34 L23 44 Z"/>
      </g>`;
    case '探索力':
      return `<g class="badge-dim-icon" fill="none" stroke="${c}" stroke-width="2">
        <circle cx="28" cy="30" r="9"/>
        <path d="M35 37 L43 45" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    case '实践力':
      return `<g class="badge-dim-icon" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
        <path d="M24 44 V32 q0 -3 3 -3 t3 3 V27 q0 -3 3 -3 t3 3 V26 q0 -3 3 -3 t3 3 V32 q0 -3 3 -3 t3 3 v12 q0 5 -6 5 h-9 q-6 0 -6 -6 Z"/>
      </g>`;
    default:
      return `<g class="badge-dim-icon" fill="${c}"><circle cx="32" cy="34" r="9"/></g>`;
  }
}

/**
 * 生成某维度某等级的徽章 SVG（盾牌造型 + 4 级精确分级）。
 * @param {string} cat
 * @param {1|2|3|4} level
 * @returns {string}
 */
export function badgeSVG(cat, level){
  const uid = 'bg' + (++_badgeUid);
  const iconColor = level === 1 ? 'var(--bee-stroke)' : 'var(--badge-gloss)';
  const defs = (id, stops) =>
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`;
  const rdefs = (id, stops) =>
    `<defs><radialGradient id="${id}" cx="50%" cy="42%" r="62%">${stops}</radialGradient></defs>`;
  const SHIELD = 'M32 5 L53 13 V31 C53 46 44 55 32 60 C20 55 11 46 11 31 V13 Z';
  let grad = '';
  let base, decor;

  if(level === 1){
    base = `<path d="${SHIELD}" fill="none" stroke="var(--metal-silver)" stroke-width="3"/>`;
    decor = '';
  } else if(level === 2){
    base = `<path d="${SHIELD}" fill="var(--metal-copper)" stroke="var(--metal-ink)" stroke-width="2"/>`;
    decor = `<text x="32" y="41" font-size="18" text-anchor="middle" fill="var(--badge-gloss)">★</text>`;
  } else if(level === 3){
    grad = defs(uid, `<stop offset="0%" stop-color="var(--metal-silver)"/><stop offset="100%" stop-color="var(--metal-copper)"/>`);
    base = `<path d="${SHIELD}" fill="url(#${uid})" stroke="var(--metal-copper)" stroke-width="2"/>`;
    decor = `
      <path d="M11 30 q-9 -4 -9 6 q9 4 9 -6 Z" fill="var(--metal-silver)" opacity="0.9"/>
      <path d="M53 30 q9 -4 9 6 q-9 4 -9 -6 Z" fill="var(--metal-silver)" opacity="0.9"/>
      <text x="32" y="24" font-size="13" text-anchor="middle" fill="var(--badge-gloss)">★</text>
      <text x="32" y="43" font-size="12" text-anchor="middle" fill="var(--badge-gloss)">★</text>`;
  } else {
    grad = rdefs(uid, `<stop offset="0%" stop-color="var(--badge-gloss)"/><stop offset="55%" stop-color="var(--metal-gold)"/><stop offset="100%" stop-color="var(--metal-copper)"/>`);
    base = `<path d="${SHIELD}" fill="url(#${uid})" stroke="var(--metal-gold)" stroke-width="2.5"/>`;
    decor = `
      <circle cx="32" cy="33" r="26" fill="var(--metal-gold)" opacity="0.18"/>
      <text x="32" y="24" font-size="13" text-anchor="middle" fill="var(--badge-gloss)">★</text>
      <text x="23" y="42" font-size="12" text-anchor="middle" fill="var(--badge-gloss)">★</text>
      <text x="41" y="42" font-size="12" text-anchor="middle" fill="var(--badge-gloss)">★</text>`;
  }

  const icon = badgeIcon(cat, iconColor);
  return `<svg viewBox="0 0 64 64" width="48" height="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${grad}
    ${base}
    ${decor}
    ${icon}
  </svg>`;
}

export function openBadgeLightbox(cat, level, score){
  const p = badgeImagePath(cat, level);
  const media = p
    ? `<img class="badge-lightbox__img" src="${p}" alt="${cat} Lv${level}">`
    : `<div class="badge-lightbox__svg">${badgeSVG(cat, level)}</div>`;
  // 已获得徽章：带 data-lv 可点击放大，当前级高亮 active
  const unlockedSlots = Array.from({length: level}, (_, i) => {
    const lv = i + 1;
    const src = badgeImagePath(cat, lv);
    return `<div class="badge-slot lv${lv} unlocked${lv === level ? ' active' : ''}" data-lv="${lv}">
      <div class="badge-icon"><img class="badge-img" src="${src}" alt="${cat} Lv${lv}" loading="lazy"></div>
      <div class="badge-label">Lv${lv}</div>
    </div>`;
  }).join('');
  // 下一级锁定徽章（level<5 时追加 1 枚，通用锁图标，不露真实徽章图，不可点击）
  let lockedSlot = '';
  if(level < 5){
    const nextLv = level + 1;
    const t = BADGE_THRESHOLDS[cat] || [0, 21, 51, 101, 189];
    const need = Math.max(0, t[level] - (Number(score) || 0)); // t[level] 即 Lv(nextLv) 阈值
    const lockSvg = `<svg class="badge-lock" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 v3"/></svg>`;
    lockedSlot = `<div class="badge-slot lv${nextLv} locked">
      <div class="badge-icon">${lockSvg}</div>
      <div class="badge-label">Lv${nextLv}</div>
      <div class="badge-need">还差 ${need} 分</div>
    </div>`;
  }
  const collection = unlockedSlots + lockedSlot;
  openModal('badge-preview', () => `
    <div class="modal-box badge-lightbox">
      <button class="badge-lightbox__close" data-modal-close aria-label="关闭">×</button>
      <div class="badge-lightbox__media">${media}</div>
      <div class="badge-lightbox__collection">${collection}</div>
      <div class="badge-lightbox__info">
        <div class="badge-lightbox__title">${cat}</div>
        <div class="badge-lightbox__sub">Lv${level} · ${score} 分</div>
      </div>
    </div>
  `, {
    onMount(overlay){
      // 已获得小徽章点击 → 顶部英雄大图切换 + 副标题更新 + active 高亮切换
      const slots = overlay.querySelectorAll('.badge-lightbox__collection .badge-slot.unlocked[data-lv]');
      slots.forEach(slot => {
        slot.addEventListener('click', () => {
          const lv = Number(slot.dataset.lv) || 1;
          const heroImg = overlay.querySelector('.badge-lightbox__media img');
          if(heroImg){
            heroImg.src = badgeImagePath(cat, lv);
            heroImg.alt = `${cat} Lv${lv}`;
          }
          const sub = overlay.querySelector('.badge-lightbox__sub');
          if(sub) sub.textContent = `Lv${lv} · ${score} 分`;
          slots.forEach(s => s.classList.remove('active'));
          slot.classList.add('active');
        });
      });
    },
  });
}

/**
 * 渲染维度徽章墙到 #badgeWall（5 槽位 5 级；学习力用位图，其余沿用 SVG），null 安全。
 */
export function renderBadges(){
  const el = document.getElementById('badgeWall');
  if(!el) return;
  const scores = computeDimensionScores(STATE.daily);
  el.innerHTML = CATEGORIES.map(c => {
    const s = scores[c.title] || 0;
    const level = badgeLevel(c.title, s);
    const unlocked = s > 0;
    const path = badgeImagePath(c.title, level);
    let iconInner;
    if(path){
      // 学习力：渲染横版位图，加载失败时降级为 SVG 盾牌
      iconInner = `<img class="badge-img" src="${path}" alt="${c.title} Lv${level}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
       <div class="badge-svg-fallback" style="display:none">${badgeSVG(c.title, level)}</div>`;
    } else {
      // 其他维度：沿用 SVG 盾牌
      iconInner = badgeSVG(c.title, level);
    }
    return `<div class="badge-slot lv${level}${unlocked ? ' unlocked' : ' locked'}" title="${c.title}：${s}分 · Lv${level}" data-cat="${c.title}" data-level="${level}" data-score="${s}">
      <div class="badge-icon">${iconInner}</div>
      <div class="badge-label">${c.title}</div>
      <div class="badge-score">${s}分 · Lv${level}</div>
    </div>`;
  }).join('');

  if(!el._badgeWired){
    el._badgeWired = true;
    el.addEventListener('click', (e) => {
      const slot = e.target.closest('.badge-slot');
      if(!slot) return;
      openBadgeLightbox(slot.dataset.cat, Number(slot.dataset.level), Number(slot.dataset.score));
    });
  }
}
