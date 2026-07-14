// features/tree-garden/fx.js — 成长树动画工具（纯 DOM，自包含，不 import render.js）
// 三个导出函数：playWatering / playStageBloom / playHarvestFireworks。
// 规则：动画类 / 元素用完必须移除，支持重入（先清旧再挂新），无残留可重复触发。

// 连续水柱（.gt-water-jet 内联 SVG）在 playWatering 中按 DOM 动态生成，无需字形池。

/**
 * 浇水流水动画：给卡片根元素加 .watering（画区发光 + ::after 土堆变润由 CSS 负责），
 * 同时让洒水壶按钮倾斜（.gt-pouring），并从壶嘴注入 1 个连续水柱 .gt-water-jet
 * （内联 SVG：上窄下宽梯形水柱 + 白色流动光纹 + 底部水花 + 从上到下渐隐），
 * 水柱高度按“壶嘴(START_TOP)→树根土壤椭圆中心”自动计算。约 1.4s 后兜底清理（支持重入）。
 * @param {HTMLElement} cardEl .gt-tree-card 根元素
 */
export function playWatering(cardEl){
  if(!cardEl || !cardEl.classList || !cardEl.classList.contains('gt-tree-card')) return;
  // 先清旧（支持重入：同一次浇水若连续触发，重置而非叠加）
  clearWatering(cardEl);

  cardEl.classList.add('watering');

  // 找到浇水按钮（洒水壶）；调用方已保证仅在待浇水池有水时进入，故浇水即倾斜 + 自壶嘴注水柱（含最后一滴）
  const btn = cardEl.querySelector('.gt-card-water-btn');
  if(btn){
    btn.classList.add('gt-pouring');

    // 卡片像素尺寸（jsdom / 异常走回退）
    const cr = cardEl.getBoundingClientRect();
    const W = Math.round(cr.width) || 240;
    const H = Math.round(cr.height) || 330;

    // —— 壶嘴在图片壶中的相对位置（已实测：左 ~6%、上 ~44%）——
    const CAN = 66, PAD = 10;
    const SX_FRAC = 0.06, SY_FRAC = 0.44;
    const canLeft = W - PAD - CAN;
    const canTop  = PAD;
    const spoutX0 = canLeft + SX_FRAC * CAN;
    const spoutY0 = canTop + SY_FRAC * CAN;
    // 倾倒后壶嘴：绕按钮「右下角」旋转 -18°，与 CSS transform-origin:bottom right 一致
    const rad = -18 * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const px = W - PAD, py = PAD + CAN;
    const spoutX = px + (spoutX0 - px) * cos - (spoutY0 - py) * sin;
    const spoutY = py + (spoutX0 - px) * sin + (spoutY0 - py) * cos;

    // 落点：树根土壤椭圆中心（相对 card 顶部）
    let soilX = W / 2, soilY = H * 0.62;
    const stage = cardEl.querySelector('.gt-tree-stage');
    if(stage && stage.getBoundingClientRect){
      const sr = stage.getBoundingClientRect();
      const cr2 = cardEl.getBoundingClientRect();
      if(sr.width && cr2.height){
        soilX = (sr.left - cr2.left) + sr.width / 2;
        soilY = (sr.bottom - cr2.top) - sr.height * 0.12;
      }
    }

    // 喇叭形水柱路径：上窄(~7px) → 下宽(~40px)，抛物线
    const halfT = 3.5, halfB = 20;
    const midX = (spoutX + soilX) / 2, midY = (spoutY + soilY) / 2;
    const ctrlLx = midX - 8, ctrlRx = midX + 8;
    const fb = (n) => n.toFixed(1);
    const streamPath =
      'M ' + fb(spoutX - halfT) + ' ' + fb(spoutY)
      + ' Q ' + fb(ctrlLx) + ' ' + fb(midY) + ' ' + fb(soilX - halfB) + ' ' + fb(soilY)
      + ' L ' + fb(soilX + halfB) + ' ' + fb(soilY)
      + ' Q ' + fb(ctrlRx) + ' ' + fb(midY) + ' ' + fb(spoutX + halfT) + ' ' + fb(spoutY) + ' Z';
    const flowPath = 'M ' + fb(spoutX) + ' ' + fb(spoutY) + ' Q ' + fb(midX) + ' ' + fb(midY) + ' ' + fb(soilX) + ' ' + fb(soilY);

    // 星光位置（壶嘴 / 沿途 / 落点）
    const sparkPos = [
      { x: spoutX + 2,  y: spoutY - 10, r: 8, d: 0 },
      { x: spoutX - 6,  y: spoutY + 18, r: 6, d: 0.12 },
      { x: midX - 6,    y: midY,        r: 5, d: 0.24 },
      { x: soilX + 4,   y: soilY - 8,   r: 8, d: 0.36 },
      { x: soilX - 12,  y: soilY + 2,   r: 6, d: 0.18 },
      { x: soilX + 14,  y: soilY - 2,   r: 5, d: 0.30 },
    ];
    const star = (s) => {
      const r = s.r;
      return '<g transform="translate(' + fb(s.x) + ',' + fb(s.y) + ')"><path class="ws-spark" style="animation-delay:' + s.d + 's" d="M0,-' + r
        + ' C1,-' + fb(r / 4) + ' ' + fb(r / 4) + ',-1 ' + r + ',0'
        + ' C' + fb(r / 4) + ',1 1,' + fb(r / 4) + ' 0,' + r
        + ' C-1,' + fb(r / 4) + ' -' + fb(r / 4) + ',1 -' + r + ',0'
        + ' C-' + fb(r / 4) + ',-1 -1,-' + fb(r / 4) + ' 0,-' + r + ' Z"/></g>';
    };

    // 浇水场景：覆盖整张卡片的内联 SVG（喇叭水柱 + 流光 + 水花 + 星光）
    const scene = document.createElement('div');
    scene.className = 'gt-water-scene';
    scene.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<linearGradient id="ws-grad" x1="0" y1="' + fb(spoutY) + '" x2="0" y2="' + fb(soilY) + '" gradientUnits="userSpaceOnUse">'
      + '<stop offset="0%" stop-color="#B3E5FC"/><stop offset="100%" stop-color="#29B6F6"/>'
      + '</linearGradient>'
      + '<filter id="ws-glow" x="-30%" y="-30%" width="160%" height="160%">'
      + '<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>'
      + '</defs>'
      + '<path class="ws-body" d="' + streamPath + '" fill="url(#ws-grad)" filter="url(#ws-glow)"/>'
      + '<g transform="translate(' + fb(soilX) + ',' + fb(soilY) + ')">'
      + '<ellipse class="ws-splash" cx="0" cy="0" rx="26" ry="8"/>'
      + '<ellipse class="ws-splash2" cx="0" cy="0" rx="20" ry="6"/>'
      + '<circle class="ws-drop d1" cx="0" cy="0" r="4"/>'
      + '<circle class="ws-drop d2" cx="0" cy="0" r="3.4"/>'
      + '<circle class="ws-drop d3" cx="0" cy="0" r="3"/>'
      + '<circle class="ws-drop d4" cx="0" cy="0" r="2.6"/>'
      + '<circle class="ws-drop d5" cx="0" cy="0" r="2.4"/>'
      + '</g>'
      + sparkPos.map(star).join('')
      + '</svg>';
    cardEl.appendChild(scene);
  }

  // 兜底清理（覆盖动画未触发 animationend 的极端情况）
  const timer = setTimeout(() => clearWatering(cardEl), 1400);
  cardEl._wateringTimer = timer;
}

/** 清除浇水动画残留（类 + 倾斜 + 水柱场景 + 定时器）。 */
function clearWatering(cardEl){
  if(cardEl._wateringTimer){ clearTimeout(cardEl._wateringTimer); cardEl._wateringTimer = null; }
  cardEl.classList.remove('watering');
  const btn = cardEl.querySelector('.gt-card-water-btn');
  if(btn) btn.classList.remove('gt-pouring');
  const old = cardEl.querySelectorAll('.gt-water-drop, .gt-spray-dot, .gt-water-jet, .gt-water-scene');
  for(let i = 0; i < old.length; i++) old[i].remove();
}

export function playStageBloom(cardEl){
  if(!cardEl || !cardEl.classList || !cardEl.classList.contains('gt-tree-card')) return;
  // 若正在播放，先移除再重放（强制 reflow 确保动画重启）
  if(cardEl.classList.contains('stage-bloom')) cardEl.classList.remove('stage-bloom');
  void cardEl.offsetWidth; // 触发重排，使 animation 重新生效
  cardEl.classList.add('stage-bloom');

  const onEnd = (e) => {
    // 仅响应卡片自身的 stage-bloom 动画（忽略 ::before bloom-star 伪元素冒泡）
    if(e.animationName !== 'stage-bloom') return;
    cardEl.classList.remove('stage-bloom');
    cardEl.removeEventListener('animationend', onEnd);
  };
  cardEl.addEventListener('animationend', onEnd);
  // 兜底：0.72s 后强制移除，避免极端情况下类残留
  setTimeout(() => { cardEl.classList.remove('stage-bloom'); }, 720);
}

// 烟花配色（与 render.js triggerFireworks 同源，纯展示用）
const FIREWORK_COLORS = [
  '#FFD54F', '#FF7043', '#AB47BC', '#26C6DA',
  '#66BB6A', '#EF5350', '#FFA726', '#7E57C2',
];

/**
 * 收获烟花：复用 index.html 已有 #fireworkLayer（不新建 .firework-layer）；
 * 清空旧 .spark，注入 N（18~24）个 .spark，随机背景色 + --dx/--dy 随机偏移，
 * 复用既有 @keyframes spark-pop；animationend 后清理。
 */
export function playHarvestFireworks(){
  const layer = document.getElementById('fireworkLayer');
  if(!layer) return; // 容器缺失则静默（测试 / jsdom 环境常见）
  // 先清旧（支持重入）
  const oldSparks = layer.querySelectorAll('.spark');
  for(let i = 0; i < oldSparks.length; i++) oldSparks[i].remove();

  const total = 18 + Math.floor(Math.random() * 7); // 18~24
  const sparks = [];
  for(let i = 0; i < total; i++){
    const spark = document.createElement('div');
    spark.className = 'spark';
    const size = (4 + Math.random() * 6).toFixed(1);
    spark.style.width = size + 'px';
    spark.style.height = size + 'px';
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    spark.style.background = color;
    spark.style.color = color; // 供 box-shadow: currentColor 发光
    spark.style.left = '50%';
    spark.style.top = '50%';
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 130; // 90~220
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    spark.style.setProperty('--dx', dx.toFixed(1) + 'px');
    spark.style.setProperty('--dy', dy.toFixed(1) + 'px');
    layer.appendChild(spark);
    sparks.push(spark);
  }

  // 逐个清理：spark-pop（780ms）结束后移除，避免残留
  for(let i = 0; i < sparks.length; i++){
    sparks[i].addEventListener('animationend', () => { sparks[i].remove(); });
  }
  // 兜底全清（防止个别未触发 animationend）
  setTimeout(() => {
    const remain = layer.querySelectorAll('.spark');
    for(let i = 0; i < remain.length; i++) remain[i].remove();
  }, 900);
}
