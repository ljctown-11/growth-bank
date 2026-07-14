// core/state.js — 单源真相状态管理
import { TASKS, DEFAULT_REWARD_ITEMS, getTodayStr } from './helpers.js';
// Bug 1 修复：freshState 中 selDate 使用动态获取的今日日期
export function freshState(){
  return {
    daily:{},
    redemptions:[],
    // 果实真加积分（双真相源：与现有 redemptions 兑换记录 UI 解耦）
    fruitEarnings:[],
    // 成长树独立页面状态（待浇水池 + 背包 + 双树，随 child 快照自动隔离）
    // V2 改造：共享 totalWater / seasonSeq 下沉为每棵独立 water；
    // 新增 pendingWater 待浇水池（三源水先进池，不设上限 D1）与浇水连浇字段。
    growthTree:{
      firstPlantDate:null,   // 种下首棵当天；此前历史不计入浇水连浇
      pendingWater:0,        // 🆕 待浇水池（不设上限，D1）；三源水先进这里
      lastDailyWaterDate:'', // 每日浇水礼去重（按真实日，跨季保留）
      effortGranted:{},      // {'YYYY-MM-DD:taskId':true} 当天努力水去重
      claimedMilestones:[],  // [3,7,14,21,28,35,…] 坚持水已领（按浇水连浇计）
      waterStreakDays:0,     // 🆕 实际浇水连浇天数（非打卡，③）
      lastWaterStreakDate:'',// 🆕 上次浇水日期（用于连浇计算）
      activeTrees:[],        // [{id, species, grade, plantedSeason, water, lastWaterDate, streakDays}] 最多 2
      inventory:[],          // InventoryItem[] {id, species, grade:5|10, state:'seed'|'fruit'}
    },
    reviews:[],
    children:[],
    activeChildId:null,
    childName:"",
    childGender:"girl",
    parentPasswordHash:"",
    theme:"sakura",
    modifiedDefaultTasks:undefined,
    customTasks:[],
    customRewards:DEFAULT_REWARD_ITEMS,
    makeupVerifiedDates:{},
    makeupUsed:{},
    reports:{},
    remindersSent:{},
    // 家长录音鼓励元数据（仅元数据，blob 存 IndexedDB；随 child 快照自动隔离）
    parentEncouragements:[],
    // UI state
    selDate: getTodayStr(),
    selCat: "学习力",
    curCalYear: new Date().getFullYear(),
    curCalMonth: new Date().getMonth(),
  };
}
// 向后兼容：TODAY_STR 和 TODAY 仍导出（仅作为当前快照）
export const TODAY_STR = getTodayStr();
export const TODAY = new Date();
// Single source of truth for ALL modules
// `STATE` is the live object; `data` is the legacy alias kept for compatibility
export let STATE = freshState();
export let data = STATE; // legacy alias
export function setData(newData){
  // Merge into the existing STATE object to keep all references alive
  const merged = {...freshState(), ...newData};
  Object.keys(merged).forEach(k => { if(merged[k] !== undefined) STATE[k] = merged[k]; });
}
// 切换孩子时，从存储对象恢复 STATE，但始终用 freshState 兜底缺失字段，
// 避免 theme/childName 等被清空为 undefined（导致主题失效 / 宝宝掉线）
export function hydrateStateFrom(obj){
  const base = freshState();
  Object.keys(base).forEach(k => {
    STATE[k] = (obj && obj[k] !== undefined) ? obj[k] : base[k];
  });
}
export function setSelDate(newSelDate){
  STATE.selDate = newSelDate;
  data.selDate = newSelDate;
}
