// core/data.js — 数据加载/保存/计算

import { freshState, STATE } from './state.js';
import { getMonthKey, getTodayStr } from './helpers.js';

export function loadData(){
  try{
    const saved=localStorage.getItem("summerGrowthBankV2");
    const parsed=saved?JSON.parse(saved):freshState();
    parsed.daily=parsed.daily||{};
    parsed.redemptions=parsed.redemptions||[];
    parsed.reviews=parsed.reviews||[];
    parsed.customTasks=parsed.customTasks||[];
    parsed.makeupVerifiedDates=parsed.makeupVerifiedDates||{};
    parsed.makeupUsed=parsed.makeupUsed||{};
    parsed.reports=parsed.reports||{};
    // 兼容旧版拼写错误 reminersSent → remindersSent
    if(parsed.reminersSent && !parsed.remindersSent){ parsed.remindersSent = parsed.reminersSent; delete parsed.reminersSent; }
    parsed.remindersSent=parsed.remindersSent||{};
    parsed.customRewards=parsed.customRewards||{};
    // 校验 childName：如果 childName 不在 children 列表中，清除它
    if(parsed.childName){
      const children = parsed.children || [];
      if(children.length > 0 && !children.some(c => c.name === parsed.childName)){
        parsed.childName = "";
      }
    }
    // Bug #3 修复：每次打开应用自动切回今天（动态计算）
    const todayStr = getTodayStr();
    if(parsed.selDate && parsed.selDate !== todayStr){
      parsed.selDate = todayStr;
      const today = new Date();
      parsed.curCalYear = today.getFullYear();
      parsed.curCalMonth = today.getMonth();
    }
    return parsed;
  }catch(e){return freshState();}
}

export function saveData(){
  if(STATE.activeChildId && STATE.activeChildId!=='default'){
    const childKey = "summerGrowthBankV2_child_"+STATE.activeChildId;
    localStorage.setItem(childKey, JSON.stringify(STATE));
  } else {
    localStorage.setItem("summerGrowthBankV2", JSON.stringify(STATE));
  }
}

export function getDay(dateStr){
  if(!STATE.daily[dateStr]){
    STATE.daily[dateStr]={tasks:{},score:0,artworks:[]};
  }
  return STATE.daily[dateStr];
}

export function calcDayScore(dateStr){
  const day=STATE.daily[dateStr]||{tasks:{}};
  let s=0;
  for(const tid in day.tasks){
    if(day.tasks[tid].done) s+=day.tasks[tid].pts||0;
  }
  return s;
}

export function calcTotalScore(){
  let total=0;
  for(const ds in STATE.daily){
    let dayScore=0;
    const day=STATE.daily[ds];
    for(const tid in day.tasks){
      if(day.tasks[tid].done) dayScore+=day.tasks[tid].pts||0;
    }
    total+=dayScore;
  }
  for(const r of STATE.redemptions){
    total-=r.cost||0;
  }
  return Math.max(0,total);
}