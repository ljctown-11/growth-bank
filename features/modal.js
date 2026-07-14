// features/modal.js — 统一弹层工具（单例注册表）
//
// 根治 C3 类「遮罩叠加」问题：同一 id 仅允许一个实例存在。
// 弹层内部 HTML 由调用方通过 builder() 提供（需包含一个 .modal-box）。
// 关闭三要素：关闭按钮（[data-modal-close]）、遮罩点击（e.target===overlay）、Esc。

const registry = new Map();

// 弹层 z-index：低于密码键盘(2000)，高于常规内容
const MODAL_ZINDEX = '1500';

/**
 * 打开一个统一弹层（单例）。
 * @param {string} id 弹层唯一 id（同一 id 已存在则直接返回 null，不叠加）
 * @param {() => string} builder 返回 overlay 内部 HTML（含 .modal-box）
 * @param {{onMount?: (overlay: HTMLElement) => void, onClose?: () => void}} [opts]
 * @returns {HTMLElement|null} 成功返回 overlay 元素；已存在同 id 返回 null
 */
export function openModal(id, builder, opts = {}) {
  if (registry.has(id)) return null; // 单例保护：同 id 已存在则不叠加（根治 C3）

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.modalId = id;
  overlay.style.zIndex = MODAL_ZINDEX;
  overlay.innerHTML = builder();
  overlay._opts = opts;
  document.body.appendChild(overlay);
  registry.set(id, overlay);

  // 关闭按钮（data-modal-close）
  overlay.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(id));
  });

  // 遮罩点击关闭（仅点在遮罩本身时）
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });

  // Esc 关闭（document 级监听，关闭时解绑）
  function onKey(e) {
    if (e.key === 'Escape') closeModal(id);
  }
  overlay._onKey = onKey;
  document.addEventListener('keydown', onKey);

  // onMount 钩子：供调用方绑定内部事件
  if (typeof opts.onMount === 'function') {
    try { opts.onMount(overlay); } catch (e) { /* 调用方自管异常 */ }
  }

  return overlay;
}

/**
 * 关闭并移除指定 id 的弹层。
 * @param {string} id
 */
export function closeModal(id) {
  const overlay = registry.get(id);
  if (!overlay) return;
  if (overlay._onKey) document.removeEventListener('keydown', overlay._onKey);
  if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  registry.delete(id);
  const opts = overlay._opts;
  if (opts && typeof opts.onClose === 'function') {
    try { opts.onClose(); } catch (e) { /* 调用方自管异常 */ }
  }
}

/**
 * 关闭所有已注册的弹层（测试清理 / 兜底用）。
 */
export function forceCloseAllModals() {
  Array.from(registry.keys()).forEach((id) => closeModal(id));
}
