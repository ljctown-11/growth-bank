// features/mood.js — 心情打卡读写 + 温柔失败话术层（纯函数，无 DOM 依赖）

import { STATE } from '../core/state.js';
import { getDay } from '../core/data.js';

// 合法心情枚举
export const MOOD_ENUM = ['happy', 'neutral', 'sad'];

// 心情对应 emoji（供 UI 展示）
export const MOOD_EMOJI = { happy: '😊', neutral: '😐', sad: '😢' };

// 温柔失败话术库（按场景分组）
export const GENTLE_MESSAGES = {
  zeroCheckin: [
    '今天还没开始也没关系，选一个小任务试试看？🌱',
    '还没打卡也没事，慢慢来，今天的一小步也算数 🍃',
    '今天可以先休息一下，想做的时候随时开始 🌿',
  ],
  uncheck: [
    '没关系，今天还可以再勾上哦 🌱',
    '取消也没关系，想做的时候随时再来 🌿',
    '它还在那里等你，有空再回来勾上就好 🍃',
  ],
  streakBroken: [
    '今天没关系的，明天我们一起再试一次 🌱',
    '断了一天也没关系，重要的是我们还在一起往前走 🌿',
    '每一次重新开始都很勇敢，明天见 🍃',
  ],
};

// 同场景会话内不连续重复同一条（避免骚扰）
const _lastGentleMsg = { zeroCheckin: '', uncheck: '', streakBroken: '' };

/**
 * 校验心情输入，返回合法枚举或 null。
 * @param {unknown} mood
 * @returns {'happy'|'neutral'|'sad'|null}
 */
export function validateMoodInput(mood){
  return MOOD_ENUM.includes(mood) ? mood : null;
}

/**
 * 写入某日心情与附言（<=50 字截断）。null/非法 mood 会清空该日 mood。
 * @param {string} date
 * @param {'happy'|'neutral'|'sad'|null} mood
 * @param {string} note
 */
export function setMood(date, mood, note){
  const day = getDay(date);
  const valid = validateMoodInput(mood);
  if(valid) day.mood = valid;
  else delete day.mood;
  const n = note == null ? '' : String(note);
  day.moodNote = n.slice(0, 50);
  return day;
}

/**
 * 读取某日心情与附言。
 * @param {string} date
 * @returns {{mood?: 'happy'|'neutral'|'sad', moodNote: string}}
 */
export function getMood(date){
  const day = getDay(date);
  return { mood: day.mood, moodNote: day.moodNote || '' };
}

/**
 * 统计某日已完成任务数（done 计数）。
 * @param {string} date
 * @returns {number}
 */
export function countDayDone(date){
  const day = STATE.daily[date];
  if(!day || !day.tasks) return 0;
  let n = 0;
  for(const tid in day.tasks){
    if(day.tasks[tid] && day.tasks[tid].done) n++;
  }
  return n;
}

/**
 * 按周聚合情绪分布（仅统计已记录 mood 的日期）。
 * 调用方应传入「目标周」的 daily 切片；getWeekKeyFn 为保留参数（用于语义对齐，可选）。
 * @param {Record<string, object>} daily
 * @param {Function} [getWeekKeyFn]
 * @returns {{happy:number, neutral:number, sad:number}}
 */
export function aggregateMoodByWeek(daily, getWeekKeyFn){
  const result = { happy: 0, neutral: 0, sad: 0 };
  if(!daily) return result;
  for(const date in daily){
    const m = daily[date] && daily[date].mood;
    if(m && result[m] !== undefined) result[m]++;
  }
  return result;
}

/**
 * 随机取一条温柔话术（同场景不连续重复上一条）。
 * @param {'zeroCheckin'|'uncheck'|'streakBroken'} scenario
 * @param {{streak?:number}} [ctx]
 * @returns {string}
 */
export function pickGentleMessage(scenario, ctx){
  const list = GENTLE_MESSAGES[scenario];
  if(!list || !list.length) return '';
  const last = _lastGentleMsg[scenario] || '';
  let pool = list.filter(m => m !== last);
  if(pool.length === 0) pool = list;
  const msg = pool[Math.floor(Math.random() * pool.length)];
  _lastGentleMsg[scenario] = msg;
  return msg;
}

// 仅供测试重置去重状态
export function _resetGentleHistory(){
  _lastGentleMsg.zeroCheckin = '';
  _lastGentleMsg.uncheck = '';
  _lastGentleMsg.streakBroken = '';
}
