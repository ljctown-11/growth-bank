// features/ideas.js — 任务灵感库（静态数据 + 设为今日任务 + 弹层渲染）

import { STATE } from '../core/state.js';
import { getDay, saveData } from '../core/data.js';
import { esc } from '../core/helpers.js';
import { renderTasks } from './render.js';
import { openModal, closeModal } from './modal.js';

// ===== 静态灵感库（5 维度各 6 条）=====
export const IDEA_LIBRARY = {
  '学习力': [
    { id: 'idea-l-study-poem', title: '背一首喜欢的古诗', pts: 1, cat: '学习力' },
    { id: 'idea-l-study-words', title: '用英语说 3 个新单词', pts: 1, cat: '学习力' },
    { id: 'idea-l-study-diary', title: '写一篇 100 字小日记', pts: 1, cat: '学习力' },
    { id: 'idea-l-study-math', title: '解一道趣味数学题', pts: 1, cat: '学习力' },
    { id: 'idea-l-study-teach', title: '给爸爸妈妈讲一个刚学到的知识', pts: 1, cat: '学习力' },
    { id: 'idea-l-study-read', title: '安静阅读 15 分钟', pts: 1, cat: '学习力' },
  ],
  '运动力': [
    { id: 'idea-p-sport-rope', title: '跳绳 100 个', pts: 1, cat: '运动力' },
    { id: 'idea-p-sport-walk', title: '和爸妈散步 20 分钟', pts: 1, cat: '运动力' },
    { id: 'idea-p-sport-dance', title: '学一个舞蹈动作', pts: 1, cat: '运动力' },
    { id: 'idea-p-sport-gym', title: '在家做一套广播操', pts: 1, cat: '运动力' },
    { id: 'idea-p-sport-ball', title: '拍球 / 颠球挑战 1 分钟', pts: 1, cat: '运动力' },
    { id: 'idea-p-sport-balance', title: '平衡走一条直线', pts: 1, cat: '运动力' },
  ],
  '自控力': [
    { id: 'idea-c-self-desk', title: '自己整理书桌 10 分钟', pts: 1, cat: '自控力' },
    { id: 'idea-c-self-screen', title: '今天少看 30 分钟屏幕', pts: 1, cat: '自控力' },
    { id: 'idea-c-self-homework', title: '写完作业再玩', pts: 1, cat: '自控力' },
    { id: 'idea-c-self-alarm', title: '自己定闹钟起床', pts: 1, cat: '自控力' },
    { id: 'idea-c-self-wait', title: '等待 5 分钟再吃零食', pts: 1, cat: '自控力' },
    { id: 'idea-c-self-focus', title: '安静专注做一件事 20 分钟', pts: 1, cat: '自控力' },
  ],
  '探索力': [
    { id: 'idea-e-exp-insect', title: '观察一种昆虫并画下来', pts: 1, cat: '探索力' },
    { id: 'idea-e-exp-lab', title: '做一个小科学实验', pts: 1, cat: '探索力' },
    { id: 'idea-e-exp-song', title: '学唱一首新歌', pts: 1, cat: '探索力' },
    { id: 'idea-e-exp-sky', title: '记录今天的天空颜色', pts: 1, cat: '探索力' },
    { id: 'idea-e-exp-cloud', title: '找一个形状像动物的云', pts: 1, cat: '探索力' },
    { id: 'idea-e-exp-bridge', title: '用积木搭一座桥', pts: 1, cat: '探索力' },
  ],
  '实践力': [
    { id: 'idea-r-prac-bowl', title: '帮家人摆碗筷', pts: 1, cat: '实践力' },
    { id: 'idea-r-prac-sock', title: '自己洗一只袜子', pts: 1, cat: '实践力' },
    { id: 'idea-r-prac-plant', title: '给植物浇水', pts: 1, cat: '实践力' },
    { id: 'idea-r-prac-cook', title: '学做一道简单菜', pts: 1, cat: '实践力' },
    { id: 'idea-r-prac-toy', title: '整理自己的玩具箱', pts: 1, cat: '实践力' },
    { id: 'idea-r-prac-parcel', title: '帮爸妈拿快递', pts: 1, cat: '实践力' },
  ],
};

// 灵感库顶部胶囊 Tab（五维，已删「全部」）
export const IDEA_TABS = ['学习力', '运动力', '自控力', '探索力', '实践力'];

// 当前选中的灵感 Tab（模块级，弹层内就地过滤，不重开）
let _activeIdeaTab = '学习力';

// 自定义灵感覆盖（主数据全局，不进孩子快照，与 customRewards 一致）
const MAIN_KEY = 'summerGrowthBankV2';

/**
 * 由灵感生成稳定的 ideaId（'idea_' + 简单 hash）。
 * @param {{title:string, cat:string}} idea
 * @returns {string}
 */
export function ideaIdOf(idea){
  const base = (idea.title || '') + '|' + (idea.cat || '');
  let h = 0;
  for(let i = 0; i < base.length; i++){
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return 'idea_' + h.toString(36);
}

/**
 * 把某条灵感写入当日任务（day.tasks[ideaId] = {done:false, pts, cat, title, fromIdea:true}）。
 * 幂等：已存在同 id 时不覆盖（尤其不覆盖已 done 状态）。
 * @param {string} date
 * @param {{title:string, cat:string, pts?:number}} idea
 */
export function addIdeaAsTask(date, idea){
  const day = getDay(date);
  const id = ideaIdOf(idea);
  const existing = day.tasks[id];
  if(existing){
    // 幂等：保持既有状态；仅确保 fromIdea 标记存在
    if(existing.fromIdea !== true) existing.fromIdea = true;
    return existing;
  }
  const entry = {
    done: false,
    pts: idea.pts || 1,
    cat: idea.cat,
    title: idea.title,
    fromIdea: true,
  };
  day.tasks[id] = entry;
  saveData();
  return entry;
}

// 仅参考提示（不改动任何状态）
function toastOnlyRef(){
  if(typeof window !== 'undefined' && window.toast) window.toast('已记下这个小灵感🌟');
}

// ===== 自定义灵感读写（主数据全局 customIdeas，不进 child 快照）=====

/**
 * 读取全部自定义灵感覆盖（来自主数据 summerGrowthBankV2.customIdeas）。
 * @returns {Record<string,{title:string,pts:number}>}
 */
export function loadCustomIdeas(){
  try{
    const mainData = JSON.parse(localStorage.getItem(MAIN_KEY) || '{}');
    return (mainData && mainData.customIdeas) || {};
  }catch(e){ return {}; }
}

/**
 * 写入一条自定义灵感覆盖（按 id 覆盖默认条目的 title/pts；cat 保持默认）。
 * @param {string} id
 * @param {string} title
 * @param {number} pts
 */
export function saveCustomIdea(id, title, pts){
  let mainData = {};
  try{ mainData = JSON.parse(localStorage.getItem(MAIN_KEY) || '{}') || {}; }catch(e){ mainData = {}; }
  if(!mainData.customIdeas) mainData.customIdeas = {};
  mainData.customIdeas[id] = { title: String(title), pts: Number(pts) || 0 };
  try{ localStorage.setItem(MAIN_KEY, JSON.stringify(mainData)); }catch(e){}
}

/**
 * 删除一条自定义灵感覆盖（恢复为该维度的默认灵感）。
 * @param {string} id
 */
export function resetCustomIdea(id){
  let mainData = {};
  try{ mainData = JSON.parse(localStorage.getItem(MAIN_KEY) || '{}') || {}; }catch(e){ mainData = {}; }
  if(mainData.customIdeas && mainData.customIdeas[id]) delete mainData.customIdeas[id];
  try{ localStorage.setItem(MAIN_KEY, JSON.stringify(mainData)); }catch(e){}
}

/**
 * 合并默认灵感与自定义覆盖，返回当前应展示的灵感视图。
 * @param {{id:string,title:string,pts:number,cat:string}} idea
 * @returns {{id:string,title:string,pts:number,cat:string}}
 */
export function getIdeaView(idea){
  const all = loadCustomIdeas();
  const ov = all[idea.id];
  if(ov){
    return { id: idea.id, title: ov.title, pts: ov.pts, cat: idea.cat };
  }
  return { id: idea.id, title: idea.title, pts: idea.pts, cat: idea.cat };
}

// ===== 灵感列表 HTML（按 _activeIdeaTab 过滤）=====
function buildIdeaListHtml(date){
  const cats = Object.keys(IDEA_LIBRARY);
  const sections = cats.map(cat => {
    if(_activeIdeaTab !== '全部' && cat !== _activeIdeaTab) return '';
    const items = IDEA_LIBRARY[cat].map(idea => {
      const view = getIdeaView(idea);
      // 判定键仍用 ideaIdOf 哈希（与 day.tasks 内部一致，无旧数据迁移）；
      // 按钮 data-idea-id 改用静态库 id，使 findIdeaById 命中（修 C2）。
      const hash = ideaIdOf(idea);
      const added = STATE.daily[date] && STATE.daily[date].tasks[hash] && STATE.daily[date].tasks[hash].fromIdea;
      return `<div class="idea-row-item" data-idea-id="${idea.id}">
        <span class="idea-title">${esc(view.title)}</span>
        <span class="idea-pts">+${view.pts}分</span>
        <button class="idea-set-btn" data-idea-id="${idea.id}" ${added ? 'disabled' : ''}>${added ? '已添加' : '设为今日任务'}</button>
        <button class="idea-edit-btn" data-idea-id="${idea.id}">修改</button>
      </div>`;
    }).join('');
    return `<div class="idea-cat"><div class="idea-cat-title">${esc(cat)}</div>${items}</div>`;
  }).join('');
  return sections;
}

// 绑定列表内「设为今日任务」/「修改」按钮（就地刷新后需重新绑定）
function bindIdeaList(ov){
  ov.querySelectorAll('.idea-set-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.ideaId;
      const idea = findIdeaById(id);
      if(!idea) return;
      if(!STATE.childName || !STATE.childName.trim()){ if(window.toast) window.toast('请先设置宝贝信息哦 👆'); return; }
      addIdeaAsTask(STATE.selDate, idea);
      btn.textContent = '已添加';
      btn.disabled = true;
      if(window.toast) window.toast('已加入今日任务，去勾勾看吧 🌱');
      if(typeof renderTasks === 'function') renderTasks();
    });
  });
  ov.querySelectorAll('.idea-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => { openIdeaEditModal(btn.dataset.ideaId); });
  });
}

/**
 * 打开任务灵感弹层（按 5 维度分组 + 顶部六胶囊 Tab），绑定「设为今日任务」/「修改」。
 * 复用统一弹层 openModal 单例（修 C3：不再自己叠遮罩）。
 */
export function renderIdeaLibrary(){
  const date = STATE.selDate;
  const builder = () => {
    const tabsHtml = IDEA_TABS.map(t =>
      `<button type="button" class="idea-tab${t === _activeIdeaTab ? ' active' : ''}" data-tab="${esc(t)}">${esc(t)}</button>`
    ).join('');
    return `<div class="modal-box" style="max-width:460px;max-height:85vh;overflow:auto">
      <h3>💡 任务灵感</h3>
      <p style="color:var(--muted);font-size:12px;margin-bottom:12px">不知道做什么？选一个小芽陪你挑一个当今日任务吧 🌱</p>
      <div class="idea-cat-tabs">${tabsHtml}</div>
      <div class="idea-list">${buildIdeaListHtml(date)}</div>
      <div style="margin-top:14px;text-align:center"><button class="btn-ghost" data-modal-close style="min-height:36px;padding:8px 28px">关闭</button></div>
    </div>`;
  };

  const onMount = (ov) => {
    // 胶囊 Tab 切换：更新选中态并就地重渲染列表（不重开弹层，避免单例不刷新）
    ov.querySelectorAll('.idea-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeIdeaTab = btn.dataset.tab;
        const listEl = ov.querySelector('.idea-list');
        if(listEl) listEl.innerHTML = buildIdeaListHtml(STATE.selDate);
        ov.querySelectorAll('.idea-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _activeIdeaTab));
        bindIdeaList(ov);
      });
    });
    bindIdeaList(ov);
  };

  // 复用统一弹层单例，相同 id 不会叠加
  openModal('idea-library', builder, { onMount });
}

/**
 * 打开单条灵感的「修改」弹框（复用 openModal 单例）。
 * 仅可改 title/pts；cat 只读冻结；保存写入主数据 customIdeas 覆盖默认、可「恢复默认」。
 * @param {string} id 静态库灵感 id
 * @returns {HTMLElement|null}
 */
export function openIdeaEditModal(id){
  const idea = findIdeaById(id);
  if(!idea) return null;
  const view = getIdeaView(idea);
  const modalId = 'idea-edit-' + id;
  const builder = () => {
    const ptsOpts = [1, 2, 3].map(p =>
      `<button type="button" class="pts-opt${view.pts === p ? ' active' : ''}" data-pts="${p}">${p}分</button>`
    ).join('');
    return `
    <div class="modal-box" style="max-width:400px;text-align:left">
      <h3 style="margin:0 0 10px;font-size:18px">✏️ 修改灵感</h3>
      <div style="display:flex;flex-direction:column;gap:12px">
        <label style="font-size:13px;font-weight:800;color:var(--leaf-dark)">标题
          <input id="ideaEditTitle" type="text" value="${esc(view.title)}" autocomplete="new-password" style="width:100%;margin-top:4px;padding:10px 12px;border-radius:10px;border:1.5px solid rgba(0,0,0,.15);font-size:14px;box-sizing:border-box;outline:none">
        </label>
        <div style="font-size:13px;font-weight:800;color:var(--leaf-dark)">分值（三选一）
          <div class="pts-options" role="radiogroup" aria-label="分值" style="margin-top:6px">${ptsOpts}</div>
        </div>
        <label style="font-size:13px;font-weight:800;color:var(--leaf-dark)">分类（不可修改）
          <input type="text" value="${esc(idea.cat)}" readonly disabled style="width:100%;margin-top:4px;padding:10px 12px;border-radius:10px;border:1.5px solid rgba(0,0,0,.12);background:rgba(0,0,0,.04);color:var(--muted);font-size:14px;box-sizing:border-box">
        </label>
        <div style="display:flex;gap:10px;margin-top:6px">
          <button class="btn-primary" id="ideaEditSave" style="flex:1">保存修改</button>
          <button class="btn-ghost" id="ideaEditReset" style="flex:1">恢复默认</button>
        </div>
      </div>
    </div>`;
  };
  const onMount = (ov) => {
    const saveBtn = ov.querySelector('#ideaEditSave');
    const resetBtn = ov.querySelector('#ideaEditReset');
    const ptsGroup = ov.querySelector('.pts-options');
    // 三选一：单选高亮
    if(ptsGroup){
      ptsGroup.querySelectorAll('.pts-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          ptsGroup.querySelectorAll('.pts-opt').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }
    if(saveBtn) saveBtn.addEventListener('click', () => {
      const title = ov.querySelector('#ideaEditTitle').value.trim();
      const active = ov.querySelector('.pts-opt.active');
      const pts = active ? Number(active.dataset.pts) : 1;
      if(!title){ if(window.toast) window.toast('标题不能为空哦'); return; }
      // 防御：仅允许 1/2/3
      if(pts !== 1 && pts !== 2 && pts !== 3){ if(window.toast) window.toast('请选择 1/2/3 分'); return; }
      saveCustomIdea(id, title, pts);
      closeModal(modalId);
      closeModal('idea-library');
      renderIdeaLibrary();
    });
    if(resetBtn) resetBtn.addEventListener('click', () => {
      resetCustomIdea(id);
      closeModal(modalId);
      closeModal('idea-library');
      renderIdeaLibrary();
    });
  };
  return openModal(modalId, builder, { onMount });
}

// 在 IDEA_LIBRARY 中按 id 查找（id 为静态库 id，如 'idea-l-study-poem'）
export function findIdeaById(id){
  for(const cat in IDEA_LIBRARY){
    const found = IDEA_LIBRARY[cat].find(x => x.id === id);
    if(found) return found;
  }
  return null;
}
