// features/tree-garden/water.js — 水滴三源引擎（纯函数，无 DOM）
// V2 改造：成长树由独立 pendingWater「待浇水池」驱动，与 calcTotalScore() 总积分解耦（双真相源）。
// 三源水（每日浇水礼 / 努力水 / 坚持水）先进池；用户手动 pourWater 把池里的水浇到某棵树上。
// 坚持水里程碑按「实际浇水连浇天数」(getWaterStreak) 发放，与全局 getStreak（打卡）解耦（③）。

import { STATE } from '../../core/state.js';
import { getTodayStr } from '../../core/helpers.js';

// 阶段名（种子/发芽/长叶/开花/繁茂）
export const TREE_STAGE_NAMES = ['种子', '发芽', '长叶', '开花', '繁茂'];

/**
 * 阶段阈值（独立真相源，不复用旧 growth-tree.js 的 STAGES 0/20/50/100/200）。
 * @param {5|10} grade
 * @returns {number[]} [种子,发芽,长叶,开花,繁茂] 的累计水滴阈值
 */
export function treeThresholds(grade){
  return grade === 5
    ? [0, 30, 70, 120, 180]   // 5 分种
    : [0, 45, 105, 180, 270]; // 10 分种（×1.5）
}

/**
 * 累计水滴 → 阶段信息（按单棵树的 water 计算）。
 * @param {number} water 某棵树当前累计水滴
 * @param {5|10} grade 该树档位（决定阈值）
 * @returns {{stage:string, idx:number, nextThreshold:number|null, pct:number}}
 *   pct 为当前阶段内进度 [0,1]。
 */
export function scoreToTreeStage(water, grade){
  const t = Math.max(0, Number(water) || 0);
  const th = treeThresholds(grade);
  let idx = 0;
  for(let i = 0; i < th.length; i++){
    if(t >= th[i]) idx = i;
  }
  const cur = th[idx];
  const next = th[idx + 1] != null ? th[idx + 1] : null;
  const span = next != null ? (next - cur) : 1;
  const pct = next != null ? Math.min(1, (t - cur) / span) : 1;
  return { stage: TREE_STAGE_NAMES[idx], idx, nextThreshold: next, pct };
}

// 坚持水里程碑表（基础档：3/7/14/21/28/35 天 → 5/10/15/20/25/30 水）
export const STREAK_MILESTONES = [
  { day: 3,  water: 5 },
  { day: 7,  water: 10 },
  { day: 14, water: 15 },
  { day: 21, water: 20 },
  { day: 28, water: 25 },
  { day: 35, water: 30 },
];

/**
 * 某连续天数对应的坚持水增量（含 35 天后每 +7 天 +5 的线性延伸）。
 * @param {number} day 连续浇水天数
 * @returns {number|null} 该里程碑应加的水；非里程碑日返回 null
 */
export function streakMilestoneWater(day){
  const d = Math.floor(Number(day) || 0);
  if(d < 3) return null;
  const base = STREAK_MILESTONES.find(m => m.day === d);
  if(base) return base.water;
  // 35 之后：每满 +7 天再 +5（day=42→35, 49→40, …）
  if(d > 35 && (d - 35) % 7 === 0){
    const k = (d - 35) / 7;
    return 30 + 5 * k;
  }
  return null;
}

/**
 * 每日浇水礼：全局 1/天，按真实日去重（跨天幂等 +1；同日返回 false）。
 * 水先进 pendingWater 待浇水池（D1 不设上限）。
 * @param {string} [today] YYYY-MM-DD，缺省用 getTodayStr()
 * @returns {boolean} 是否成功加水
 */
export function grantDailyWater(today){
  const ds = today || getTodayStr();
  const gt = STATE.growthTree;
  if(gt.lastDailyWaterDate === ds) return false;
  gt.lastDailyWaterDate = ds;
  gt.pendingWater += 1;
  return true;
}

/**
 * 努力水：当天每完成 1 个打卡任务 +1，按「日期:任务」去重（同日同任务幂等）。
 * 仅当天打卡才产水（D4）；非今天直接 return 0，不产生水。
 * @param {string} taskId 任务 id
 * @param {string} date YYYY-MM-DD
 * @returns {boolean} 是否成功加水
 */
export function grantEffortWater(taskId, date){
  if(date !== getTodayStr()) return 0; // D4：非当天不产水
  const gt = STATE.growthTree;
  const key = getTodayStr() + ':' + taskId;
  if(gt.effortGranted[key]) return false; // 同日同任务幂等
  gt.effortGranted[key] = true;
  const pts = (STATE.daily[date]?.tasks?.[taskId]?.pts) || 1;
  gt.pendingWater += pts;
  return true;
}

/**
 * 收回努力水（D2）：仅当天且已对该任务发放过努力水才精确扣回待浇水池；
 * 已浇到树上的部分不倒回。非今天或从未发放则返回 false。
 * @param {string} taskId 任务 id
 * @param {string} date YYYY-MM-DD
 * @returns {boolean} 是否成功收回
 */
export function revokeEffortWater(taskId, date){
  if(date !== getTodayStr()) return false; // D2：仅当天收回
  const gt = STATE.growthTree;
  const key = getTodayStr() + ':' + taskId;
  if(!gt.effortGranted[key]) return false;
  const pts = (STATE.daily[date]?.tasks?.[taskId]?.pts) || 1;
  // 允许变负（债务）：已浇光又取消时，pendingWater 进入负数；显示层用 getDisplayPendingWater 夹成 0
  gt.pendingWater = (gt.pendingWater || 0) - pts;
  // 清除发放记录：当天复勾时 grantEffortWater 会重新 +水（避免「取消→复勾」卡在 0 不产水）
  delete gt.effortGranted[key];
  return true;
}

/**
 * 待浇水展示值：债务（负数）一律显示为 0（实际负水量仅内部记账，保证复勾不会凭空多水）。
 * @returns {number}
 */
export function getDisplayPendingWater(){
  return Math.max(0, STATE.growthTree.pendingWater || 0);
}

/**
 * 解析 YYYY-MM-DD 为本地 Date（仅日期部分）。
 * @param {string} ds
 * @returns {Date}
 */
function parseDS(ds){
  const [y, m, d] = String(ds).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 格式化 Date → YYYY-MM-DD。
 * @param {Date} d
 * @returns {string}
 */
function fmtDS(d){
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 计算「昨天」的 YYYY-MM-DD 字符串。
 * @param {string} ds
 * @returns {string}
 */
function yesterdayStr(ds){
  const [y, m, d] = String(ds).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/**
 * 从种树日（firstPlantDate）起的连续打卡天数（坚持水源的基础，V1 口径，保留兼容）。
 * 与全局 getStreak 不同：种树前的历史连续不计入；遇到种树日之前的日期即截断；
 * 遇断卡（某日无任何 done 任务）即停。
 * @param {string} [todayStr] YYYY-MM-DD，缺省用 getTodayStr()（注入便于测试）
 * @returns {number}
 */
export function getStreakSincePlant(todayStr){
  const gt = STATE.growthTree;
  if(!gt.firstPlantDate) return 0;
  const today = parseDS(todayStr || getTodayStr());
  const doneOn = (ds) => {
    const day = STATE.daily[ds];
    if(!day || !day.tasks) return 0;
    let n = 0;
    for(const tid in day.tasks){ if(day.tasks[tid] && day.tasks[tid].done) n++; }
    return n;
  };
  const hasToday = doneOn(fmtDS(today)) > 0;
  let cursor = new Date(today);
  if(!hasToday) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for(let i = 0; i < 4000; i++){
    const ds = fmtDS(cursor);
    if(ds < gt.firstPlantDate) break;   // 种树前不计入
    if(doneOn(ds) > 0){
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;                              // 断卡即停
    }
  }
  return streak;
}

/**
 * 实际浇水连浇天数（V2 口径，③）：从 lastWaterStreakDate 起算。
 * 仅当最近一次浇水是「今天」或「昨天」才算连浇有效；断档（>1 天）则返回 0。
 * @returns {number}
 */
export function getWaterStreak(){
  const gt = STATE.growthTree;
  if(!gt.lastWaterStreakDate) return 0;
  const today = parseDS(getTodayStr());
  const last = parseDS(gt.lastWaterStreakDate);
  const diffDays = Math.round((today - last) / 86400000);
  if(diffDays <= 1) return gt.waterStreakDays || 0; // 今天或昨天浇过 → 连浇有效
  return 0; // 断档归零
}

/**
 * 推进全局浇水连浇（基于实际浇水，③）：
 * lastWaterStreakDate==昨天 → +1；==今天 → 不变；断档 → 重置为 1；lastWaterStreakDate=今天。
 * @param {object} gt STATE.growthTree
 * @param {string} today
 */
function updateWaterStreak(gt, today){
  if(gt.lastWaterStreakDate === today){
    // 今天已推进，保持
  } else if(gt.lastWaterStreakDate === yesterdayStr(today)){
    gt.waterStreakDays += 1;
  } else {
    gt.waterStreakDays = 1;
  }
  gt.lastWaterStreakDate = today;
}

/**
 * 坚持水：命中里程碑且未 claimed 则一次性发放（断浇后连续天数随 getWaterStreak 归零，
 * 已领里程碑记 claimedMilestones 持久不重发）。水进 pendingWater 待浇水池。
 * @param {number} [streak] 可选注入连续浇水天数（测试用）；缺省按实际浇水连浇天数计算
 * @returns {number} 本次加水量（0 表示无新里程碑）
 */
export function grantStreakWater(streak){
  const gt = STATE.growthTree;
  const s = (streak == null) ? getWaterStreak() : streak;
  let gained = 0;
  // 基础里程碑
  for(const m of STREAK_MILESTONES){
    if(s >= m.day && !gt.claimedMilestones.includes(m.day)){
      gt.pendingWater += m.water;
      gt.claimedMilestones.push(m.day);
      gained += m.water;
    }
  }
  // 35 天后每 +7 天 +5（上限到当前 streak）
  for(let d = 42; d <= s; d += 7){
    const w = streakMilestoneWater(d);
    if(w != null && !gt.claimedMilestones.includes(d)){
      gt.pendingWater += w;
      gt.claimedMilestones.push(d);
      gained += w;
    }
  }
  return gained;
}

/**
 * 浇水（用户手动）：选树 → 该树 water +1；pendingWater -1；
 * 更新该树 streakDays 与全局 waterStreakDays / lastWaterStreakDate（③）。
 * @param {string} treeId
 * @returns {boolean} 成功 true；树不存在或待浇水池为空返回 false
 */
export function pourWater(treeId){
  const gt = STATE.growthTree;
  const tree = gt.activeTrees.find(t => t.id === treeId);
  if(!tree) return false;            // 树不存在
  if(gt.pendingWater <= 0) return false; // 池空，无水解
  gt.pendingWater -= 1;
  tree.water += 1;
  // 该树连浇天数（基于实际浇水）
  const today = getTodayStr();
  if(tree.lastWaterDate === today){
    // 今天已浇过，streakDays 不变
  } else if(tree.lastWaterDate === yesterdayStr(today)){
    tree.streakDays += 1;
  } else {
    tree.streakDays = 1;
  }
  tree.lastWaterDate = today;
  // 全局浇水连浇天数（基于实际浇水）
  updateWaterStreak(gt, today);
  return true;
}
