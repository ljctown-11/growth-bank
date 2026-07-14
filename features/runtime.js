// features/runtime.js — 运行时共享函数（主题、提醒、成长报告）
//
// 这些函数原本位于 main.js。为根除「parent-center.js 从 ../main.js 导入导致
// main.js 被加载两遍（?v= 查询串与无查询串被视为两个模块实例）」的双实例 bug，
// 现统一迁移到本模块，由 main.js 与 parent-center.js 共同依赖（同一 URL，ESM 只加载一次）。

import { data, STATE, TODAY_STR as STATE_TODAY_STR } from '../core/state.js';
import { saveData, calcTotalScore } from '../core/data.js';
import { TASKS, localDateStr, esc } from '../core/helpers.js';

// 全局 toast 兜底：真实环境由 main.js 在 boot 前设置 window.toast。
// 若本模块被单独加载（如单测直接 import parent-center 而未加载 main.js），
// 此处保证全局 toast 存在，避免裸调用抛 ReferenceError。生产环境 main.js 已设置，不会覆盖。
if (typeof window !== 'undefined' && typeof window.toast !== 'function') {
  window.toast = function (_msg) { /* isolated module loading 的空兜底，不影响生产行为 */ };
}

// ===== Apply theme & render =====
export function applyTheme(){
  const t=data.theme||"sakura";
  document.body.dataset.theme=t;
  const mc=document.querySelector("meta[name=theme-color]");
  if(mc){
    const colors={sakura:"#ff7043",ocean:"#42a5f5",forest:"#66bb6a",sunset:"#ff9800",starry:"#7e57c2"};
    mc.content=colors[t]||"#ff7043";
  }
}

// ===== Daily reminder =====
export function requestNotificationPermission(){
  if(!("Notification" in window))return;
  // 只在新用户首次访问时请求一次，已授权或已拒绝就不再打扰
  if(Notification.permission==="granted")return;
  if(Notification.permission==="denied")return;
  // 用 sessionStorage 记录是否已提示过，刷新页面不再重复弹授权弹窗
  if(sessionStorage.getItem("_notiAsked")==="1")return;
  Notification.requestPermission().then(p=>{
    if(p==="granted"){
      sessionStorage.setItem("_notiAsked","1");
      window.toast("打卡提醒已开启 🔔");
    } else {
      sessionStorage.setItem("_notiAsked","1");
    }
  });
}

export function scheduleDailyReminder(){
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

export function clearDailyReminderFlag(){
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

export function checkGrowthReportDay(){
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

