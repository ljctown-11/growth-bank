// core/state.js — 单源真相状态管理

import { TASKS, DEFAULT_REWARD_ITEMS, getTodayStr } from './helpers.js';

// Bug 1 修复：freshState 中 selDate 使用动态获取的今日日期
export function freshState(){
  return {
    daily:{},
    redemptions:[],
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
    // UI state
    selDate: getTodayStr(),
    selCat: "全部",
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