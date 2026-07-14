// features/tree-garden/seed-shop.js — 种子小铺（buySeed 纯函数提交段 + openSeedShop 弹层）
// 复用既有 showPasswordModal（买种真扣）与 openModal 单例弹层契约；余额不足不写状态。

import { STATE } from '../../core/state.js';
import { calcTotalScore, saveData } from '../../core/data.js';
import { showPasswordModal } from '../password.js';
import { openModal, closeModal } from '../modal.js';
import { addInventoryItem, SPECIES_GRADE, SPECIES_EMOJI, SPECIES_NAME } from './inventory.js';

/**
 * 购买种子（已授权上下文的纯函数提交段）。
 * 真扣：push {cost:grade, reward:"买种子", level:"成长树", date} 到 STATE.redemptions；
 * 种子进背包 state:'seed'。余额不足返回 false 且不写任何状态。
 * @param {'pine'|'apple'|'sakura'|'orange'} species
 * @param {5|10} grade
 * @returns {boolean}
 */
export function buySeed(species, grade){
  const cost = Number(grade) || 0;
  if(calcTotalScore() < cost) return false; // 余额不足：不写状态
  STATE.redemptions.unshift({
    date: new Date().toLocaleDateString('zh-CN'),
    reward: '买种子',
    level: '成长树',
    cost,
  });
  addInventoryItem({ species, grade, state: 'seed' });
  return true;
}

/**
 * 打开种子小铺弹层（4 物种 2 档价，选物种 → 密码真扣 → 进背包）。
 * @param {()=>void} [onChanged] 购买成功/失败后回调（用于刷新成长树页）
 */
export function openSeedShop(onChanged){
  const list = ['pine', 'apple', 'sakura', 'orange'];
  const builder = () => {
    const cards = list.map(sp => {
      const grade = SPECIES_GRADE[sp];
      const emoji = SPECIES_EMOJI[sp];
      const name = SPECIES_NAME[sp];
      return `<div class="gt-seed-card">
        <div class="gt-seed-emoji">${emoji}</div>
        <div class="gt-seed-name">${name}</div>
        <div class="gt-seed-price">${grade} 分</div>
        <button class="btn-primary gt-buy-btn" data-species="${sp}" data-grade="${grade}" type="button">购买</button>
      </div>`;
    }).join('');
    return `<div class="modal-box gt-seed-modal" style="max-width:460px">
      <h3 style="margin:0 0 4px">🌱 种子小铺</h3>
      <p style="color:var(--muted);font-size:13px;margin:0 0 14px">用成长分买一棵种子，种下你的成长树（可囤买）</p>
      <div class="gt-seed-grid">${cards}</div>
      <div class="modal-actions"><button class="btn-ghost" data-modal-close type="button">关闭</button></div>
    </div>`;
  };
  const ov = openModal('seed-shop', builder, {
    onMount(overlay){
      overlay.querySelectorAll('.gt-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sp = btn.dataset.species;
          const grade = Number(btn.dataset.grade) || 0;
          const name = SPECIES_NAME[sp] || sp;
          const emoji = SPECIES_EMOJI[sp] || '';
          showPasswordModal(
            `购买${emoji}${name}种子需扣除 <b>${grade}</b> 分，请输入家长密码确认`,
            () => {
              const ok = buySeed(sp, grade);
              if(ok){
                saveData();
                // R1 修复：买种后即时刷新首页总分与兑换记录（解耦事件，避免循环依赖）
                try { window.dispatchEvent(new CustomEvent('growthbank:score-changed')); } catch(e) { /* 静默回退 */ }
                if(typeof window.toast === 'function') window.toast(`已购买${emoji}${name}种子 🌱`);
              } else {
                if(typeof window.toast === 'function') window.toast('成长分不足，无法购买');
              }
              closeModal('seed-shop');
              if(typeof onChanged === 'function') onChanged();
            },
            () => { /* 取消：保留小铺，可重试 */ }
          );
        });
      });
    }
  });
  return ov;
}
