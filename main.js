// main.js — 应用入口，连接所有模块
import { freshState, setData, setSelDate, STATE, data, TODAY_STR as STATE_TODAY_STR } from './core/state.js';
import { loadData, saveData, getDay, calcTotalScore } from './core/data.js';
import { TASKS, localDateStr, fmtDisplay, esc, getWeekKey, getTodayStr } from './core/helpers.js';
import { renderAll, renderTasks, renderCalendar, renderDateLabel, renderCheckinDateLabel, toggleTask, renderPoints, renderRedemptions, renderBabyName, renderArchive, renderMap, renderTrendChart, showEncourageMsg, switchToCategory, renderCheckinExtras, renderMoodTrend, renderWeekTable } from './features/render.js';
import { showPasswordModal, hasParentPassword, hashPassword, showPasswordError, dismissAutofill } from './features/password.js';
import { getMakeupCost, canMakeupDate, isToday, isFuture, isPastLocked, canCheckIn } from './features/makeup.js';
import { saveMedia } from './features/media.js';
import { openParentCenter, openPasswordModal, openBackupModal, openChildrenModal, openTaskManager, checkForUpdate, switchChildFromParentCenter, deleteChild } from './features/parent-center.js';
// 增量功能
import { setMood, getMood, pickGentleMessage } from './features/mood.js';
import { getStreak } from './features/growth-tree.js';
// 独立「成长树」养成页面模块
import { mountGrowthTreePage } from './features/tree-garden/index.js';
import { renderIdeaLibrary } from './features/ideas.js';
import { startRecording, stopRecording, saveRecording, listRecordings, playRecording, deleteRecording } from './features/voice-encourage.js';
import { applyTheme, requestNotificationPermission, scheduleDailyReminder, clearDailyReminderFlag, checkGrowthReportDay } from './features/runtime.js';
// ===== 常量 =====
const MAX_IMG_MB = 10;     // 作品图片大小上限（MB）
const MAX_VIDEO_MB = 100;  // 作品视频大小上限（MB）
// ===== Init =====
// Load data from localStorage into a local variable
let _localData = loadData();
// Load active child data on init
if(_localData.activeChildId && _localData.activeChildId!=='default'){
  const childId = _localData.activeChildId;
  try{
    const childKey = "summerGrowthBankV2_child_"+childId;
    const saved = localStorage.getItem(childKey);
    const mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
    if(saved){
      const parsed = JSON.parse(saved);
      _localData = {...freshState(), ...parsed};
      _localData.activeChildId = childId;
      // 方案B：从 main.children 派生元信息
      const c = (mainData.children||[]).find(x=>x.id===childId);
      if(c){ _localData.childName=c.name; _localData.childGender=c.gender||"girl"; _localData.theme=c.theme||"sakura"; }
      _localData.children = mainData.children||[];
    } else {
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
// R1 修复：买种子/兑换后即时刷新首页总分与兑换记录（成长树模块通过事件解耦通知，避免循环依赖）
window.addEventListener('growthbank:score-changed', () => {
  try { renderPoints(); renderRedemptions(); } catch(e) { /* 静默回退 */ }
});
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
// ===== Event listeners =====
// Main tabs
document.querySelectorAll("#mainTabNav button").forEach(b=>b.addEventListener("click",()=>{
  const tab=b.dataset.maintab;
  document.querySelectorAll("#mainTabNav button").forEach(x=>x.classList.toggle("active",x.dataset.maintab===tab));
  document.querySelectorAll(".main-tab-content").forEach(x=>x.style.display=x.id==="mtab-"+tab?"block":"none");
  if(tab==="archive"){ renderArchive(); renderWeekTable(); renderMoodTrend(); renderWorksDropdown(); }
  if(tab==="checkin"){renderCheckinDateLabel();renderCheckinExtras();}
  if(tab==="tree"){ mountGrowthTreePage(); }
}));
// ===== 家长录音鼓励区（设置宝贝信息弹层内）=====
function setupVoiceEncourage(ov){
  const childId = (STATE.activeChildId && STATE.activeChildId !== "default") ? STATE.activeChildId : null;
  const recordBtn = ov.querySelector("#encRecordBtn");
  const stopBtn = ov.querySelector("#encStopBtn");
  const nameInput = ov.querySelector("#encNameInput");
  const listEl = ov.querySelector("#encList");
  const hintEl = ov.querySelector("#encHint");
  if(!recordBtn) return;
  function renderList(){
    const items = listRecordings() || [];
    if(!items.length){
      listEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:4px">还没有录音，录一条给孩子惊喜吧 🎙️</div>';
      return;
    }
    listEl.innerHTML = items.map((it, i) => `
      <div class="enc-item" data-id="${it.id}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.8);border:1.5px solid rgba(255,112,67,.12);margin-bottom:6px">
        <span style="font-size:18px">🔊</span>
        <span style="flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.label || ("加油语音 #" + (i + 1)))}</span>
        <button class="enc-play" data-id="${it.id}" style="padding:4px 8px;border-radius:6px;border:none;background:rgba(41,182,246,.12);color:#1565c0;font-size:12px;cursor:pointer">▶ 试听</button>
        <button class="enc-del" data-id="${it.id}" style="padding:4px 8px;border-radius:6px;border:none;background:rgba(239,83,80,.12);color:var(--red);font-size:12px;cursor:pointer">🗑</button>
      </div>`).join('');
    listEl.querySelectorAll(".enc-play").forEach(b => b.addEventListener("click", () => {
      playRecording(b.dataset.id).catch(() => {});
    }));
    listEl.querySelectorAll(".enc-del").forEach(b => b.addEventListener("click", () => {
      showPasswordModal('删除录音需家长密码验证', async () => {
        await deleteRecording(b.dataset.id);
        renderList();
      });
    }));
  }
  if(!childId){
    recordBtn.disabled = true;
    hintEl.textContent = "保存宝贝信息后即可录制语音鼓励 🌱";
    renderList();
    return;
  }
  renderList();
  let recTimer = null;
  let secs = 0;
  function tick(){
    secs++;
    hintEl.textContent = "录制中… " + secs + "s";
    if(secs >= 30){ try { stopBtn.click(); } catch(e){} }
  }
  recordBtn.addEventListener("click", async () => {
    try{
      await startRecording(childId);
      recordBtn.disabled = true;
      stopBtn.disabled = false;
      secs = 0;
      hintEl.textContent = "录制中… 0s";
      recTimer = setInterval(tick, 1000);
    }catch(err){
      recordBtn.disabled = false;
      stopBtn.disabled = true;
      hintEl.textContent = "⚠️ 无法录音，打卡仍会有机器鼓励声";
      toast("无法录音，打卡仍会有机器鼓励声");
    }
  });
  stopBtn.addEventListener("click", async () => {
    if(recTimer){ clearInterval(recTimer); recTimer = null; }
    stopBtn.disabled = true;
    try{
      const blob = await stopRecording();
      const name = (nameInput && nameInput.value || "").trim();
      await saveRecording(childId, blob, name || undefined);
      if(nameInput) nameInput.value = "";
      toast("录音已保存 🎙️");
      renderList();
    }catch(e){
      toast("录音保存失败");
    }
    recordBtn.disabled = false;
    hintEl.textContent = "";
  });
}
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
    '<div style="text-align:left;margin-bottom:18px"><label style="display:block;margin-bottom:8px;font-weight:800;font-size:14px;color:var(--ink)">🎙️ 家长录音鼓励</label>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<button id="encRecordBtn" class="btn-secondary" style="min-height:36px;padding:8px 14px">● 录制</button>'+
      '<button id="encStopBtn" class="btn-primary" style="min-height:36px;padding:8px 14px" disabled>⏹ 停止</button>'+
      '<input id="encNameInput" placeholder="给这条语音起个名字（可选）" autocomplete="new-password" style="flex:1;min-width:120px;min-height:36px;padding:8px 10px;border-radius:8px;border:1px solid rgba(0,0,0,.15);font-size:13px;outline:none">'+
    '</div>'+
    '<div id="encList" class="enc-list" style="margin-top:10px"></div>'+
    '<div id="encHint" class="enc-hint" style="margin-top:6px;font-size:12px;color:var(--muted)"></div>'+
    '</div>'+
    '<div class="modal-actions"><button class="btn-ghost" id="babyModalCancel">取消</button><button class="btn-primary" id="babyModalOk">确认</button></div></div>';
  document.body.appendChild(ov);
  // 家长录音鼓励区（仅对当前 activeChildId 生效）
  setupVoiceEncourage(ov);
  ov.querySelectorAll(".gender-opt").forEach(l=>l.addEventListener("click",function(){ov.querySelectorAll(".gender-opt").forEach(x=>x.style.borderColor="rgba(0,0,0,.1)");l.style.borderColor="var(--leaf)";l.querySelector("input").checked=true;}));
  ov.querySelectorAll(".theme-opt").forEach(l=>l.addEventListener("click",function(){ov.querySelectorAll(".theme-opt").forEach(x=>{x.style.borderColor="rgba(0,0,0,.1)";x.style.background="transparent";});l.style.borderColor="var(--leaf)";l.querySelector("input").checked=true;}));
  function doSaveAfterPassword(name, gender, theme){
    var hadActive = data.activeChildId && data.activeChildId!=="default";
    // 1) 写入当前宝宝信息到 STATE（单源真相）
    data.childName=name;data.childGender=gender;data.theme=theme;
    if(hadActive){
      // 更新当前已激活的宝宝元信息（名字/性别/主题）
      data.childName=name;data.childGender=gender;data.theme=theme;
    } else {
      // 没有激活宝宝：真正“新增”一个宝宝（生成新 id，绝不覆盖已有 children[0]）
      var newId="child_"+Date.now();
      data.activeChildId=newId;
      if(!data.children) data.children=[];
      data.children.push({id:newId,name:name,gender:gender,theme:theme});
    }
    // 2) 同步元信息到 main.children 单一真相源，并把当前打卡数据存为该宝宝的独立快照
    try{
      var m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      if(!m.children)m.children=[];
      if(data.activeChildId && data.activeChildId!=="default"){
        var idx=-1;
        for(var i=0;i<m.children.length;i++){if(m.children[i].id===data.activeChildId){idx=i;break;}}
        if(idx>=0){
          // 已存在：更新元信息
          m.children[idx].name=name;m.children[idx].gender=gender;m.children[idx].theme=theme;
        } else {
          // 新增：push 新宝宝（不覆盖任何已有宝宝）
          m.children.push({id:data.activeChildId,name:name,gender:gender,theme:theme});
        }
        m.activeChildId=data.activeChildId;
      }
      m.parentPasswordHash = data.parentPasswordHash || m.parentPasswordHash || "";
      m.customRewards = data.customRewards || m.customRewards || {};
      localStorage.setItem("summerGrowthBankV2",JSON.stringify(m));
      // 把当前 STATE（含已有打卡数据）作为该宝宝的独立快照保存
      if(data.activeChildId && data.activeChildId!=="default"){
        var childKey="summerGrowthBankV2_child_"+data.activeChildId;
        var { children, childName, childGender, theme, activeChildId, parentPasswordHash, customRewards, ...childData } = data;
        localStorage.setItem(childKey, JSON.stringify(childData));
      }
    }catch(e){}
    // 3) 通过 saveData() 二次兜底，确保 main 与子快照一致
    applyTheme();
    saveData();
    renderBabyName();
    // 先关闭弹窗（即便后面渲染抛错，面板也一定消失）
    ov.remove();
    dismissAutofill();
    try {
      renderAll();
    } catch(e) {
      console.error("renderAll after save failed", e);
    }
    // 主界面跳回「学习力」分类（打卡 tab，active 态正确）
    switchToCategory('学习力');
    toast((hadActive?"已更新宝贝信息：":("已添加为："+(gender==="boy"?"👦":"👧")+" "+name+"宝贝")));
  }
    function save(){
      var name=ov.querySelector("#babyNameInput").value.trim();
      var genderEl=ov.querySelector("input[name='babyGender']:checked");
      var gender=genderEl?genderEl.value:"girl";
      var themeEl=ov.querySelector("input[name='babyTheme']:checked");
      var theme=themeEl?themeEl.value:"sakura";
      if(!name){showEncourageMsg("请输入宝贝的名字");return;}
      // 检查是否已设置家长密码
      if(!hasParentPassword()){
        showPasswordError("请先设置家长密码");
        ov.remove();
        dismissAutofill();
        setTimeout(function(){ openParentCenter(); }, 300);
        return;
      }
      // 有家长密码：先隐藏设置弹层（保留 DOM + 录音态），再弹密码键盘
      ov.style.display='none';
      showPasswordModal("保存宝贝信息需要家长密码确认", function(){
        doSaveAfterPassword(name, gender, theme);
      }, function(){
        // 取消：恢复设置弹层，保留已填内容与录音态
        ov.style.display='';
      });
    }
  ov.querySelector("#babyModalOk").addEventListener("click",save);
  ov.querySelector("#babyModalCancel").addEventListener("click",function(){ov.remove();dismissAutofill();});
  ov.addEventListener("click",function(e){if(e.target===ov){ov.remove();dismissAutofill();}});
  ov.querySelector("#babyNameInput").addEventListener("keydown",function(e){if(e.key==="Enter")save();});
});
// ===== 心情行 / 灵感按钮（静态容器，启动后绑定一次）=====
function currentDayMood(){
  const m = STATE.daily[STATE.selDate];
  return m ? m.mood : undefined;
}
document.querySelectorAll("#moodRow .mood-btn").forEach(b => b.addEventListener("click", () => {
  if(!STATE.childName || !STATE.childName.trim()) return;
  const mood = b.dataset.mood;
  const noteEl = document.getElementById("moodNote");
  const note = noteEl ? noteEl.value : "";
  setMood(STATE.selDate, mood, note);
  saveData();
  renderCheckinExtras();
}));
const moodNoteEl = document.getElementById("moodNote");
moodNoteEl?.addEventListener("input", () => {
  if(!STATE.childName || !STATE.childName.trim()) return;
  let v = moodNoteEl.value.slice(0, 50);
  if(v !== moodNoteEl.value) moodNoteEl.value = v;
  setMood(STATE.selDate, currentDayMood(), v);
  saveData();
});
document.getElementById("ideaBtn")?.addEventListener("click", () => {
  if(!STATE.childName || !STATE.childName.trim()){ toast("请先设置宝贝信息哦 👆"); return; }
  renderIdeaLibrary();
});
// 断卡温柔轻提示（当天首次进 App 且确有历史但连续归零）
function maybePromptStreakBroken(){
  if(!STATE.childName || !STATE.childName.trim()) return;
  const key = "streakPrompt_" + STATE_TODAY_STR;
  try{ if(sessionStorage.getItem(key)) return; }catch(e){}
  const streak = getStreak();
  let hasHistory = false;
  for(const ds in STATE.daily){
    const day = STATE.daily[ds];
    if(day && day.tasks && Object.values(day.tasks).some(t => t && t.done)){ hasHistory = true; break; }
  }
  if(streak === 0 && hasHistory){
    try{ sessionStorage.setItem(key, "1"); }catch(e){}
    toast(pickGentleMessage("streakBroken", { streak }));
  }
}
// Parent center button
document.getElementById("parentCenterBtn")?.addEventListener("click", openParentCenter);
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
function getWorkDate(){
  const inp = document.getElementById("workDate");
  return (inp && inp.value) ? inp.value : getTodayStr();
}
function renderWorksDropdown(){
  const s = document.getElementById("workTask");
  if(!s) return;
  const wd = getWorkDate();
  const day = getDay(wd);
  const doneTaskIds = day.tasks ? Object.keys(day.tasks) : [];
  const allTasks = [...(STATE.modifiedDefaultTasks||[]), ...(STATE.customTasks||[])];
  const tasks = allTasks.length > 0 ? allTasks : TASKS;
  const doneTasks = tasks.filter(t => doneTaskIds.includes(t.id));
  s.innerHTML = '<option value="">-- 关联打卡任务 --</option>' +
    doneTasks.map(t => `<option value="${t.id}">${t.title} (${t.cat})</option>`).join("");
  const note = document.getElementById("workDateNote");
  if(note) note.textContent = "作品将关联到：" + wd;
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
document.getElementById("workDate")?.addEventListener("change", renderWorksDropdown);
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
  const wd = getWorkDate();
  const day = getDay(wd);
  const allTasks = [...(STATE.modifiedDefaultTasks||[]), ...(STATE.customTasks||[])];
  const tasks = allTasks.length > 0 ? allTasks : TASKS;
  const artwork = {
    id: "art_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    taskId: tid,
    taskTitle: (tasks.find(t => t.id === tid) || {}).title || tid,
    title: title || "未命名作品",
    note,
    date: wd,
    dateDisplay: fmtDisplay(new Date(wd + "T00:00:00")),
    hasMedia: !!workFile
  };
  // 去重：同一作品（id 相同）不重复写入
  if(day.artworks.some(a => a.id === artwork.id)){
    toast("该作品已存入档案");
    return;
  }
  // 文件大小校验（图片 ≤10MB，视频 ≤100MB）后再读取
  if(workFile){
    const sizeMB = workFile.size / (1024 * 1024);
    if(workFile.type.startsWith("image/") && sizeMB > MAX_IMG_MB){
      toast("图片不能超过10MB");
      return;
    }
    if(workFile.type.startsWith("video/") && sizeMB > MAX_VIDEO_MB){
      toast("视频不能超过100MB");
      return;
    }
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
// ===== SW Register =====
const SW_VERSION = 'summer-growth-bank-v3.2.00';
if('serviceWorker' in navigator){
  // 先 unregister 旧版 SW
  navigator.serviceWorker.getRegistrations().then(regs=>{
    regs.forEach(r=>r.unregister());
  });
  navigator.serviceWorker.register("sw.js?v=3.2.00").then(reg=>{
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
// 作品日期默认今天
const _wd = document.getElementById("workDate");
if(_wd && !_wd.value) _wd.value = getTodayStr();
renderAll();
maybePromptStreakBroken();
clearDailyReminderFlag();
requestNotificationPermission();
scheduleDailyReminder();
checkGrowthReportDay();
autoCheckUpdate();