// ===== features/makeup.js — 补卡规则 =====

import { getMonthKey, getTodayStr } from '../core/helpers.js';
import { getDay, saveData } from '../core/data.js';
import { STATE } from '../core/state.js';

export function isToday(dateStr){
  return dateStr === getTodayStr();
}

export function isFuture(dateStr){
  return dateStr > getTodayStr();
}

// 过去日期：如果有打卡记录，则锁定（不可再补）；如果没有打卡记录，则允许补卡
export function isPastLocked(dateStr){
  if(dateStr >= getTodayStr()) return false;
  const day = getDay(dateStr);
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) return true;
  }
  return false;
}

// 过去日期：没有任何打卡记录，允许补卡
export function isPastWithNoCheckins(dateStr){
  if(dateStr >= getTodayStr()) return false;
  const day = getDay(dateStr);
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) return false;
  }
  return true;
}

export function canMakeupDate(dateStr){
  if(isToday(dateStr))return false;
  if(isFuture(dateStr))return false;
  if(!isPastWithNoCheckins(dateStr)) return false;
  return true;
}

export function canCheckIn(dateStr){
  if(isToday(dateStr))return true;
  if(isFuture(dateStr))return false;
  // 过去日期：有打卡记录则可（查看状态），无打卡记录则不可直接打卡（需先补卡）
  if(dateStr < getTodayStr()){
    const day=getDay(dateStr);
    for(const tid in day.tasks){
      if(day.tasks[tid]&&day.tasks[tid].done) return true;
    }
    return false;
  }
  return true;
}

export function getMakeupCost(dateStr){
  if(!canMakeupDate(dateStr))return {allowed:false,reason:"该日期不可补卡",cost:0};
  const monthKey=getMonthKey(dateStr);
  const currentMonth=getMonthKey(getTodayStr());
  if(monthKey!==currentMonth)return {allowed:false,reason:"非当月",cost:0};
  const already=STATE.makeupVerifiedDates&&STATE.makeupVerifiedDates[dateStr];
  if(already)return {allowed:true,cost:0};
  const used=STATE.makeupUsed[monthKey]||0;
  // 每月4次补卡机会：第1-2次免费，第3次扣10分，第4次扣20分，第5次及以后不可补
  if(used>=4)return {allowed:false,reason:"本月补卡次数已用完（最多4次），下月重置",cost:0};
  let cost=0;
  if(used===2)cost=10;
  else if(used===3)cost=20;
  return {allowed:true,cost};
}