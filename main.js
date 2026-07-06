// main.js — 应用入口，连接所有模块
import { freshState, setData, setSelDate, STATE, data, TODAY_STR as STATE_TODAY_STR } from './core/state.js';
import { loadData, saveData, getDay, calcTotalScore } from './core/data.js';
import { CATEGORIES, TASKS, REWARDS, ENCOURAGES, CAT_INTRO, localDateStr, fmtDisplay, esc, getMonthKey } from './core/helpers.js';
import { renderAll, renderTasks, renderCalendar, renderDateLabel, renderCheckinDateLabel, toggleTask, renderPoints, renderBabyName, renderArchive, renderMap, renderTrendChart, renderReviewTimeline } from './features/render.js';
import { showPasswordModal, hasParentPassword, hashPassword } from './features/password.js';
import { getMakeupCost, canMakeupDate, isToday, isFuture, isPastLocked, canCheckIn } from './features/makeup.js';
import { saveMedia } from './features/media.js';
import { openParentCenter, openPasswordModal, openBackupModal, openChildrenModal, openTaskManager, checkForUpdate, switchChildFromParentCenter, deleteChild } from './features/parent-center.js';

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
  function doSaveAfterPassword(){
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
  function save(){
    var name=ov.querySelector("#babyNameInput").value.trim();
    var genderEl=ov.querySelector("input[name='babyGender']:checked");
    var gender=genderEl?genderEl.value:"girl";
    var themeEl=ov.querySelector("input[name='babyTheme']:checked");
    var theme=themeEl?themeEl.value:"sakura";
    if(!name){toast("请输入宝贝的名字");return;}
    // 密码确认后保存
    showPasswordModal("保存宝贝信息需要家长密码确认", function(){
      doSaveAfterPassword();
    });
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