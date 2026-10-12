let dbPromise;
export function database(){
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('bail-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(req.error);};});
 return dbPromise;
}
async function transaction(mode,operation){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode);const req=operation(tx.objectStore('projects'));tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Storage unavailable.'));});}
export const saveProject=p=>transaction('readwrite',s=>s.put(p));
export const listProjects=()=>transaction('readonly',s=>s.getAll());
export const deleteProject=id=>transaction('readwrite',s=>s.delete(id));
