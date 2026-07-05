// ========== BUNDLE.JS — 暑假成长积分银行 v3.0 ==========
// 单文件打包版，兼容 file:// 和 http:// 协议


// ===== core/helpers.js =====
// core/helpers.js — 常量 + 工具函数

const CATEGORIES = [
  {id:"learning", title:"学习力", color:"#4c88b8", icon:"📖"},
  {id:"physical", title:"运动力", color:"#2f947f", icon:"🏃"},
  {id:"discipline", title:"自控力", color:"#e7ac2c", icon:"⏰"},
  {id:"exploration", title:"探索力", color:"#7e57c2", icon:"🔍"},
  {id:"practice", title:"实践力", color:"#ef8f72", icon:"🛠️"},
];

const TASKS = [
  {id:"study-task",title:"完成今日学习任务",pts:1,cat:"学习力"},
  {id:"read-20",title:"阅读20分钟",pts:1,cat:"学习力"},
  {id:"diary",title:"写日记",pts:2,cat:"学习力"},
  {id:"handwriting",title:"练字20分钟",pts:1,cat:"学习力"},
  {id:"poem",title:"背诵一首古诗",pts:1,cat:"学习力"},
  {id:"words",title:"背诵10个英语单词",pts:1,cat:"学习力"},
  {id:"mistakes",title:"错题订正复盘",pts:2,cat:"学习力"},
  {id:"math-practice",title:"口算/计算练习15分钟",pts:1,cat:"学习力"},
  {id:"sport-30",title:"运动30分钟",pts:1,cat:"运动力"},
  {id:"outside-2h",title:"户外活动2小时",pts:2,cat:"运动力"},
  {id:"jump-rope",title:"跳绳100个",pts:1,cat:"运动力"},
  {id:"swim",title:"游泳/戏水30分钟",pts:2,cat:"运动力"},
  {id:"cycling",title:"骑行20分钟",pts:1,cat:"运动力"},
  {id:"ball-game",title:"球类运动（篮球/足球/羽毛球等）",pts:2,cat:"运动力"},
  {id:"stretch",title:"拉伸放松10分钟",pts:1,cat:"运动力"},
  {id:"screen",title:"屏幕时间不超过2小时",pts:2,cat:"自控力"},
  {id:"pack",title:"自己准备出行物品",pts:1,cat:"自控力"},
  {id:"weekly-review-task",title:"每周复盘",pts:2,cat:"自控力"},
  {id:"homework-time",title:"自己安排作业时间",pts:1,cat:"自控力"},
  {id:"initiative",title:"主动安排并完成一件事",pts:3,cat:"自控力"},
  {id:"early-sleep",title:"早睡（9点30分前）",pts:1,cat:"自控力"},
  {id:"alarm",title:"自己定闹钟并按时起床",pts:1,cat:"自控力"},
  {id:"organize-bag",title:"整理书包/文具",pts:1,cat:"自控力"},
  {id:"less-snack",title:"减少零食摄入",pts:1,cat:"自控力"},
  {id:"look-far",title:"望远2次，每次20秒",pts:1,cat:"自控力"},
  {id:"interest-work",title:"完成一件兴趣作品",pts:2,cat:"探索力"},
  {id:"explore",title:"参加一次探索活动",pts:2,cat:"探索力"},
  {id:"emotion",title:"情绪好好表达",pts:1,cat:"探索力"},
  {id:"talk",title:"亲子沟通一次",pts:1,cat:"探索力"},
  {id:"observe-nature",title:"观察自然（植物/昆虫/天气）",pts:1,cat:"探索力"},
  {id:"mini-experiment",title:"做一个小实验",pts:2,cat:"探索力"},
  {id:"learn-song",title:"学唱一首新歌",pts:1,cat:"探索力"},
  {id:"visit-museum",title:"参观博物馆/展览",pts:3,cat:"探索力"},
  {id:"observation-diary",title:"写一篇观察日记",pts:2,cat:"探索力"},
  {id:"chore",title:"帮父母做一次家务",pts:2,cat:"实践力"},
  {id:"room",title:"整理自己房间",pts:1,cat:"实践力"},
  {id:"cook",title:"做一道菜",pts:3,cat:"实践力"},
  {id:"volunteer",title:"做一次志愿者",pts:2,cat:"实践力"},
  {id:"party",title:"组织一场朋友聚会",pts:2,cat:"实践力"},
  {id:"wash-dishes",title:"洗碗",pts:1,cat:"实践力"},
  {id:"water-plants",title:"浇花/照顾植物",pts:1,cat:"实践力"},
  {id:"pet-care",title:"照顾宠物（喂食/遛弯）",pts:1,cat:"实践力"},
  {id:"grocery",title:"帮家长买菜/购物",pts:2,cat:"实践力"},
  {id:"trash-sort",title:"垃圾分类",pts:1,cat:"实践力"}
];
// TASKS is a mutable reference - modifications by modules will be visible everywhere

const REWARDS = [
  {cost:10,title:"10分小奖励",items:["选择一次家庭电影","点播一次睡前故事","选择一次晚餐菜单","多一次亲子游戏时间"]},
  {cost:30,title:"30分中奖励",items:["买一本喜欢的书","一次朋友聚会","一次亲子外出","一个手工或科学材料包"]},
  {cost:60,title:"60分大奖励",items:["一次短途旅行","一次主题体验活动","实现一个孩子期待的小愿望"]},
  {cost:100,title:"100分终极大奖励",items:["一次远途旅行"]}
];
const DEFAULT_REWARD_ITEMS = {
  10: ["选择一次家庭电影","点播一次睡前故事","选择一次晚餐菜单","多一次亲子游戏时间"],
  30: ["买一本喜欢的书","一次朋友聚会","一次亲子外出","一个手工或科学材料包"],
  60: ["一次短途旅行","一次主题体验活动","实现一个孩子期待的小愿望"],
  100: ["一次远途旅行"]
};

const ENCOURAGES = [
  "今天的努力，会在明天开花 🌱","每一小步，都在走向更大的自己",
  "你比昨天又进步了一点点 ✨","坚持的你，正在闪闪发光",
  "成长不是一天的事，但你今天做到了","小小的坚持，就是大大的力量",
  "今天的你，给自己加了一颗星 ⭐","暑假的每一天，你都在悄悄成长",
  "你的努力，已经被成长银行存起来了","做得很棒！继续保持哦",
  "又收获了一枚成长金币 🪙","今天的汗水，会变成明天的笑容",
  "你很了不起，因为你没有放弃","一步一个脚印，走着走着就远了",
  "看见自己的进步，就是最好的奖励","这个世界上，又多了一个努力的小孩",
  "每完成一件事，你就变厉害了一点点","你的认真，值得一朵小红花 🌸",
  "慢慢来，你已经在路上了","今天的付出，都悄悄存进了未来的你"
];

const CAT_INTRO = {
  "学习力":"把学习拆成看得见的小动作，今天从一项开始也很好。",
  "运动力":"身体动起来，暑假的能量才会越来越满。",
  "自控力":"把屏幕、时间和计划交还给孩子练习掌舵。",
  "探索力":"保留好奇、表达感受，也记录一次新的尝试。",
  "实践力":"在真实生活里做一件事，成长会更有手感。"
};

// ===== helpers =====

function localDateStr(d){
  // 使用本地时区格式化日期
  const pad=(n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fmtDisplay(d){
  const pad=(n)=>String(n).padStart(2,'0');
  const weekdays=['周日','周一','周二','周三','周四','周五','周六'];
  return `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 ${weekdays[d.getDay()]}`;
}

function esc(s){
  const d=document.createElement("div");d.textContent=s;return d.innerHTML;
}

function getMonthKey(dateStr){
  return dateStr.slice(0,7); // "2026-07"
}

// 动态获取今天日期字符串（本地时区）
function getTodayStr(){
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
}

// ===== core/state.js =====
// core/state.js — 单源真相状态管理

// Bug 1 修复：freshState 中 selDate 使用动态获取的今日日期
function freshState(){
  return {
    daily:{},
    redemptions:[],
    reviews:[],
    children:[],
    activeChildId:null,
    childName:"",
    childGender:"girl",
    parentPasswordHash:"",
    theme:"sakura",
    modifiedDefaultTasks:undefined,
    customTasks:[],
    customRewards:DEFAULT_REWARD_ITEMS,
    makeupVerifiedDates:{},
    makeupUsed:{},
    reports:{},
    remindersSent:{},
    // UI state
    selDate: getTodayStr(),
    selCat: "全部",
    curCalYear: new Date().getFullYear(),
    curCalMonth: new Date().getMonth(),
  };
}

// 向后兼容：TODAY_STR 和 TODAY 仍导出（仅作为当前快照）
const TODAY_STR = getTodayStr();
const TODAY = new Date();

// Single source of truth for ALL modules
// `STATE` is the live object; `data` is the legacy alias kept for compatibility
let STATE = freshState();
let data = STATE; // legacy alias

function setData(newData){
  // Merge into the existing STATE object to keep all references alive
  const merged = {...freshState(), ...newData};
  Object.keys(merged).forEach(k => { STATE[k] = merged[k]; });
}

function setSelDate(newSelDate){
  STATE.selDate = newSelDate;
  data.selDate = newSelDate;
}


// 桥接：main.js 需要 STATE_TODAY_STR
var STATE_TODAY_STR = TODAY_STR;

// ===== core/data.js =====
// core/data.js — 数据加载/保存/计算

function loadData(){
  try{
    const saved=localStorage.getItem("summerGrowthBankV2");
    const parsed=saved?JSON.parse(saved):freshState();
    parsed.daily=parsed.daily||{};
    parsed.redemptions=parsed.redemptions||[];
    parsed.reviews=parsed.reviews||[];
    parsed.customTasks=parsed.customTasks||[];
    parsed.makeupVerifiedDates=parsed.makeupVerifiedDates||{};
    parsed.makeupUsed=parsed.makeupUsed||{};
    parsed.reports=parsed.reports||{};
    // 兼容旧版拼写错误 reminersSent → remindersSent
    if(parsed.reminersSent && !parsed.remindersSent){ parsed.remindersSent = parsed.reminersSent; delete parsed.reminersSent; }
    parsed.remindersSent=parsed.remindersSent||{};
    parsed.customRewards=parsed.customRewards||{};
    // 校验 childName：如果 childName 不在 children 列表中，清除它
    if(parsed.childName){
      const children = parsed.children || [];
      if(children.length > 0 && !children.some(c => c.name === parsed.childName)){
        parsed.childName = "";
      }
    }
    // Bug #3 修复：每次打开应用自动切回今天（动态计算）
    const todayStr = getTodayStr();
    if(parsed.selDate && parsed.selDate !== todayStr){
      parsed.selDate = todayStr;
      const today = new Date();
      parsed.curCalYear = today.getFullYear();
      parsed.curCalMonth = today.getMonth();
    }
    return parsed;
  }catch(e){return freshState();}
}

function saveData(){
  if(STATE.activeChildId && STATE.activeChildId!=='default'){
    const childKey = "summerGrowthBankV2_child_"+STATE.activeChildId;
    localStorage.setItem(childKey, JSON.stringify(STATE));
  } else {
    localStorage.setItem("summerGrowthBankV2", JSON.stringify(STATE));
  }
}

function getDay(dateStr){
  if(!STATE.daily[dateStr]){
    STATE.daily[dateStr]={tasks:{},score:0,artworks:[]};
  }
  return STATE.daily[dateStr];
}

function calcDayScore(dateStr){
  const day=STATE.daily[dateStr]||{tasks:{}};
  let s=0;
  for(const tid in day.tasks){
    if(day.tasks[tid].done) s+=day.tasks[tid].pts||0;
  }
  return s;
}

function calcTotalScore(){
  let total=0;
  for(const ds in STATE.daily){
    let dayScore=0;
    const day=STATE.daily[ds];
    for(const tid in day.tasks){
      if(day.tasks[tid].done) dayScore+=day.tasks[tid].pts||0;
    }
    total+=dayScore;
  }
  for(const r of STATE.redemptions){
    total-=r.cost||0;
  }
  return Math.max(0,total);
}

// ===== features/makeup.js =====
// ===== features/makeup.js — 补卡规则 =====

function isToday(dateStr){
  return dateStr === getTodayStr();
}

function isFuture(dateStr){
  return dateStr > getTodayStr();
}

// 过去日期：如果有打卡记录，则锁定（不可再补）；如果没有打卡记录，则允许补卡
function isPastLocked(dateStr){
  if(dateStr >= getTodayStr()) return false;
  const day = getDay(dateStr);
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) return true;
  }
  return false;
}

// 过去日期：没有任何打卡记录，允许补卡
function isPastWithNoCheckins(dateStr){
  if(dateStr >= getTodayStr()) return false;
  const day = getDay(dateStr);
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) return false;
  }
  return true;
}

function canMakeupDate(dateStr){
  if(isToday(dateStr))return false;
  if(isFuture(dateStr))return false;
  if(!isPastWithNoCheckins(dateStr)) return false;
  return true;
}

function canCheckIn(dateStr){
  if(isToday(dateStr))return true;
  if(isFuture(dateStr))return false;
  // 过去日期：有打卡记录则可（查看状态），无打卡记录则不可直接打卡（需先补卡）
  if(dateStr < getTodayStr()){
    const day=getDay(dateStr);
    for(const tid in day.tasks){
      if(day.tasks[tid]&&day.tasks[tid].done) return true;
    }
    return false;
  }
  return true;
}

function getMakeupCost(dateStr){
  if(!canMakeupDate(dateStr))return {allowed:false,reason:"该日期不可补卡",cost:0};
  const monthKey=getMonthKey(dateStr);
  const currentMonth=getMonthKey(getTodayStr());
  if(monthKey!==currentMonth)return {allowed:false,reason:"非当月",cost:0};
  const already=STATE.makeupVerifiedDates&&STATE.makeupVerifiedDates[dateStr];
  if(already)return {allowed:true,cost:0};
  const used=STATE.makeupUsed[monthKey]||0;
  // 每月4次补卡机会：第1-2次免费，第3次扣10分，第4次扣20分，第5次及以后不可补
  if(used>=4)return {allowed:false,reason:"本月补卡次数已用完（最多4次），下月重置",cost:0};
  let cost=0;
  if(used===2)cost=10;
  else if(used===3)cost=20;
  return {allowed:true,cost};
}

// ===== features/media.js =====
// features/media.js — IndexedDB 图片存储

const DB_NAME = "summerGrowthMediaDB";
const STORE_NAME = "media";

async function openDB(){
  return new Promise((resolve, reject)=>{
    const req=indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME,{keyPath:"id"});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function saveMedia(id, blob){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    const store=tx.objectStore(STORE_NAME);
    const req=store.put({id,blob});
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

async function getMedia(id){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readonly");
    const store=tx.objectStore(STORE_NAME);
    const req=store.get(id);
    req.onsuccess=()=>resolve(req.result?req.result.blob:null);
    req.onerror=()=>reject(req.error);
  });
}

async function removeMedia(id){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    const store=tx.objectStore(STORE_NAME);
    const req=store.delete(id);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

async function hasMedia(id){
  try{
    const media=await getMedia(id);
    return !!media;
  }catch(e){return false;}
}

// Convert blob to base64 (for localStorage export)
async function blobToBase64(blob){
  return new Promise((resolve, reject)=>{
    const reader=new FileReader();
    reader.onloadend=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ===== features/password.js =====
// features/password.js — 密码相关

// 获取主数据中的家长密码（不依赖 STATE，始终从 main localStorage 读取）
function getMainPasswordHash(){
  try{
    const m = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
    return m.parentPasswordHash || "";
  }catch(e){return "";}
}

async function hashPassword(pwd){
  if(!pwd||!/^\d{4,6}$/.test(pwd))return null;
  const enc=new TextEncoder().encode(pwd);
  const buf=await crypto.subtle.digest('SHA-256',enc);
  const arr=Array.from(new Uint8Array(buf));
  return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function verifyPassword(pwd){
  const h=await hashPassword(pwd);
  if(!h)return false;
  const mainHash = getMainPasswordHash();
  if(!mainHash) return false;
  // 精确匹配哈希
  if(mainHash === h) return true;
  // 兼容旧数据：如果存储的是明文（4-6位数字），也允许直接匹配
  if(/^\d{4,6}$/.test(mainHash) && mainHash === pwd) return true;
  return false;
}

function hasParentPassword(){
  return !!getMainPasswordHash();
}

// ===== 全局锁：防止同时打开多个密码弹窗 =====
let _passwordModalActive = false;

// 关闭弹窗后 dismiss iOS Safari autofill 建议栏
function dismissAutofill(){
  // 先 blur 当前焦点
  try {
    const active = document.activeElement;
    if (active) active.blur();
  } catch(e) {}
  // 页面滚动1px dismiss autofill 建议栏
  window.scrollBy(0, 1);
  setTimeout(() => window.scrollBy(0, -1), 50);
}

async function showPasswordModal(promptText, cb){
  if(_passwordModalActive){showPasswordError("请关闭上一个验证窗口后再操作");return Promise.resolve(false);}
  if(!hasParentPassword()){showPasswordError("请先设置密码");return Promise.resolve(false);}
  _passwordModalActive = true;
  try{
    const result = await new Promise((resolve)=>{
    const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="2000";
    ov.innerHTML=`<div class="modal-box"><h3>🔒 家长验证</h3><p style="color:var(--muted);font-size:14px;margin-bottom:18px">${promptText}</p>
      <div style="display:flex;justify-content:center;gap:10px;margin-bottom:22px" id="pinDigits"></div>
      <div class="pin-keypad" id="pinKeypad"></div>
      <p style="color:var(--muted);font-size:12px;margin-top:16px">请输入4-6位数字家长密码</p>
    </div>`;
    document.body.appendChild(ov);

    const pinDigits=ov.querySelector("#pinDigits");
    const pinKeypad=ov.querySelector("#pinKeypad");
    let pin="";
    const maxLen=6;

    function renderDigits(){
      let h="";for(let i=0;i<maxLen;i++){
        const filled=i<pin.length;
        h+=`<div class="pin-dot ${filled?'pin-filled':''}">${filled?'●':''}</div>`;
      }pinDigits.innerHTML=h;
    }
    function renderKeypad(){
      let h='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:280px;margin:0 auto">';
      for(const n of [1,2,3,4,5,6,7,8,9,"",0,"del"]){
        if(n==="")h+=`<div></div>`;
        else if(n==="del")h+=`<button class="pin-key pin-del" data-key="del">⌫</button>`;
        else h+=`<button class="pin-key" data-key="${n}">${n}</button>`;
      }
      h+='</div>';
      pinKeypad.innerHTML=h;
    }
    renderDigits();renderKeypad();

    function handleKey(k){
      if(k==="del"){pin=pin.slice(0,-1);renderDigits();return;}
      if(pin.length>=maxLen)return;
      pin+=k;renderDigits();
      if(pin.length>=4){
        ov.querySelectorAll(".pin-key").forEach(b=>b.disabled=true);
        try{ov.querySelector(".pin-del").disabled=true;}catch(e){}
        verifyPassword(pin).then(async ok=>{
          if(ov.parentNode){
            ov.querySelectorAll(".pin-key").forEach(b=>{try{b.disabled=false;}catch(e){}});
            try{ov.querySelector(".pin-del").disabled=false;}catch(e){}
          }
          if(ok){
            if(ov.parentNode)ov.remove();
            try{cb&&await cb();}catch(e){toast("操作失败，请重试");}
            resolve(true);
          }else{
            // 显示错误提示，同时让弹窗抖动一下
            if(ov.parentNode){
              const modal = ov.querySelector(".modal-box");
              if(modal){
                modal.style.animation = "shakeModal 0.4s ease";
                setTimeout(()=>{ if(modal) modal.style.animation = ""; }, 400);
              }
              showPasswordError("密码错误，请重试");
            }
            pin=""; renderDigits();
            ov.querySelectorAll(".pin-key").forEach(b=>{
              try{b.disabled=false;}catch(e){}
            });
            try{ov.querySelector(".pin-del").disabled=false;}catch(e){}
            // 关键修复：必须 resolve(false) 释放锁，否则后续操作全部卡死
            resolve(false);
          }
        }).catch(err=>{
          // verifyPassword 自身出错
          if(ov.parentNode) showPasswordError("验证失败，请重试");
          pin=""; renderDigits();
          ov.querySelectorAll(".pin-key").forEach(b=>{
            try{b.disabled=false;}catch(e){}
          });
          try{ov.querySelector(".pin-del").disabled=false;}catch(e){}
          resolve(false);
        });
      }
    }
    pinKeypad.addEventListener("click",e=>{
      const key=e.target.closest(".pin-key");if(!key)return;
      handleKey(key.dataset.key);
    });
    ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();resolve(false);}});
    ov.addEventListener("keydown",e=>{
      if(/^[0-9]$/.test(e.key))handleKey(e.key);
      else if(e.key==="Backspace")handleKey("del");
    });
    ov.addEventListener("click",()=>ov.focus());
    ov.focus();
  });
    return result;
  } finally {
    _passwordModalActive = false;
    dismissAutofill();
  }
}

function showPasswordError(msg){
  const el=document.createElement("div");
  el.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:14px 28px;border-radius:12px;background:rgba(239,83,80,.92);color:#fff;font-size:16px;font-weight:900;letter-spacing:1px;text-align:center;box-shadow:0 6px 24px rgba(239,83,80,.4);animation:fadeInOut 1.2s forwards";
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{if(el.parentNode)el.remove();},1200);
}

// ===== features/render.js =====
// features/render.js — 所有渲染函数（匹配原始 CSS 结构）

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
function renderAll(){
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
function renderDateLabel(){
  const el = document.getElementById("selectedDateLabel");
  if(!el) return;
  const [y,m,d] = STATE.selDate.split("-").map(Number);
  el.textContent = fmtDisplay(new Date(y, m-1, d));
}

function renderCheckinDateLabel(){
  const el1 = document.getElementById("checkinDateLabel");
  const el2 = document.getElementById("checkinDateBadge");
  if(!el1) return;
  const [y,m,d] = STATE.selDate.split("-").map(Number);
  el1.textContent = fmtDisplay(new Date(y, m-1, d));
  el2.style.display = isToday(STATE.selDate) ? "" : "none";
}

// ===== 宝贝名称 =====
function renderBabyName(){
  const el = document.getElementById("babyName");
  if(!el) return;
  const name = STATE.childName || "宝贝";
  const gender = STATE.childGender || "girl";
  el.innerHTML = `${gender==="boy"?"👦":"👧"} ${esc(name)}`;
}

// ===== 积分显示 =====
function renderPoints(){
  const total = calcTotalScore();
  const el = document.getElementById("topPoints");
  if(el) el.textContent = total;
}

// ===== 日历 =====
function renderCalendar(){
  const now = new Date();
  let calYear = STATE.curCalYear != null ? STATE.curCalYear : now.getFullYear();
  let calMonth = STATE.curCalMonth != null ? STATE.curCalMonth + 1 : now.getMonth() + 1;

  document.getElementById("calMonthLabel").textContent = calYear + "年" + calMonth + "月";

  // 控制日历页面的"今天"标签显示/隐藏
  const dateBadge = document.getElementById("dateBadge");
  if(dateBadge) dateBadge.style.display = isToday(STATE.selDate) ? "" : "none";

  const g = document.getElementById("calGrid");
  if(!g) return;

  const firstDay = new Date(calYear, calMonth-1, 1);
  const lastDate = new Date(calYear, calMonth, 0).getDate();
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
function renderTasks(){
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
async function toggleTask(tid, checked, event){
  if(_toggleLocked){ toast("操作过快，请稍后再试"); return; }
  // 前置校验：必须有宝贝信息
  if(!STATE.childName || !STATE.childName.trim()){
    toast("请先设置宝贝信息哦 👆");
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

function showEncourageMsg(){
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
function renderMap(){
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
function renderTrendChart(){
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
function renderRewards(){
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

async function redeemReward(cost){
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
function renderRedemptions(){
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
function renderReviewTimeline(){
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
async function renderArchive(){
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

// ===== features/parent-center.js =====
// features/parent-center.js — 家长中心、备份、多孩子、任务管理

// ===== 家长中心 =====
function openParentCenter(){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  const hasPwd=STATE.parentPasswordHash?"已设置":"未设置";
  const childCount=(()=>{ try{const m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}"); return m.children?m.children.length:0;}catch(e){return 0;}})();
  const taskCount=(STATE.customTasks||[]).length;
  ov.innerHTML=`<div class="modal-box" style="max-width:420px;max-height:85vh;overflow:auto"><h3>👨‍💼 家长中心</h3>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
      <button class="pc-btn" data-pc="password" style="padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,rgba(255,243,224,.6),rgba(255,224,178,.4));cursor:pointer;text-align:left;font-size:14px;font-weight:800;color:var(--ink);transition:.15s;border:1.5px solid rgba(255,152,0,.3)">
        <span style="font-size:18px">🔒</span> 家长密码 <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:4px">— ${hasPwd}</span>
      </button>
      <button class="pc-btn" data-pc="update" style="padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,rgba(227,242,253,.5),rgba(232,245,233,.4));cursor:pointer;text-align:left;font-size:14px;font-weight:800;color:var(--ink);transition:.15s;border:1.5px solid rgba(41,182,246,.2)">
        <span style="font-size:18px">🔄</span> 检查更新 <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:4px" id="pcUpdateStatus">— 点击检查</span>
      </button>
      <button class="pc-btn" data-pc="backup" style="padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,rgba(227,242,253,.5),rgba(232,245,233,.4));cursor:pointer;text-align:left;font-size:14px;font-weight:800;color:var(--ink);transition:.15s;border:1.5px solid rgba(41,182,246,.2)">
        <span style="font-size:18px">💾</span> 数据备份与恢复 <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:4px">— 导出/导入</span>
      </button>
      <button class="pc-btn" data-pc="tasks" style="padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,#fff3e0,rgba(255,248,225,.6));cursor:pointer;text-align:left;font-size:14px;font-weight:800;color:var(--ink);transition:.15s;border:1.5px solid rgba(255,152,0,.3)">
        <span style="font-size:18px">📋</span> 任务管理 <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:4px">— ${taskCount}个自定义</span>
      </button>
      <button class="pc-btn" data-pc="children" style="padding:14px 18px;border-radius:12px;border:none;background:linear-gradient(135deg,rgba(232,245,233,.5),rgba(227,242,253,.3));cursor:pointer;text-align:left;font-size:14px;font-weight:800;color:var(--ink);transition:.15s;border:1.5px solid rgba(102,187,106,.3)">
        <span style="font-size:18px">👨‍👩‍👧</span> 好多宝宝切换 <span style="font-size:11px;color:var(--muted);font-weight:400;margin-left:4px">— ${childCount}个宝宝</span>
      </button>
    </div>
    <div style="margin-top:14px;text-align:center"><button class="btn-ghost" id="pcClose" style="min-height:36px;padding:8px 24px">关闭</button></div>
  </div>`;
  document.body.appendChild(ov);

  ov.querySelector("[data-pc='password']").addEventListener("click", ()=>{ ov.remove(); openPasswordModal(); });
  ov.querySelector("[data-pc='backup']").addEventListener("click", ()=>{ ov.remove(); openBackupModal(); });
  ov.querySelector("[data-pc='tasks']").addEventListener("click", ()=>{ ov.remove(); openTaskManager(); });
  ov.querySelector("[data-pc='children']").addEventListener("click", ()=>{ ov.remove(); openChildrenModal(); });
  ov.querySelector("[data-pc='update']").addEventListener("click", (e)=>{ e.stopPropagation(); checkForUpdate(ov.querySelector("#pcUpdateStatus")); });
  ov.querySelector("#pcClose").addEventListener("click", ()=>{ov.remove();dismissAutofill();});
  ov.addEventListener("click", e=>{ if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== 密码弹窗 =====
function openPasswordModal(){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  const hasPwd=hasParentPassword();
  ov.innerHTML=`<div class="modal-box" style="max-width:380px"><h3>🔒 家长密码</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:14px">${hasPwd?"已设置家长密码。修改或清除需验证旧密码。":"设置4-6位数字密码，保护敏感操作。"}</p>
    ${hasPwd?'<div style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:800;font-size:13px">旧密码（验证）</label><input id="pcPwdOld" type="password" autocomplete="new-password" placeholder="4-6位数字" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="width:100%;min-height:38px;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:15px;box-sizing:border-box;outline:none"></div>':''}
    <div style="margin-bottom:14px">
      <label style="display:block;margin-bottom:6px;font-weight:800;font-size:13px">${hasPwd?"新密码（留空不变）":"设置密码"}</label>
      <input id="pcPwdNew" type="password" autocomplete="new-password" placeholder="4-6位数字" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="width:100%;min-height:38px;padding:8px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:15px;box-sizing:border-box;outline:none">
    </div>
    <div class="modal-actions">
      ${hasPwd?'<button class="btn-ghost" id="pcPwdClear" style="color:var(--red)">清除密码</button>':''}
      <button class="btn-ghost" id="pcPwdCancel">取消</button>
      <button class="btn-primary" id="pcPwdSave">保存</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#pcPwdCancel").addEventListener("click",()=>ov.remove());
  ov.querySelector("#pcPwdSave").addEventListener("click",async()=>{
    const pwdNew=ov.querySelector("#pcPwdNew").value.trim();
    if(hasPwd){
      const pwdOld=ov.querySelector("#pcPwdOld").value.trim();
      if(!pwdOld){toast("请先验证旧密码");return;}
      if(!/^\d{4,6}$/.test(pwdOld)){toast("旧密码需4-6位数字");return;}
      const ok = await showPasswordModal("修改密码需要验证旧密码",()=>{});
      if(!ok){toast("旧密码错误");return;}
    }
    if(pwdNew){
      if(!/^\d{4,6}$/.test(pwdNew)){toast("密码需4-6位数字");return;}
      // 密码必须先做 SHA-256 哈希再存储，验证时也是哈希对比
      const pwdNewHash = await hashPassword(pwdNew);
      const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      mainData.parentPasswordHash = pwdNewHash;
      localStorage.setItem("summerGrowthBankV2", JSON.stringify(mainData));
      STATE.parentPasswordHash = pwdNewHash;
      toast("家长密码已修改 🔒");
      ov.remove();
      dismissAutofill();
    } else {
      toast("新密码留空，密码未修改");
      ov.remove();
      dismissAutofill();
    }
  });
  if(hasPwd){
    ov.querySelector("#pcPwdClear").addEventListener("click",async()=>{
      const pwdOld=ov.querySelector("#pcPwdOld").value.trim();
      if(!pwdOld){toast("请先验证旧密码");return;}
      if(!/^\d{4,6}$/.test(pwdOld)){toast("旧密码需4-6位数字");return;}
      // 清除密码 — 写入 main localStorage
      const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      mainData.parentPasswordHash = "";
      localStorage.setItem("summerGrowthBankV2", JSON.stringify(mainData));
      STATE.parentPasswordHash = "";
      toast("家长密码已清除");
      ov.remove();
      dismissAutofill();
    });
  }
  ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== 备份弹窗 =====
function openBackupModal(){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  ov.innerHTML=`<div class="modal-box"><h3>💾 数据备份与恢复</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:14px">导出备份到本地，换设备后可一键恢复。导入会覆盖当前数据。</p>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn-primary" id="pcExportBtn" style="flex:1;min-height:40px;padding:10px;font-size:13px;background:linear-gradient(90deg,#42a5f5,#66bb6a);box-shadow:0 4px 12px rgba(41,182,246,.3)">📤 导出备份</button>
      <button class="btn-ghost" id="pcImportBtn" style="flex:1;min-height:40px;padding:10px;font-size:13px;color:#1565c0;border-color:rgba(41,182,246,.3)">📥 导入恢复</button>
    </div>
    <button class="btn-ghost" id="pcBackupClose" style="min-height:36px;padding:8px 24px">关闭</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#pcExportBtn").addEventListener("click", async()=>{
    const ok = await showPasswordModal("导出备份需要家长密码确认", ()=>{});
    if(!ok) return;
    const mainData = (()=>{ try{return JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");}catch(e){return {};}})();
    const exportData={version:3,exportedAt:new Date().toISOString(),data:STATE,main:{children: mainData.children || [],parentPasswordHash: mainData.parentPasswordHash || ""}};
    if(STATE.activeChildId && STATE.activeChildId!=='default'){
      const childRaw = localStorage.getItem("summerGrowthBankV2_child_"+STATE.activeChildId);
      if(childRaw) exportData.childData = JSON.parse(childRaw);
    }
    const blob=new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`成长银行备份_${new Date().toISOString().slice(0,10)}.json`;a.click();
    URL.revokeObjectURL(url);toast("备份已下载 📦");
  });
  ov.querySelector("#pcImportBtn").addEventListener("click", async()=>{
    const fi=document.createElement("input");fi.type="file";fi.accept=".json";
    fi.onchange=async()=>{
      const file=fi.files[0];if(!file)return;
      try{
        const text=await file.text();const parsed=JSON.parse(text);
        const ok = await showPasswordModal("导入恢复会替换所有数据，请输入家长密码确认", ()=>{});
        if(!ok) return;
        const main = parsed.main || {};
        localStorage.setItem("summerGrowthBankV2", JSON.stringify({children: main.children || [],parentPasswordHash: main.parentPasswordHash || "",activeChildId: main.activeChildId || null}));
        if(parsed.data){
          localStorage.setItem("summerGrowthBankV2", JSON.stringify({...(JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}")), ...parsed.data}));
        }
        if(parsed.childData){
          localStorage.setItem("summerGrowthBankV2_child_"+(parsed.data&&parsed.data.activeChildId||STATE.activeChildId||'default'), JSON.stringify(parsed.childData));
        }
        toast("数据已恢复，请刷新页面 🎉");
        ov.remove();
      }catch(e){toast("文件解析失败 🚫");}
    };
    fi.click();
  });
  ov.querySelector("#pcBackupClose").addEventListener("click", ()=>{ov.remove();dismissAutofill();});
  ov.addEventListener("click", e=>{ if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== 多孩子切换弹窗 =====
function openChildrenModal(){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  ov.innerHTML=`<div class="modal-box"><h3>👨‍👩‍👧 好多宝宝切换</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:14px">添加孩子后，各自成长档案完全隔离。最多3个孩子。</p>
    <div id="pcChildrenList" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;min-height:30px"></div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn-primary" id="pcAddChildBtn" style="min-height:36px;padding:8px 14px;font-size:13px">+ 添加孩子</button>
    </div>
    <button class="btn-ghost" id="pcChildrenClose" style="min-height:36px;padding:8px 24px">关闭</button></div>`;
  document.body.appendChild(ov);

  function getChildren(){
    const m = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
    return m.children || [];
  }

  function render(){
    const cl=ov.querySelector("#pcChildrenList");
    const childrenList = getChildren();
    if(!childrenList||childrenList.length===0){
      cl.innerHTML='<div style="color:var(--muted);font-size:11px;padding:4px">暂无宝宝，先添加一个吧～</div>';
      ov.querySelector("#pcAddChildBtn").textContent="添加孩子";
      ov.querySelector("#pcAddChildBtn").disabled=false;
      return;
    }
    const currentId=STATE.activeChildId||"default";
    let html='';
    childrenList.forEach(c=>{
      const isActive=c.id===currentId;
      const emoji=c.gender==='boy'?'👦':'👧';
      html+=`<div class="child-card" data-cid="${c.id}" style="display:flex;align-items:center;gap:4px;padding:6px 14px 6px 6px;border-radius:999px;font-size:12px;font-weight:800;border:2px solid ${isActive?'var(--leaf)':'rgba(0,0,0,.1)'};background:${isActive?'var(--mint)':'rgba(255,255,255,.7)'};cursor:pointer;color:${isActive?'var(--leaf-dark)':'var(--ink)'};transition:.15s;user-select:none">
        <button class="child-select" style="padding:6px 14px;border:none;background:transparent;cursor:pointer;font-size:12px;font-weight:800;color:inherit">${emoji} ${esc(c.name)}${isActive?' ✓':''}</button>
        <button class="child-delete-btn" style="padding:4px 6px;border:none;background:rgba(239,83,80,.12);color:var(--red);font-size:14px;cursor:pointer;border-radius:6px;font-weight:900;line-height:1;flex-shrink:0" title="删除">${isActive?'⋯':'✕'}</button>
      </div>`;
    });
    cl.innerHTML=html;
    cl.querySelectorAll(".child-select").forEach(b=>{
      b.addEventListener("click",(e)=>{e.stopPropagation();saveData();ov.remove();switchChildFromParentCenter(b.parentElement.dataset.cid);});
    });
    cl.querySelectorAll(".child-card").forEach(card=>{
      card.addEventListener("click",(e)=>{if(e.target.closest(".child-delete-btn"))return;saveData();ov.remove();switchChildFromParentCenter(card.dataset.cid);});
    });
    cl.querySelectorAll(".child-delete-btn").forEach(btn=>{
      btn.addEventListener("click",(e)=>{e.stopPropagation();deleteChild(btn.parentElement.dataset.cid, ov);});
    });
    ov.querySelector("#pcAddChildBtn").textContent=childrenList.length>=3?"已达上限":"+ 添加";
    ov.querySelector("#pcAddChildBtn").disabled=childrenList.length>=3;
  }
  render();

  ov.querySelector("#pcAddChildBtn").addEventListener("click",()=>{
    const ov2=document.createElement("div");ov2.className="modal-overlay";ov2.style.zIndex="2000";
    ov2.innerHTML='<div class="modal-box" style="max-width:380px"><h3>添加孩子</h3>'
      +'<div style="margin:14px 0"><label style="font-weight:800;font-size:13px">名字</label>'
      +'<input id="pcAddName" placeholder="输入孩子名字" autocomplete="new-password" style="width:100%;min-height:36px;padding:8px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:13px;outline:none;margin-top:6px;box-sizing:border-box"></div>'
      +'<div style="margin:14px 0"><label style="font-weight:800;font-size:13px">性别</label>'
      +'<select id="pcAddGender" style="width:100%;min-height:36px;padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:13px;margin-top:6px"><option value="girl">👧 女孩</option><option value="boy">👦 男孩</option></select></div>'
      +'<div style="margin:14px 0"><label style="font-weight:800;font-size:13px">配色主题</label>'
      +'<select id="pcAddTheme" style="width:100%;min-height:36px;padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:13px;margin-top:6px"><option value="sakura">🌸 樱花粉</option><option value="ocean">🌊 海洋蓝</option><option value="forest">🌿 森林绿</option><option value="sunset">☀️ 阳光橙</option><option value="starry">⭐ 星夜紫</option></select></div>'
      +'<div class="modal-actions"><button class="btn-ghost" id="pcAddCancel">取消</button><button class="btn-primary" id="pcAddOk">添加</button></div></div>';
    document.body.appendChild(ov2);
    ov2.querySelector("#pcAddCancel").addEventListener("click",()=>{ov2.remove();dismissAutofill();});
    ov2.querySelector("#pcAddOk").addEventListener("click",()=>{
      const name=ov2.querySelector("#pcAddName").value.trim();
      if(!name){toast("请输入名字");return;}
      const existingChildren = (()=>{ try{return JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}").children||[];}catch(e){return [];}})();
      if(existingChildren.some(c=>c.name===name)){toast("已有同名宝宝，换个名字吧");return;}
      const doAdd=()=>{
        const id="child_"+Date.now();
        try{
          const m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
          if(!m.children)m.children=[];
          m.children.push({id,name,gender:ov2.querySelector("#pcAddGender").value,theme:ov2.querySelector("#pcAddTheme").value});
          localStorage.setItem("summerGrowthBankV2",JSON.stringify(m));
        }catch(e){toast("保存失败");return;}
        toast(`${name}已添加 👶`);
        ov2.remove();ov.remove();openChildrenModal();
      };
      showPasswordModal("添加孩子需要家长密码验证",doAdd);
    });
  });
  ov.querySelector("#pcChildrenClose").addEventListener("click",()=>{ov.remove();dismissAutofill();});
  ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== Switch child =====
function switchChildFromParentCenter(id){
  let mainChildren=[];
  let mainPasswordHash="";
  let mainCustomRewards={};
  try{const m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");mainChildren=m.children||[];mainPasswordHash=m.parentPasswordHash||"";mainCustomRewards=m.customRewards||{};}catch(e){}
  if(id==='default'){
    try{const savedMain=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");setStateFromSaved(savedMain);}catch(e){setStateFromSaved(loadData());}
    // Bug 4 修复：切换孩子后重置 selDate 到今天
    const todayStr = getTodayStr();
    STATE.selDate = todayStr;
    STATE.curCalYear = new Date().getFullYear();
    STATE.curCalMonth = new Date().getMonth();
    // 校验 childName：如果不在 children 列表中则清除
    if(STATE.childName && mainChildren.length > 0 && !mainChildren.some(c => c.name === STATE.childName)){
      STATE.childName = "";
    }
    STATE.activeChildId=null;
    localStorage.setItem("summerGrowthBankV2",JSON.stringify(STATE));
  }else{
    const childKey="summerGrowthBankV2_child_"+id;
    const saved=localStorage.getItem(childKey);
    if(saved){
      try{const parsed=JSON.parse(saved);setStateFromSaved(parsed);}catch(e){setStateFromSaved(loadData());}
    }else{
      const child=mainChildren.find(c=>c.id===id);
      if(child){setStateFromFresh();STATE.childName=child.name;STATE.childGender=child.gender||"girl";STATE.theme=child.theme||"sakura";}else{setStateFromSaved(loadData());}
    }
    // Bug 4 修复：切换孩子后重置 selDate 到今天
    const todayStr = getTodayStr();
    STATE.selDate = todayStr;
    STATE.curCalYear = new Date().getFullYear();
    STATE.curCalMonth = new Date().getMonth();
    // 校验 childName：如果不在 children 列表中则清除
    if(STATE.childName && mainChildren.length > 0 && !mainChildren.some(c => c.name === STATE.childName)){
      STATE.childName = "";
    }
    STATE.parentPasswordHash = mainPasswordHash;
    STATE.customRewards = mainCustomRewards; // sync custom rewards from main
    STATE.activeChildId=id;
    STATE.children=mainChildren;
    localStorage.setItem(childKey,JSON.stringify(STATE));
  }
  applyTheme();renderAll();
  clearDailyReminderFlag();requestNotificationPermission();scheduleDailyReminder();checkGrowthReportDay();
}

// Helper: mutate STATE object in place (keeps all references alive)
function setStateFromSaved(obj){
  Object.keys(STATE).forEach(k => { STATE[k] = undefined; });
  Object.assign(STATE, obj);
}
function setStateFromFresh(){
  const f = freshState();
  Object.keys(STATE).forEach(k => { STATE[k] = undefined; });
  Object.assign(STATE, f);
}

// ===== Delete child =====
function deleteChild(cid, modalOverlay){
  const childrenList = (()=>{ try{return (JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}").children||[]);}catch(e){return [];}})();
  if(childrenList.length <= 1){toast("至少保留一个宝宝哦");return;}
  const child = childrenList.find(c=>c.id===cid);
  if(!child){toast("未找到该孩子");return;}
  showPasswordModal(`确定要删除「${esc(child.name)}」吗？删除后所有打卡记录将丢失，不可恢复。`, async()=>{
    try{
      const m = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      const idx = (m.children|| []).findIndex(c=>c.id===cid);
      if(idx>=0) m.children.splice(idx, 1);
      localStorage.setItem("summerGrowthBankV2", JSON.stringify(m));
      localStorage.removeItem("summerGrowthBankV2_child_"+cid);
      if(STATE.activeChildId === cid){
        const remaining = childrenList.filter(c=>c.id!==cid);
        if(remaining.length>0){switchChildFromParentCenter(remaining[0].id);}
        else {setStateFromSaved(loadData());applyTheme();renderAll();}
        if(modalOverlay && modalOverlay.parentElement)modalOverlay.remove();
      } else {
        if(modalOverlay && modalOverlay.parentElement){modalOverlay.remove();openChildrenModal();}
        else {openChildrenModal();}
      }
      toast(`${child.name} 已删除`);
    }catch(e){toast("删除失败");}
  });
}

// ===== 检查更新 =====
async function checkForUpdate(statusEl){
  if(!statusEl)return;
  statusEl.textContent="— 检查中…";
  try{
    const r=await fetch("sw.js?v="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("network");
    const text=await r.text();
    const m=text.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
    if(!m)throw new Error("parse");
    const remoteVer=m[1];
    const localVer=window.localSWVersion||"";
    if(remoteVer===localVer){
      statusEl.textContent=`— 已是最新版 ${localVer}`;
      toast("已是最新版本 ✅");
    }else{
      // 用 DOM 元素 + addEventListener 替代 innerHTML inline onclick（沙箱兼容）
      const btn = document.createElement("button");
      btn.className = "btn-primary";
      btn.textContent = "立即更新";
      btn.style.cssText = "margin-left:6px;padding:3px 10px;font-size:11px;border-radius:6px";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.applySWUpdate(statusEl);
      });
      statusEl.textContent = "";
      statusEl.innerHTML = `— 发现新版本 ${remoteVer}！`;
      statusEl.appendChild(btn);
      toast("发现新版本 🎉");
    }
  }catch(e){
    statusEl.textContent="— 检查失败，请重试";
    toast("无法检查更新 🚫");
  }
}

// ===== 任务管理 =====
function openTaskManager(){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  ov.innerHTML=`<div class="modal-box" style="max-width:540px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column"><h3>📋 任务管理</h3>
    <p style="color:var(--muted);font-size:12px;margin-bottom:10px">管理所有打卡任务。所有操作需家长密码。</p>
    <div style="text-align:left;margin-bottom:10px;padding:10px;border-radius:10px;background:rgba(255,255,255,.7);border:1.5px solid rgba(255,202,40,.2)">
      <h4 style="margin:0 0 6px;font-size:13px">➕ 新增任务</h4>
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input id="newTaskTitle" placeholder="任务名称" autocomplete="new-password" style="flex:2;min-height:34px;padding:6px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:12px;outline:none">
        <select id="newTaskCat" style="flex:1;min-height:34px;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:11px">
          <option value="学习力">学习力</option><option value="运动力">运动力</option><option value="自控力">自控力</option><option value="探索力">探索力</option><option value="实践力">实践力</option>
        </select>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <label style="font-size:12px;font-weight:800">积分</label>
        <select id="newTaskPts" style="min-height:34px;padding:6px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:12px">
          <option value="1">1分</option><option value="2">2分</option><option value="3">3分</option>
        </select>
        <button class="btn-primary" id="addTaskBtn" style="margin-left:auto;min-height:34px;padding:6px 14px;font-size:12px">添加</button>
      </div>
      <div id="newTaskList" style="margin-top:6px;font-size:12px;color:var(--muted)"></div>
    </div>
    <div id="taskListContainer" style="flex:1;overflow:auto;max-height:360px;margin-bottom:10px"></div>
    <div class="modal-actions"><button class="btn-ghost" id="taskModalCancel">关闭</button><button class="btn-primary" id="taskModalSave">保存并应用</button></div></div>`;
  document.body.appendChild(ov);

  let workingDeleteIds = new Set();
  let pendingNewTasks = [];

  function getActiveTasks(){
    const base = STATE.modifiedDefaultTasks ? [...STATE.modifiedDefaultTasks] : [...TASKS];
    if(STATE.customTasks && STATE.customTasks.length > 0) base.push(...STATE.customTasks);
    return base;
  }

  function genTaskId(){return "t_"+Date.now()+"_"+Math.random().toString(36).slice(2,6);}

  function renderTasks(){
    const tc = ov.querySelector("#taskListContainer");
    const allTasks = getActiveTasks();
    tc.innerHTML = allTasks.map((t,i)=>{
      if(workingDeleteIds.has(i)) return "";
      const isCustom = STATE.customTasks && STATE.customTasks.some(ct=>ct.id===t.id);
      return `<div class="task-manage-row" data-idx="${i}">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;flex-wrap:wrap">
          <span style="width:6px;height:6px;border-radius:50%;background:${isCustom?'var(--gold)':'var(--leaf)'};flex-shrink:0"></span>
          <input class="task-edit-title" data-idx="${i}" autocomplete="new-password" value="${esc(t.title)}" style="font-size:13px;flex:1;min-width:80px;padding:3px 6px;border-radius:6px;border:1px solid rgba(0,0,0,.12);background:rgba(255,255,255,.9);outline:none;font-weight:700">
          <select class="task-edit-cat" data-idx="${i}" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid rgba(0,0,0,.12);background:#fff">
            <option value="学习力" ${t.cat==='学习力'?'selected':''}>学习力</option><option value="运动力" ${t.cat==='运动力'?'selected':''}>运动力</option><option value="自控力" ${t.cat==='自控力'?'selected':''}>自控力</option><option value="探索力" ${t.cat==='探索力'?'selected':''}>探索力</option><option value="实践力" ${t.cat==='实践力'?'selected':''}>实践力</option>
          </select>
          <select class="task-edit-pts" data-idx="${i}" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid rgba(0,0,0,.12);width:48px;background:#fff">
            <option value="1" ${t.pts===1?'selected':''}>1分</option><option value="2" ${t.pts===2?'selected':''}>2分</option><option value="3" ${t.pts===3?'selected':''}>3分</option>
          </select>
          <span style="color:var(--muted);font-size:10px">${isCustom?'自定义':'默认'}</span>
        </div>
        <button class="task-del-btn" data-idx="${i}" style="padding:5px 10px;border-radius:8px;border:none;background:rgba(239,83,80,.1);color:var(--red);font-size:14px;cursor:pointer;flex-shrink:0">✕</button>
      </div>`;
    }).join("");
    tc.querySelectorAll(".task-del-btn").forEach(b=>{
      b.addEventListener("click",()=>{
        const idx = parseInt(b.dataset.idx);
        // 删除时只标记，不弹密码；密码在保存时统一验证
        showPasswordError("已标记删除，点击「保存并应用」后需验证密码");
        workingDeleteIds.add(idx);
        renderTasks();
      });
    });
  }

  function saveWorking(){
    const allTasks = getActiveTasks();
    const newDefaults = [];
    const newCustoms = [];
    allTasks.forEach((t,i)=>{
      if(workingDeleteIds.has(i)) return;
      const isCustom = STATE.customTasks && STATE.customTasks.some(ct=>ct.id===t.id);
      const titleEl = ov.querySelector(`.task-edit-title[data-idx="${i}"]`);
      const catEl = ov.querySelector(`.task-edit-cat[data-idx="${i}"]`);
      const ptsEl = ov.querySelector(`.task-edit-pts[data-idx="${i}"]`);
      const newTitle = titleEl ? titleEl.value.trim() : t.title;
      const newCat = catEl ? catEl.value : t.cat;
      const newPts = ptsEl ? parseInt(ptsEl.value) : t.pts;
      if(!newTitle) return;
      const task = {id:t.id, title:newTitle, cat:newCat, pts:newPts};
      if(isCustom) newCustoms.push(task); else newDefaults.push(task);
    });
    STATE.modifiedDefaultTasks = newDefaults;
    STATE.customTasks = newCustoms;
    pendingNewTasks.forEach(t => { if(!STATE.customTasks) STATE.customTasks = []; STATE.customTasks.push(t); });
    pendingNewTasks = [];
    saveData();
  }

  renderTasks();

  ov.querySelector("#addTaskBtn").addEventListener("click",()=>{
    const title = ov.querySelector("#newTaskTitle").value.trim();
    const cat = ov.querySelector("#newTaskCat").value;
    const pts = parseInt(ov.querySelector("#newTaskPts").value);
    if(!title){toast("请输入任务名称");return;}
    pendingNewTasks.push({id:genTaskId(), title, pts, cat});
    ov.querySelector("#newTaskTitle").value="";
    renderTasks();
    toast(`${title} 已暂存 ✅`);
  });
  ov.querySelector("#newTaskTitle").addEventListener("keydown",e=>{if(e.key==="Enter") ov.querySelector("#addTaskBtn").click();});
  ov.querySelector("#taskModalSave").addEventListener("click", async ()=>{
    const ok = await showPasswordModal("保存任务修改需要家长密码验证", ()=>{
      saveWorking();
      ov.remove();
      renderAll();
    });
  });
  ov.querySelector("#taskModalCancel").addEventListener("click",()=>{ov.remove();dismissAutofill();});
  ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== main.js =====
// main.js — 应用入口，连接所有模块

// ===== Init =====
// Load data from localStorage into a local variable
let _localData = loadData();

// Load active child data on init
if(_localData.activeChildId && _localData.activeChildId!=='default'){
  try{
    const childKey = "summerGrowthBankV2_child_"+_localData.activeChildId;
    const saved = localStorage.getItem(childKey);
    if(saved){
      const parsed = JSON.parse(saved);
      _localData = {...freshState(), ...parsed};
    } else {
      const mainData = loadData();
      mainData.activeChildId = null;
      _localData = mainData;
    }
  }catch(e){
    const mainData = loadData();
    mainData.activeChildId = null;
    _localData = mainData;
  }
}

// Sync customRewards from main localStorage (shared across all children)
try{
  const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
  if(mainData.customRewards){ _localData.customRewards = mainData.customRewards; }
  if(mainData.parentPasswordHash){ _localData.parentPasswordHash = mainData.parentPasswordHash; }
}catch(e){}

// Sync loaded data into shared STATE — this makes STATE the single source of truth
// `data` is an alias for STATE, so all modules see the same data
setData(_localData);
setSelDate(localDateStr(new Date()));

// Local SW version for update detection
let localSWVersion = "";

// ===== Global functions (for inline event handlers) =====
window.applySWUpdate = async function(el){
  // 沙箱/本地环境无 service worker 时，直接刷新页面即可获取更新
  if(!navigator.serviceWorker||!navigator.serviceWorker.controller){
    toast("正在刷新获取更新…");
    window.location.reload();
    return;
  }
  const reg=await navigator.serviceWorker.ready;
  const waiting=reg.waiting;
  if(waiting){
    toast("有新版本，正在激活…");
    navigator.serviceWorker.addEventListener('message', function handler(e){
      if(e.data&&e.data.type==='UPDATE_AVAILABLE')window.location.reload();
    });
    waiting.postMessage({type:'SKIP_WAITING'});
    setTimeout(()=>window.location.reload(), 2000);
  } else {
    // 无 waiting worker，直接刷新（PWA 更新通常需要先 reload 才能检测到 waiting）
    window.location.reload();
  }
};

// ===== Apply theme & render =====
function applyTheme(){
  const t=data.theme||"sakura";
  document.body.dataset.theme=t;
  const mc=document.querySelector("meta[name=theme-color]");
  if(mc){
    const colors={sakura:"#ff7043",ocean:"#42a5f5",forest:"#66bb6a",sunset:"#ff9800",starry:"#7e57c2"};
    mc.content=colors[t]||"#ff7043";
  }
}

// ===== Event listeners =====
// Main tabs
document.querySelectorAll("#mainTabNav button").forEach(b=>b.addEventListener("click",()=>{
  const tab=b.dataset.maintab;
  document.querySelectorAll("#mainTabNav button").forEach(x=>x.classList.toggle("active",x.dataset.maintab===tab));
  document.querySelectorAll(".main-tab-content").forEach(x=>x.style.display=x.id==="mtab-"+tab?"block":"none");
  if(tab==="archive")renderArchive();
  if(tab==="checkin"){STATE.selCat="学习力";renderCheckinDateLabel();}
}));

// Archive sub-tabs
document.querySelectorAll("#archiveSubTabs button").forEach(b=>b.addEventListener("click",()=>{
  const sub=b.dataset.asub;
  document.querySelectorAll("#archiveSubTabs button").forEach(x=>x.classList.toggle("active",x.dataset.asub===sub));
  document.querySelectorAll(".archive-sub").forEach(x=>x.style.display=x.id==="asub-"+sub?"block":"none");
  if(sub==="works"){renderArchive();renderWorksDropdown();}
  if(sub==="review"){renderMap();renderTrendChart();renderReviewTimeline();}
}));

// Baby name click
document.getElementById("babyName")?.addEventListener("click", function(){
  if(!data) return;
  const currentName=data.childName||"";
  const currentGender=data.childGender||"girl";
  const boyChecked=currentGender==="boy"?"checked":"";
  const girlChecked=currentGender==="girl"?"checked":"";
  const curTheme=data.theme||"sakura";
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  ov.innerHTML='<div class="modal-box" style="max-width:420px"><h3>设置宝贝信息</h3>'+
    '<div style="text-align:left;margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-weight:800;font-size:14px;color:var(--ink)">名字</label><input id="babyNameInput" placeholder="输入宝贝的名字" value="'+esc(currentName)+'" autocomplete="new-password" style="width:100%;min-height:42px;padding:10px 12px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:15px;box-sizing:border-box;outline:none" autofocus></div>'+
    '<div style="text-align:left;margin-bottom:14px"><label style="display:block;margin-bottom:8px;font-weight:800;font-size:14px;color:var(--ink)">性别</label><div style="display:flex;gap:16px"><label style="display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;border:2px solid rgba(0,0,0,.1);cursor:pointer;font-size:15px;font-weight:700;transition:.15s" class="gender-opt" data-gender="boy"><input type="radio" name="babyGender" value="boy" '+boyChecked+' style="accent-color:var(--sky);width:18px;height:18px;cursor:pointer">👦 男孩</label><label style="display:flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;border:2px solid rgba(0,0,0,.1);cursor:pointer;font-size:15px;font-weight:700;transition:.15s" class="gender-opt" data-gender="girl"><input type="radio" name="babyGender" value="girl" '+girlChecked+' style="accent-color:var(--rose);width:18px;height:18px;cursor:pointer">👧 女孩</label></div></div>'+
    '<div style="text-align:left;margin-bottom:18px"><label style="display:block;margin-bottom:8px;font-weight:800;font-size:14px;color:var(--ink)">配色主题</label><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
    ['sakura','ocean','forest','sunset','starry'].map(t=>`<label class="theme-opt" data-theme="${t}" style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;border:2px solid ${curTheme===t?'var(--leaf)':'rgba(0,0,0,.1)'};cursor:pointer;font-size:13px;font-weight:700;transition:.15s;background:${curTheme===t?'var(--mint)':'transparent'}"><input type="radio" name="babyTheme" value="${t}" ${curTheme===t?'checked':''} style="accent-color:var(--leaf);cursor:pointer"> ${t==="sakura"?"🌸 樱花粉":t==="ocean"?"🌊 海洋蓝":t==="forest"?"🌿 森林绿":t==="sunset"?"☀️ 阳光橙":"⭐ 星夜紫"}</label>`).join('')+
    '</div></div>'+
    '<div class="modal-actions"><button class="btn-ghost" id="babyModalCancel">取消</button><button class="btn-primary" id="babyModalOk">确认</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelectorAll(".gender-opt").forEach(l=>l.addEventListener("click",function(){ov.querySelectorAll(".gender-opt").forEach(x=>x.style.borderColor="rgba(0,0,0,.1)");l.style.borderColor="var(--leaf)";l.querySelector("input").checked=true;}));
  ov.querySelectorAll(".theme-opt").forEach(l=>l.addEventListener("click",function(){ov.querySelectorAll(".theme-opt").forEach(x=>{x.style.borderColor="rgba(0,0,0,.1)";x.style.background="transparent";});l.style.borderColor="var(--leaf)";l.querySelector("input").checked=true;}));
  function save(){
    var name=ov.querySelector("#babyNameInput").value.trim();
    var genderEl=ov.querySelector("input[name='babyGender']:checked");
    var gender=genderEl?genderEl.value:"girl";
    var themeEl=ov.querySelector("input[name='babyTheme']:checked");
    var theme=themeEl?themeEl.value:"sakura";
    if(!name){toast("请输入宝贝的名字");return;}
    data.childName=name;data.childGender=gender;data.theme=theme;saveData();
    try{
      var m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      if(!m.children)m.children=[];
      if(data.activeChildId && data.activeChildId!=="default"){
        var idx=-1;
        for(var i=0;i<m.children.length;i++){if(m.children[i].id===data.activeChildId){idx=i;break;}}
        if(idx>=0){m.children[idx].name=name;m.children[idx].gender=gender;m.children[idx].theme=theme;m.activeChildId=data.activeChildId;}
      } else {
        if(m.children.length>0){m.children[0].name=name;m.children[0].gender=gender;m.children[0].theme=theme;m.activeChildId=m.children[0].id;data.activeChildId=m.children[0].id;}
        else {m.children.push({id:"child_"+Date.now(),name:name,gender:gender,theme:theme});m.activeChildId=m.children[0].id;data.activeChildId=m.children[0].id;}
      }
      localStorage.setItem("summerGrowthBankV2",JSON.stringify(m));
    }catch(e){}
    applyTheme();renderBabyName();
    toast("已更新为："+(gender==="boy"?"👦":"👧")+" "+name+"宝贝");
    ov.remove();
    dismissAutofill();
  }
  ov.querySelector("#babyModalOk").addEventListener("click",save);
  ov.querySelector("#babyModalCancel").addEventListener("click",function(){ov.remove();dismissAutofill();});
  ov.addEventListener("click",function(e){if(e.target===ov){ov.remove();dismissAutofill();}});
  ov.querySelector("#babyNameInput").addEventListener("keydown",function(e){if(e.key==="Enter")save();});
});

// Parent center button
document.getElementById("parentCenterBtn")?.addEventListener("click", openParentCenter);

// ===== Review save =====
document.getElementById("saveReview")?.addEventListener("click", () => {
  // 前置校验：必须有宝贝信息
  if(!STATE.childName || !STATE.childName.trim()){
    toast("请先设置宝贝信息哦 👆");
    return;
  }
  const now = new Date();
  const rev = {
    date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
    best: document.getElementById("revBest").value.trim(),
    hard: document.getElementById("revHard").value.trim(),
    next: document.getElementById("revNext").value.trim(),
    parent: document.getElementById("revParent").value.trim(),
    support: document.getElementById("revSupport").value.trim(),
    editIdx: document.getElementById("revEditIdx")?.value ? parseInt(document.getElementById("revEditIdx").value) : -1
  };
  // 至少填写任意一项（5个字段都可作为有效内容）
  if(!rev.best && !rev.hard && !rev.next && !rev.parent && !rev.support){ toast("请至少填写一项复盘内容"); return; }

  if(rev.editIdx >= 0 && rev.editIdx < STATE.reviews.length){
    // 编辑模式：更新已有复盘
    STATE.reviews[rev.editIdx] = { ...STATE.reviews[rev.editIdx], ...rev };
    delete STATE.reviews[rev.editIdx].editIdx;
    toast("复盘已更新 ✏️");
  } else {
    // 新增模式
    STATE.reviews.unshift(rev);
    toast("复盘已保存，看见进步就是最好的成长。");
  }

  // 清空编辑状态
  const editIdxInput = document.getElementById("revEditIdx");
  if(editIdxInput) editIdxInput.value = "";

  saveData();
  ["revBest","revHard","revNext","revParent","revSupport"].forEach(id => document.getElementById(id).value = "");
  renderReviewTimeline();
});

// ===== Works =====
let workFile = null;

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function renderWorksDropdown(){
  const s = document.getElementById("workTask");
  if(!s) return;
  const day = getDay(STATE.selDate);
  const doneTaskIds = day.tasks ? Object.keys(day.tasks) : [];
  const allTasks = [...(STATE.modifiedDefaultTasks||[]), ...(STATE.customTasks||[])];
  const tasks = allTasks.length > 0 ? allTasks : TASKS;
  const doneTasks = tasks.filter(t => doneTaskIds.includes(t.id));
  s.innerHTML = '<option value="">-- 关联打卡任务 --</option>' +
    doneTasks.map(t => `<option value="${t.id}">${t.title} (${t.cat})</option>`).join("");
}

document.getElementById("workMedia")?.addEventListener("change", e => {
  const f = e.target.files[0];
  workFile = f || null;
  const p = document.getElementById("mediaPreview");
  if(!f){ p.classList.remove("show"); p.innerHTML = ""; return; }
  p.classList.add("show");
  const url = URL.createObjectURL(f);
  if(f.type.startsWith("image/")) p.innerHTML = `<img src="${url}" alt="预览">`;
  else if(f.type.startsWith("video/")) p.innerHTML = `<video src="${url}" controls playsinline></video>`;
  else if(f.type.startsWith("audio/")) p.innerHTML = `<audio src="${url}" controls style="width:100%"></audio>`;
  else p.innerHTML = `<div style="padding:12px">已选择：${esc(f.name)}</div>`;
});

document.getElementById("saveWork")?.addEventListener("click", async () => {
  // 前置校验：必须有宝贝信息
  if(!STATE.childName || !STATE.childName.trim()){
    toast("请先设置宝贝信息哦 👆");
    return;
  }
  const tid = document.getElementById("workTask").value;
  const title = document.getElementById("workTitle").value.trim();
  const note = document.getElementById("workNote").value.trim();
  if(!tid){ toast("请先选择关联的打卡任务"); return; }
  const day = getDay(STATE.selDate);
  const allTasks = [...(STATE.modifiedDefaultTasks||[]), ...(STATE.customTasks||[])];
  const tasks = allTasks.length > 0 ? allTasks : TASKS;
  const artwork = {
    id: "art_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    taskId: tid,
    taskTitle: (tasks.find(t => t.id === tid) || {}).title || tid,
    title: title || "未命名作品",
    note,
    date: STATE.selDate,
    dateDisplay: fmtDisplay(new Date(STATE.selDate + "T00:00:00")),
    hasMedia: !!workFile
  };
  if(workFile){
    try{
      const dataUrl = await fileToDataURL(workFile);
      await saveMedia(artwork.id, dataUrl);
      const type = workFile.type;
      artwork.mediaKind = type.startsWith("image/") ? "image" :
                      type.startsWith("video/") ? "video" :
                      type.startsWith("audio/") ? "audio" : "file";
      artwork.hasMedia = true;
    }catch(e){
      toast("媒体保存失败，将只保存文字信息");
      artwork.hasMedia = false;
    }
  }
  day.artworks.unshift(artwork);
  saveData();
  document.getElementById("workTask").value = "";
  document.getElementById("workTitle").value = "";
  document.getElementById("workNote").value = "";
  document.getElementById("workMedia").value = "";
  workFile = null;
  document.getElementById("mediaPreview").classList.remove("show");
  document.getElementById("mediaPreview").innerHTML = "";
  toast("作品已存入成长档案 📁");
  renderAll();
});

// ===== Toast =====
window.toast = function(msg){
  let t=document.getElementById("globalToast");
  if(!t){
    t=document.createElement("div");t.id="globalToast";
    t.style.cssText=`position:fixed;bottom:calc(80px + env(safe-area-inset-bottom, 0px));left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:25px;background:rgba(0,0,0,.85);color:#fff;font-size:14px;font-weight:800;z-index:9999;animation:fadeInUp .3s ease;pointer-events:none;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.3)`;
    document.body.appendChild(t);
  }
  t.textContent=msg;
  t.style.animation='fadeInUp .3s ease';
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>{
    t.textContent='';
    t.style.animation='fadeOut .3s ease forwards';
    // 动画结束后隐藏，避免残留黑框
    setTimeout(()=>{t.style.display='none';},300);
  },2500);
};

// 暴露全局
window.renderWorksDropdown = renderWorksDropdown;

// ===== Auto-save =====
window.addEventListener("beforeunload", ()=>{ try{saveData();}catch(e){} });

// ===== Splash animation =====
(function(){
  var ov=document.getElementById('splashOverlay');
  var app=document.querySelector('.app');
  if(!ov||!app)return;
  document.body.style.overflow='hidden';
  setTimeout(function(){
    if(ov&&ov.parentNode){ov.parentNode.removeChild(ov);}
    requestAnimationFrame(function(){
      app.classList.add('app-ready');
      setTimeout(function(){document.body.style.overflow='';},450);
    });
  },3050);
})();

// ===== Auto-check update =====
async function autoCheckUpdate(){
  await navigator.serviceWorker.ready.catch(()=>{});
  try{
    const r=await fetch("sw.js?v="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw new Error("network");
    const text=await r.text();
    const m=text.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
    if(!m)throw new Error("parse");
    const remoteVer=m[1];
    const localVer=window.localSWVersion||"";
    if(remoteVer!==localVer){
      const btn=document.getElementById("parentCenterBtn");
      if(btn&&!btn.querySelector(".update-dot")){
        const dot=document.createElement("span");dot.className="update-dot";
        btn.appendChild(dot);
      }
    }
  }catch(e){}
}

// ===== Daily reminder =====
function requestNotificationPermission(){
  if(!("Notification" in window))return;
  // 只在新用户首次访问时请求一次，已授权或已拒绝就不再打扰
  if(Notification.permission==="granted")return;
  if(Notification.permission==="denied")return;
  // 用 sessionStorage 记录是否已提示过，刷新页面不再重复弹授权弹窗
  if(sessionStorage.getItem("_notiAsked")==="1")return;
  Notification.requestPermission().then(p=>{
    if(p==="granted"){
      sessionStorage.setItem("_notiAsked","1");
      toast("打卡提醒已开启 🔔");
    } else {
      sessionStorage.setItem("_notiAsked","1");
    }
  });
}

function scheduleDailyReminder(){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const now=new Date();const target=new Date(now.getFullYear(),now.getMonth(),now.getDate(),20,30,0);
  if(target<=now)target.setDate(target.getDate()+1);
  const delay=target-now;  const checkId="checkinRemind_"+STATE_TODAY_STR;
  if(data.remindersSent&&data.remindersSent[checkId])return;
  setTimeout(()=>{
    const todayScore=calcTotalScore();
    if(todayScore===0){
      const notification=new Notification("暑假成长积分银行",{body:"今天还没打卡哦！完成一个小任务就能存入成长积分 🌟",icon:"icon-512.png",badge:"icon-512.png"});
      notification.onclick=()=>window.focus();
    if(!data.remindersSent)data.remindersSent={};
    data.remindersSent[checkId]=true;saveData();
    }
    scheduleDailyReminder();
  },delay);
}

function clearDailyReminderFlag(){
  const todayKey="checkinRemind_"+STATE_TODAY_STR;
  if(data.remindersSent&&data.remindersSent[todayKey]){delete data.remindersSent[todayKey];saveData();}
}

// ===== Growth report =====
function generateGrowthReport(){
  const allTasks=[...TASKS, ...(data.modifiedDefaultTasks||[]), ...(data.customTasks||[])];
  const activeCats=[...new Set(allTasks.map(t=>t.cat))];
  const stats={totalDays:0,checkInDays:0,totalScore:0,catScores:{},totalTasks:0,doneTasks:0,workCount:0,rewardCount:0,redemptions:[]};
  activeCats.forEach(c=>stats.catScores[c]=0);
  for(const ds in data.daily){
    const day=data.daily[ds];let dayScore=0;
    for(const tid in day.tasks){stats.totalTasks++;if(day.tasks[tid].done){dayScore+=day.tasks[tid].pts;stats.doneTasks++;}}
    if(dayScore>0){stats.checkInDays++;stats.totalScore+=dayScore;}
    stats.totalDays++;
    allTasks.forEach(t=>{if(day.tasks[t.id]&&day.tasks[t.id].done&&stats.catScores[t.cat]!==undefined)stats.catScores[t.cat]+=t.pts;});
    if(day.artworks)stats.workCount+=day.artworks.length;
  }
  stats.redemptions=data.redemptions;stats.rewardCount=data.redemptions.length;
  return {date:STATE_TODAY_STR,stats,childName:data.childName||"宝贝",generatedAt:new Date().toISOString()};
}

function renderGrowthReport(report){
  const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";
  const s=report.stats;
  const topPct=s.totalTasks>0?Math.round(s.doneTasks/s.totalTasks*100):0;
  const catBars=Object.entries(s.catScores).map(([cat,pts])=>{
    const pct=s.totalScore>0?Math.round(pts/s.totalScore*100):0;
    return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:50px;font-size:12px;font-weight:800;color:var(--ink)">${cat}</span><div style="flex:1;height:10px;border-radius:5px;background:rgba(0,0,0,.06);overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--leaf),var(--rose));border-radius:5px;transition:width .5s"></div></div><span style="font-size:12px;font-weight:900;color:var(--leaf-dark)">${pts}分 (${pct}%)</span></div>`;
  }).join("");
  ov.innerHTML=`<div class="modal-box" style="max-width:500px;max-height:85vh;overflow:auto"><div style="text-align:center;margin-bottom:16px"><div style="font-size:40px;margin-bottom:6px">🏆</div><h3 style="margin:0">成长报告</h3><p style="color:var(--muted);font-size:13px;margin-top:4px">${report.date} · ${report.childName}宝贝</p></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px"><div style="text-align:center;padding:12px 8px;border-radius:10px;background:linear-gradient(135deg,#fff8e1,#fce4ec)"><div style="font-size:24px;font-weight:900;color:var(--leaf-dark)">${s.totalScore}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">总积分</div></div><div style="text-align:center;padding:12px 8px;border-radius:10px;background:linear-gradient(135deg,#e8f5e9,#e3f2fd)"><div style="font-size:24px;font-weight:900;color:var(--lime)">${s.checkInDays}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">打卡天数</div></div><div style="text-align:center;padding:12px 8px;border-radius:10px;background:linear-gradient(135deg,#e3f2fd,#ede7f6)"><div style="font-size:24px;font-weight:900;color:var(--sky)">${topPct}%</div><div style="font-size:11px;color:var(--muted);margin-top:2px">任务完成率</div></div><div style="text-align:center;padding:12px 8px;border-radius:10px;background:linear-gradient(135deg,#ede7f6,#fce4ec)"><div style="font-size:24px;font-weight:900;color:var(--purple)">${s.workCount}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">作品数量</div></div></div><div style="margin-bottom:18px"><h4 style="margin:0 0 10px;font-size:14px">📊 各维度积分占比</h4>${catBars}</div>${s.rewardCount>0?`<div style="margin-bottom:16px"><h4 style="margin:0 0 8px;font-size:14px">🎁 兑换记录</h4>${s.redemptions.slice(0,8).map(r=>`<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px dashed rgba(0,0,0,.08)"><span>${esc(r.reward||r.desc||'兑换')}</span><span style="color:var(--rose);font-weight:800">-${r.cost}分</span></div>`).join('')}</div>`:'<div style="color:var(--muted);font-size:12px;text-align:center">暂无兑换记录</div>'}
    <div style="text-align:center;margin-top:16px"><button class="btn-primary" id="growthReportClose" style="min-height:36px;padding:8px 32px">关闭</button></div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#growthReportClose").addEventListener("click", ()=>ov.remove());
  ov.addEventListener("click",e=>{if(e.target===ov)ov.remove();});
}

function checkGrowthReportDay(){
  const today=STATE_TODAY_STR;
  if(today.endsWith("-07-30")||today.endsWith("-08-31")){
    const reportKey=localDateStr(new Date(today+"T00:00:00"));
    if(!data.reports||!data.reports[reportKey]){
      const report=generateGrowthReport();
      if(!data.reports)data.reports={};
      data.reports[reportKey]=report;saveData();
      setTimeout(()=>renderGrowthReport(report),1500);
    }else{setTimeout(()=>renderGrowthReport(data.reports[reportKey]),1500);}
  }
}

// ===== SW Register =====
const SW_VERSION = 'summer-growth-bank-v3.0';

if('serviceWorker' in navigator){
  // 先 unregister 旧版 SW
  navigator.serviceWorker.getRegistrations().then(regs=>{
    regs.forEach(r=>r.unregister());
  });
  navigator.serviceWorker.register("sw.js?v=3.0").then(reg=>{
    // 注册成功后设置版本号，供检查更新使用
    window.localSWVersion = SW_VERSION;
    if(reg.waiting){
      navigator.serviceWorker.addEventListener('message', function handler(e){
        if(e.data && e.data.type==='UPDATE_AVAILABLE'){
          window.location.reload();
        }
      });
      reg.waiting.postMessage({type:'SKIP_WAITING'});
    }
  }).catch(()=>{});
}

// ===== Boot =====
applyTheme();
renderBabyName();
renderAll();
clearDailyReminderFlag();
requestNotificationPermission();
scheduleDailyReminder();
checkGrowthReportDay();
autoCheckUpdate();
