// features/render.js — 所有渲染函数（匹配原始 CSS 结构）

import { STATE, TODAY_STR, setSelDate } from '../core/state.js';
import { TASKS, REWARDS, CATEGORIES, CAT_INTRO, localDateStr, fmtDisplay, esc, getMonthKey, DEFAULT_REWARD_ITEMS } from '../core/helpers.js';
import { getDay, saveData, calcTotalScore, calcDayScore } from '../core/data.js';
import { getMakeupCost, canMakeupDate, isToday, isFuture, isPastLocked, isPastWithNoCheckins, canCheckIn } from '../features/makeup.js';
import { showPasswordModal } from '../features/password.js';
import { getMedia, removeMedia } from '../features/media.js';

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
  renderMap();
  renderTrendChart();
  renderRewards();
  renderRedemptions();
  renderReviewTimeline();
  renderArchive();
  renderPoints();
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
    const allTasks = getActiveTasks();
    const vis = allTasks.filter(t => STATE.selCat === "全部" || t.cat === STATE.selCat);

    taskGrid.innerHTML = vis.map(t => {
      const done = day.tasks[t.id] && day.tasks[t.id].done;
      return `<label class="task-row${done?' done':''}">
        <input type="checkbox" data-tid="${t.id}" ${done?'checked':''}>
        <span><strong>${t.title}</strong><span class="tag">${t.cat}</span></span>
        <span class="pts"><span class="coin" style="width:20px;height:20px;font-size:10px">分</span>+${t.pts}</span>
      </label>`;
    }).join("");

    taskGrid.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("change", async e => await toggleTask(e.target.dataset.tid, e.target.checked, e));
    });
    return;
  }

  // 正常打卡模式
  taskGrid.style.display = "";
  catTabs.style.display = "";
  if(taskLocked) taskLocked.style.display = "none";
  if(banner) banner.style.display = "none";

  renderCatTabs();
  const day = getDay(STATE.selDate);
  const allTasks = getActiveTasks();
  const vis = allTasks.filter(t => STATE.selCat === "全部" || t.cat === STATE.selCat);

  taskGrid.innerHTML = vis.map(t => {
    const done = day.tasks[t.id] && day.tasks[t.id].done;
    return `<label class="task-row${done?' done':''}">
      <input type="checkbox" data-tid="${t.id}" ${done?'checked':''}>
      <span><strong>${t.title}</strong><span class="tag">${t.cat}</span></span>
      <span class="pts"><span class="coin" style="width:20px;height:20px;font-size:10px">分</span>+${t.pts}</span>
    </label>`;
  }).join("");

  taskGrid.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", async e => await toggleTask(e.target.dataset.tid, e.target.checked, e));
  });
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
  const t = getActiveTasks().find(x => x.id === tid);
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
          toast("成长分不足，无法补卡（补卡需扣"+mc.cost+"分，当前只有"+currentScore+"分）");
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

    // ✅ 打卡完成后实时更新成长档案的关联任务下拉
    if(typeof window.renderWorksDropdown === 'function') window.renderWorksDropdown();

    // ✅ 触发鼓励话 + 烟花效果
    triggerEncourageAndFirework();
    toast("太棒了！成长能量已存入 🌟");
  } else if(!checked && day.tasks[tid].done){
    day.tasks[tid].done = false;
    day.score = calcDayScore(STATE.selDate);
    if(!isToday(STATE.selDate) && STATE.makeupVerifiedDates && STATE.makeupVerifiedDates[STATE.selDate]){
      STATE.redemptions = STATE.redemptions.filter(r => {
        return !(r.level === "补卡" && r.date && r.date.startsWith(STATE.selDate.slice(0, 10)));
      });
      delete STATE.makeupVerifiedDates[STATE.selDate];
      const mk = getMonthKey(STATE.selDate);
      STATE.makeupUsed[mk] = Math.max(0, (STATE.makeupUsed[mk] || 0) - 1);
    }
    saveData();
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

function triggerEncourageAndFirework(){
  // 1. 随机鼓励话（屏幕中心）
  showEncourageMsg();
  // 2. 烟花效果
  triggerFireworks();
}

export function showEncourageMsg(customMsg){
  // 移除旧弹窗
  const old = document.querySelector(".encourage-msg");
  if(old) old.remove();

  const msg = _ENCOURAGES[Math.floor(Math.random() * _ENCOURAGES.length)];
  // 清理表情符号后用于语音朗读
  const cleanMsg = msg.replace(/[🌟🎉💪✨❤️🚀🎁🎊🌈🌻]/g, '');

  const el = document.createElement("div");
  el.className = "encourage-msg";
  el.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    display:flex; align-items:center; justify-content:center;
    z-index:9998; pointer-events:none;
    animation: encourageIn .5s ease forwards;
  `;
  el.innerHTML = `
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

  // 🎤 语音朗读
  speakEncourage(cleanMsg);
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
      <button class="${can?'redeem-btn':'disabled-btn'}" data-redeem="${cost}" ${can?'':'disabled'}>${can?'兑换所选奖励':'继续存分'}</button>
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
    const isLatest = idx === 0;
    return `<div class="timeline-item review-item${isLatest?' latest':''}" data-review-idx="${idx}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <time>${esc(dateStr)}</time>
        <div style="display:flex;gap:6px;align-items:center">
          ${isLatest ? `<button class="review-edit-btn" data-review-edit="${idx}" style="padding:3px 8px;border-radius:6px;border:none;background:rgba(41,182,246,.12);color:#1565c0;font-size:11px;font-weight:800;cursor:pointer;transition:.15s">编辑</button>` : ''}
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

function openReviewDetail(r){
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.style.zIndex = "1000";
  ov.innerHTML = `<div class="modal-box" style="max-width:420px;max-height:80vh;overflow:auto">
    <h3 style="margin-bottom:6px">📝 复盘详情</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:16px">${esc(r.date || "未记录日期")}</p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${r.best ? `<div><div style="font-weight:800;font-size:13px;color:var(--leaf-dark);margin-bottom:4px">🌟 最棒的事</div><div style="font-size:13px;line-height:1.6">${esc(r.best)}</div></div>` : ''}
      ${r.hard ? `<div><div style="font-weight:800;font-size:13px;color:var(--orange);margin-bottom:4px">💪 遇到的困难</div><div style="font-size:13px;line-height:1.6">${esc(r.hard)}</div></div>` : ''}
      ${r.next ? `<div><div style="font-weight:800;font-size:13px;color:var(--leaf-dark);margin-bottom:4px">📌 下周计划</div><div style="font-size:13px;line-height:1.6">${esc(r.next)}</div></div>` : ''}
      ${r.parent ? `<div><div style="font-weight:800;font-size:13px;color:#7b1fa2;margin-bottom:4px">👨‍👩‍👧 家长悄悄话</div><div style="font-size:13px;line-height:1.6">${esc(r.parent)}</div></div>` : ''}
      ${r.support ? `<div><div style="font-weight:800;font-size:13px;color:var(--rose);margin-bottom:4px">💗 需要支持</div><div style="font-size:13px;line-height:1.6">${esc(r.support)}</div></div>` : ''}
    </div>
    <div style="margin-top:20px;text-align:center">
      <button class="btn-ghost" id="reviewDetailClose" style="min-height:36px;padding:8px 32px">关闭</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#reviewDetailClose").addEventListener("click", () => ov.remove());
  ov.addEventListener("click", e => { if(e.target === ov) ov.remove(); });
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
  if(!all.length){
    c.innerHTML = '<div class="empty-state">还没有作品。暑假结束后，这里会成为孩子自己的成长档案。</div>';
    return;
  }
  c.innerHTML = all.slice(0, 30).map(a =>
    `<div class="timeline-item work-item" data-artid="${a.id}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
        <div style="flex:1;min-width:0">
          <time>${a.dateDisplay} · ${esc(a.taskTitle)}</time>
          <strong>${esc(a.title)}</strong>
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