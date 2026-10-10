/* =========================================================
   FIREBASE STORAGE SERVICE (thay cho localStorage)
   - collection config/main      : nhân sự, tiêu chí, kỳ đánh giá, quyền, cài đặt (chỉ admin ghi)
   - collection evaluations      : mỗi lượt đánh giá chéo = 1 document
   - collection selfEvaluations  : mỗi lượt tự đánh giá = 1 document
   ========================================================= */
const SESSION_KEY = "employeeEvaluationSession_v1";
const CONFIG_KEYS = ["employees", "criteria", "periods", "permissions", "settings"];

function deepClone(v){ return JSON.parse(JSON.stringify(v)); }

// Dữ liệu mặc định (đồng bộ) – chưa có bài đánh giá nào
function loadData(){
  const f = buildInitialData();
  f.evaluations = []; f.selfEvaluations = [];
  f.settings.theme = localStorage.getItem("ee_theme") || "light";
  return f;
}

function applyConfig(target, cfg){
  CONFIG_KEYS.forEach(k => { if(cfg[k] !== undefined) target[k] = cfg[k]; });
  const theme = localStorage.getItem("ee_theme") || "light";
  target.settings = {...loadData().settings, ...(target.settings || {}), theme};
}

function migrateData(data){
  const fresh = loadData();
  return {
    ...fresh, ...data,
    employees: Array.isArray(data.employees) ? data.employees : fresh.employees,
    criteria: Array.isArray(data.criteria) ? data.criteria : fresh.criteria,
    periods: Array.isArray(data.periods) ? data.periods : fresh.periods,
    evaluations: Array.isArray(data.evaluations) ? data.evaluations : [],
    selfEvaluations: Array.isArray(data.selfEvaluations) ? data.selfEvaluations : [],
    permissions: data.permissions || fresh.permissions,
    settings: {...fresh.settings, ...(data.settings || {}), theme: fresh.settings.theme}
  };
}

// ID cố định => mỗi người chỉ đánh giá 1 lần/kỳ, kể cả khi bấm gửi từ 2 máy
function recordDocId(r){
  const s = v => String(v).replace(/[\/\s]/g, "_");
  return r.type === "self"
    ? `self_${s(r.periodId)}_${s(r.targetId)}`
    : `cross_${s(r.periodId)}_${s(r.evaluatorId)}_${s(r.targetId)}`;
}

/* ---------- Đọc dữ liệu khi mở trang ---------- */
async function initRemoteData(){
  const [cfg, ev, se] = await Promise.all([
    fbDb.collection("config").doc("main").get(),
    fbDb.collection("evaluations").get(),
    fbDb.collection("selfEvaluations").get()
  ]);
  const base = loadData();
  if(cfg.exists) applyConfig(base, cfg.data());
  base.evaluations = ev.docs.map(d => d.data());
  base.selfEvaluations = se.docs.map(d => d.data());
  return base;
}

// Tự cập nhật khi máy khác có thay đổi (admin thấy bài mới nộp ngay)
function startRealtime(){
  let timer = null;
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if(session?.role !== "admin") return;
      if($("#modalOverlay")?.classList.contains("show")) return;
      const a = document.activeElement;
      if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
      render();
    }, 500);
  };
  fbDb.collection("config").doc("main").onSnapshot(s => {
    if(s.exists && session?.role !== "admin"){ applyConfig(DB, s.data()); }
  });
  ["evaluations", "selfEvaluations"].forEach(col => {
    fbDb.collection(col).onSnapshot(s => { DB[col] = s.docs.map(d => d.data()); refresh(); });
  });
}

/* ---------- Ghi dữ liệu ---------- */
async function writeConfig(data){
  if(!firebase.auth().currentUser) return;
  const cfg = {};
  CONFIG_KEYS.forEach(k => cfg[k] = data[k]);
  delete cfg.settings.theme;
  const clean = JSON.parse(JSON.stringify(cfg));
  if(JSON.stringify(clean).length > 900000){
    toast("error", "Dữ liệu cấu hình quá lớn (thường do ảnh). Hãy dùng ảnh nhỏ hơn.");
    return;
  }
  await fbDb.collection("config").doc("main").set(clean);
}
// persist() trong app.js gọi hàm này (chỉ admin mới ghi được)
function saveData(data){
  writeConfig(data).catch(e => { console.error(e); toast("error", "Lưu lên máy chủ thất bại: " + e.message); });
}

// Gửi 1 bài đánh giá lên server. Trả về true/false
async function saveRecord(col, rec){
  rec.id = recordDocId(rec);
  try{
    await fbDb.collection(col).doc(rec.id).set(JSON.parse(JSON.stringify(rec)));
    if(!DB[col].some(x => x.id === rec.id)) DB[col].push(rec);
    return true;
  }catch(err){
    console.error(err);
    toast("error", err.code === "permission-denied"
      ? "Không gửi được: bài này đã được gửi trước đó hoặc không có quyền."
      : "Không gửi được lên máy chủ. Kiểm tra mạng rồi thử lại.");
    return false;
  }
}

async function deleteCollection(col){
  const snap = await fbDb.collection(col).get();
  for(let i = 0; i < snap.docs.length; i += 400){
    const b = fbDb.batch();
    snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
}
async function writeCollection(col, arr){
  const map = new Map();
  arr.forEach(r => { r.id = recordDocId(r); map.set(r.id, r); });
  const list = [...map.values()];
  for(let i = 0; i < list.length; i += 400){
    const b = fbDb.batch();
    list.slice(i, i + 400).forEach(r => b.set(fbDb.collection(col).doc(r.id), JSON.parse(JSON.stringify(r))));
    await b.commit();
  }
}
async function clearAllEvaluations(){
  await deleteCollection("evaluations"); await deleteCollection("selfEvaluations");
  DB.evaluations = []; DB.selfEvaluations = [];
}
// Đưa nhân sự/tiêu chí/kỳ/cài đặt về dữ liệu gốc trong data.js (giữ nguyên bài đã nộp)
async function resetData(){
  const fresh = loadData();
  await writeConfig(fresh);
  fresh.evaluations = DB.evaluations; fresh.selfEvaluations = DB.selfEvaluations;
  return fresh;
}

/* ---------- Backup / Restore ---------- */
function exportDataFile(data){
  const filename = `evaluation_backup_${new Date().toISOString().slice(0,10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function importDataFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try{
        const imported = migrateData(JSON.parse(reader.result));
        await writeConfig(imported);
        await deleteCollection("evaluations"); await deleteCollection("selfEvaluations");
        await writeCollection("evaluations", imported.evaluations);
        await writeCollection("selfEvaluations", imported.selfEvaluations);
        resolve(imported);
      }catch(error){ reject(error); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ---------- Đăng nhập admin bằng Firebase Auth ---------- */
async function adminSignIn(email, password){
  await firebase.auth().signInWithEmailAndPassword(email, password);
  const snap = await fbDb.collection("config").doc("main").get();
  if(!snap.exists) await writeConfig(DB);   // lần đầu: đẩy dữ liệu gốc từ data.js lên server
}
function adminSignOut(){ return firebase.auth().signOut(); }
function waitForAuth(){
  return new Promise(res => { const un = firebase.auth().onAuthStateChanged(u => { un(); res(u); }); });
}

/* ---------- Phiên đăng nhập (chỉ lưu tạm trong tab) ---------- */
function saveSession(session){ sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function loadSession(){
  try{ return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch{ return null; }
}
function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }
