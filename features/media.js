// features/media.js — IndexedDB 图片存储

const DB_NAME = "summerGrowthMediaDB";
const STORE_NAME = "media";

export async function openDB(){
  return new Promise((resolve, reject)=>{
    const req=indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME,{keyPath:"id"});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function saveMedia(id, blob){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    const store=tx.objectStore(STORE_NAME);
    const req=store.put({id,blob});
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

export async function getMedia(id){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readonly");
    const store=tx.objectStore(STORE_NAME);
    const req=store.get(id);
    req.onsuccess=()=>resolve(req.result?req.result.blob:null);
    req.onerror=()=>reject(req.error);
  });
}

export async function removeMedia(id){
  const db=await openDB();
  return new Promise((resolve, reject)=>{
    const tx=db.transaction(STORE_NAME,"readwrite");
    const store=tx.objectStore(STORE_NAME);
    const req=store.delete(id);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

export async function hasMedia(id){
  try{
    const media=await getMedia(id);
    return !!media;
  }catch(e){return false;}
}

// Convert blob to base64 (for localStorage export)
export async function blobToBase64(blob){
  return new Promise((resolve, reject)=>{
    const reader=new FileReader();
    reader.onloadend=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}