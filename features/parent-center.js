// features/parent-center.js — 家长中心、备份、多孩子、任务管理

import { STATE } from '../core/state.js';
import { saveData, loadData } from '../core/data.js';
import { freshState, hydrateStateFrom } from '../core/state.js';
import { esc, getMonthKey, getTodayStr } from '../core/helpers.js';
import { showPasswordModal, hasParentPassword, hashPassword, dismissAutofill } from '../features/password.js';
import { TASKS } from '../core/helpers.js';
import { renderAll } from '../features/render.js';
import { applyTheme, clearDailyReminderFlag, requestNotificationPermission, scheduleDailyReminder, checkGrowthReportDay } from './runtime.js';
import { encStorageKey } from '../features/voice-encourage.js';
import { removeMedia } from '../features/media.js';

// ===== 家长中心 =====
export function openParentCenter(){
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
export function openPasswordModal(){
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
export function openBackupModal(){
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
export function openChildrenModal(){
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
    try {
      const m = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
      return m.children || [];
    } catch(e){ return []; }
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
        ov2.remove();ov.remove();
        switchChildFromParentCenter(id);  // 方案B+问题3：添加后立即切到新宝宝，信息即时同步到“设置宝贝信息”
      };
      showPasswordModal("添加孩子需要家长密码验证",doAdd);
    });
  });
  ov.querySelector("#pcChildrenClose").addEventListener("click",()=>{ov.remove();dismissAutofill();});
  ov.addEventListener("click",e=>{if(e.target===ov){ov.remove();dismissAutofill();}});
}

// ===== Switch child =====
export function switchChildFromParentCenter(id){
  let mainChildren=[];
  let mainPasswordHash="";
  let mainCustomRewards={};
  try{const m=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");mainChildren=m.children||[];mainPasswordHash=m.parentPasswordHash||"";mainCustomRewards=m.customRewards||{};}catch(e){}
  if(id==='default'){
    try{hydrateStateFrom(loadData());}catch(e){hydrateStateFrom(loadData());}
    // 切换孩子后重置 selDate 到今天
    const todayStr = getTodayStr();
    STATE.selDate = todayStr;
    STATE.curCalYear = new Date().getFullYear();
    STATE.curCalMonth = new Date().getMonth();
    // default 分支保留 main 元信息
    STATE.activeChildId=null;
    STATE.children = mainChildren;
    STATE.parentPasswordHash = mainPasswordHash;
    STATE.customRewards = mainCustomRewards;
    saveData();
  }else{
    const childKey="summerGrowthBankV2_child_"+id;
    const saved=localStorage.getItem(childKey);
    const child=mainChildren.find(c=>c.id===id);
    if(saved){
      try{const parsed=JSON.parse(saved);hydrateStateFrom(parsed);}catch(e){hydrateStateFrom(freshState());}
    }else{
      hydrateStateFrom(freshState());
    }
    // 切换孩子后重置 selDate 到今天
    const todayStr = getTodayStr();
    STATE.selDate = todayStr;
    STATE.curCalYear = new Date().getFullYear();
    STATE.curCalMonth = new Date().getMonth();
    // 从 main.children 派生元信息（单一真相源），始终用 child 内的值兜底
    if(child){
      STATE.childName=child.name||"";
      STATE.childGender=child.gender||"girl";
      STATE.theme=child.theme||"sakura";
    } else {
      STATE.childName="";
      STATE.theme="sakura";
    }
    STATE.parentPasswordHash = mainPasswordHash;
    STATE.customRewards = mainCustomRewards; // sync custom rewards from main
    STATE.activeChildId=id;
    STATE.children=mainChildren;
    saveData();  // 回写 main（activeChildId + children 元信息）+ child 快照
  }
  applyTheme();renderAll();
  clearDailyReminderFlag();requestNotificationPermission();scheduleDailyReminder();checkGrowthReportDay();
}

// Helper: 从“设置宝贝信息”/家长中心新增或更新当前宝宝后，确保 main.children 与当前宝宝同步
export function syncCurrentChildToMain(){
  let mainData;
  try{ mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}"); }catch(e){ mainData={}; }
  if(!mainData.children) mainData.children=[];
  if(STATE.activeChildId && STATE.activeChildId!=='default'){
    const idx = mainData.children.findIndex(c=>c.id===STATE.activeChildId);
    if(idx>=0){
      mainData.children[idx] = {...mainData.children[idx], name:STATE.childName, gender:STATE.childGender, theme:STATE.theme};
    }
  }
  mainData.activeChildId = STATE.activeChildId;
  mainData.parentPasswordHash = STATE.parentPasswordHash||"";
  mainData.customRewards = STATE.customRewards||{};
  localStorage.setItem("summerGrowthBankV2", JSON.stringify(mainData));
}

// ===== Delete child =====
export function deleteChild(cid, modalOverlay){
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
      // 非阻塞清理该孩录音 blob（enc_<cid>_<seq>，单孩上限 10 条）
      for(let seq = 0; seq < 10; seq++){
        removeMedia(encStorageKey(cid, seq)).catch(() => {});
      }
      if(STATE.activeChildId === cid){
        const remaining = childrenList.filter(c=>c.id!==cid);
        if(remaining.length>0){switchChildFromParentCenter(remaining[0].id);}
        else {hydrateStateFrom(loadData());applyTheme();renderAll();}
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
export async function checkForUpdate(statusEl){
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
export function openTaskManager(){
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