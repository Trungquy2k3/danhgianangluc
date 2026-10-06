/* =========================================================
   LOCAL STORAGE SERVICE
   ========================================================= */
const STORAGE_KEY = 'employeeEvaluationSystem_v1';
const SESSION_KEY = 'employeeEvaluationSession_v1';

function deepClone(value){
  return JSON.parse(JSON.stringify(value));
}

function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const fresh = buildInitialData();
    saveData(fresh);
    return fresh;
  }
  try{
    const parsed = JSON.parse(raw);
    return migrateData(parsed);
  }catch(error){
    console.error('Không thể đọc dữ liệu localStorage:', error);
    const fresh = buildInitialData();
    saveData(fresh);
    return fresh;
  }
}

function migrateData(data){
  const fresh = buildInitialData();
  return {
    ...fresh,
    ...data,
    employees: Array.isArray(data.employees) ? data.employees : fresh.employees,
    criteria: Array.isArray(data.criteria) ? data.criteria : fresh.criteria,
    periods: Array.isArray(data.periods) ? data.periods : fresh.periods,
    evaluations: Array.isArray(data.evaluations) ? data.evaluations : fresh.evaluations,
    selfEvaluations: Array.isArray(data.selfEvaluations) ? data.selfEvaluations : fresh.selfEvaluations,
    permissions: data.permissions || fresh.permissions,
    settings: {...fresh.settings, ...(data.settings || {})}
  };
}

function resetData(){
  const fresh = buildInitialData();
  saveData(fresh);
  return fresh;
}

function exportDataFile(data){
  const filename = `evaluation_backup_${new Date().toISOString().slice(0,10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFile(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const imported = migrateData(JSON.parse(reader.result));
        saveData(imported);
        resolve(imported);
      }catch(error){ reject(error); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function saveSession(session){
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function loadSession(){
  try{ return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch{ return null; }
}
function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }
