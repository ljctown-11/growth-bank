const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf-8');

// ===== FIX #1: Baby settings modal - remove sections moved to parent center =====
// Replace the password section and all sections after it (keep only name/gender/theme + pwdStatus + modal-actions)
const oldPwSection = '    <div style="text-align:left;margin-bottom:16px;padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(255,248,225,.8),rgba(255,236,210,.5));border:1.5px dashed rgba(255,152,0,.3)">\r\n      <label style="display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;color:#e65100;margin-bottom:8px">🔒 家长密码</label>\r\n      <small style="display:block;color:var(--muted);font-size:12px;margin-bottom:10px;line-height:1.5">设置后，修改奖励内容等操作需要验证。密码为4-6位数字。</small>\r\n      <div id="pwdStatus" style="font-size:12px;font-weight:800;margin-bottom:8px;color:var(--muted)">${data.parentPasswordHash?"已设置密码 ✓":"未设置密码"}</div>\r\n      </div>\r\n      <div style="text-align:left;margin-bottom:14px;padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(232,245,233,.5),rgba(227,242,253,.4));border:1.5px dashed rgba(41,182,246,.3)">\r\n      <label style="display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;color:#1565c0;margin-bottom:8px">密码设置</label>';

const newPwSection = '    </div>\r\n    <div class="modal-actions"><button class="btn-ghost" id="babyModalCancel">取消</button><button class="btn-primary" id="babyModalOk">确认</button></div></div>`;

if (c.includes(oldPwSection)) {
  c = c.replace(oldPwSection, newPwSection);
  console.log('OK #1: Removed moved sections from baby modal');
} else {
  console.log('FAIL #1: oldPwSection not found');
}

// ===== FIX #2: Password modal z-index =====
const oldPwdZ = 'const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="100";';
const newPwdZ = 'const ov=document.createElement("div");ov.className="modal-overlay";ov.style.zIndex="1000";';

let count = 0;
let idx = 0;
while ((idx = c.indexOf(oldPwdZ, idx)) !== -1) {
  c = c.substring(0, idx) + newPwdZ + c.substring(idx + oldPwdZ.length);
  count++;
  idx += newPwdZ.length;
}
console.log('OK #2: Fixed password modal z-index, replaced ' + count + ' occurrences');

// ===== FIX #3: Task manager - fix duplicate tasks =====
// 3a. Remove pending tasks rendering in renderTasks (remove the block that shows pending at top)
const pendingRender = '    // Show pending new tasks at bottom\r\n    if(pendingNewTasks.length > 0){\r\n      let pendingHtml = \'<div style="padding:8px;border-radius:8px;background:rgba(255,202,40,.1);margin-bottom:6px;font-size:12px">\';\r\n      pendingNewTasks.forEach(t=>{\r\n        pendingHtml += \'<span style="display:inline-block;padding:3px 8px;margin:2px;border-radius:4px;background:rgba(255,202,40,.3);font-weight:700">★ 新增: \'+t.title+\' (\'+t.cat+\', \'+t.pts+\'\')</span>\';\r\n      });\r\n      pendingHtml += \'</div>\';\r\n      tc.insertAdjacentHTML("afterbegin", pendingHtml);\r\n    }\r\n';
if (c.includes(pendingRender)) {
  c = c.replace(pendingRender, '');
  console.log('OK #3a: Removed pending task rendering from task list');
} else {
  console.log('FAIL #3a: pendingRender not found');
}

// 3b. Fix saveWorking: pending tasks should be merged into customTasks at the END of saving
// Replace: data.modifiedDefaultTasks = newDefaults; data.customTasks = newCustoms; pendingNewTasks.forEach...
const oldSaveLogic = '    // Save modified default tasks to data.modifiedDefaultTasks (persistent)\r\n    data.modifiedDefaultTasks = newDefaults;\r\n    data.customTasks = newCustoms;\r\n    // Add pending new tasks\r\n    pendingNewTasks.forEach(t => {\r\n      if(!data.customTasks) data.customTasks = [];\r\n      data.customTasks.push(t);\r\n    });\r\n    pendingNewTasks = [];\r\n    // Update in-memory TASKS for immediate rendering\r\n    TASKS.length = 0;\r\n    newDefaults.forEach(t => TASKS.push(t));\r\n  }';
const newSaveLogic = '    // Save modified default tasks to data.modifiedDefaultTasks (persistent)\r\n    data.modifiedDefaultTasks = newDefaults;\r\n    // Merge existing customs + pending into customTasks\r\n    const mergedCustoms = [...(data.customTasks || []), ...pendingNewTasks];\r\n    data.customTasks = mergedCustoms;\r\n    pendingNewTasks = [];\r\n    // Update in-memory TASKS for immediate rendering\r\n    TASKS.length = 0;\r\n    newDefaults.forEach(t => TASKS.push(t));\r\n    saveData();\r\n  }';

if (c.includes(oldSaveLogic)) {
  c = c.replace(oldSaveLogic, newSaveLogic);
  console.log('OK #3b: Fixed saveWorking to merge pending tasks properly');
} else {
  console.log('FAIL #3b: oldSaveLogic not found');
}

// ===== FIX #4: switchChild - restore children array when switching back to default =====
// Replace the switchChild function in baby settings modal
const oldSwitchChild = '  function switchChild(id){\r\n    // Remove modal first, then switch\r\n    ov.remove();\r\n    // Switch to child: save current main data, then load child data\r\n    // Save current main data\r\n    data.activeChildId = id;\r\n    localStorage.setItem("summerGrowthBankV2", JSON.stringify(data));\r\n    // Load child-specific data or create fresh\r\n    if(id === \'default\'){\r\n      data = loadData();\r\n    } else {';

const newSwitchChild = '  function switchChild(id){\r\n    // Remove modal first, then switch\r\n    ov.remove();\r\n    if(id === \'default\'){\r\n      // Switching back to default: reload from main localStorage but preserve children array\r\n      try{\r\n        const savedMain = JSON.parse(localStorage.getItem("summerGrowthBankV2") || "{}");\r\n        data = {...freshState(), ...savedMain}; \r\n      }catch(e){ data = loadData(); }\r\n    } else {';

if (c.includes(oldSwitchChild)) {
  c = c.replace(oldSwitchChild, newSwitchChild);
  console.log('OK #4a: Fixed switchChild for default account');
} else {
  console.log('FAIL #4a: oldSwitchChild not found');
}

// Also fix switchChild in parent center (openChildrenModal)
const oldPcSwitch = 'function switchChildFromParentCenter(id){\r\n  if(id===\'default\'){\r\n    data=loadData();\r\n  }else{';

const newPcSwitch = 'function switchChildFromParentCenter(id){\r\n  if(id===\'default\'){\r\n    // Reload from main localStorage, preserve children\r\n    try{const savedMain=JSON.parse(localStorage.getItem("summerGrowthBankV2")||"{}");data={...freshState(),...savedMain};}catch(e){data=loadData();}\r\n  }else{';

if (c.includes(oldPcSwitch)) {
  c = c.replace(oldPcSwitch, newPcSwitch);
  console.log('OK #4b: Fixed switchChildFromParentCenter for default account');
} else {
  console.log('FAIL #4b: oldPcSwitch not found');
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('\nPhase 2 done. File written.');
