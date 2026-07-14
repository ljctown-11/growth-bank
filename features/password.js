// features/password.js — 密码相关

import { showCenterToast } from './toast-center.js';

// 获取主数据中的家长密码（不依赖 STATE，始终从 main localStorage 读取）
function getMainPasswordHash(){
  try{
    const m = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
    return m.parentPasswordHash || "";
  }catch(e){return "";}
}

export async function hashPassword(pwd){
  if(!pwd||!/^\d{4,6}$/.test(pwd))return null;
  const enc=new TextEncoder().encode(pwd);
  const buf=await crypto.subtle.digest('SHA-256',enc);
  const arr=Array.from(new Uint8Array(buf));
  return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function verifyPassword(pwd){
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

export function hasParentPassword(){
  return !!getMainPasswordHash();
}

// ===== 全局锁：防止同时打开多个密码弹窗 =====
let _passwordModalActive = false;

// 关闭弹窗后 dismiss iOS Safari autofill 建议栏
export function dismissAutofill(){
  // 先 blur 当前焦点
  try {
    const active = document.activeElement;
    if (active) active.blur();
  } catch(e) {}
  // 页面滚动1px dismiss autofill 建议栏（部分环境未实现 scrollBy，安全兜底）
  try { window.scrollBy(0, 1); } catch(e) {}
  try { setTimeout(() => { try { window.scrollBy(0, -1); } catch(e2) {} }, 50); } catch(e) {}
}

export async function showPasswordModal(promptText, cb, onCancel){
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
      <div style="margin-top:18px;display:flex;justify-content:center;gap:12px">
        <button class="btn-ghost" id="pinCancel" style="min-height:40px;padding:10px 28px">取消</button>
      </div>
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
            showCenterToast('ok', '✓ 验证通过');
            try{cb&&await cb();}catch(e){toast("操作失败，请重试");}
            resolve(true);
          }else{
            // 密码错误：仅抖动 + 提示，保持弹窗让用户重试（不 resolve，避免弹窗卡留）
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
          }
        }).catch(err=>{
          // verifyPassword 自身出错：提示并可重试/取消（不自动 resolve）
          if(ov.parentNode) showPasswordError("验证失败，请重试");
          pin=""; renderDigits();
          ov.querySelectorAll(".pin-key").forEach(b=>{
            try{b.disabled=false;}catch(e){}
          });
          try{ov.querySelector(".pin-del").disabled=false;}catch(e){}
        });
      }
    }
    pinKeypad.addEventListener("click",e=>{
      const key=e.target.closest(".pin-key");if(!key)return;
      handleKey(key.dataset.key);
    });
    // 取消：移除密码键盘 + 回调 onCancel + resolve(false)
    function cancel(){
      if(ov.parentNode) ov.remove();
      try{ if(typeof onCancel === 'function') onCancel(); }catch(e){}
      resolve(false);
    }
    ov.addEventListener("click",e=>{if(e.target===ov)cancel();});
    ov.addEventListener("keydown",e=>{
      if(/^[0-9]$/.test(e.key))handleKey(e.key);
      else if(e.key==="Backspace")handleKey("del");
    });
    ov.addEventListener("click",()=>ov.focus());
    const cancelBtn = ov.querySelector("#pinCancel");
    if(cancelBtn) cancelBtn.addEventListener("click", cancel);
    ov.focus();
  });
    return result;
  } finally {
    _passwordModalActive = false;
    dismissAutofill();
  }
}

export function showPasswordError(msg){
  const el=document.createElement("div");
  el.style.cssText="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:14px 28px;border-radius:12px;background:rgba(239,83,80,.92);color:#fff;font-size:16px;font-weight:900;letter-spacing:1px;text-align:center;box-shadow:0 6px 24px rgba(239,83,80,.4);animation:fadeInOut 1.2s forwards";
  el.textContent=msg;
  document.body.appendChild(el);
  setTimeout(()=>{if(el.parentNode)el.remove();},1200);
}