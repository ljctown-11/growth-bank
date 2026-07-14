// features/tree-garden/inventory.js — 背包 / 种下 / 收获 / 兑果 / 合成（纯函数，无 DOM）
// 统一结构 InventoryItem；所有读写经 STATE.growthTree（随 child 快照自动隔离）。
// V2：每棵树独立 water / lastWaterDate / streakDays；收获单棵判断（某棵达繁茂才收那棵）。
import { STATE } from '../../core/state.js';
import { calcTotalScore } from '../../core/data.js';
import { scoreToTreeStage } from './water.js';
import { getTodayStr } from '../../core/helpers.js';
export const SPECIES = ['pine', 'apple', 'sakura', 'orange'];
// 物种 → 默认档位（🌲松树/🍎苹果 = 5 分；🌸樱花/🍊橙子 = 10 分）
export const SPECIES_GRADE = {
  pine: 5,
  apple: 5,
  sakura: 10,
  orange: 10,
};
// 物种 → 展示 emoji
export const SPECIES_EMOJI = {
  pine: '🌲',
  apple: '🍎',
  sakura: '🌸',
  orange: '🍊',
};
// 物种 → 中文名
export const SPECIES_NAME = {
  pine: '松树',
  apple: '苹果',
  sakura: '樱花',
  orange: '橙子',
};
let _invSeq = 0;
function nextInvId(){
  _invSeq += 1;
  return 'inv_' + Date.now().toString(36) + '_' + _invSeq.toString(36);
}
/**
 * 统一背包结构。
 * @typedef {Object} InventoryItem
 * @property {string} id 唯一 id（用于种下/兑果定位）
 * @property {'pine'|'apple'|'sakura'|'orange'} species
 * @property {5|10} grade
 * @property {'seed'|'fruit'} state
 */
/**
 * 写入一个背包项（自动生成 id），返回创建后的对象。
 * @param {{species:string, grade:5|10, state:'seed'|'fruit'}} item
 * @returns {InventoryItem}
 */
export function addInventoryItem(item){
  const it = Object.assign({ id: nextInvId() }, item);
  STATE.growthTree.inventory.push(it);
  return it;
}
/** @returns {InventoryItem[]} */
export function getInventory(){
  return STATE.growthTree.inventory || [];
}
/**
 * 构造一棵新树对象（每棵完全独立：自带 water / lastWaterDate / streakDays）。
 * @param {object} base {id, species, grade}
 * @returns {object}
 */
function newTree(base){
  return {
    id: base.id,
    species: base.species,
    grade: base.grade,
    plantedSeason: 0,        // 每棵独立后仅作信息字段，不再驱动全局重置
    water: 0,                // 🆕 独立水滴
    lastWaterDate: '',       // 🆕 该树最近浇水日
    streakDays: 0,           // 🆕 该树浇水连浇天数
  };
}
/**
 * 种下背包中的种子 → activeTrees（最多 2 棵）。
 * @param {string} itemId 背包种子项 id
 * @returns {boolean} 成功 true；=2 棵已满或找不到返回 false
 */
export function plantSeed(itemId){
  const gt = STATE.growthTree;
  const item = gt.inventory.find(x => x.id === itemId && x.state === 'seed');
  if(!item) return false;
  if(gt.activeTrees.length >= 2) return false;
  gt.inventory = gt.inventory.filter(x => x.id !== itemId);
  gt.activeTrees.push(newTree({ id: item.id, species: item.species, grade: item.grade }));
  if(!gt.firstPlantDate) gt.firstPlantDate = getTodayStr();
  return true;
}
/**
 * 果实直接种下当种子（以该 fruit 的 grade 开一季）。
 * @param {string} itemId 背包果实项 id
 * @returns {boolean}
 */
export function plantFruitAsSeed(itemId){
  const gt = STATE.growthTree;
  const item = gt.inventory.find(x => x.id === itemId && x.state === 'fruit');
  if(!item) return false;
  if(gt.activeTrees.length >= 2) return false;
  gt.inventory = gt.inventory.filter(x => x.id !== itemId);
  gt.activeTrees.push(newTree({ id: item.id, species: item.species, grade: item.grade }));
  if(!gt.firstPlantDate) gt.firstPlantDate = getTodayStr();
  return true;
}
/**
 * 果实兑积分（已授权上下文）：push fruitEarnings + 从背包移除该 fruit。
 * @param {string} itemId 背包果实项 id
 * @returns {boolean}
 */
export function redeemFruit(itemId){
  const gt = STATE.growthTree;
  const item = gt.inventory.find(x => x.id === itemId && x.state === 'fruit');
  if(!item) return false;
  const gain = Number(item.grade) === 5 ? 5 : 10;
  STATE.fruitEarnings.push({ gain, source: '果实兑换', date: getTodayStr() });
  gt.inventory = gt.inventory.filter(x => x.id !== itemId);
  return true;
}
/**
 * 是否有任意 active 树处于繁茂（idx===4，按各棵独立 water 计算）。
 * @returns {boolean}
 */
export function isAnyLush(){
  const gt = STATE.growthTree;
  if(gt.activeTrees.length === 0) return false;
  return gt.activeTrees.some(t => scoreToTreeStage(t.water, t.grade).idx === 4);
}
/**
 * 收获：仅繁茂可收获。可指定某棵树（单棵判断，该棵 water 达繁茂阈值才收那棵）；
 * 不指定 treeId 时收获全部繁茂树。收获后该棵重置（water/lastWaterDate/streakDays 归零，
 * 不继承），claimedMilestones 跨季保留，effortGranted 清空。
 * @param {()=>number} [rng] 可注入随机 [0,1)，默认 Math.random
 * @param {string} [treeId] 指定收获某棵（单棵）
 * @returns {InventoryItem[]|false} 非繁茂返回 false；否则返回产出的果实数组
 */
export function harvestTree(rng, treeId){
  const r = rng || Math.random;
  const gt = STATE.growthTree;
  let targets;
  if(treeId){
    const t = gt.activeTrees.find(x => x.id === treeId);
    if(!t) return false;
    if(t.harvested) return false; // 已收获的树不再重复收获
    if(scoreToTreeStage(t.water, t.grade).idx !== 4) return false; // 该棵未繁茂
    targets = [t];
  } else {
    targets = gt.activeTrees.filter(t => !t.harvested && scoreToTreeStage(t.water, t.grade).idx === 4);
  }
  if(targets.length === 0) return false;
  const fruits = [];
  for(const tree of targets){
    const grade = tree.grade;
    const min = grade === 5 ? 3 : 5;
    const max = grade === 5 ? 6 : 10;
    const n = min + Math.floor(r() * (max - min + 1)); // 闭区间 [min,max]
    for(let i = 0; i < n; i++){
      fruits.push(addInventoryItem({ species: tree.species, grade, state: 'fruit' }));
    }
    // 收获后保持繁茂：不清零 water / streakDays，仅打收获标记（按钮转为「铲除」，7 天后可强制铲除）
    tree.harvested = true;
    tree.harvestDate = getTodayStr();
  }
  return fruits;
}
/**
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
}
/**
 * 距今天数（用于「收获后 7 天强制铲除」）。
 * @param {string} dateStr YYYY-MM-DD
 * @returns {number} 距今天数；无日期返回 Infinity（视为已过期）
 */
export function daysSince(dateStr){
  if(!dateStr) return Infinity;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const [ty, tm, td] = getTodayStr().split('-').map(Number);
  const now = new Date(ty, tm - 1, td);
  return Math.round((now - dt) / 86400000);
}
/**
 * 铲除某棵树（从园中移除）。
 * @param {string} treeId
 * @returns {boolean} 是否真正移除（不存在返回 false）
 */
export function uprootTree(treeId){
  const gt = STATE.growthTree;
  const before = gt.activeTrees.length;
  gt.activeTrees = gt.activeTrees.filter(t => t.id !== treeId);
  return gt.activeTrees.length < before;
}
