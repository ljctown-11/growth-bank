// Independent QA verification script for the badgeLevel 分维度阈值 change.
// Imports the REAL function from features/growth-tree.js (fresh-eyes, not trusting the impl's self-test).
// Usage: node scripts/verify-badge-level.mjs  (run from project root)

import { badgeLevel, BADGE_THRESHOLDS } from '../features/growth-tree.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(label, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`  PASS  ${label}  => ${actual}`);
  } else {
    fail++;
    failures.push({ label, actual, expected });
    console.log(`  FAIL  ${label}  => got ${actual}, expected ${expected}`);
  }
}

console.log('========================================================');
console.log('PART 1: 5 维度 × L1–L5 边界断言 (import 真实 badgeLevel)');
console.log('========================================================');

const boundaryCases = [
  // cat, score, expected
  // 学习力
  ['学习力', 0, 1], ['学习力', 60, 2], ['学习力', 120, 3], ['学习力', 195, 4], ['学习力', 270, 5], ['学习力', 300, 5],
  // 运动力 (同学习力)
  ['运动力', 0, 1], ['运动力', 60, 2], ['运动力', 120, 3], ['运动力', 195, 4], ['运动力', 270, 5], ['运动力', 300, 5],
  // 自控力 [0,36,72,117,162]
  ['自控力', 0, 1], ['自控力', 36, 2], ['自控力', 72, 3], ['自控力', 117, 4], ['自控力', 162, 5], ['自控力', 180, 5],
  // 探索力 [0,12,24,39,54]
  ['探索力', 0, 1], ['探索力', 12, 2], ['探索力', 24, 3], ['探索力', 39, 4], ['探索力', 54, 5], ['探索力', 60, 5],
  // 实践力 (同探索力)
  ['实践力', 0, 1], ['实践力', 12, 2], ['实践力', 24, 3], ['实践力', 39, 4], ['实践力', 54, 5], ['实践力', 60, 5],
];

for (const [cat, score, expected] of boundaryCases) {
  check(`badgeLevel('${cat}', ${score}) -> L${expected}`, badgeLevel(cat, score), expected);
}

console.log('\n========================================================');
console.log('PART 2: 异常 / 边界输入 (安全降级)');
console.log('========================================================');
check(`badgeLevel('学习力', -5) -> 1`, badgeLevel('学习力', -5), 1);
check(`badgeLevel('学习力', NaN) -> 1`, badgeLevel('学习力', NaN), 1);
check(`badgeLevel('学习力', undefined) -> 1`, badgeLevel('学习力', undefined), 1);
check(`badgeLevel('学习力', null) -> 1`, badgeLevel('学习力', null), 1);
check(`badgeLevel('学习力', '60') -> 2`, badgeLevel('学习力', '60'), 2);
check(`badgeLevel('学习力', '270') -> 5`, badgeLevel('学习力', '270'), 5);

// 未知维度 -> 走 fallback [0,21,51,101,189]
console.log('\n[未知维度 fallback] 阈值应为 [0,21,51,101,189]');
check(`badgeLevel('未知', 0) -> 1`, badgeLevel('未知', 0), 1);
check(`badgeLevel('未知', 21) -> 2`, badgeLevel('未知', 21), 2);
check(`badgeLevel('未知', 189) -> 5`, badgeLevel('未知', 189), 5);

console.log('\n========================================================');
console.log('PART 3: 设计目标达成校验 (25 徽章全部可达)');
console.log('========================================================');
const DAYS = 60;
// 审批的日均
const daily = { '学习力': 5, '运动力': 5, '自控力': 3, '探索力': 1.5, '实践力': 1.5 };
// 探索力/实践力 按最慢 1分/天 校准 (总量60) 保证必解锁
const calibBase = { '学习力': 300, '运动力': 300, '自控力': 180, '探索力': 60, '实践力': 60 };

let allReachable = true;
for (const cat of Object.keys(daily)) {
  const total = daily[cat] * DAYS;
  const l5 = BADGE_THRESHOLDS[cat][4];
  const ok = total >= l5;
  if (!ok) allReachable = false;
  console.log(`  ${cat}: 日均${daily[cat]}×${DAYS}=${total} 总量 >= L5阈值${l5} ? ${ok ? 'YES' : 'NO'}`);
  // 校验阈值本身是否符合 20/40/65/90% 规则
  const t = BADGE_THRESHOLDS[cat];
  const expect = [0, calibBase[cat]*0.2, calibBase[cat]*0.4, calibBase[cat]*0.65, calibBase[cat]*0.9]
    .map(v => Math.round(v));
  const ruleOk = JSON.stringify(t) === JSON.stringify(expect);
  if (!ruleOk) allReachable = false;
  console.log(`     阈值${JSON.stringify(t)} 符合 20/40/65/90%(${JSON.stringify(expect)}) ? ${ruleOk ? 'YES' : 'NO'}`);
}
const totalBadges = Object.keys(daily).length * 5;
console.log(`\n  => 维度数×5 = ${totalBadges} 个徽章，全部可达: ${allReachable ? 'YES (25/25)' : 'NO'}`);

console.log('\n========================================================');
console.log(`SUMMARY: ${pass} passed, ${fail} failed`);
console.log('========================================================');
if (fail > 0) {
  console.log('FAILURES:');
  for (const f of failures) console.log(`  ${f.label}: got ${f.actual}, expected ${f.expected}`);
  process.exitCode = 1;
}
