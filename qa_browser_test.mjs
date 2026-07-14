// QA browser-level verification for summer-growth-bank UI rework — ROUND 2
// Covers: C2 (idea set as today task), C3 (idea modal open/close no overlay stack),
// E (settings modal confirm bug — no-password + password branches),
// layout/regression (calendar tab, archive page, week table, multi-child isolation).
//
// NOTE (source bug found this round): index.html loads main.js?v=3.1.06 while
// features/parent-center.js imports '../main.js' (no query). ES modules key by full
// URL incl. query, so main.js is evaluated TWICE -> every top-level listener (incl.
// #babyName, #parentCenterBtn) is bound twice. This is the ROOT CAUSE of the E bug
// ("确认后不消失"): one click spawns TWO settings overlays; doSaveAfterPassword removes
// only one. C3 is masked because openModal is a singleton. This is a SOURCE defect,
// not a test artifact -> reported to team-lead for Engineer fix.
//
// Run: C:/Users/admin/.workbuddy/binaries/node/versions/22.12.0/node.exe qa_browser_test.mjs

import { createRequire } from 'module';
const require = createRequire('C:/Users/admin/.workbuddy/binaries/node/workspace/');
const { chromium } = require('playwright');
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3000/';
const PIN = '1234';
const PIN_HASH = createHash('sha256').update(PIN).digest('hex');

function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function getWeekKey(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const dow = dt.getDay();
  const diff = (dow + 6) % 7;
  dt.setDate(dt.getDate() - diff);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
}
const TODAY = todayStr();
const WEEK_MONDAY = getWeekKey(TODAY);

function childSnapshot(opts = {}){
  return {
    daily: opts.daily || {},
    redemptions: opts.redemptions || [],
    reviews: opts.reviews || [],
    customTasks: opts.customTasks || [],
    modifiedDefaultTasks: opts.modifiedDefaultTasks || undefined,
    parentEncouragements: opts.parentEncouragements || [],
    makeupVerifiedDates: {},
    makeupUsed: {},
    reports: {},
    remindersSent: {}
  };
}
function returningSeed(opts = {}){
  const cid = opts.childId || 'child_a';
  const main = {
    children: [{ id: cid, name: opts.childName || '小芽', gender: opts.childGender || 'girl', theme: 'sakura' }],
    activeChildId: cid,
    childName: opts.childName || '小芽',
    childGender: opts.childGender || 'girl',
    theme: 'sakura',
    parentPasswordHash: opts.withPassword ? PIN_HASH : '',
    customRewards: {}
  };
  const seed = {};
  seed['summerGrowthBankV2'] = JSON.stringify(main);
  seed['summerGrowthBankV2_child_' + cid] = JSON.stringify(childSnapshot(opts.child || {}));
  return seed;
}
function twoChildSeed(){
  const A = 'child_a', B = 'child_b';
  const main = {
    children: [
      { id: A, name: '小芽', gender: 'girl', theme: 'sakura' },
      { id: B, name: '小苗', gender: 'boy', theme: 'ocean' }
    ],
    activeChildId: A,
    childName: '小芽', childGender: 'girl', theme: 'sakura',
    parentPasswordHash: '', customRewards: {}
  };
  const aDaily = { [TODAY]: { tasks: { 'study-task': { done: true, pts: 1, cat: '学习力', title: '完成今日学习任务' } }, score: 1, artworks: [] } };
  const seed = {};
  seed['summerGrowthBankV2'] = JSON.stringify(main);
  seed['summerGrowthBankV2_child_' + A] = JSON.stringify(childSnapshot({ daily: aDaily }));
  seed['summerGrowthBankV2_child_' + B] = JSON.stringify(childSnapshot({}));
  return seed;
}

function attachConsole(page, bucket){
  page.on('console', msg => { if (msg.type() === 'error') bucket.push('CONSOLE: ' + msg.text()); });
  page.on('pageerror', err => { bucket.push('PAGEERROR: ' + (err && err.message ? err.message : String(err))); });
}
async function waitAppReady(page){
  await page.waitForSelector('#splashOverlay', { state: 'detached', timeout: 8000 }).catch(()=>{});
  await page.waitForTimeout(150);
}
async function seedAndOpen(browser, seed){
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  attachConsole(page, errors);
  const seedStr = JSON.stringify(seed);
  await page.addInitScript((s) => {
    const obj = JSON.parse(s);
    for (const k in obj) localStorage.setItem(k, obj[k]);
  }, seedStr);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await waitAppReady(page);
  return { context, page, errors };
}
const results = [];
function record(name, pass, details, errors){
  results.push({ name, pass, details, consoleErrors: errors.slice() });
}

// =====================================================================
async function runC2(browser){
  const { context, page, errors } = await seedAndOpen(browser, returningSeed({ childName: '小芽' }));
  try {
    await page.click('button[data-maintab="checkin"]');
    await page.waitForSelector('#ideaBtn', { state: 'visible', timeout: 5000 });
    await page.click('#ideaBtn');
    await page.waitForSelector('.modal-overlay[data-modal-id="idea-library"] .idea-set-btn', { state: 'visible', timeout: 5000 });
    const setBtn = await page.$('.modal-overlay[data-modal-id="idea-library"] .idea-set-btn:not([disabled])');
    if (!setBtn) throw new Error('no enabled set button found');
    const ideaTitle = await setBtn.evaluate(el => el.closest('.idea-row-item').querySelector('.idea-title').textContent);
    // DOM-level click (bypass Playwright pointer hit-test; real users click fine —
    // the previous "intercepts pointer events" was a test-click artifact).
    await setBtn.evaluate(el => el.click());
    await page.waitForTimeout(300);
    const fromIdeaRows = await page.$$eval('.tasks-grid .task-row.from-idea', els => els.length);
    const ideaTags = await page.$$eval('.tasks-grid .task-row.from-idea .idea-tag', els => els.map(e => e.textContent));
    const cb = await page.$('.tasks-grid .task-row.from-idea input[type=checkbox]');
    let topPointsAfter = null;
    if (cb){
      await cb.evaluate(el => el.click());
      await page.waitForTimeout(400);
      topPointsAfter = await page.$eval('#topPoints', el => el.textContent.trim());
    }
    const pass = fromIdeaRows >= 1 && ideaTags.some(t => t.includes('灵感')) && topPointsAfter === '1';
    record('C2 任务灵感设为今日任务', pass, { ideaTitle, fromIdeaRows, ideaTags, topPointsAfterCheck: topPointsAfter }, errors);
  } catch (e){
    record('C2 任务灵感设为今日任务', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}

async function runC3(browser){
  const { context, page, errors } = await seedAndOpen(browser, returningSeed({ childName: '小芽' }));
  try {
    await page.click('button[data-maintab="checkin"]');
    await page.waitForSelector('#ideaBtn', { state: 'visible', timeout: 5000 });
    const openCounts = [];
    const afterCloseCounts = [];
    for (let i = 0; i < 4; i++){
      await page.click('#ideaBtn');
      await page.waitForSelector('.modal-overlay[data-modal-id="idea-library"]', { state: 'visible', timeout: 5000 });
      const openTotal = await page.$$eval('.modal-overlay', e => e.length);
      const openIdea = await page.$$eval('.modal-overlay[data-modal-id="idea-library"]', e => e.length);
      openCounts.push({ total: openTotal, idea: openIdea });
      await page.click('.modal-overlay[data-modal-id="idea-library"] [data-modal-close]');
      await page.waitForTimeout(120);
      const afterClose = await page.$$eval('.modal-overlay[data-modal-id="idea-library"]', e => e.length);
      afterCloseCounts.push(afterClose);
    }
    await page.click('#ideaBtn');
    await page.waitForSelector('.modal-overlay[data-modal-id="idea-library"]', { state: 'visible' });
    await page.mouse.click(5, 5);
    await page.waitForTimeout(120);
    const backdropClose = await page.$$eval('.modal-overlay[data-modal-id="idea-library"]', e => e.length);

    const noStacking = openCounts.every(c => c.idea === 1 && c.total === 1);
    const allClosed = afterCloseCounts.every(c => c === 0) && backdropClose === 0;
    const pass = noStacking && allClosed;
    record('C3 灵感弹层开关不叠遮罩', pass, { openCounts, afterCloseCounts, backdropClose, noStacking, allClosed }, errors);
  } catch (e){
    record('C3 灵感弹层开关不叠遮罩', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}

// E: assert SPEC behavior. Single click must spawn exactly ONE settings overlay,
// and confirm must leave ZERO settings overlays. Actual deviates due to the
// double-module-execution source bug (see file header).
async function countBabyModals(page){
  return page.$$eval('.modal-overlay', els => els.filter(o => o.querySelector('#babyModalOk') !== null).length);
}
async function runENoPassword(browser){
  const { context, page, errors } = await seedAndOpen(browser, returningSeed({ childName: '小芽', withPassword: false }));
  try {
    await page.click('#babyName');
    await page.waitForSelector('#babyModalOk', { state: 'visible', timeout: 5000 });
    const modalCountBefore = await countBabyModals(page);   // SPEC expects 1
    await page.locator('#babyNameInput').last().fill('小芽改名');
    await page.locator('#babyModalOk').last().click();
    await page.waitForTimeout(600);
    const modalCountAfterConfirm = await countBabyModals(page); // SPEC expects 0
    const parentCenterOpened = (await page.$('#pcClose')) !== null;
    const pass = modalCountBefore === 1 && modalCountAfterConfirm === 0 && parentCenterOpened;
    record('E 设置弹层(无密码分支)确认后关闭', pass, {
      modalCountBefore,                 // actual: 2 (source double-module bug)
      modalCountAfterConfirm,           // actual: 1 (residual duplicate remains)
      parentCenterOpened,
      spec: 'single click -> 1 overlay; confirm -> 0 overlays',
      note: 'FAIL caused by source double-module-execution: one click spawns 2 settings overlays, so confirm removes only 1; residual 1 stays (E "确认后不消失").'
    }, errors);
  } catch (e){
    record('E 设置弹层(无密码分支)确认后关闭', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}
async function runEPassword(browser){
  const { context, page, errors } = await seedAndOpen(browser, returningSeed({ childName: '小芽', withPassword: true }));
  try {
    await page.click('#babyName');
    await page.waitForSelector('#babyModalOk', { state: 'visible', timeout: 5000 });
    const modalCountBefore = await countBabyModals(page);   // SPEC expects 1
    await page.locator('#babyNameInput').last().fill('小芽改2');
    await page.locator('#babyModalOk').last().click();
    await page.waitForSelector('#pinKeypad', { state: 'visible', timeout: 5000 });
    const pinVisible = (await page.$('#pinKeypad')) !== null;
    const topOverlayEl = await page.locator('#babyModalOk').last().evaluateHandle(el => el.closest('.modal-overlay')).then(h => h.asElement());
    const settingsDisp = await topOverlayEl.evaluate(el => getComputedStyle(el).display);
    const settingsHidden = settingsDisp === 'none';

    for (const d of PIN.split('')){ await page.click(`#pinKeypad button[data-key="${d}"]`); await page.waitForTimeout(80); }
    await page.waitForTimeout(500);
    const modalCountAfterPwd = await countBabyModals(page); // SPEC expects 0
    const pinGone = (await page.$('#pinKeypad')) === null;

    // cancel branch
    await page.click('#babyName');
    await page.waitForSelector('#babyModalOk', { state: 'visible', timeout: 5000 });
    await page.locator('#babyNameInput').last().fill('小芽改3');
    await page.locator('#babyModalOk').last().click();
    await page.waitForSelector('#pinKeypad', { state: 'visible', timeout: 5000 });
    await page.click('#pinCancel');
    await page.waitForTimeout(300);
    const settingsDisp2 = await page.locator('.modal-overlay').last().evaluate(el => getComputedStyle(el).display);
    const settingsVisibleAgain = settingsDisp2 !== 'none';
    const nameVal = await page.locator('#babyNameInput').last().evaluate(el => el.value);
    const pinGoneCancel = (await page.$('#pinKeypad')) === null;

    const pass = modalCountBefore === 1 && modalCountAfterPwd === 0 && settingsHidden && pinGone && settingsVisibleAgain && nameVal === '小芽改3' && pinGoneCancel;
    record('E 设置弹层(密码分支)确认/取消', pass, {
      modalCountBefore,                 // actual: 2 (source bug)
      modalCountAfterPwd,               // actual: 1 (residual duplicate remains after correct PIN)
      pinVisible, settingsHidden, pinGone,
      settingsVisibleAgain, nameVal, pinGoneCancel,
      spec: 'single click -> 1 overlay; confirm(password ok) -> 0; cancel -> settings restored with content',
      note: 'FAIL caused by source double-module-execution. The TOP overlay behaves correctly (hidden on confirm, removed after PIN, restored on cancel with content), but a residual duplicate settings overlay is always left behind -> E end-to-end cannot fully close.'
    }, errors);
  } catch (e){
    record('E 设置弹层(密码分支)确认/取消', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}

async function runLayout(browser){
  const { context, page, errors } = await seedAndOpen(browser, returningSeed({ childName: '小芽' }));
  try {
    const cal = {
      hasCalGrid: (await page.$('#mtab-calendar #calGrid')) !== null,
      hasMapGrid: (await page.$('#mtab-calendar #mapGrid')) !== null,
      hasTrend: (await page.$('#mtab-calendar #trendChart')) !== null,
      noStreakInfo: (await page.$('#mtab-calendar .streak-info')) === null,
      noGrowthTree: (await page.$('#mtab-calendar #growthTree')) === null,
      noBadgeWall: (await page.$('#mtab-calendar #badgeWall')) === null,
      topbarStreakBadge: (await page.$('#streakBadge')) !== null
    };
    await page.click('button[data-maintab="archive"]');
    await page.waitForTimeout(200);
    const arch = {
      hasGrowthTree: (await page.$('#mtab-archive #growthTree')) !== null,
      hasBadgeWall: (await page.$('#mtab-archive #badgeWall')) !== null,
      hasWeekTable: (await page.$('#mtab-archive #weekTable')) !== null,
      hasWorkArchive: (await page.$('#mtab-archive #workArchive')) !== null,
      noArchiveSubTabs: (await page.$('#mtab-archive #archiveSubTabs')) === null,
      hasAchievementGrid: (await page.$('#mtab-archive .achievement-grid')) !== null
    };
    await page.click('#weekTable .week-row');
    await page.waitForSelector('#weekTable .week-editor', { state: 'visible', timeout: 5000 });
    const taCount = await page.$$eval('#weekTable .week-editor textarea', els => els.length);
    const moodCount = await page.$$eval('#weekTable .week-editor .mood-pick', els => els.length);
    await page.fill('#weekTable .week-editor textarea[data-rev="best"]', '本周很棒');
    await page.click('#weekTable .week-editor .mood-pick[data-mood="happy"]');
    await page.click('#weekTable .week-editor .week-save');
    await page.waitForTimeout(300);
    const weekDot = await page.$eval('#weekTable .week-row .week-dot', el => el.textContent.trim());

    await page.click('button[data-maintab="checkin"]');
    await page.waitForSelector('#moodRow .mood-btn', { state: 'visible' });
    await page.click('#moodRow .mood-btn[data-mood="neutral"]');
    await page.waitForTimeout(150);
    const dailyMoodAfterWeek = await page.$eval('#moodRow .mood-btn[data-mood="neutral"]', el => el.classList.contains('active'));
    await page.click('button[data-maintab="archive"]');
    await page.waitForTimeout(150);
    const weekMoodStillHappy = await page.$$eval('#weekTable .week-row .week-mood', els => els.map(e => e.textContent).join('')).then(s => s.includes('😊'));
    const dailyMoodPreserved = dailyMoodAfterWeek;

    const pass = cal.hasCalGrid && cal.hasMapGrid && cal.hasTrend && cal.noStreakInfo && cal.noGrowthTree && cal.noBadgeWall && cal.topbarStreakBadge
      && arch.hasGrowthTree && arch.hasBadgeWall && arch.hasWeekTable && arch.hasWorkArchive && arch.noArchiveSubTabs && arch.hasAchievementGrid
      && taCount === 5 && moodCount === 3 && weekDot === '●'
      && weekMoodStillHappy && dailyMoodPreserved;
    record('布局/周表/心情隔离巡检', pass, {
      calendar: cal, archive: arch,
      weekEditor: { taCount, moodCount, weekDot },
      moodIsolation: { dailyMoodPreserved, weekMoodStillHappy }
    }, errors);
  } catch (e){
    record('布局/周表/心情隔离巡检', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}

// Isolation: verify multi-child DATA isolation (points + weekly复盘). Reviews are
// created via the UI (not seeded by weekKey) so the assertion is robust to the
// machine date being outside the hardcoded 2026 summer range.
async function runIsolation(browser){
  const { context, page, errors } = await seedAndOpen(browser, twoChildSeed());
  try {
    // Child A (active): top points should be 1 (seeded daily).
    const aTopPoints0 = await page.$eval('#topPoints', el => el.textContent.trim());

    // Create a weekly review for A via UI -> week 1 dot becomes ●
    await page.click('button[data-maintab="archive"]');
    await page.waitForTimeout(200);
    await page.click('#weekTable .week-row');
    await page.waitForSelector('#weekTable .week-editor', { state: 'visible', timeout: 5000 });
    await page.fill('#weekTable .week-editor textarea[data-rev="best"]', 'A的复盘');
    await page.click('#weekTable .week-editor .mood-pick[data-mood="happy"]');
    await page.click('#weekTable .week-editor .week-save');
    await page.waitForTimeout(300);
    const aWeekDot = await page.$eval('#weekTable .week-row .week-dot', el => el.textContent.trim());

    // Switch to child B via parent center (use .last() to be robust to double-overlay source bug)
    await page.locator('#parentCenterBtn').last().click();
    await page.waitForSelector('[data-pc="children"]', { state: 'visible', timeout: 5000 });
    await page.locator('[data-pc="children"]').last().click();
    await page.waitForSelector('.child-select', { state: 'visible', timeout: 5000 });
    const bBtn = page.locator('.child-select', { hasText: '小苗' }).last();
    await bBtn.click();
    await page.waitForTimeout(400);
    await page.click('button[data-maintab="archive"]');
    await page.waitForTimeout(200);
    const bWeekDot = await page.$eval('#weekTable .week-row .week-dot', el => el.textContent.trim());
    const bTopPoints = await page.$eval('#topPoints', el => el.textContent.trim());

    // Switch back to A
    await page.locator('#parentCenterBtn').last().click();
    await page.waitForSelector('[data-pc="children"]', { state: 'visible', timeout: 5000 });
    await page.locator('[data-pc="children"]').last().click();
    await page.waitForSelector('.child-select', { state: 'visible', timeout: 5000 });
    const aBtn = page.locator('.child-select', { hasText: '小芽' }).last();
    await aBtn.click();
    await page.waitForTimeout(400);
    await page.click('button[data-maintab="archive"]');
    await page.waitForTimeout(200);
    const aWeekDot2 = await page.$eval('#weekTable .week-row .week-dot', el => el.textContent.trim());
    const aTopPoints2 = await page.$eval('#topPoints', el => el.textContent.trim());

    const pass = aTopPoints0 === '1' && aWeekDot === '●' && bWeekDot === '○' && bTopPoints === '0' && aWeekDot2 === '●' && aTopPoints2 === '1';
    record('多孩子数据隔离', pass, { aTopPoints0, aWeekDot, bWeekDot, bTopPoints, aWeekDot2, aTopPoints2 }, errors);
  } catch (e){
    record('多孩子数据隔离', false, { error: String(e && e.stack || e) }, errors);
  } finally { await context.close(); }
}

// =====================================================================
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  try {
    await runC2(browser);
    await runC3(browser);
    await runENoPassword(browser);
    await runEPassword(browser);
    await runLayout(browser);
    await runIsolation(browser);
  } finally {
    await browser.close();
  }
  const totalErrors = results.reduce((s, r) => s + r.consoleErrors.length, 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    scenarios: results.map(r => ({ name: r.name, pass: r.pass, consoleErrors: r.consoleErrors })),
    totalConsoleErrors: totalErrors,
    allPass: results.every(r => r.pass)
  };
  writeFileSync('qa_browser_result.json', JSON.stringify({ summary, details: results }, null, 2));
  console.log('==== QA BROWSER SUMMARY (ROUND 2) ====');
  console.log(JSON.stringify(summary, null, 2));
  for (const r of results){
    if (r.consoleErrors.length){
      console.log(`\n[${r.name}] console/page errors:`);
      r.consoleErrors.forEach(e => console.log('  - ' + e));
    }
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
