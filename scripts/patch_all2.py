import io, os, re

ROOT = 'I:/summer-growth-bank'

def read(p):
    return io.open(p, 'rb').read().decode('utf-8')

def norm(s):
    # 折叠任意 \r / \n 连续序列为单个 \n（兼容 \r\r\n 异常双回车）
    return re.sub(r'[\r\n]+', '\n', s)

def write(p, s):
    out = re.sub(r'[\r\n]+', '\r\n', s)  # 写回标准 CRLF
    io.open(p, 'wb').write(out.encode('utf-8'))

def patch(path, repls):
    p = os.path.join(ROOT, path)
    s = norm(read(p))
    for old, new in repls:
        if old not in s:
            print('!! MISS in', path, '::', repr(old[:70]))
            raise SystemExit(1)
        s = s.replace(old, new, 1)
    write(p, s)
    print('OK', path)

# ---------- inventory.js ----------
patch('features/tree-garden/inventory.js', [
('''/**
 * 合成：2 个 5 分果 → 1 个 10 分果；20% 失败，失败时净 -1（消耗 2 个中 1 个消失、退回 1 个）。
 * @param {()=>number} [rng] 可注入随机 [0,1)，默认 Math.random
 * @returns {boolean} true=执行了合成（≥2 个 5 分果）；false=不足 2 个 5 分果
 */
export function synthesizeFruit(rng){
  const r = rng || Math.random;
  const gt = STATE.growthTree;
  const fiveFruits = gt.inventory.filter(x => x.state === 'fruit' && x.grade === 5);
  if(fiveFruits.length < 2) return false;
  // 取出前 2 个 5 分果
  const [a, b] = fiveFruits;
  gt.inventory = gt.inventory.filter(x => x.id !== a.id && x.id !== b.id);
  if(r() < 0.2){
    // 失败（20%）：净 -1，退回 1 个
    gt.inventory.push(a);
    return true;
  }
  // 成功：产 1 个 10 分果（净 -1 数量，但升级为 10 分果）
  addInventoryItem({ species: a.species, grade: 10, state: 'fruit' });
  return true;
}''',
'''/**
 * 合成：2 个 5 分果 → 1 个 10 分果；20% 失败，失败时净 -1（消耗 2 个中 1 个消失、退回 1 个）。
 * @param {()=>number} [rng] 可注入随机 [0,1)，默认 Math.random
 * @returns {{ok:boolean, reason:'success'|'fail'|'insufficient'}}
 *   ok=true 成功合成；ok=false 且 reason='fail' 合成失败（损失 1 个）；reason='insufficient' 不足 2 个 5 分果
 */
export function synthesizeFruit(rng){
  const r = rng || Math.random;
  const gt = STATE.growthTree;
  const fiveFruits = gt.inventory.filter(x => x.state === 'fruit' && x.grade === 5);
  if(fiveFruits.length < 2) return { ok:false, reason:'insufficient' };
  // 取出前 2 个 5 分果
  const [a, b] = fiveFruits;
  gt.inventory = gt.inventory.filter(x => x.id !== a.id && x.id !== b.id);
  if(r() < 0.2){
    // 失败（20%）：净 -1，退回 1 个
    gt.inventory.push(a);
    return { ok:false, reason:'fail' };
  }
  // 成功：产 1 个 10 分果（净 -1 数量，但升级为 10 分果）
  addInventoryItem({ species: a.species, grade: 10, state: 'fruit' });
  return { ok:true, reason:'success' };
}'''),
])

# ---------- page.js ----------
patch('features/tree-garden/page.js', [
('''import {
  scoreToTreeStage, TREE_STAGE_NAMES, grantDailyWater,
  grantEffortWater, grantStreakWater, revokeEffortWater, pourWater,
} from './water.js';''',
'''import {
  scoreToTreeStage, TREE_STAGE_NAMES, grantDailyWater,
  grantEffortWater, grantStreakWater, revokeEffortWater, pourWater,
  getDisplayPendingWater,
} from './water.js';'''),
('''import { showPasswordModal } from '../password.js';''',
'''import { showPasswordModal } from '../password.js';
import { showResultBanner } from '../toast-center.js';'''),
('''    <span>💧 ${gt.pendingWater} 水</span>''',
'''    <span>💧 ${getDisplayPendingWater()} 水</span>'''),
('''  const waterStatic = `<div class="gt-water-static">💧 待浇水 ${gt.pendingWater}</div>`;''',
'''  const waterStatic = `<div class="gt-water-static">💧 待浇水 ${getDisplayPendingWater()}</div>`;'''),
('''function doSynthesize(){
  const ok = synthesizeFruit(Math.random);
  saveData();
  if(typeof window.toast === 'function'){
    window.toast(ok ? '合成成功 🧪' : '需要 2 个 5 分果才能合成哦');
  }
  closeModal('inventory');
  refreshGrowthTree();
}''',
'''function doSynthesize(){
  const res = synthesizeFruit(Math.random);
  saveData();
  if(res && res.ok){
    showResultBanner('success', '合成成功！获得 1 个 10 分果 🍎');
  } else if(res && res.reason === 'fail'){
    showResultBanner('fail', '合成失败，损失 1 个 5 分果（已退回 1 个）');
  } else {
    if(typeof window.toast === 'function') window.toast('需要 2 个 5 分果才能合成哦');
  }
  closeModal('inventory');
  refreshGrowthTree();
}'''),
])

# ---------- core/state.js ----------
patch('core/state.js', [
('''    selCat: "全部",''',
'''    selCat: "学习力",'''),
])

# ---------- main.js ----------
patch('main.js', [
('''  if(tab==="checkin"){STATE.selCat="学习力";renderCheckinDateLabel();renderCheckinExtras();}''',
'''  if(tab==="checkin"){renderCheckinDateLabel();renderCheckinExtras();}'''),
])

# ---------- toast-center.js (append showResultBanner) ----------
p = os.path.join(ROOT, 'features/toast-center.js')
s = norm(read(p))
if 'showResultBanner' not in s:
    s = s.rstrip('\n') + '\n\n' + '''/**
 * 在屏幕正中弹出一条「结果横幅」：更大、更醒目，成功绿 / 失败红，带图标与标题。
 * 用于合成种子等需要明显成功/失败反馈的场景。
 * @param {'success'|'fail'} type 结果类型
 * @param {string} text 主文案
 * @param {number} [duration=1800] 显示时长（毫秒）
 */
export function showResultBanner(type, text, duration = 1800){
  const ok = type === 'success';
  const bg = ok ? 'linear-gradient(135deg,#43a047,#66bb6a)' : 'linear-gradient(135deg,#e53935,#ef5350)';
  const icon = ok ? '🎉' : '💔';
  const el = document.createElement('div');
  el.className = 'result-banner result-banner-' + (ok ? 'ok' : 'fail');
  el.style.cssText =
    'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);' +
    'z-index:10000;min-width:240px;max-width:84vw;padding:22px 28px;border-radius:18px;' +
    'color:#fff;text-align:center;font-weight:800;box-shadow:0 12px 40px rgba(0,0,0,.3);' +
    'background:' + bg + ';opacity:0;transition:opacity .2s ease,transform .2s ease;pointer-events:none;';
  el.innerHTML = '<div style="font-size:40px;line-height:1;margin-bottom:8px;">' + icon + '</div>' +
    '<div style="font-size:17px;line-height:1.5;">' + text + '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,-50%) scale(1)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%,-50%) scale(.9)';
    setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 240);
  }, duration);
}
'''
    write(p, s)
    print('OK features/toast-center.js (appended)')
else:
    print('SKIP features/toast-center.js (already has showResultBanner)')

# ---------- tests/tree-garden.test.js ----------
patch('tests/tree-garden.test.js', [
('''    expect(synthesizeFruit(zero)).toBe(false);''',
'''    expect(synthesizeFruit(zero).ok).toBe(false);'''),
('''    expect(synthesizeFruit(zero)).toBe(true); // 执行了合成''',
'''    expect(synthesizeFruit(zero).ok).toBe(false); // 失败：rng<0.2'''),
('''    expect(synthesizeFruit(almost)).toBe(true);''',
'''    expect(synthesizeFruit(almost).ok).toBe(true);'''),
])

# ---------- tests/tree-garden-qa.test.js ----------
patch('tests/tree-garden-qa.test.js', [
('''    expect(synthesizeFruit(zero)).toBe(true); // 执行了合成''',
'''    expect(synthesizeFruit(zero).ok).toBe(false); // 失败：rng<0.2'''),
('''    expect(synthesizeFruit(almost)).toBe(true);''',
'''    expect(synthesizeFruit(almost).ok).toBe(true);'''),
('''    expect(synthesizeFruit(zero)).toBe(false); // 10 分果不参与合成''',
'''    expect(synthesizeFruit(zero).ok).toBe(false); // 10 分果不参与合成'''),
])

# ---------- tests/tree-garden-v2-qa.test.js ----------
patch('tests/tree-garden-v2-qa.test.js', [
('''import {

  pourWater, revokeEffortWater, getWaterStreak,

  grantEffortWater, grantStreakWater, scoreToTreeStage,

} from '../features/tree-garden/water.js';''',
'''import {

  pourWater, revokeEffortWater, getWaterStreak,

  grantEffortWater, grantStreakWater, scoreToTreeStage,

  getDisplayPendingWater,

} from '../features/tree-garden/water.js';'''),
('''    expect(STATE.growthTree.effortGranted[getTodayStr() + ':t1']).toBe(true); // A1：key 保留，复勾不再产水''',
'''    expect(STATE.growthTree.effortGranted[getTodayStr() + ':t1']).toBeUndefined(); // key 已清除，复勾会重新产水'''),
('''  it('A1 当天取消后复勾 → 不再产水（key 保留，grantEffortWater 返回 false）', () => {

    const today = getTodayStr();

    STATE.growthTree.pendingWater = 0;

    STATE.growthTree.effortGranted = {};

    grantEffortWater('t1', today); // pool +1, key set

    expect(STATE.growthTree.pendingWater).toBe(1);

    revokeEffortWater('t1', today); // pool -1, key 保留

    expect(STATE.growthTree.pendingWater).toBe(0);

    const again = grantEffortWater('t1', today); // 复勾

    expect(again).toBe(false); // 不再产水

    expect(STATE.growthTree.pendingWater).toBe(0); // 池不变

  });''',
'''  it('D2 当天取消后复勾 → 重新产水（key 已清除）', () => {

    const today = getTodayStr();

    STATE.growthTree.pendingWater = 0;

    STATE.growthTree.effortGranted = {};

    grantEffortWater('t1', today); // pool +1, key set

    expect(STATE.growthTree.pendingWater).toBe(1);

    revokeEffortWater('t1', today); // pool -1, key 删除

    expect(STATE.growthTree.pendingWater).toBe(0);

    expect(STATE.growthTree.effortGranted[getTodayStr() + ':t1']).toBeUndefined();

    const again = grantEffortWater('t1', today); // 复勾

    expect(again).toBe(true); // 重新产水

    expect(STATE.growthTree.pendingWater).toBe(1); // 池回到 1

  });

  it('D2 待浇水为 0 取消 → 池变负（债务），但显示仍夹为 0', () => {

    const today = getTodayStr();

    STATE.growthTree.pendingWater = 0;

    STATE.growthTree.effortGranted = {};

    grantEffortWater('t1', today); // pool +1

    revokeEffortWater('t1', today); // pool 0 - 1 = -1（债务）

    expect(STATE.growthTree.pendingWater).toBe(-1);

    expect(getDisplayPendingWater()).toBe(0); // 显示夹成 0

    // 复勾：从 -1 重新 +1 回到 0（不会凭空多出「0 起点」的水）
    const again = grantEffortWater('t1', today);

    expect(again).toBe(true);

    expect(STATE.growthTree.pendingWater).toBe(0);

    expect(getDisplayPendingWater()).toBe(0);

  });'''),
])

print('ALL PATCHES DONE')
