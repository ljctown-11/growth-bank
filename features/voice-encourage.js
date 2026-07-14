// features/voice-encourage.js — 家长录音鼓励（录制/播放/删除 + 播放决策）

import { STATE } from '../core/state.js';
import { saveData } from '../core/data.js';
import { getTodayStr } from '../core/helpers.js';
import { saveMedia, getMedia, removeMedia } from './media.js';

const MAX_RECORD_SECONDS = 30; // 单条时长上限
const MAX_RECORDINGS = 10;     // 单孩录音条数上限

// 模块级录音状态
let _recorder = null;
let _chunks = [];
let _recordTimer = null;

/**
 * 录音 IndexedDB key（含 childId 实现物理隔离）。
 * @param {string} childId
 * @param {number} seq
 * @returns {string}
 */
export function encStorageKey(childId, seq){
  return `enc_${childId}_${seq}`;
}

/**
 * 优先录音、无则 null 回退的播放决策。
 * @param {Array<{id:string, label?:string}>} [list]
 * @param {string} [childId]
 * @returns {{id:string, label:string} | null}
 */
export function getEncouragementToPlay(list, childId){
  const arr = (list && list.length) ? list : (STATE.parentEncouragements || []);
  if(!arr || !arr.length) return null;
  const pick = arr[Math.floor(Math.random() * arr.length)];
  return { id: pick.id, label: pick.label || '' };
}

/**
 * 开始录音（MediaRecorder 三态：不支持/拒绝/成功）。
 * 不支持或无麦克风权限时抛带 code 的错误（UNSUPPORTED / DENIED）。
 * @param {string} childId
 * @returns {Promise<MediaRecorder>}
 */
export async function startRecording(childId){
  if(typeof window === 'undefined' || !window.MediaRecorder ||
     !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    const e = new Error('录音功能不可用');
    e.code = 'UNSUPPORTED';
    throw e;
  }
  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }catch(err){
    const e = new Error('麦克风授权被拒绝');
    e.code = (err && err.name === 'NotAllowedError') ? 'DENIED' : 'ERROR';
    throw e;
  }
  const rec = new window.MediaRecorder(stream);
  _chunks = [];
  rec.ondataavailable = (ev) => { if(ev.data && ev.data.size) _chunks.push(ev.data); };
  rec.start();
  _recorder = rec;
  // 单条时长上限自动停止
  _recordTimer = setTimeout(() => {
    try { if(_recorder && _recorder.state !== 'inactive') _recorder.stop(); } catch(e){}
  }, MAX_RECORD_SECONDS * 1000);
  return rec;
}

/**
 * 停止录音并返回音频 Blob。
 * @returns {Promise<Blob>}
 */
export function stopRecording(){
  return new Promise((resolve, reject) => {
    if(_recordTimer){ clearTimeout(_recordTimer); _recordTimer = null; }
    if(!_recorder){ reject(new Error('没有正在进行的录音')); return; }
    const rec = _recorder;
    rec.onstop = () => {
      const blob = new Blob(_chunks, { type: rec.mimeType || 'audio/webm' });
      _recorder = null;
      _chunks = [];
      resolve(blob);
    };
    if(rec.state !== 'inactive') rec.stop();
  });
}

/**
 * 保存录音：blob 存 IndexedDB（key=enc_<childId>_<seq>），元数据推入 STATE.parentEncouragements。
 * @param {string} childId
 * @param {Blob} blob
 * @param {string} [label]
 * @returns {Promise<string>} 返回的录音 id（即 IndexedDB key）
 */
export async function saveRecording(childId, blob, label){
  if(!STATE.parentEncouragements) STATE.parentEncouragements = [];
  if(STATE.parentEncouragements.length >= MAX_RECORDINGS){
    throw new Error('录音数量已达上限');
  }
  const seq = STATE.parentEncouragements.length;
  const id = encStorageKey(childId, seq);
  await saveMedia(id, blob);
  STATE.parentEncouragements.push({
    id,
    label: label || `加油语音 #${seq + 1}`,
    createdAt: getTodayStr(),
  });
  saveData();
  return id;
}

/**
 * 当前孩子的录音元数据列表。
 * @returns {Array<{id:string, label:string, createdAt:string, scene?:string}>}
 */
export function listRecordings(){
  return STATE.parentEncouragements || [];
}

/**
 * 播放指定录音（getMedia → Audio 播放，非阻塞）。
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function playRecording(id){
  const blob = await getMedia(id);
  if(!blob) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  await audio.play().catch(() => {});
}

/**
 * 删除录音：先删元数据（同步），再非阻塞 removeMedia（失败不阻塞）。
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteRecording(id){
  if(STATE.parentEncouragements){
    STATE.parentEncouragements = STATE.parentEncouragements.filter(x => x.id !== id);
    saveData();
  }
  try { await removeMedia(id); } catch(e){ /* 非阻塞：blob 缺失不影响元数据清理 */ }
}

/**
 * 打卡成功时优先播家长录音；无录音则调用方回退机器女声（返回 false）。
 * 非阻塞，不挡烟花。
 * @param {string} childId
 * @returns {boolean} 是否成功触发了录音播放
 */
export function playParentEncouragementOnCheckin(childId){
  const pick = getEncouragementToPlay(STATE.parentEncouragements, childId);
  if(!pick) return false;
  playRecording(pick.id).catch(() => {});
  return true;
}
