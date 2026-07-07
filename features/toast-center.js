// features/toast-center.js — 中心高亮提示组件（三态语义色）
//
// 统一「中心浮层」提示，供补卡余额不足（warn）、密码验证成功（ok）等场景复用。
// 颜色取自 CSS 变量 --ok / --warn / --err（在 index.html 的 :root 与 5 套主题中定义），
// JS 零写死，保证 5 主题下都能解析为对应语义色（绿 / 橙 / 红）。

/**
 * 在屏幕正中弹出一条高亮提示，duration 毫秒后自动淡出并移除。
 * @param {'ok'|'warn'|'err'} type 提示类型，决定背景语义色
 * @param {string} text 提示文案
 * @param {number} [duration=1400] 显示时长（毫秒）
 */
export function showCenterToast(type, text, duration = 1400){
  // 校验类型，未知类型回退为 ok
  const t = (type === 'warn' || type === 'err') ? type : 'ok';
  // 背景色取自对应 CSS 变量
  const bgVar = t === 'ok' ? 'var(--ok)' : (t === 'warn' ? 'var(--warn)' : 'var(--err)');

  const el = document.createElement("div");
  el.className = "center-toast center-toast-" + t;
  el.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.96);" +
    "z-index:9999;padding:12px 20px;border-radius:10px;color:#fff;font-weight:800;" +
    "font-size:15px;line-height:1.4;text-align:center;max-width:80vw;box-shadow:0 6px 24px rgba(0,0,0,.2);" +
    "background:" + bgVar + ";" +
    "opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none;";
  el.textContent = text;
  document.body.appendChild(el);

  // 淡入
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translate(-50%,-50%) scale(1)";
  });

  // duration 后淡出并移除
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translate(-50%,-50%) scale(.96)";
    setTimeout(() => {
      if(el.parentNode) el.parentNode.removeChild(el);
    }, 220);
  }, duration);
}
