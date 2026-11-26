import {normalizeWorkspace, validateProject, MAX_PROJECTS} from './engine.mjs';

export class WorkspaceConflictError extends Error {
  constructor(message='This project changed in another tab. Your edits are still in this tab. Export a backup before reloading the saved copy.') {
    super(message);this.name='WorkspaceConflictError';this.code='WORKSPACE_CONFLICT';
  }
}

export function persistentWorkspace(raw, now=Date.now()) {
  const workspace=normalizeWorkspace(raw,now),metadata=raw?.persistence;
  const generation=typeof metadata?.generation==='string'&&metadata.generation.length<=100?metadata.generation:'initial';
  const revisions=Object.fromEntries(workspace.projects.map(project=>{
    const value=metadata?.revisions?.[project.id];
    return [project.id,Number.isSafeInteger(value)&&value>0?value:1];
  }));
  return {...workspace,persistence:{generation,revisions}};
}

// All conflict/capacity checks happen before a caller writes the single resulting
// record. Updates contain only deliberate edits, never an entire tab's library.
export function mergeWorkspace(raw,change={},now=Date.now()) {
  const current=persistentWorkspace(raw,now);
  if(change.clear){
    if(typeof change.newGeneration!=='string'||!change.newGeneration)throw Error('A clear operation requires a new workspace generation.');
    return {version:2,projects:[],activeId:null,persistence:{generation:change.newGeneration,revisions:{}}};
  }
  const upserts=change.upserts||[],deletions=change.deletions||[];
  if(!Array.isArray(upserts)||!Array.isArray(deletions))throw Error('Invalid workspace update.');
  if((upserts.length||deletions.length)&&change.generation!==current.persistence.generation){
    throw new WorkspaceConflictError('The workspace was cleared in another tab. Your edits are still here. Export a backup before reloading.');
  }
  const projects=new Map(current.projects.map(project=>[project.id,project]));
  const revisions={...current.persistence.revisions},seen=new Set();
  const check=(id,expected)=>{
    if(seen.has(id))throw Error('The same project cannot appear twice in one workspace update.');
    seen.add(id);
    const actual=projects.has(id)?revisions[id]:null;
    if(actual!==expected)throw new WorkspaceConflictError(actual===null&&expected!==null
      ?'This project was removed or expired in another tab. Your edits are still here. Export a backup to keep them.'
      :undefined);
  };
  for(const item of deletions){
    check(item.id,item.expectedRevision);
    projects.delete(item.id);delete revisions[item.id];
  }
  for(const item of upserts){
    const project=validateProject(item.project);
    if(project.id!==item.project.id)throw Error('Invalid project identity.');
    check(project.id,item.expectedRevision);
    projects.set(project.id,project);
    revisions[project.id]=(item.expectedRevision||0)+1;
  }
  if(projects.size>MAX_PROJECTS){const error=Error('Your saved library is full or changed in another tab. No projects were imported or replaced. Export a backup and free a project space first.');error.code='WORKSPACE_CAPACITY';throw error;}
  const selected=Object.hasOwn(change,'activeId')?change.activeId:current.activeId;
  const activeId=projects.has(selected)?selected:projects.has(current.activeId)?current.activeId:projects.keys().next().value||null;
  return {version:2,projects:[...projects.values()],activeId,persistence:{generation:current.persistence.generation,revisions}};
}

// IndexedDB serializes readwrite transactions on this store across tabs. Keep
// reads, merge checks and the write in this transaction with no intervening await.
export function transactWorkspace(db,change={},now=Date.now()) {
  return new Promise((resolve,reject)=>{
    let result,failure;
    const tx=db.transaction('workspace','readwrite'),store=tx.objectStore('workspace');
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(failure||tx.error||Error('Device storage could not be updated.'));
    tx.onabort=()=>reject(failure||tx.error||Error('Device storage update was cancelled.'));
    const apply=raw=>{
      try{
        result=mergeWorkspace(raw,change,now);
        store.put(result,'library');store.delete('project');
      }catch(error){failure=error;tx.abort();}
    };
    const request=store.get('library');
    request.onsuccess=()=>{
      if(request.result!==undefined&&request.result!==null)return apply(request.result);
      const legacy=store.get('project');legacy.onsuccess=()=>apply(legacy.result);
    };
  });
}
