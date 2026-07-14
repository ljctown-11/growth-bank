// features/tree-garden/page.js — 成长树独立页面（DOM 渲染 + 弹层接线 + 蝴蝶挂载）
// 组合 water / inventory / tree-svg / seed-shop；复用 openModal、voice-encourage、getStreak(已弃用显示)。
// V2：每棵树独立进度/阶段/连浇；浇水需手动选树（pourWater）；打卡产水仅限当天（D4）；
// 取消打卡仅当天收回努力水（D2）。
import { STATE } from '../../core/state.js';
import { calcTotalScore, saveData } from '../../core/data.js';
import { getTodayStr } from '../../core/helpers.js';
import { renderMascot } from '../mascot.js';
import { openModal, closeModal } from '../modal.js';
import { getEncouragementToPlay, playRecording } from '../voice-encourage.js';
import { showPasswordModal } from '../password.js';
import { showResultBanner } from '../toast-center.js';
import {
  scoreToTreeStage, TREE_STAGE_NAMES, grantDailyWater,
  grantEffortWater, grantStreakWater, revokeEffortWater, pourWater,
  getDisplayPendingWater,
} from './water.js';
import {
  getInventory, plantSeed, plantFruitAsSeed, redeemFruit, harvestTree,
  synthesizeFruit, SPECIES_EMOJI, SPECIES_NAME, uprootTree, daysSince,
} from './inventory.js';
import { renderTreeStage } from './tree-svg.js';
import { renderTreeCanvas, mountTreeCanvases, TREE_RENDERER } from './tree-canvas.js';
import { preloadTreeSprite, whenSpriteLoaded } from './tree-sprite.js';
import { openSeedShop } from './seed-shop.js';
import { playWatering, playStageBloom, playHarvestFireworks } from './fx.js';
// ===== 动画调度状态（模块级，跨重渲染保持）=====
const _lastStageIdx = Object.create(null);
let _justWateredId = null;
// 蝴蝶随机漫游定时器（模块级，跨重渲染保持；重渲染前先清理，防泄漏/重影）
const _butterflyTimers = [];
// ===== 单棵树卡片（含 2 只蝴蝶 + 单棵进度条 + 单棵浇水/收获按钮）=====
function renderTreeCard(tree){
  const info = scoreToTreeStage(tree.water, tree.grade);
  const emoji = SPECIES_EMOJI[tree.species] || '🌳';
  const name = SPECIES_NAME[tree.species] || tree.species;
  const butterflies = `
    <div class="gt-butterfly gt-butterfly-l">${renderMascot('tree', { size: 52 })}</div>
    <div class="gt-butterfly gt-butterfly-r">${renderMascot('tree', { size: 46 })}</div>`;
  // 收获后 → 铲除按钮；繁茂未收获 → 收获按钮；其余无
  let harvestBtn = '';
  if(tree.harvested){
    harvestBtn = `<button class="btn-secondary gt-uproot-btn" data-id="${tree.id}" type="button">🗑 铲除</button>`;
  } else if(info.idx >= 4){
    harvestBtn = `<button class="btn-primary gt-harvest-btn" data-id="${tree.id}" type="button">🍎 收获果实</button>`;
  }
  // 阶段舞台：按 TREE_RENDERER 选择 Canvas（默认）或回退 SVG
  const stageInner = TREE_RENDERER === 'svg'
    ? renderTreeStage(tree.species, tree.grade, info.idx)
    : `<canvas class="gt-tree-canvas gt-tree-loading" data-tree-id="${tree.id}" data-species="${tree.species}" width="100%" height="100%" role="img" aria-label="${emoji} ${name} 成长树${info.stage}"></canvas>`;
  // 浇水按钮禁用条件：待浇水池为空，或该树已繁茂（繁茂树无需再浇水）
  const waterEmpty = STATE.growthTree.pendingWater <= 0;
  const lush = info.idx >= 4;
  const waterDisabled = waterEmpty || lush;
  // 浇水壶：复用已抠图的图片壶（assets/watering-can-new.webp），不再手绘 SVG / 按树种变色
  const waterBtn = `<button class="gt-card-water-btn${waterDisabled ? ' disabled' : ''}" data-tree-id="${tree.id}" type="button" aria-label="浇水"${waterDisabled ? ' aria-disabled="true"' : ''}>
    <img class="gt-can-img" src="assets/watering-can-new.webp" alt="浇水壶" draggable="false"/>
  </button>`;
  // 单棵进度条：逻辑复用 scoreToTreeStage（单一来源），内嵌于卡片
  const pct = Math.round(info.pct * 100);
  let nextText;
  if(tree.harvested){
    const left = Math.max(0, 7 - daysSince(tree.harvestDate));
    nextText = left > 0 ? `已收获，约 ${left} 天后自动铲除 🍂` : '已成熟，可随时铲除 🍂';
  } else if(info.idx >= 4){
    nextText = '可收获啦 🎉';
  } else {
    nextText = `还差 ${info.nextThreshold - tree.water} 水到「${TREE_STAGE_NAMES[info.idx + 1]}」`;
  }
  const progressBar = `
    <div class="gt-progress">
      <div class="gt-progress-head">
        <span class="gt-stage-label">🌱 ${info.stage}</span>
        <span class="gt-progress-pct">${pct}%</span>
      </div>
      <div class="gt-progress-bar"><div class="gt-progress-fill" style="width:${pct}%"></div></div>
      <div class="gt-progress-next">${nextText}</div>
    </div>`;
  return `<div class="gt-tree-card" data-tree-id="${tree.id}" data-species="${tree.species}">
    ${waterBtn}
    ${harvestBtn ? `<div class="gt-card-corner-actions">${harvestBtn}</div>` : ''}
    <div class="gt-tree-stage">${stageInner}${butterflies}</div>
    <div class="gt-tree-name">${emoji} ${name}</div>
    ${progressBar}
  </div>`;
}
// ===== 中央舞台 =====
function renderStage(){
  const gt = STATE.growthTree;
  if(gt.activeTrees.length === 0){
    return `<div class="gt-empty-stage">
      <div class="gt-empty-emoji">🌱</div>
      <div class="gt-empty-tip">还没有种下成长树</div>
      <div class="gt-empty-actions">
        <button class="btn-primary gt-shop-btn" type="button">🌱 去种子小铺</button>
        <button class="btn-secondary gt-inv-btn" type="button">🎒 打开背包种下</button>
      </div>
    </div>`;
  }
  const cards = gt.activeTrees.map(renderTreeCard).join('');
  return `<div class="gt-stage">${cards}</div>`;
}
// ===== 统计条（待浇水池 + 实际浇水连浇）=====
function renderStats(){
  const gt = STATE.growthTree;
  const score = calcTotalScore();
  const fruitCount = gt.inventory.filter(x => x.state === 'fruit').length;
  return `<div class="gt-stats">
    <span>🪙 ${score} 分</span>
    <span>💧 ${getDisplayPendingWater()} 水</span>
    <span>🔥 连浇 ${gt.waterStreakDays} 天</span>
    <span>🍎 果实 ${fruitCount}</span>
    <span>🌳 ${gt.activeTrees.length} 棵</span>
  </div>`;
}
// ===== 底部操作栏（浇水 +1 = 手动浇某棵树）=====
function renderActions(){
  const gt = STATE.growthTree;
  // 待浇水池改为只读展示胶囊（T6）：不再 button、不绑事件、不受 canPour 影响。
  const waterStatic = `<div class="gt-water-static">💧 待浇水 ${getDisplayPendingWater()}</div>`;
  return `<div class="gt-actions">
    ${waterStatic}
    <button class="btn-secondary gt-shop-btn" type="button">🌱 种子小铺</button>
    <button class="btn-secondary gt-inv-btn" type="button">🎒 背包</button>
  </div>`;
}
/**
 * 渲染成长树独立页面到 #mtab-tree（null 安全；未设宝贝整页禁用）。
 * 进入页面时发放「每日浇水礼」(+1 进待浇水池，全局 1/天幂等)。
 */
export function renderGrowthTreePage(){
  const root = document.getElementById('mtab-tree');
  if(!root) return;
  if(!STATE.childName || !STATE.childName.trim()){
    root.innerHTML = `<div class="gt-locked">
      <div class="gt-empty-emoji">🌳</div>
      <div class="gt-empty-tip">请先在首页设置宝贝信息，才能养一棵成长树哦 👆</div>
    </div>`;
    return;
  }
  // 每日浇水礼：进待浇水池（全局 1/天，幂等）
  if(grantDailyWater(getTodayStr())) saveData();
  // 收获后 7 天强制铲除（已收获且距 harvestDate ≥7 天）：进入页面即检查
  const expired = STATE.growthTree.activeTrees.filter(t => t.harvested && daysSince(t.harvestDate) >= 7);
  if(expired.length){
    expired.forEach(t => uprootTree(t.id));
    saveData();
    if(typeof window.toast === 'function') window.toast(`有 ${expired.length} 棵树已自然凋零，已为你铲除 🍂`);
  }
  root.innerHTML = `
    <div class="gt-page">
      ${renderStage()}
      ${renderStats()}
      ${renderActions()}
    </div>`;
  // DOM 已就绪后挂载 Canvas（每棵 .gt-tree-canvas 独立初始化，rAF 由 Controller 管理）
  if (TREE_RENDERER === 'canvas') mountTreeCanvases(root);
  // 进页预加载：立即开始下载当前阶段精灵图（提前于首次 draw 的懒加载），加载完成后去掉占位
  STATE.growthTree.activeTrees.forEach(tree => {
    const idx = scoreToTreeStage(tree.water, tree.grade).idx;
    preloadTreeSprite(tree.species, idx);
    if (TREE_RENDERER === 'canvas') {
      const canvas = root.querySelector(`.gt-tree-canvas[data-tree-id="${tree.id}"]`);
      if (canvas) {
        // 图片 onload 后由 _loadListeners 触发：去掉 .gt-tree-loading 占位
        // （controller 内部 onTreeSpriteLoad 已负责重绘，此处只管移除占位类）
        whenSpriteLoaded(tree.species, idx, () => {
          canvas.classList.remove('gt-tree-loading');
        });
      }
    }
  });
  // 阶段切换 / 浇水动画调度（首屏仅初始化 _lastStageIdx，不播动画）
  scheduleTreeAnimations(root);
  // 蝴蝶随机漫游：在树绘制区内自由飞行（重渲染前先自我清理）
  startButterflyRoam(root);
}
// ===== 动画调度（浇水流水 / 阶段跨段绽放）=====
// 首屏仅初始化 _lastStageIdx，不播动画；后续渲染按阶段变化 / 本次浇水决定播哪类。
function scheduleTreeAnimations(root){
  const gt = STATE.growthTree;
  gt.activeTrees.forEach(tree => {
    const card = root.querySelector('.gt-tree-card[data-tree-id="' + tree.id + '"]');
    if(!card) return;
    const idx = scoreToTreeStage(tree.water, tree.grade).idx;
    const prev = _lastStageIdx[tree.id];
    if(prev === undefined){ _lastStageIdx[tree.id] = idx; return; } // 首屏初始化，不播
    if(idx !== prev){
      _lastStageIdx[tree.id] = idx;
      playStageBloom(card);            // 跨阶段优先绽放
    } else if(_justWateredId === tree.id){
      playWatering(card);             // 未跨阶段才播浇水流水
    }
  });
  _justWateredId = null;
}
// ===== 蝴蝶随机漫游（替换固定 butterfly-dance 关键帧）=====
// 每次重渲染调用：先清旧定时器（旧 DOM 已 detach，停回调防泄漏/重影），
// 再为每只蝴蝶在 .gt-tree-stage（树绘制区，范围 A）内随机取点平滑飞过去，循环往复。
// prefers-reduced-motion 时只放静态随机点、不漫游（降级）。
function startButterflyRoam(root){
  // 清理上一轮
  while(_butterflyTimers.length){
    clearTimeout(_butterflyTimers.pop());
  }
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = root.querySelectorAll('.gt-tree-card');
  cards.forEach(card => {
    const stage = card.querySelector('.gt-tree-stage');
    const flies = card.querySelectorAll('.gt-butterfly');
    if(!stage || flies.length === 0) return;
    const rand = max => Math.max(0, Math.floor(Math.random() * Math.max(0, max)));
    flies.forEach((el, i) => {
      // 瞬时落到随机起点（0s 过渡，不扫场）
      const snap = dir => {
        const w = stage.clientWidth || 220;
        const h = stage.clientHeight || 200;
        el.style.transitionDuration = '0s';
        el.style.transform = `translate(${rand(w - 52)}px, ${rand(h - 56)}px) scaleX(${dir})`;
        void el.offsetWidth;             // 强制 reflow，让 0s 起点立即生效
        el.style.transitionDuration = ''; // 还原为 CSS 默认过渡
      };
      const fly = () => {
        if(!el.isConnected) return;       // 旧节点已被重渲染销毁则停止
        const w = stage.clientWidth || 220;
        const h = stage.clientHeight || 200;
        const x = rand(w - 52);
        const y = rand(h - 56);
        const dir = Math.random() < 0.5 ? -1 : 1; // 按移动方向翻转朝向
        const dur = (2.5 + Math.random() * 2).toFixed(2); // 每段 2.5–4.5s
        el.style.transitionDuration = dur + 's';
        el.style.transform = `translate(${x}px, ${y}px) scaleX(${dir})`;
        _butterflyTimers.push(setTimeout(fly, (parseFloat(dur) + 0.3) * 1000));
      };
      if(reduce){
        snap(1); return; // 降级：静态随机点
      }
      snap(1);
      _butterflyTimers.push(setTimeout(fly, 400 + i * 300)); // 错峰起飞
    });
  });
}
// ===== 事件委托（绑定一次）=====
let _bound = false;
function onPageClick(e){
  const t = e.target.closest('button');
  if(!t) return;
  if(t.classList.contains('gt-shop-btn')) return openSeedShop(refreshGrowthTree);
  if(t.classList.contains('gt-inv-btn')) return openInventory();
  if(t.classList.contains('gt-harvest-btn')) return onHarvestClick(t.dataset.id);
  if(t.classList.contains('gt-uproot-btn')) return onUprootClick(t.dataset.id);
  if(t.classList.contains('gt-card-water-btn')) return onCardWaterClick(t.dataset.treeId);
}
/**
 * 挂载成长树页面（供 main.js 第 5 个 tab 切换调用）。
 */
export function mountGrowthTreePage(){
  const root = document.getElementById('mtab-tree');
  if(!root) return;
  if(!_bound){
    root.addEventListener('click', onPageClick);
    _bound = true;
  }
  renderGrowthTreePage();
}
/**
 * 打卡成功回调（供 render.js toggleTask 成功分支调用）：
 * 发努力水（按任务去重）+ 坚持水（里程碑，基于实际浇水连浇）。
 * 仅当天打卡才产水（D4）；种树前不计水。
 * @param {string} taskId
 * @param {string} date YYYY-MM-DD
 */
export function onTaskChecked(taskId, date){
  if(!STATE.childName) return;
  if(!STATE.growthTree.firstPlantDate) return; // 种树前不计水
  if(date !== getTodayStr()) return;           // D4：仅当天产水
  grantEffortWater(taskId, date);
  grantStreakWater();                          // 基于实际浇水连浇（通常 0，除非已浇）
  saveData();
}
/**
 * 打卡取消回调（供 render.js toggleTask 取消分支调用，D2）：
 * 仅当天取消才精确收回对应努力水（已浇到树上的不倒回）。
 * @param {string} taskId
 * @param {string} date YYYY-MM-DD
 */
export function onTaskUnchecked(taskId, date){
  if(!STATE.childName) return;
  if(date !== getTodayStr()) return;           // D2：仅当天收回
  revokeEffortWater(taskId, date);
  saveData();
}
/**
 * 浇水按钮（手动浇某棵树）：1 棵直接浇，≥2 棵弹轻量选择器。
 */
export function onWaterClick(){
  if(!STATE.childName) return;
  const gt = STATE.growthTree;
  if(gt.activeTrees.length === 0){
    if(typeof window.toast === 'function') window.toast('先去种子小铺种下一棵树吧 🌱');
    return;
  }
  if(gt.pendingWater <= 0){
    if(typeof window.toast === 'function') window.toast('待浇水池空空的，先打卡攒水吧 💧');
    return;
  }
  if(gt.activeTrees.length === 1){
    doPour(gt.activeTrees[0].id);
  } else {
    openTreePicker();
  }
}
/**
 * 卡片右上角浇水按钮（单棵）：复用到指定树 doPour。
 * 待浇水池为空时给出引导 toast（视觉态由 .disabled 表示，点击事件仍触发，由此处守卫拦截）。
 * @param {string} treeId
 */
function onCardWaterClick(treeId){
  if(!STATE.childName) return;
  // 繁茂树禁浇（已收获或仅成熟都禁止，避免无意义浇水）
  const tree = STATE.growthTree.activeTrees.find(t => t.id === treeId);
  if(tree && scoreToTreeStage(tree.water, tree.grade).idx >= 4){
    if(typeof window.toast === 'function') window.toast('这棵树已枝繁叶茂，不需要再浇水啦 🌳');
    return;
  }
  if(STATE.growthTree.pendingWater <= 0){
    if(typeof window.toast === 'function') window.toast('待浇水池已空，去完成小任务攒水吧 💧');
    return;
  }
  doPour(treeId);
}
/**
 * 把待浇水池里的水浇到指定树上（pourWater + 动画/语音/重渲染）。
 * @param {string} treeId
 */
function doPour(treeId){
  const ok = pourWater(treeId);
  if(ok){
    saveData();
    _justWateredId = treeId; // 标记本次浇水，供刷新后的动画调度使用（T3）
    // 随机家长录音鼓励（非阻塞，不挡动画）
    try{
      const pick = getEncouragementToPlay(undefined, STATE.activeChildId);
      if(pick && pick.id) playRecording(pick.id).catch(() => {});
    }catch(e){ /* 静默回退 */ }
    if(typeof window.toast === 'function') window.toast('浇水成功，小树 +1 💧');
    refreshGrowthTree();
  } else {
    if(typeof window.toast === 'function') window.toast('待浇水池空了，去打卡攒水吧 💧');
  }
}
/**
 * 轻量选树器（≥2 棵树时选择要浇的对象）。
 */
function openTreePicker(){
  const gt = STATE.growthTree;
  const list = gt.activeTrees.map(t => {
    const emoji = SPECIES_EMOJI[t.species] || '🌳';
    const name = SPECIES_NAME[t.species] || t.species;
    const info = scoreToTreeStage(t.water, t.grade);
    return `<button class="btn-secondary gt-pick-tree" data-id="${t.id}" type="button">${emoji} ${name} · ${info.stage}（已浇 ${t.water} 水）</button>`;
  }).join('');
  const builder = () => `<div class="modal-box gt-pick-modal" style="max-width:420px">
    <h3>💧 选一棵浇水</h3>
    <div class="gt-pick-list">${list}</div>
    <div class="modal-actions"><button class="btn-ghost" data-modal-close type="button">取消</button></div>
  </div>`;
  openModal('tree-pick', builder, {
    onMount(overlay){
      overlay.querySelectorAll('.gt-pick-tree').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id;
        closeModal('tree-pick');
        doPour(id);
      }));
    }
  });
}
/**
 * 收获按钮（单棵）：仅该棵达繁茂才可收，收后该棵重置。
 * @param {string} treeId
 */
function onHarvestClick(treeId){
  const fruits = harvestTree(Math.random, treeId);
  if(fruits === false){
    if(typeof window.toast === 'function') window.toast('这棵还没成熟，继续浇水养大它吧 💧');
    return;
  }
  saveData();
  playHarvestFireworks(); // 收获烟花（T5）：在刷新前播放
  if(typeof window.toast === 'function') window.toast(`收获成功，得到 ${fruits.length} 个果实 🍎`);
  refreshGrowthTree();
}
/**
 * 铲除按钮（单棵）：从园中移除该树（收获后 7 天可手动铲除，超期也会自动铲除）。
 * @param {string} treeId
 */
function onUprootClick(treeId){
  const ok = uprootTree(treeId);
  saveData();
  if(ok && typeof window.toast === 'function') window.toast('已铲除这棵树 🍂');
  refreshGrowthTree();
}
/**
 * 刷新成长树页（供 render.js renderAll 调用；不可见静默）。
 */
export function refreshGrowthTree(){
  const root = document.getElementById('mtab-tree');
  if(!root) return;
  if(root.style.display === 'none') return;
  renderGrowthTreePage();
}
// ===== 背包仓库弹层 =====
function openInventory(){
  const inv = getInventory();
  const body = inv.length
    ? inv.map(it => {
        const emoji = SPECIES_EMOJI[it.species] || '🌳';
        const name = SPECIES_NAME[it.species] || it.species;
        if(it.state === 'seed'){
          return `<div class="gt-inv-item">
            <span class="gt-inv-label">${emoji} ${name}种子</span>
            <button class="btn-secondary gt-inv-act" data-act="plant" data-id="${it.id}" type="button">种下</button>
          </div>`;
        }
        const gain = Number(it.grade) === 5 ? 5 : 10;
        return `<div class="gt-inv-item">
          <span class="gt-inv-label">${emoji} ${name}果实（${it.grade}分）</span>
          <span class="gt-inv-acts">
            <button class="btn-secondary gt-inv-act" data-act="redeem" data-id="${it.id}" type="button">兑换+${gain}</button>
            <button class="btn-secondary gt-inv-act" data-act="plantfruit" data-id="${it.id}" type="button">种下当种</button>
          </span>
        </div>`;
      }).join('')
    : '<div class="gt-inv-empty">背包空空如也，去种子小铺买一棵吧 🌱</div>';
  const fiveCount = inv.filter(x => x.state === 'fruit' && x.grade === 5).length;
  const synthBtn = fiveCount >= 2
    ? `<button class="btn-primary gt-inv-act" data-act="synth" type="button">🧪 合成（2 个 5 分果 → 1 个 10 分果）</button>`
    : '';
  const builder = () => `<div class="modal-box gt-inv-modal" style="max-width:460px">
    <h3>🎒 背包仓库</h3>
    <div class="gt-inv-list">${body}</div>
    ${synthBtn}
    <div class="modal-actions"><button class="btn-ghost" data-modal-close type="button">关闭</button></div>
  </div>`;
  openModal('inventory', builder, {
    onMount(overlay){
      overlay.querySelectorAll('.gt-inv-act').forEach(b => b.addEventListener('click', () => {
        const act = b.dataset.act;
        const id = b.dataset.id;
        if(act === 'plant') doPlant(id);
        else if(act === 'plantfruit') doPlantFruit(id);
        else if(act === 'redeem') onRedeemClick(id);
        else if(act === 'synth') doSynthesize();
      }));
    }
  });
}
function doPlant(itemId){
  const ok = plantSeed(itemId);
  saveData();
  if(typeof window.toast === 'function') window.toast(ok ? '已种下 🌱' : (STATE.growthTree.activeTrees.length >= 2 ? '最多同时养 2 棵哦' : '种下失败'));
  closeModal('inventory');
  refreshGrowthTree();
}
function doPlantFruit(itemId){
  const ok = plantFruitAsSeed(itemId);
  saveData();
  if(typeof window.toast === 'function') window.toast(ok ? '已种下果实当种子 🌱' : '种下失败');
  closeModal('inventory');
  refreshGrowthTree();
}
function onRedeemClick(itemId){
  const item = getInventory().find(x => x.id === itemId && x.state === 'fruit');
  if(!item) return;
  const gain = Number(item.grade) === 5 ? 5 : 10;
  showPasswordModal(
    `果实兑换需确认，将增加 <b>${gain}</b> 分`,
    () => {
      const ok = redeemFruit(itemId);
      if(ok){
        saveData();
        if(typeof window.toast === 'function') window.toast(`果实已兑换 +${gain} 分 🎉`);
      }
      closeModal('inventory');
      refreshGrowthTree();
    },
    () => { /* 取消：保留背包 */ }
  );
}
function doSynthesize(){
  const res = synthesizeFruit(Math.random);
  saveData();
  if(res && res.ok){
    showResultBanner('success', '合成成功！获得 1 个 10 分果 🍎');
  } else if(res && res.reason === 'fail'){
    showResultBanner('fail', '合成失败，损失 1 个 5 分果（已退回 1 个）');
  } else {
    if(typeof window.toast === 'function') window.toast('需要 2 个 5 分果才能合成哦');
  }
  closeModal('inventory');
  refreshGrowthTree();
}
