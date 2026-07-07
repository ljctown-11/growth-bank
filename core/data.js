// core/data.js — 数据加载/保存/计算

import { freshState, STATE } from './state.js';
import { getTodayStr, getWeekKey } from './helpers.js';

export function loadData(){
  try{
    const saved=localStorage.getItem("summerGrowthBankV2");
    const parsed=saved?JSON.parse(saved):freshState();
    parsed.daily=parsed.daily||{};
    parsed.redemptions=parsed.redemptions||[];
    parsed.reviews=parsed.reviews||[];
    // 复盘 weekKey 迁移：旧数据补 weekKey；同周多条合并为「最新内容 + 最早 date 锚点」
    if(parsed.reviews && parsed.reviews.length){
      const _byWeek = {};
      const _merged = [];
      for(const r of parsed.reviews){
        const _ds = r.date || getTodayStr();
        const _wk = getWeekKey(_ds);
        if(!r.weekKey) r.weekKey = _wk;
        if(_byWeek[_wk]){
          const _base = _byWeek[_wk];
          // 合并：保留最早 date 锚点；内容取最新（首条=最新）的已填项，空白由旧记录补全
          _base.best = r.best || _base.best;
          _base.hard = r.hard || _base.hard;
          _base.next = r.next || _base.next;
          _base.parent = r.parent || _base.parent;
          _base.support = r.support || _base.support;
          if(_ds < _base.date) _base.date = _ds;
        } else {
          _byWeek[_wk] = r;
          _merged.push(r);
        }
      }
      parsed.reviews = _merged;
    }
    parsed.customTasks=parsed.customTasks||[];
    parsed.makeupVerifiedDates=parsed.makeupVerifiedDates||{};
    parsed.makeupUsed=parsed.makeupUsed||{};
    parsed.reports=parsed.reports||{};
    // 兼容旧版拼写错误 reminersSent → remindersSent
    if(parsed.reminersSent && !parsed.remindersSent){ parsed.remindersSent = parsed.reminersSent; delete parsed.reminersSent; }
    parsed.remindersSent=parsed.remindersSent||{};
    parsed.customRewards=parsed.customRewards||{};
    // 方案B：从 main.children[activeChildId] 派生 childName/theme/gender（单一真相源），不再按名字匹配清空
    const _mainChildren = parsed.children || [];
    if(parsed.activeChildId && parsed.activeChildId!=='default'){
      const _c = _mainChildren.find(x=>x.id===parsed.activeChildId);
      if(_c){ parsed.childName=_c.name; parsed.childGender=_c.gender||"girl"; parsed.theme=_c.theme||"sakura"; }
      else { parsed.childName=""; }
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
  // main 永远保存元信息（children / activeChildId / parentPasswordHash / customRewards / theme / childName / childGender）
  // 保证在任何路径下 main 都是“单一真相源”，避免切换/刷新后宝宝掉线
  let mainData;
  try{
    mainData = JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");
  }catch(e){ mainData = {}; }

  mainData.children = STATE.children && STATE.children.length ? STATE.children : (mainData.children||[]);
  // 同步当前宝宝的元信息到 main.children（单一真相源）
  if(STATE.activeChildId && STATE.activeChildId!=='default'){
    if(!mainData.children) mainData.children = [];
    const idx = mainData.children.findIndex(c=>c.id===STATE.activeChildId);
    if(idx>=0){
      mainData.children[idx] = {
        ...mainData.children[idx],
        name: STATE.childName||mainData.children[idx].name||"宝贝",
        gender: STATE.childGender||mainData.children[idx].gender||"girl",
        theme: STATE.theme||mainData.children[idx].theme||"sakura"
      };
    }
    mainData.activeChildId = STATE.activeChildId;
  } else {
    // default 模式：若 main 没有孩子，则把当前输入当作第一个宝宝保存
    if((!mainData.children || mainData.children.length===0) && STATE.childName && STATE.childName.trim()){
      const id = "child_"+Date.now();
      mainData.children = [{id, name:STATE.childName, gender:STATE.childGender||"girl", theme:STATE.theme||"sakura"}];
      STATE.activeChildId = id;
      mainData.activeChildId = id;
    } else {
      mainData.activeChildId = STATE.activeChildId || null;
    }
  }
  mainData.parentPasswordHash = STATE.parentPasswordHash || "";
  mainData.customRewards = STATE.customRewards || {};

  if(STATE.activeChildId && STATE.activeChildId!=='default'){
    const childKey = "summerGrowthBankV2_child_"+STATE.activeChildId;
    // 子快照只存打卡数据，元信息已剥离到 main
    const { children, childName, childGender, theme, activeChildId, parentPasswordHash, customRewards, ...childData } = STATE;
    localStorage.setItem(childKey, JSON.stringify(childData));
  }
  // 始终回写 main（含元信息），保证刷新/切换后不丢失
  localStorage.setItem("summerGrowthBankV2", JSON.stringify(mainData));
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