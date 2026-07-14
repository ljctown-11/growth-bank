// features/render.js — 所有渲染函数（匹配原始 CSS 结构）

import { STATE, setSelDate } from '../core/state.js';
import { TASKS, REWARDS, CATEGORIES, CAT_INTRO, fmtDisplay, esc, getMonthKey, getWeekKey, getTodayStr, DEFAULT_REWARD_ITEMS, enumerateSummerWeeks, getWeekMeta } from '../core/helpers.js';
import { getDay, saveData, calcTotalScore, calcDayScore } from '../core/data.js';
import { getMakeupCost, isToday, isFuture, isPastLocked, isPastWithNoCheckins, canCheckIn } from '../features/makeup.js';
import { showPasswordModal } from '../features/password.js';
import { openModal, closeModal } from './modal.js';
import { getMedia, removeMedia } from '../features/media.js';
import { showCenterToast } from './toast-center.js';
// 增量功能模块
import { countDayDone, pickGentleMessage } from './mood.js';
import { renderStreak, renderBadges, getStreak, morningGlorySVG, computeDimensionScores } from './growth-tree.js';
import { renderMascot } from './mascot.js';
import { playParentEncouragementOnCheckin } from './voice-encourage.js';
// 独立「成长树养成页面」模块
import { onTaskChecked, onTaskUnchecked, refreshGrowthTree } from './tree-garden/index.js';

// ===== 全局锁 =====
let _toggleLocked = false;

// ===== 获取活跃任务列表 =====
function getActiveTasks(){
  const all = [...(STATE.modifiedDefaultTasks||[]), ...(STATE.customTasks||[])];
  return all.length > 0 ? all : TASKS;
}

// ===== 获取活跃分类 =====
function getActiveCategories(){
  const allTasks = getActiveTasks();
  return [...new Set(allTasks.map(t => t.cat))];
}

// ===== 获取某档位奖励内容（用户自定义优先） =====
function getRewardItems(cost){
  const key = String(cost);
  // 优先从主数据中读取用户自定义奖励内容
  try{
    const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
    if(mainData.customRewards && mainData.customRewards[key] && Array.isArray(mainData.customRewards[key]) && mainData.customRewards[key].length > 0){
      return mainData.customRewards[key];
    }
  }catch(e){}
  // 回退到 STATE.customRewards
  if(STATE.customRewards && STATE.customRewards[key] && Array.isArray(STATE.customRewards[key]) && STATE.customRewards[key].length > 0){
    return STATE.customRewards[key];
  }
  // 回退到 REWARDS 默认
  const r = REWARDS.find(x => x.cost === cost);
  return r ? r.items : [`兑换${cost}分奖励`];
}

// ===== 获取所有奖励档位（用户自定义优先，缺失的档位回退到默认REWARDS） =====
function getRewardTiers(){
  let customRewards = null;
  // 优先从主数据读取
  try{
    customRewards = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}").customRewards || null;
  }catch(e){customRewards = null;}
  // 如果没有主数据，用 STATE
  if(!customRewards) customRewards = STATE.customRewards || null;

  const tiers = [];
  // 遍历默认REWARDS的所有档位
  for(const r of REWARDS){
    const cost = r.cost;
    let items = r.items;
    // 如果customRewards里有这个成本档位的自定义内容，用自定义的
    if(customRewards && customRewards[String(cost)] && Array.isArray(customRewards[String(cost)]) && customRewards[String(cost)].length > 0){
      items = customRewards[String(cost)];
    }
    // 如果自定义 items 为空且 default items 存在，用 default items
    if(!items || items.length === 0){
      items = DEFAULT_REWARD_ITEMS[cost] || [`兑换${cost}分奖励`];
    }
    tiers.push({cost, title: r.title || `${cost}分奖励`, items});
  }

  // 此外，如果customRewards中有REWARDS未覆盖的成本档位，也加进去
  if(customRewards){
    const defaultCosts = new Set(REWARDS.map(r => String(r.cost)));
    for(const [costStr, items] of Object.entries(customRewards)){
      if(defaultCosts.has(costStr)) continue; // 已覆盖的跳过
      if(Array.isArray(items) && items.length > 0){
        const numCost = parseInt(costStr);
        if(!isNaN(numCost) && numCost > 0){
          tiers.push({cost: numCost, title: numCost + '分奖励', items});
        }
      }
    }
  }

  tiers.sort((a,b) => a.cost - b.cost);
  return tiers;
}

// ===== 获取奖励层级名称 =====
function getRewardLevel(cost){
  if(cost <= 15) return "初级";
  if(cost <= 30) return "中级";
  if(cost <= 60) return "高级";
  return "顶级";
}

// ===== renderAll =====
export function renderAll(){
  renderCalendar();
  renderDateLabel();
  renderCheckinDateLabel();
  renderBabyName();
  renderTasks();
  renderCheckinExtras();
  renderMap();
  renderTrendChart();
  renderRewards();
  renderRedemptions();
  renderWeekTable();
  renderMoodTrend();
  renderArchive();
  renderPoints();
  // 成长树 / Streak / 徽章（随 child 隔离，实时重算）
  // 注：首页藤蔓 renderGrowthVine 已迁移为独立「成长树」养成页面（见 features/tree-garden）
  renderStreak();
  renderBadges();
  // 若成长树 tab 当前可见则静默刷新（不可见时跳过，避免无谓重渲染）
  refreshGrowthTree();
}

// ===== 日期标签（跟随 STATE.selDate） =====
export function renderDateLabel(){
  const el = document.getElementById("selectedDateLabel");
  if(!el) return;
  const [y,m,d] = STATE.selDate.split("-").map(Number);
  el.textContent = fmtDisplay(new Date(y, m-1, d));
}

export function renderCheckinDateLabel(){
  const el1 = document.getElementById("checkinDateLabel");
  const el2 = document.getElementById("checkinDateBadge");
  if(!el1) return;
  const [y,m,d] = STATE.selDate.split("-").map(Number);
  el1.textContent = fmtDisplay(new Date(y, m-1, d));
  el2.style.display = isToday(STATE.selDate) ? "" : "none";
}

// ===== 宝贝名称 =====
export function renderBabyName(){
  const el = document.getElementById("babyName");
  if(!el) return;
  const name = STATE.childName || "宝贝";
  const gender = STATE.childGender || "girl";
  el.innerHTML = `${gender==="boy"?"👦":"👧"} ${esc(name)}`;
}

// ===== 积分显示 =====
export function renderPoints(){
  const total = calcTotalScore();
  const el = document.getElementById("topPoints");
  if(el) el.textContent = total;
  // 同步顶部连续打卡徽标
  renderStreak();
}

// ===== 打卡 Tab 附加区：心情行 / 灵感按钮 / 温柔空状态卡 =====
export function renderCheckinExtras(){
  const nameEmpty = !STATE.childName || !STATE.childName.trim();
  const day = STATE.daily[STATE.selDate];

  // 心情行
  const moodRow = document.getElementById("moodRow");
  if(moodRow){
    const cur = (day && day.mood) || '';
    moodRow.querySelectorAll(".mood-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.mood === cur);
      b.disabled = nameEmpty;
    });
    const noteEl = document.getElementById("moodNote");
    if(noteEl){
      noteEl.value = (day && day.moodNote) || '';
      noteEl.disabled = nameEmpty;
    }
  }

  // 灵感按钮
  const ideaBtn = document.getElementById("ideaBtn");
  if(ideaBtn) ideaBtn.disabled = nameEmpty;

  // 任务灵感引导卡（B6）：仅「今天」显示；选中过去日期（出现补卡横幅）时隐藏
  const ideaCard = document.getElementById("ideaPromptCard");
  if(ideaCard) ideaCard.style.display = isToday(STATE.selDate) ? "" : "none";

  // 温柔空状态卡（仅今天且 0 打卡时显示，带吉祥物）
  const zc = document.getElementById("zeroCheckinCard");
  if(zc){
    const today = getTodayStr();
    const showCard = STATE.selDate === today && countDayDone(today) === 0 && !nameEmpty;
    if(showCard){
      zc.style.display = "";
      zc.innerHTML = `<div class="zero-card">
        <div class="zero-mascot">${renderMascot("empty", { size: 80 })}</div>
        <div class="zero-text">今天还没开始也没关系，选一个小任务试试看？🌱</div>
      </div>`;
    } else {
      zc.style.display = "none";
      zc.innerHTML = "";
    }
  }
}

// ===== 复盘 Tab：本周情绪趋势 =====
export function renderMoodTrend(){
  const el = document.getElementById("moodTrend");
  if(!el) return;
  const wk = getWeekKey(getTodayStr());
  const counts = { happy: 0, neutral: 0, sad: 0 };
  for(const ds in STATE.daily){
    if(getWeekKey(ds) === wk){
      const m = STATE.daily[ds] && STATE.daily[ds].mood;
      if(m && counts[m] !== undefined) counts[m]++;
    }
  }
  const total = counts.happy + counts.neutral + counts.sad;
  if(total === 0){
    el.innerHTML = `<div class="mood-trend-empty">这周还没记录心情哦，打卡时顺手选一个吧 🌱</div>`;
    return;
  }
  const happyMost = counts.happy >= counts.sad;
  el.innerHTML = `<div class="mood-trend-title">😊 本周心情</div>
    <div class="mood-trend-bar">
      <span class="mt happy">😊×${counts.happy}</span>
      <span class="mt neutral">😐×${counts.neutral}</span>
      <span class="mt sad">😢×${counts.sad}</span>
    </div>
    <div class="mood-trend-note">${happyMost ? '这周你大多数时候都很开心呀🌞' : '这周有点小低落，抱抱你🌿'}</div>`;
}

// ===== 日历 =====
export function renderCalendar(){
  const now = new Date();
  // 防御性校验：防止 STATE.curCalYear 或 STATE.curCalMonth 为 NaN 导致日历崩溃
  let calYear = (STATE.curCalYear != null && !isNaN(STATE.curCalYear)) ? STATE.curCalYear : now.getFullYear();
  let calMonth = (STATE.curCalMonth != null && !isNaN(STATE.curCalMonth)) ? (STATE.curCalMonth + 1) : (now.getMonth() + 1);
  if(calMonth < 1) calMonth = 1;
  if(calMonth > 12) calMonth = 12;

  document.getElementById("calMonthLabel").textContent = calYear + "年" + calMonth + "月";

  // 控制日历页面的"今天"标签显示/隐藏
  const dateBadge = document.getElementById("dateBadge");
  if(dateBadge) dateBadge.style.display = isToday(STATE.selDate) ? "" : "none";

  const g = document.getElementById("calGrid");
  if(!g) return;

  const firstDay = new Date(calYear, calMonth-1, 1);
  let lastDate = new Date(calYear, calMonth, 0).getDate();
  // 防御性校验：防止 lastDate 异常
  if(!lastDate || isNaN(lastDate) || lastDate < 1) lastDate = 28;
  const startDow = (firstDay.getDay()+6)%7;

  let h = '';
  for(let i=0; i<7; i++) h += `<div class="cal-day-header${i>=5?' weekend':''}">${"一二三四五六日"[i]}</div>`;
  for(let i=0; i<startDow; i++) h += '<div class="cal-cell"></div>';
  for(let d=1; d<=lastDate; d++){
    const ds = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const score = calcDayScore(ds);
    let cls = "cal-cell";
    if(isFuture(ds)) cls += " future";
    else if(isPastLocked(ds)) cls += " past-locked";
    else if(isPastWithNoCheckins(ds)) cls += " past-nocheck";
    if(score>0) cls += " has-pts";
    if(isToday(ds)) cls += " today";
    if(ds === STATE.selDate) cls += " active";
    h += `<div class="${cls}" data-date="${ds}"><span class="day-num">${d}</span>${score>0?`<span class="day-pts">+${score}</span>`:''}</div>`;
  }

  g.innerHTML = h;

  g.querySelectorAll(".cal-cell[data-date]").forEach(c => {
    c.addEventListener("click", () => {
      const ds = c.dataset.date;
      if(isFuture(ds)){ toast("还不能打卡未来日期哦"); return; }
      setSelDate(ds);
      switchMainTab("checkin");
      renderAll();
    });
  });

  const prevBtn = document.getElementById("calPrev");
  const nextBtn = document.getElementById("calNext");
  const todayBtn = document.getElementById("calToday");

  if(prevBtn){
    prevBtn.disabled = calMonth <= 7;
    prevBtn.onclick = () => {
      if(calMonth <= 7) return;
      STATE.curCalMonth = calMonth - 2;
      if(STATE.curCalMonth < 0){
        STATE.curCalMonth = 11;
        STATE.curCalYear = calYear - 1;
      }
      renderCalendar();
    };
  }
  if(nextBtn){
    nextBtn.disabled = calMonth >= 8;
    nextBtn.onclick = () => {
      if(calMonth >= 8) return;
      STATE.curCalMonth = calMonth;
      if(STATE.curCalMonth > 11){
        STATE.curCalMonth = 0;
        STATE.curCalYear = calYear + 1;
      }
      renderCalendar();
    };
  }
  if(todayBtn){
    todayBtn.onclick = () => {
      STATE.curCalMonth = new Date().getMonth();
      STATE.curCalYear = new Date().getFullYear();
      renderCalendar();
    };
  }
}

// ===== 切换主tab =====
function switchMainTab(tab){
  document.querySelectorAll("#mainTabNav button").forEach(b => {
    b.classList.toggle("active", b.dataset.maintab === tab);
  });
  document.querySelectorAll(".main-tab-content").forEach(x => {
    x.style.display = x.id === "mtab-" + tab ? "" : "none";
  });
}

// ===== 切换到指定分类（保存宝宝后回「学习力」） =====
export function switchToCategory(cat){
  if(cat) STATE.selCat = cat;
  // 切回打卡主 tab 并高亮
  document.querySelectorAll("#mainTabNav button").forEach(b => {
    b.classList.toggle("active", b.dataset.maintab === "checkin");
  });
  document.querySelectorAll(".main-tab-content").forEach(x => {
    x.style.display = x.id === "mtab-checkin" ? "" : "none";
  });
  renderCheckinDateLabel();
  renderTasks();
  renderMap();
}

// ===== 分类标签 =====
function renderCatTabs(){
  const tabs = document.getElementById("catTabs");
  if(!tabs) return;
  const names = [...getActiveCategories(), "全部"];
  tabs.innerHTML = names.map(n =>
    `<button class="${STATE.selCat===n?'active':''}" data-cat="${n}">${n}</button>`
  ).join("");
  tabs.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      STATE.selCat = b.dataset.cat;
      renderTasks();
      renderMap();
    });
  });
}

// ===== 可渲染任务列表（合并灵感库 fromIdea 项）=====
function getRenderableTasks(day){
  const all = getActiveTasks();
  const vis = all
    .filter(t => STATE.selCat === "全部" || t.cat === STATE.selCat)
    .map(t => ({
      id: t.id, title: t.title, pts: t.pts, cat: t.cat,
      fromIdea: false, done: !!(day.tasks[t.id] && day.tasks[t.id].done),
    }));
  // 合并灵感库任务（day.tasks 中 fromIdea:true 的项）
  for(const tid in day.tasks){
    const te = day.tasks[tid];
    if(te && te.fromIdea && (STATE.selCat === "全部" || te.cat === STATE.selCat)){
      if(!vis.find(v => v.id === tid)){
        vis.push({
          id: tid, title: te.title, pts: te.pts, cat: te.cat,
          fromIdea: true, done: !!te.done,
        });
      }
    }
  }
  return vis;
}

// 渲染任务网格（含 fromIdea 项）并绑定 toggle
function renderTaskGrid(taskGrid, day){
  const vis = getRenderableTasks(day);
  const nameEmpty = !STATE.childName || !STATE.childName.trim();
  taskGrid.innerHTML = vis.map(t => {
    const done = t.done;
    return `<label class="task-row${done?' done':''}${nameEmpty?' name-empty-disabled':''}${t.fromIdea?' from-idea':''}">
      <input type="checkbox" data-tid="${esc(t.id)}" ${done?'checked':''} ${nameEmpty?'disabled':''}>
      <span><strong>${esc(t.title)}</strong><span class="tag">${esc(t.cat)}</span>${t.fromIdea?'<span class="idea-tag">🌟灵感</span>':''}</span>
      <span class="pts"><span class="coin" style="width:20px;height:20px;font-size:10px">分</span>+${t.pts}</span>
    </label>`;
  }).join("");
  taskGrid.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", async e => await toggleTask(e.target.dataset.tid, e.target.checked, e));
  });
  // 同步心情行 / 灵感按钮 / 温柔空状态卡
  renderCheckinExtras();
}

// ===== 任务列表（跟随 STATE.selDate，区分打卡/补卡模式） =====
export function renderTasks(){
  const can = canCheckIn(STATE.selDate);
  const taskGrid = document.getElementById("taskGrid");
  const taskLocked = document.getElementById("taskLocked");
  const catTabs = document.getElementById("catTabs");
  const banner = document.getElementById("makeupBanner");

  if(!can){
    // 判断是否为过去无打卡日期（可能补卡）
    const isMakeupEligible = isPastWithNoCheckins(STATE.selDate);
    if(!isMakeupEligible){
      // 完全不可打卡
      taskGrid.style.display = "none";
      catTabs.style.display = "none";
      if(banner) banner.style.display = "none";
      if(taskLocked){
        taskLocked.style.display = "";
        const mc = getMakeupCost(STATE.selDate);
        taskLocked.textContent = "📌 " + (mc.reason || "该日期不可打卡") + "。选择日历中可点击的日期吧。";
      }
      return;
    }

    // 过去无打卡日期（补卡模式）：显示任务列表 + 补卡横幅
    taskGrid.style.display = "";
    catTabs.style.display = "";
    if(taskLocked) taskLocked.style.display = "none";

    const mc = getMakeupCost(STATE.selDate);
    if(mc.allowed){
      if(banner){
        banner.style.display = "";
        const mk = getMonthKey(STATE.selDate);
        const used = STATE.makeupUsed[mk] || 0;
        const willUse = used + 1;
        let costLabel = mc.cost === 0 ? '免费' : `扣除 <b>${mc.cost}分</b>`;
        banner.innerHTML = `
          <div style="padding:10px 14px;background:rgba(255,193,7,.18);border:1px dashed rgba(255,193,7,.5);border-radius:10px;margin-bottom:10px;font-size:13px;color:#c44d2a;font-weight:700">
            📌 <b>该日期可补卡</b> · ${costLabel} · 本月第 <b>${willUse}</b>/4 次<br>
            <span style="font-size:11px;color:#b36b1c;font-weight:400">💡 补卡规则：每月4次 · 前2次免费 · 第3次扣10分 · 第4次扣20分 · 补卡积分计入总分</span>
          </div>`;
      }
    } else {
      taskGrid.style.display = "none";
      catTabs.style.display = "none";
      if(banner) banner.style.display = "none";
      if(taskLocked){
        taskLocked.style.display = "";
        taskLocked.textContent = "📌 " + (mc.reason || "该日期不可打卡") + "。选择日历中可点击的日期吧。";
      }
      return;
    }

    renderCatTabs();
    const day = getDay(STATE.selDate);
    renderTaskGrid(taskGrid, day);
    return;
  }

  // 正常打卡模式
  taskGrid.style.display = "";
  catTabs.style.display = "";
  if(taskLocked) taskLocked.style.display = "none";
  if(banner) banner.style.display = "none";

  renderCatTabs();
  const day = getDay(STATE.selDate);
  renderTaskGrid(taskGrid, day);
}

// ===== Toggle task =====
export async function toggleTask(tid, checked, event){
  if(_toggleLocked){ toast("操作过快，请稍后再试"); return; }
  // 前置校验：必须有宝贝信息
  if(!STATE.childName || !STATE.childName.trim()){
    showEncourageMsg("请先设置宝贝信息哦 👆");
    // 阻止默认行为 + 回退勾选状态
    if(event && event.target){
      event.preventDefault();
      event.target.checked = !checked;
    }
    return;
  }
  if(!canCheckIn(STATE.selDate) && !isPastWithNoCheckins(STATE.selDate)) return;
  // ✅ 回退：灵感任务（fromIdea）写入 day.tasks[ideaId]，不在 getActiveTasks() 中，
  // 需在 getDay().tasks[tid] 中回退取 pts/cat，否则永远无法勾选/取消，且不计入总分（PRD P0-3 验收②）
  const t = getActiveTasks().find(x => x.id === tid) || getDay(STATE.selDate).tasks[tid];
  if(!t) return;
  const day = getDay(STATE.selDate);

  // 补卡处理：过去日期首次完成任务时验证补卡次数
  if(!isToday(STATE.selDate) && checked && !day.tasks[tid]?.done){
    if(!STATE.makeupVerifiedDates || !STATE.makeupVerifiedDates[STATE.selDate]){
      const mc = getMakeupCost(STATE.selDate);
      if(!mc.allowed){
        toast(mc.reason || "该日期不可补卡");
        if(event && event.target) event.target.checked = false;
        return;
      }
      // 余额校验：补卡扣分不能超过当前总分
      if(mc.cost > 0){
        const currentScore = calcTotalScore();
        if(currentScore < mc.cost){
          showCenterToast('warn', '成长分不足，还差 ' + (mc.cost - currentScore) + ' 分才能补卡');
          if(event && event.target) event.target.checked = false;
          return;
        }
      }
      const mk = getMonthKey(STATE.selDate);
      STATE.makeupUsed[mk] = (STATE.makeupUsed[mk] || 0) + 1;
      if(mc.cost > 0){
        _toggleLocked = true;
        if(event && event.target) event.target.checked = false;
        const ok = await showPasswordModal(`补卡需扣除 <b>${mc.cost}</b> 分，请输入家长密码确认`, () => {});
        if(!ok){
          // 密码取消，回退次数
          STATE.makeupUsed[mk] = Math.max(0, STATE.makeupUsed[mk] - 1);
          _toggleLocked = false;
          renderAll();
          return;
        }
        _toggleLocked = true;
        if(event && event.target) event.target.checked = true;
        _toggleLocked = false;
      }
      if(mc.cost > 0){
      STATE.redemptions.unshift({
        date: new Date().toLocaleDateString("zh-CN"),
        makeupDate: STATE.selDate,
        reward: "补卡扣分",
        level: "补卡",
        cost: mc.cost
      });
      }
      if(!STATE.makeupVerifiedDates) STATE.makeupVerifiedDates = {};
      STATE.makeupVerifiedDates[STATE.selDate] = true;
    }
  }

  if(!day.tasks[tid]) day.tasks[tid] = {done: false, pts: t.pts, cat: t.cat};
  if(checked && !day.tasks[tid].done){
    day.tasks[tid].done = true;
    day.score = calcDayScore(STATE.selDate);
    saveData();
    // ✅ 同步给「成长树」独立水量池：任务努力水 + 连续打卡里程碑水（与总分解耦）
    try { onTaskChecked(tid, STATE.selDate); } catch(e) { console.error("onTaskChecked failed", e); }

    // ✅ 打卡完成后实时更新成长档案的关联任务下拉
    if(typeof window.renderWorksDropdown === 'function') window.renderWorksDropdown();

    // ✅ 优先播家长录音（非阻塞，不挡烟花）；有录音则机器女声让位
    const played = playParentEncouragementOnCheckin(STATE.activeChildId);
    // ✅ 触发鼓励话 + 烟花效果（有录音时静音机器女声，避免双重声音）
    triggerEncourageAndFirework(played ? { silent: true } : undefined);
    toast("太棒了！成长能量已存入 🌟");
  } else if(!checked && day.tasks[tid].done){
    day.tasks[tid].done = false;
    day.score = calcDayScore(STATE.selDate);
    if(!isToday(STATE.selDate) && STATE.makeupVerifiedDates && STATE.makeupVerifiedDates[STATE.selDate]){
      // 判定当天是否还有其他勾选任务（"全空才返还"）
      const stillHas = Object.values(day.tasks).some(t => t && t.done);
      if(!stillHas){
        // 找该日补卡扣分记录，取其金额用于反馈，再按 makeupDate 精确删除
        const rec = STATE.redemptions.find(r => r.level === "补卡" && r.makeupDate === STATE.selDate);
        const returned = rec ? (rec.cost || 0) : 0;
        STATE.redemptions = STATE.redemptions.filter(r => !(r.level === "补卡" && r.makeupDate === STATE.selDate));
        delete STATE.makeupVerifiedDates[STATE.selDate];
        const mk = getMonthKey(STATE.selDate);
        STATE.makeupUsed[mk] = Math.max(0, (STATE.makeupUsed[mk] || 0) - 1);
        if(returned > 0) toast(`已返还 ${returned} 分，补卡次数 -1`);
      }
      // 否则：当天仍有勾选任务 → 保留扣分记录与补卡标记、不回退次数
    }
    // ✅ 取消勾选 → 温柔话术（不破坏既有勾选/扣分/补卡逻辑）
    showEncourageMsg(pickGentleMessage('uncheck', { streak: getStreak() }));
    saveData();
    // ✅ 取消勾选 → 收回当天努力水（D2：仅今天生效，已浇到树上的不倒回）
    try { onTaskUnchecked(tid, STATE.selDate); } catch(e) { /* 静默回退 */ }
  }
  renderAll();
}

// ===== 鼓励话 + 烟花效果 =====
const _ENCOURAGES = [
  "你今天真了不起！🌟",
  "太棒了，继续保持！🎉",
  "小小的坚持，大大的成长！💪",
  "今天的你真闪亮！✨",
  "每一步都算数，为你骄傲！❤️",
  "加油呀，你超棒的！🚀",
  "今天的努力，未来的礼物！🎁",
  "哇！又完成一项任务！🎊",
  "成长路上，你从不掉队！🌈",
  "今天的你，比昨天更好！🌻"
];

function triggerEncourageAndFirework(opts){
  // 1. 随机鼓励话（屏幕中心）+ 成功吉祥物（T03：成功路径传成功标识）
  showEncourageMsg(undefined, { ...(opts || {}), mascotType: 'success' });
  // 2. 烟花效果
  triggerFireworks();
}

export function showEncourageMsg(customMsg, opts){
  // 移除旧弹窗
  const old = document.querySelector(".encourage-msg");
  if(old) old.remove();

  const msg = customMsg || _ENCOURAGES[Math.floor(Math.random() * _ENCOURAGES.length)];
  // 清理表情符号后用于语音朗读
  const cleanMsg = msg.replace(/[🌟🎉💪✨❤️🚀🎁🎊🌈🌻]/g, '');

  const el = document.createElement("div");
  el.className = "encourage-msg";
  el.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
    z-index:9998; pointer-events:none;
    animation: encourageIn .5s ease forwards;
  `;
  // T03：按 opts.mascotType 挂载吉祥物（成功→success、鼓励→encourage）；默认不挂载，保持旧行为
  let mascotHtml = '';
  if(opts && opts.mascotType === 'success'){
    mascotHtml = `<div class="encourage-mascot">${renderMascot('success')}</div>`;
  } else if(opts && opts.mascotType === 'encourage'){
    mascotHtml = `<div class="encourage-mascot">${renderMascot('encourage')}</div>`;
  }
  el.innerHTML = `
    ${mascotHtml}
    <div style="
      background:linear-gradient(135deg,rgba(255,236,210,.98),rgba(255,210,180,.98));
      padding:20px 36px; border-radius:24px;
      font-size:24px; font-weight:900; color:#c44d2a;
      box-shadow:0 8px 32px rgba(255,152,0,.35);
      text-align:center; line-height:1.4;
      border:2px solid rgba(255,152,0,.3);
      max-width:85vw;
    ">${msg}</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = "encourageOut .4s ease forwards";
    setTimeout(() => el.remove(), 400);
  }, 1800);

  // 🎤 语音朗读（silent 时不播机器女声，让位给家长录音）
  if(!(opts && opts.silent)) speakEncourage(cleanMsg);
}

// ===== 语音朗读鼓励话 =====
let _speechUtterance = null;
function speakEncourage(text){
  if(!('speechSynthesis' in window)) return;
  // 停止之前正在播放的语音
  if(window.speechSynthesis.speaking){
    window.speechSynthesis.cancel();
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 1.0;
  utter.pitch = 1.1;
  _speechUtterance = utter; // 先赋值，确保 applyVoice 不会提前返回

  // 语音加载可能延迟，尝试选择中文女声
  function applyVoice(){
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh') && v.name.toLowerCase().includes('female'))
                || voices.find(v => v.lang.startsWith('zh'));
    if(zhVoice) utter.voice = zhVoice;
    if(!_speechUtterance) return; // 已被新语音取代
    window.speechSynthesis.speak(utter);
  }

  if(window.speechSynthesis.getVoices().length > 0){
    applyVoice();
  } else {
    // 语音列表尚未加载，等待加载完成
    if('onvoiceschanged' in window.speechSynthesis){
      window.speechSynthesis.onvoiceschanged = applyVoice;
    } else {
      // 兼容性回退：延迟后再试
      setTimeout(applyVoice, 100);
    }
  }
}

function triggerFireworks(){
  // 清除旧的烟花
  const old = document.querySelector(".firework-layer");
  if(old) old.remove();

  const layer = document.createElement("div");
  layer.className = "firework-layer";
  layer.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    pointer-events:none; z-index:9997; overflow:hidden;
  `;
  document.body.appendChild(layer);

  const colors = ["#FFD54F","#FF7043","#AB47BC","#26C6DA","#66BB6A","#EF5350","#FFA726","#7E57C2"];
  const totalSparks = 60;
  for(let i = 0; i < totalSparks; i++){
    const spark = document.createElement("div");
    spark.style.cssText = `
      position:absolute;
      width:${4+Math.random()*6}px; height:${4+Math.random()*6}px;
      border-radius:50%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:50%; top:50%;
      opacity:0;
      box-shadow:0 0 12px currentColor;
    `;
    layer.appendChild(spark);

    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 250;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const delay = Math.random() * 300;
    const dur = 700 + Math.random() * 500;
    const size = spark.style.width;

    setTimeout(() => {
      spark.style.transition = `all ${dur}ms cubic-bezier(.2,.8,.3,1)`;
      spark.style.left = `calc(50% + ${dx}px)`;
      spark.style.top = `calc(50% + ${dy}px)`;
      spark.style.opacity = "1";
      spark.style.transform = `scale(0.3)`;
      spark.style.width = size;
      spark.style.height = spark.style.height;
      setTimeout(() => {
        spark.style.opacity = "0";
        spark.style.transform = "scale(1.5)";
      }, dur * 0.6);
    }, delay);
  }

  setTimeout(() => layer.remove(), 2000);
}

// ===== 成长地图（跟随 STATE.selDate） =====
export function renderMap(){
  ensureCollapseBinding();
  applyCollapseState();
  const day = getDay(STATE.selDate);
  const g = document.getElementById("mapGrid");
  if(!g) return;
  const allTasks = getActiveTasks();
  const activeCats = getActiveCategories();

  g.innerHTML = activeCats.map((cat, i) => {
    const catTasks = allTasks.filter(t => t.cat === cat);
    let pts = 0, doneCount = 0;
    catTasks.forEach(t => {
      if(day.tasks[t.id] && day.tasks[t.id].done){ pts += t.pts; doneCount++; }
    });
    const flowers = pts > 0 ? '🌸'.repeat(Math.min(pts, 15)) : '<span class="empty-flower">🌸🌸🌸</span>';
    return `<div class="map-card${pts>0?' has-score':''}">
      <div class="map-num">${i+1}</div>
      <strong>${cat}</strong>
      <small>${CAT_INTRO[cat]||''} (${doneCount}/${catTasks.length})</small>
      <div class="flowers">${flowers}</div>
    </div>`;
  }).join("");
}

// ===== 本月积分趋势 =====
export function renderTrendChart(){
  ensureCollapseBinding();
  applyCollapseState();
  const chart = document.getElementById("trendChart");
  const labels = document.getElementById("trendLabels");
  if(!chart || !labels) return;

  // 使用日历当前显示的月份
  const now = new Date();
  let calYear = STATE.curCalYear != null ? STATE.curCalYear : now.getFullYear();
  let calMonth = STATE.curCalMonth != null ? STATE.curCalMonth + 1 : now.getMonth() + 1;

  const lastDate = new Date(calYear, calMonth, 0).getDate();
  const dailyPts = [];
  for(let d=1; d<=lastDate; d++){
    const ds = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    dailyPts.push(calcDayScore(ds));
  }

  const maxPts = Math.max(1, ...dailyPts);
  const today = new Date().getDate();

  chart.innerHTML = dailyPts.map((pts, i) => {
    const dayNum = i + 1;
    const pct = Math.round(pts / maxPts * 100);
    const isFuture = dayNum > today;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0">
      <div style="font-size:9px;font-weight:900;color:${pts>0?'var(--leaf-dark)':'var(--muted)'}">${pts}</div>
      <div style="width:100%;height:${Math.max(4, pct*0.8)}px;background:${pts>0 && !isFuture?'linear-gradient(180deg,var(--leaf),var(--rose))':isFuture?'rgba(0,0,0,.04)':'rgba(0,0,0,.08)'};border-radius:3px 3px 0 0;transition:height .4s"></div>
    </div>`;
  }).join("");

  let labelHtml = "";
  for(let i=0; i<dailyPts.length; i++){
    labelHtml += `<div style="flex:1;text-align:center;font-size:9px;color:${(i+1)===today?'var(--leaf-dark)':'var(--muted)'};font-weight:${(i+1)===today?'900':'400'}">${i+1}</div>`;
  }
  labels.innerHTML = labelHtml;
}

// ===== 奖励兑换 =====
export function renderRewards(){
  const total = calcTotalScore();
  const g = document.getElementById("rewardGrid");
  if(!g) return;

  const tiers = getRewardTiers();

  g.innerHTML = tiers.map(r => {
    const cost = r.cost;
    const can = total >= cost;
    // 必须有 items 才能渲染兑换选项；如果缺 items（默认REWARDS），用DEFAULT_REWARD_ITEMS
    let items = r.items;
    if(!items || items.length === 0){
      items = DEFAULT_REWARD_ITEMS[cost] || [`兑换${cost}分奖励`];
    }
    const rowsHtml = items.map((it, idx) => {
      const rid = `ri_${cost}_${idx}`;
      return `<label class="reward-item-row" for="${rid}">
        <input type="radio" name="ri_${cost}" id="${rid}" value="${esc(it)}" ${!can?'disabled':''}>
        <span>${esc(it)}</span>
      </label>`;
    }).join("");
    return `<div class="reward-card" data-card-cost="${cost}">
      <div class="reward-level"><h3>${r.title || `${cost}分奖励`}</h3><span class="points-pill" style="font-size:13px"><span class="coin" style="width:22px;height:22px;font-size:10px">分</span>${cost}</span></div>
      <div class="reward-items">${rowsHtml}</div>
      <details class="reward-editor"><summary>修改奖励内容</summary>
        <div class="reward-editor-body">
          <textarea data-red-edit="${cost}" placeholder="每行一个奖励" autocomplete="new-password">${items.join("\n")}</textarea>
          <button class="secondary-btn" data-save-red="${cost}">保存修改</button>
        </div>
      </details>
      <button class="${can?'redeem-btn':'disabled-btn'}" data-redeem="${cost}" ${can?'':'disabled'}>${can?'兑换所选奖励':'还差 ' + (cost - total) + ' 分'}</button>
    </div>`;
  }).join("");

  // highlight selected row
  g.querySelectorAll(".reward-item-row input[type=radio]").forEach(inp => {
    inp.addEventListener("change", () => {
      const cost = inp.name.replace("ri_", "");
      g.querySelectorAll(`[data-card-cost="${cost}"] .reward-item-row`).forEach(row => row.classList.remove("selected"));
      if(inp.checked) inp.closest(".reward-item-row").classList.add("selected");
    });
  });

  // save edited items
  g.querySelectorAll("[data-save-red]").forEach(b => b.addEventListener("click", () => {
    const c = b.dataset.saveRed;
    const ta = g.querySelector(`[data-red-edit="${c}"]`);
    const items = ta.value.split("\n").map(s => s.trim()).filter(Boolean);
    if(!items.length){ toast("至少写一条奖励内容"); return; }
    showPasswordModal("修改奖励内容需要家长密码验证", async () => {
      // 保存到主 localStorage（所有孩子共享）
      try{
        const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
        if(!mainData.customRewards) mainData.customRewards = {};
        mainData.customRewards[String(c)] = items;
        localStorage.setItem("summerGrowthBankV2", JSON.stringify(mainData));
      }catch(e){}
      // 同步到 STATE
      if(!STATE.customRewards) STATE.customRewards = {};
      STATE.customRewards[String(c)] = items;
      saveData();
      toast("奖励内容已保存 ✅");
      renderRewards();
    });
  }));

  // redeem button
  g.querySelectorAll("[data-redeem]").forEach(b => b.addEventListener("click", async () => {
    await redeemReward(Number(b.dataset.redeem));
  }));
}

export async function redeemReward(cost){
  // 前置校验：必须有宝贝信息
  if(!STATE.childName || !STATE.childName.trim()){
    toast("请先设置宝贝信息哦 👆");
    return;
  }
  const total = calcTotalScore();
  if(total < cost){ toast(`还差 ${cost-total} 分才能兑换这个奖励哦`); return; }

  const checked = document.querySelector(`input[name="ri_${cost}"]:checked`);
  if(!checked){ toast("请先选择一项具体奖励再兑换哦 👆"); return; }
  const itemName = checked.value;
  const reward = REWARDS.find(r => r.cost === cost) || {title: getRewardLevel(cost)};

  // 兑换需家长密码验证
  const ok = await showPasswordModal(`确定用 <b>${cost}</b> 分兑换「<b>${esc(itemName)}</b>」吗？兑换后将从成长账户中扣除对应积分。`, () => {});
  if(!ok) return;

  STATE.redemptions.unshift({
    date: new Date().toLocaleDateString("zh-CN"),
    reward: itemName,
    level: reward.title,
    cost: cost
  });

  saveData();
  toast("🎉 奖励已兑换！请和孩子一起庆祝这份努力。");
  renderAll();
}

// ===== 兑换记录 =====
export function renderRedemptions(){
  const l = document.getElementById("redemptionList");
  if(!l) return;
  if(!STATE.redemptions || STATE.redemptions.length === 0){
    l.innerHTML = '<div style="color:#a5b0aa;padding:8px;font-size:12px">还没有兑换记录。</div>';
    return;
  }
  l.innerHTML = STATE.redemptions.map(r =>
    `<div class="redemption-item">
      <span>
        <span class="red-date">${esc(r.date)}</span>
        <strong style="display:block;font-size:13px;margin-top:1px">${esc(r.reward)}</strong>
        <span style="font-size:11px;color:var(--muted)">${esc(r.level||'')}</span>
      </span>
      <span class="red-cost">-${r.cost}分</span>
    </div>`
  ).join("");
}

// ===== 复盘时间线 =====
export function renderReviewTimeline(){
  const tl = document.getElementById("reviewTimeline");
  if(!tl) return;
  if(!STATE.reviews || STATE.reviews.length === 0){
    tl.innerHTML = '<div class="empty-state">还没有复盘记录。</div>';
    return;
  }
  tl.innerHTML = STATE.reviews.map((r, idx) => {
    const dateStr = r.date || "未记录";
    const preview = r.best ? r.best.slice(0, 40) + (r.best.length > 40 ? '...' : '') : (r.next || r.hard || r.parent || r.support || "未填写内容").slice(0, 40);
    return `<div class="timeline-item review-item" data-review-idx="${idx}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <time>${esc(dateStr)}</time>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="review-edit-btn" data-review-edit="${idx}" style="padding:3px 8px;border-radius:6px;border:none;background:rgba(41,182,246,.12);color:#1565c0;font-size:11px;font-weight:800;cursor:pointer;transition:.15s">编辑</button>
          <span style="font-size:11px;color:var(--muted)">查看详情</span>
        </div>
      </div>
      <strong>${esc(preview)}</strong>
    </div>`;
  }).join("");

  // 点击复盘查看详情
  tl.querySelectorAll(".review-item").forEach(el => {
    el.addEventListener("click", (e) => {
      // 如果点击的是编辑按钮，不触发详情
      if(e.target.classList.contains("review-edit-btn")) return;
      const idx = parseInt(el.dataset.reviewIdx);
      const r = STATE.reviews[idx];
      if(!r) return;
      openReviewDetail(r);
    });
  });

  // 编辑按钮：将内容回填到表单
  tl.querySelectorAll(".review-edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.reviewEdit);
      const r = STATE.reviews[idx];
      if(!r) return;
      // 回填到表单
      document.getElementById("revBest").value = r.best || "";
      document.getElementById("revHard").value = r.hard || "";
      document.getElementById("revNext").value = r.next || "";
      document.getElementById("revParent").value = r.parent || "";
      document.getElementById("revSupport").value = r.support || "";
      // 设置编辑状态
      const editIdxInput = document.getElementById("revEditIdx");
      if(editIdxInput) editIdxInput.value = idx;
      // 滚动到表单
      document.getElementById("revBest").scrollIntoView({behavior:"smooth", block:"center"});
      toast("已加载到表单，修改后点击保存复盘更新 ✏️");
    });
  });
}

export function openReviewDetail(r){
  if(!r) return;
  const meta = r.weekKey ? getWeekMeta(r.weekKey) : { weekIndex: '', dateRange: '' };
  const moodEmoji = r.mood ? ({ happy: '😊', neutral: '😐', sad: '😢' }[r.mood] || '') : '';
  // 复用统一弹层单例（F 复用点）
  openModal('review-detail', () => `
    <div class="modal-box" style="max-width:420px;max-height:80vh;overflow:auto">
      <h3 style="margin-bottom:6px">📝 复盘详情</h3>
      <p style="color:var(--muted);font-size:12px;margin-bottom:16px">第${meta.weekIndex}周 · ${esc(meta.dateRange)}</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${r.best ? `<div><div style="font-weight:800;font-size:13px;color:var(--leaf-dark);margin-bottom:4px">🌟 最棒的事</div><div style="font-size:13px;line-height:1.6">${esc(r.best)}</div></div>` : ''}
        ${r.hard ? `<div><div style="font-weight:800;font-size:13px;color:var(--orange);margin-bottom:4px">💪 遇到的困难</div><div style="font-size:13px;line-height:1.6">${esc(r.hard)}</div></div>` : ''}
        ${r.next ? `<div><div style="font-weight:800;font-size:13px;color:var(--leaf-dark);margin-bottom:4px">📌 下周计划</div><div style="font-size:13px;line-height:1.6">${esc(r.next)}</div></div>` : ''}
        ${r.parent ? `<div><div style="font-weight:800;font-size:13px;color:#7b1fa2;margin-bottom:4px">👨‍👩‍👧 家长看见的进步</div><div style="font-size:13px;line-height:1.6">${esc(r.parent)}</div></div>` : ''}
        ${r.support ? `<div><div style="font-weight:800;font-size:13px;color:var(--rose);margin-bottom:4px">💗 孩子希望的支持</div><div style="font-size:13px;line-height:1.6">${esc(r.support)}</div></div>` : ''}
        ${moodEmoji ? `<div><div style="font-weight:800;font-size:13px;color:var(--leaf-dark);margin-bottom:4px">😊 本周心情</div><div style="font-size:20px">${moodEmoji}</div></div>` : ''}
      </div>
      <div style="margin-top:20px;text-align:center">
        <button class="btn-ghost" data-modal-close style="min-height:36px;padding:8px 32px">关闭</button>
      </div>
    </div>
  `);
}

// ===== 周表（每周复盘 D 模块）：3×4 方块网格 =====
export function renderWeekTable(){
  const el = document.getElementById("weekTable");
  if(!el) return;
  const weeks = enumerateSummerWeeks();
  const byKey = {};
  for(const r of (STATE.reviews || [])){
    if(r && r.weekKey) byKey[r.weekKey] = r;
  }
  if(!weeks.length){
    el.innerHTML = '<div class="empty-state">暑假还没开始哦 🌱</div>';
    return;
  }
  const moodMap = { happy: '😊', neutral: '😐', sad: '😢' };
  const todayStr = getTodayStr();
  // 前 10 格：真实周（周次+日期合并一行 + 放大心情 emoji + 状态点）
  const cells = weeks.map(wk => {
    const meta = getWeekMeta(wk);
    const rec = byKey[wk];
    const filled = !!(rec && (rec.best || rec.hard || rec.next || rec.parent || rec.support || rec.mood));
    const moodEmoji = rec && rec.mood ? (moodMap[rec.mood] || '') : '';
    const moodCls = rec && rec.mood ? ` mood-${rec.mood}` : '';
    // 未来周（当周周一晚于今天）：加 .future 类、cursor:default、不绑定编辑器（data-week 保留以便结构/查询稳定）
    const isFuture = wk > todayStr;
    const cls = `week-cell${filled ? ' filled' : ''}${moodCls}${isFuture ? ' future' : ''}`;
    const cursor = isFuture ? 'default' : 'pointer';
    return `<div class="${cls}" data-week="${wk}" role="button" tabindex="0" style="cursor:${cursor}">
      <div class="week-cell-top">
        <span class="week-line"><span class="week-idx">第${meta.weekIndex}周</span><span class="week-sep"> · </span><span class="week-range">${esc(meta.dateRange)}</span></span>
        <span class="week-dot">${filled ? '●' : '○'}</span>
      </div>
      <div class="week-mood">${moodEmoji || ''}</div>
    </div>`;
  });
  // 第11格：暑假小结入口（→ D 报告卡），新增「📅 截至 {今日}」
  const t = new Date();
  const todayLabel = `${t.getMonth() + 1}月${t.getDate()}日`;
  cells.push(`<div class="week-cell cell-summary" data-summary="1" role="button" tabindex="0" style="cursor:pointer">
      <div class="week-cell-top"><span class="week-idx">🌞 暑假小结</span></div>
      <div class="week-range">📅 截至 ${todayLabel}</div>
    </div>`);
  // 第12格：全部完成 🎉 装饰卡（不可点）
  cells.push(`<div class="week-cell cell-done" aria-hidden="true">
      <div class="week-cell-top"><span class="week-idx">✨ 全部完成 🎉</span></div>
      <div class="week-range">暑假圆满收官</div>
    </div>`);

  el.innerHTML = `<div class="week-grid">${cells.join('')}</div>`;

  el.querySelectorAll('.week-cell[data-week]').forEach(cell => {
    if(cell.classList.contains('future')) return; // 未来周：不绑定编辑器
    cell.addEventListener('click', () => openWeekEditorModal(cell.dataset.week));
    cell.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openWeekEditorModal(cell.dataset.week); }
    });
  });
  const summaryCell = el.querySelector('.cell-summary');
  if(summaryCell){
    summaryCell.addEventListener('click', () => openSummerSummary());
    summaryCell.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openSummerSummary(); }
    });
  }
}

// 点击真实周格 → 复用 openModal 单例弹编辑器（5 框 + 周 mood），存储结构不变
export function openWeekEditorModal(weekKey){
  const id = 'week-editor-' + weekKey;
  const meta = getWeekMeta(weekKey);
  const rec = (STATE.reviews || []).find(r => r.weekKey === weekKey) || null;
  return openModal(id, () => `
    <div class="modal-box week-editor-modal" style="max-width:440px;max-height:86vh;overflow:auto;text-align:left">
      <h3 style="margin:0 0 4px;font-size:18px">📝 第${meta.weekIndex}周 · ${esc(meta.dateRange)}</h3>
      <div id="weekEditorMount"></div>
    </div>
  `, {
    onMount(overlay){
      const mount = overlay.querySelector('#weekEditorMount');
      if(mount){
        const node = buildWeekEditor(weekKey, rec);
        mount.appendChild(node);
      }
      const saveBtn = overlay.querySelector('.week-save');
      if(saveBtn){
        // buildWeekEditor 内部已绑定保存（saveWeekReview）；此处仅负责保存后收起弹层
        saveBtn.addEventListener('click', () => { setTimeout(() => closeModal(id), 0); });
      }
    }
  });
}

// 内联展开某周的 5 个复盘框 + 本周心情三选一；返回挂载好的 DOM 节点
export function buildWeekEditor(weekKey, existing){
  const rec = existing || {};
  const wrap = document.createElement('div');
  wrap.className = 'week-editor';
  wrap.dataset.week = weekKey;
  const fields = [
    ['best', '🌟 最棒的事'],
    ['hard', '💪 遇到的困难'],
    ['next', '📌 下周计划'],
    ['parent', '👨‍👩‍👧 家长看见的进步'],
    ['support', '💗 孩子希望的支持'],
  ];
  const taHtml = fields.map(([k, label]) =>
    `<div class="rev-field"><label>${label}</label><textarea data-rev="${k}" placeholder="${label}">${esc(rec[k] || '')}</textarea></div>`
  ).join('');
  const moodVal = rec.mood || '';
  wrap.innerHTML = `
    <div class="week-editor-inner">
      <div class="rev-fields">${taHtml}</div>
      <div class="week-mood-pick">
        <span>本周心情：</span>
        <button type="button" class="mood-pick ${moodVal==='happy'?'active':''}" data-mood="happy">😊</button>
        <button type="button" class="mood-pick ${moodVal==='neutral'?'active':''}" data-mood="neutral">😐</button>
        <button type="button" class="mood-pick ${moodVal==='sad'?'active':''}" data-mood="sad">😢</button>
      </div>
      <button type="button" class="btn-primary week-save" data-week-save="${weekKey}">保存本周复盘</button>
    </div>
  `;
  let chosenMood = moodVal;
  wrap.querySelectorAll('.week-mood-pick button').forEach(b => {
    b.addEventListener('click', () => {
      chosenMood = b.dataset.mood;
      wrap.querySelectorAll('.week-mood-pick button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  wrap.querySelector('.week-save').addEventListener('click', () => {
    const data = {
      best: wrap.querySelector('[data-rev="best"]').value.trim(),
      hard: wrap.querySelector('[data-rev="hard"]').value.trim(),
      next: wrap.querySelector('[data-rev="next"]').value.trim(),
      parent: wrap.querySelector('[data-rev="parent"]').value.trim(),
      support: wrap.querySelector('[data-rev="support"]').value.trim(),
      mood: chosenMood,
    };
    saveWeekReview(weekKey, data);
  });
  return wrap;
}

// 保存（upsert）某周复盘到 STATE.reviews，并落盘
export function saveWeekReview(weekKey, data){
  const meta = getWeekMeta(weekKey);
  const rec = {
    weekKey,
    weekIndex: meta.weekIndex,
    dateRange: meta.dateRange,
    best: data.best || '',
    hard: data.hard || '',
    next: data.next || '',
    parent: data.parent || '',
    support: data.support || '',
    mood: data.mood || '',
  };
  if(!STATE.reviews) STATE.reviews = [];
  const idx = STATE.reviews.findIndex(r => r.weekKey === weekKey);
  if(idx >= 0) STATE.reviews[idx] = rec;
  else STATE.reviews.unshift(rec);
  saveData();
  renderWeekTable();
}

// ===== 暑假小结成长报告卡（D 模块）=====
export function openSummerSummary(){
  const id = 'summer-summary';
  return openModal(id, () => {
    const dims = computeDimensionScores(STATE.daily);
    const total = calcTotalScore();
    const checkinDays = Object.keys(STATE.daily).filter(ds => {
      const day = STATE.daily[ds];
      return day && day.tasks && Object.values(day.tasks).some(t => t && t.done);
    }).length;
    const maxScore = Math.max(1, ...CATEGORIES.map(c => dims[c.title] || 0));
    const rows = CATEGORIES.map(c => {
      const s = dims[c.title] || 0;
      const pct = Math.min(100, Math.round(s / maxScore * 100));
      return `<div class="sum-row">
        <span class="sum-label">${c.icon} ${c.title}</span>
        <span class="sum-bar"><span class="sum-bar-fill" style="width:${pct}%;background:${c.color}"></span></span>
        <span class="sum-val">${s}</span>
      </div>`;
    }).join('');
    return `<div class="modal-box summer-summary" style="max-width:440px;text-align:center">
      <div class="sum-flower">${morningGlorySVG(96)}</div>
      <h3 style="margin:6px 0 2px;font-size:20px">🌻 成长报告卡</h3>
      <div class="sum-sub" style="color:var(--muted);font-size:13px;margin-bottom:14px">${esc(STATE.childName || '宝贝')} 的暑假小结</div>
      <div class="sum-dims">${rows}</div>
      <div class="sum-total" style="margin-top:14px;font-size:15px;font-weight:800">总积分 <b style="color:var(--leaf-dark);font-size:20px">${total}</b> 分 · 打卡 <b>${checkinDays}</b> 天</div>
      <button class="btn-primary" data-save-img type="button" style="width:100%;margin-top:16px">📷 保存为图片</button>
    </div>`;
  }, {
    onMount(overlay){
      const btn = overlay.querySelector('[data-save-img]');
      if(btn) btn.addEventListener('click', () => exportSummaryCardImage(overlay));
    }
  });
}

// 原生 Canvas 手绘导出报告卡为 PNG（零依赖：SVG→Image→drawImage→toBlob→下载）
function exportSummaryCardImage(overlay){
  const W = 600, H = 760, scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if(!ctx){ toast('当前环境不支持图片导出'); return; }
  ctx.scale(scale, scale);

  const style = getComputedStyle(document.body);
  const readVar = (name, fallback) => {
    const v = style.getPropertyValue(name).trim();
    return v || fallback;
  };

  // 背景圆角卡片
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fillStyle = readVar('--paper', '#fffdf8'); ctx.fill();
  ctx.strokeStyle = 'rgba(255,112,67,.25)'; ctx.lineWidth = 2; ctx.stroke();

  // 标题
  ctx.fillStyle = readVar('--leaf-dark', '#e64a19');
  ctx.font = 'bold 26px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌻 成长报告卡', W / 2, 52);
  ctx.fillStyle = readVar('--muted', '#8a7b6e');
  ctx.font = '14px "PingFang SC",sans-serif';
  ctx.fillText(esc(STATE.childName || '宝贝') + ' 的暑假小结', W / 2, 76);

  // 大牵牛花（SVG → Image；将 CSS 变量替换为计算值，使 Canvas 内可见）
  let flowerSVG = morningGlorySVG(140);
  flowerSVG = flowerSVG.replace(/var\((--[\w-]+)\)/g, (m, n) => readVar(n, m));
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flowerSVG);
  const img = new Image();
  img.onload = () => { ctx.drawImage(img, W / 2 - 70, 92, 140, 140); drawSummaryBody(ctx, W, readVar); finishExport(canvas); };
  img.onerror = () => { drawSummaryBody(ctx, W, readVar); finishExport(canvas); };
  img.src = svgUrl;

  function drawSummaryBody(ctx, W, readVar){
    const dims = computeDimensionScores(STATE.daily);
    const total = calcTotalScore();
    const checkinDays = Object.keys(STATE.daily).filter(ds => {
      const day = STATE.daily[ds];
      return day && day.tasks && Object.values(day.tasks).some(t => t && t.done);
    }).length;
    const maxScore = Math.max(1, ...CATEGORIES.map(c => dims[c.title] || 0));
    let y = 252;
    ctx.textAlign = 'left';
    CATEGORIES.forEach(c => {
      const s = dims[c.title] || 0;
      const pct = Math.min(100, Math.round(s / maxScore * 100));
      ctx.fillStyle = '#5c3a28'; ctx.font = 'bold 14px "PingFang SC",sans-serif';
      ctx.fillText(`${c.icon} ${c.title}`, 60, y);
      const bx = 170, bw = 320, bh = 16;
      roundRect(ctx, bx, y - 13, bw, bh, 8); ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fill();
      roundRect(ctx, bx, y - 13, Math.max(2, bw * pct / 100), bh, 8); ctx.fillStyle = c.color; ctx.fill();
      ctx.fillStyle = readVar('--ink', '#2d1f0e'); ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(String(s), W - 60, y); ctx.textAlign = 'left';
      y += 40;
    });
    y += 12;
    ctx.fillStyle = readVar('--leaf-dark', '#e64a19');
    ctx.font = 'bold 18px "PingFang SC",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`总积分 ${total} 分 · 打卡 ${checkinDays} 天`, W / 2, y);
  }

  function finishExport(canvas){
    try{
      canvas.toBlob(blob => {
        if(!blob){ toast('图片导出失败'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '成长报告卡.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      }, 'image/png');
    }catch(e){ toast('图片导出失败'); }
  }
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ===== 成长地图 / 积分趋势 折叠（F 模块）=====
const COLLAPSE_PREF_KEY = 'sbg_ui_collapse';
let _collapseBound = false;

function readCollapsePref(){
  const def = { map: false, trend: true }; // 默认：地图展开 / 趋势收起
  try{
    const saved = JSON.parse(localStorage.getItem(COLLAPSE_PREF_KEY) || '{}');
    return { ...def, ...(saved || {}) };
  }catch(e){ return def; }
}

function saveCollapsePref(key, collapsed){
  const pref = readCollapsePref();
  pref[key] = collapsed;
  try{ localStorage.setItem(COLLAPSE_PREF_KEY, JSON.stringify(pref)); }catch(e){}
}

function ensureCollapseBinding(){
  if(_collapseBound) return;
  _collapseBound = true;
  document.querySelectorAll('.collapse-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.collapse;
      const body = document.getElementById(key + 'Body');
      if(!body) return;
      const collapsed = body.classList.toggle('collapsed');
      btn.classList.toggle('collapsed', collapsed);
      saveCollapsePref(key, collapsed);
    });
  });
}

function applyCollapseState(){
  const pref = readCollapsePref();
  ['map', 'trend'].forEach(key => {
    const body = document.getElementById(key + 'Body');
    const btn = document.querySelector(`.collapse-toggle[data-collapse="${key}"]`);
    if(!body || !btn) return;
    const collapsed = !!pref[key];
    body.classList.toggle('collapsed', collapsed);
    btn.classList.toggle('collapsed', collapsed);
  });
}

// ===== 成长档案 =====
export async function renderArchive(){
  const c = document.getElementById("workArchive");
  if(!c) return;
  const all = [];
  for(const ds in STATE.daily){
    const day = STATE.daily[ds];
    if(day.artworks) day.artworks.forEach(a => all.push(a));
  }
  all.sort((a,b) => b.date.localeCompare(a.date));

  const guide = document.getElementById('workEmptyGuide');
  const wform = document.querySelector('.work-form');
  const wnote = document.getElementById('workDateNote');

  if(!all.length){
    // 空状态：显引导卡、隐藏作品表单（E 交互）
    if(guide){
      guide.style.display = '';
      guide.innerHTML = `<div class="work-empty-card">
        <div class="work-empty-icon">🎨</div>
        <div class="work-empty-text">还没有作品呢～<br>暑假的每一份努力都值得收藏 ✨</div>
        <button class="btn-primary" id="workEmptyAddBtn" type="button">去记录第一个作品 ✨</button>
      </div>`;
      const btn = guide.querySelector('#workEmptyAddBtn');
      if(btn) btn.addEventListener('click', () => {
        guide.style.display = 'none';
        if(wform){ wform.style.display = ''; wform.classList.remove('fade-in'); void wform.offsetWidth; wform.classList.add('fade-in'); }
        if(wnote) wnote.style.display = '';
      });
    }
    if(wform) wform.style.display = 'none';
    if(wnote) wnote.style.display = 'none';
    c.innerHTML = '';
    return;
  }

  // 有作品：恢复表单显示、隐藏引导卡
  if(guide) guide.style.display = 'none';
  if(wform){ wform.style.display = ''; wform.classList.remove('fade-in'); }
  if(wnote) wnote.style.display = '';
  c.innerHTML = all.slice(0, 30).map(a =>
    `<div class="work-item" data-artid="${a.id}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <span class="work-date-badge">${esc(a.dateDisplay)}</span>
          <div class="work-task-title">${esc(a.taskTitle)}</div>
          <strong class="work-title">${esc(a.title)}</strong>
          <div style="color:var(--muted);font-size:12px;margin-top:2px">${esc(a.note || "")}</div>
        </div>
        <button class="art-del-btn" data-artid="${a.id}" style="padding:4px 10px;border-radius:8px;border:none;background:rgba(239,83,80,.1);color:var(--red);font-size:14px;cursor:pointer;flex-shrink:0;transition:.12s" title="删除作品">✕</button>
      </div>
      <div class="art-media-${a.id}"></div>
    </div>`
  ).join("");

  c.querySelectorAll(".art-del-btn").forEach(b => {
    b.addEventListener("click", async (e) => {
      e.stopPropagation(); // 阻止冒泡到作品详情
      const artId = b.dataset.artid;
      await showPasswordModal("删除作品需要家长密码验证", async () => {
        let found = false;
        for(const ds in STATE.daily){
          const day = STATE.daily[ds];
          if(day.artworks){
            const idx = day.artworks.findIndex(a => a.id === artId);
            if(idx >= 0){ day.artworks.splice(idx, 1); found = true; break; }
          }
        }
        // Bug 3 修复：同时删除 IndexedDB 中的媒体文件
        if(found){
          try { await removeMedia(artId); } catch(err) {}
          saveData(); renderArchive(); toast("作品已删除");
        }
      });
    });
  });

  // 点击作品查看详情的
  c.querySelectorAll(".work-item").forEach(el => {
    el.addEventListener("click", () => {
      const artId = el.dataset.artid;
      const artwork = all.find(a => a.id === artId);
      if(!artwork) return;
      openWorkDetail(artwork);
    });
  });

  for(const a of all.slice(0, 30)){
    if(a.hasMedia){
      const mc = c.querySelector(`.art-media-${a.id}`);
      if(!mc) continue;
      const url = await getMedia(a.id);
      if(!url) continue;
      let thumbHtml = "";
      if(a.mediaKind === "image"){
        thumbHtml = `<div class="work-media-thumb"><img src="${url}" alt="${esc(a.title)}"></div>`;
      } else if(a.mediaKind === "video"){
        thumbHtml = `<div class="work-media-thumb"><video src="${url}" preload="metadata"></video></div>`;
      } else if(a.mediaKind === "audio"){
        thumbHtml = `<div class="work-media-thumb"><div class="thumb-audio"><span class="thumb-audio-icon">🎵</span><div><div class="thumb-audio-label">${esc(a.title)}</div><div class="thumb-audio-meta">音频 · 点击播放</div></div></div></div>`;
      }
      mc.innerHTML = thumbHtml;
    }
  }
}

// ===== 作品详情弹窗 =====
function openWorkDetail(a){
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.style.zIndex = "1000";
  let mediaHtml = "";
  if(a.hasMedia){
    // 异步加载媒体
    const loadMedia = async () => {
      const url = await getMedia(a.id);
      if(!url) return;
      const mc = ov.querySelector("#workDetailMedia");
      if(!mc) return;
      if(a.mediaKind === "image"){
        mc.innerHTML = `<img src="${url}" alt="${esc(a.title)}" style="max-width:100%;border-radius:10px">`;
      } else if(a.mediaKind === "video"){
        mc.innerHTML = `<video src="${url}" controls playsinline style="max-width:100%;border-radius:10px"></video>`;
      } else if(a.mediaKind === "audio"){
        mc.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:48px;margin-bottom:12px">🎵</div><audio src="${url}" controls style="width:100%"></audio></div>`;
      }
    };
    loadMedia();
    mediaHtml = `<div id="workDetailMedia" style="text-align:center;margin:12px 0"></div>`;
  }
  ov.innerHTML = `<div class="modal-box" style="max-width:420px;max-height:80vh;overflow:auto">
    <h3 style="margin-bottom:4px">${esc(a.title)}</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:6px">${a.dateDisplay} · ${esc(a.taskTitle)}</p>
    ${a.note ? `<div style="font-size:13px;line-height:1.6;color:var(--ink);margin-bottom:8px;padding:10px 12px;background:rgba(255,243,224,.5);border-radius:8px">${esc(a.note)}</div>` : ''}
    ${mediaHtml}
    <div style="margin-top:12px;text-align:center">
      <button class="btn-ghost" id="workDetailClose" style="min-height:36px;padding:8px 32px">关闭</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#workDetailClose").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if(e.target === ov) ov.remove(); });
}