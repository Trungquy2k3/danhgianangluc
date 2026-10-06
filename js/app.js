/* =========================================================
   EMPLOYEE EVALUATION SYSTEM - FRONTEND SPA
   Mọi chức năng chạy phía trình duyệt + localStorage.
   Đây KHÔNG phải cơ chế bảo mật production.
   ========================================================= */

let DB = loadData();
let session = loadSession();
let currentRoute = 'dashboard';
let selectedEmployeeId = null;
let selectedTargetId = null;
let charts = {};
let loginMode = 'employee';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function persist(){ saveData(DB); }
function activeEmployee(){ return session?.role === 'user' ? DB.employees.find(e=>e.id===session.employeeId) : null; }
function activePeriod(){
  return DB.periods.find(p=>p.status==='active') || DB.periods[DB.periods.length-1] || APP_CONFIG.activePeriod;
}
function isPeriodOpen(){
  const p = activePeriod();
  const now = new Date();
  return p?.status==='active' && now >= new Date(`${p.startDate}T00:00:00`) && now <= new Date(`${p.endDate}T23:59:59`);
}
function formatDate(s){ return s ? new Date(s).toLocaleDateString('vi-VN') : '—'; }
function formatDateTime(s){ return s ? new Date(s).toLocaleString('vi-VN') : '—'; }
function initials(name){ return name.split(' ').slice(-2).map(x=>x[0]).join('').toUpperCase().slice(0,2); }
function avatarHTML(emp, cls='avatar'){
  const safeName = esc(emp.name);
  return `<div class="${cls}" title="${safeName}"><img src="${esc(emp.avatar||'')}" alt="${safeName}" onerror="this.style.display='none';this.parentElement.dataset.initials='${initials(emp.name)}'"/><span>${initials(emp.name)}</span></div>`;
}
function resultBand(score){ return APP_CONFIG.resultBands.find(b=>score>=b.min && score<=b.max) || APP_CONFIG.resultBands.at(-1); }
function scoreTo100(score5){ return +(Number(score5||0)/5*100).toFixed(1); }
function avg(arr){ const a=arr.filter(v=>typeof v==='number' && !Number.isNaN(v)); return a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0; }
function getCriteria(){ return [...DB.criteria].sort((a,b)=>(a.order||0)-(b.order||0)); }
function activeQuestions(){ return getCriteria().map(c=>({...c,questions:(c.questions||[]).filter(q=>q.active!==false)})).filter(c=>c.questions.length); }
function totalWeight(){ return getCriteria().reduce((s,c)=>s+Number(c.weight||0),0); }
function criteriaScoreMap(records){
  const result={};
  const criteria=getCriteria();
  criteria.forEach(c=>{
    const vals = records.flatMap(r=>{
      const v = r.scores?.[c.id];
      return v == null ? [] : [Number(v)];
    });
    result[c.id]=avg(vals);
  });
  return result;
}
function weightedScore(map){
  const weight=totalWeight(); if(!weight) return 0;
  const v = getCriteria().reduce((s,c)=>s+(Number(map[c.id]||0)*Number(c.weight||0)),0)/weight;
  return +(v*20).toFixed(1);
}
function targetRecords(targetId, type='cross'){
  const p=activePeriod();
  return DB.evaluations.filter(r=>r.targetId===targetId && (!p || r.periodId===p.id || !r.periodId) && r.type===type);
}
function recordsForPeriod(targetId, type, periodId){
  return type==='self'
    ? DB.selfEvaluations.filter(r=>r.targetId===targetId && r.periodId===periodId)
    : DB.evaluations.filter(r=>r.targetId===targetId && r.periodId===periodId && r.type==='cross');
}
function selfRecord(targetId){
  const p=activePeriod();
  return DB.selfEvaluations.find(r=>r.targetId===targetId && (!p || r.periodId===p.id || !r.periodId));
}
function crossAvgRecord(targetId){ return targetRecords(targetId,'cross'); }
function employeeScore(targetId){
  const self=selfRecord(targetId);
  const cross=criteriaScoreMap(crossAvgRecord(targetId));
  const selfMap=self?.scores || {};
  const selfScore=self?weightedScore(selfMap):0;
  const crossScore=crossAvgRecord(targetId).length?weightedScore(cross):0;
  if(self && crossAvgRecord(targetId).length){ const sc=APP_CONFIG.scoreComposition; const total=Number(sc.self)+Number(sc.cross)||100; return +((selfScore*(Number(sc.self)||0)+crossScore*(Number(sc.cross)||0))/total).toFixed(1); }
  return +(selfScore || crossScore || 0).toFixed(1);
}
function permissionKey(from,to){
  const map={worker:'worker',technical:'technical',other:'worker'};
  return `${map[from]||'worker'}_to_${map[to]||'worker'}`;
}
function canCrossEvaluate(evaluator,target){
  if(!evaluator || !target || evaluator.id===target.id) return false;
  return !!DB.permissions[permissionKey(evaluator.group,target.group)];
}
function alreadyCross(evaluatorId,targetId){
  const p=activePeriod();
  return DB.evaluations.some(r=>r.evaluatorId===evaluatorId && r.targetId===targetId && r.type==='cross' && r.periodId===p.id);
}
function alreadySelf(employeeId){
  const p=activePeriod();
  return DB.selfEvaluations.some(r=>r.targetId===employeeId && r.periodId===p.id);
}
function completionPercent(employeeId){
  const criteria=activeQuestions();
  const count=criteria.reduce((s,c)=>s+c.questions.length,0);
  const self=alreadySelf(employeeId)?count:0;
  return count ? Math.round(self/count*100) : 0;
}

function toast(icon,title){
  if(window.Swal) Swal.fire({toast:true,position:'top-end',icon,title,showConfirmButton:false,timer:2200,timerProgressBar:true});
}
async function confirmAction(title,text,confirmText='Xác nhận'){
  if(!window.Swal) return true;
  const r=await Swal.fire({icon:'question',title,text,showCancelButton:true,confirmButtonText:confirmText,cancelButtonText:'Hủy'});
  return r.isConfirmed;
}
function showModal(content){
  $('#modalCard').innerHTML=content; $('#modalOverlay').classList.add('show'); $('#modalOverlay').setAttribute('aria-hidden','false');
}
function closeModal(){ $('#modalOverlay').classList.remove('show'); $('#modalOverlay').setAttribute('aria-hidden','true'); }
$('#modalOverlay').addEventListener('click',e=>{ if(e.target.id==='modalOverlay') closeModal(); });

document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-route]');
  if(nav){ e.preventDefault(); go(nav.dataset.route); }
  const act=e.target.closest('[data-action]');
  if(act) handleAction(act.dataset.action,act.dataset);
});

document.addEventListener('change',e=>{
  if(e.target.matches('#employeeImageInput')) previewEmployeeImage(e.target.files?.[0]);
  if(e.target.matches('#importDataInput')) doImport(e.target.files?.[0]);
  if(e.target.matches('#crossGroupFilter,#crossDeptFilter,#crossTeamFilter')) renderCrossTargetList();
  if(e.target.matches('#adminEmployeeGroup,#adminEmployeeStatus,#adminEmployeeSort')) renderAdminEmployees();
  if(e.target.matches('#reportPeriodFilter,#reportDeptFilter,#reportGroupFilter,#reportCriteriaFilter')) renderAdminReports();
});

document.addEventListener('input',e=>{
  if(e.target.id==='employeeSearch') renderLoginEmployeeList();
  if(e.target.id==='crossSearch' || e.target.id==='crossGroupFilter' || e.target.id==='crossDeptFilter' || e.target.id==='crossTeamFilter') renderCrossTargetList();
  if(e.target.id==='adminEmployeeSearch') renderAdminEmployees();
  if(e.target.id==='reportEmployeeSearch' || e.target.id==='reportDeptFilter' || e.target.id==='reportGroupFilter' || e.target.id==='reportCriteriaFilter' || e.target.id==='reportPeriodFilter') renderAdminReports();
});

function go(route){
  if(!session){ currentRoute='login'; render(); return; }
  if(session.role==='admin') currentRoute = route.startsWith('admin') ? route : 'admin-dashboard';
  else currentRoute = route.startsWith('admin') ? 'dashboard' : route;
  location.hash=currentRoute; render();
}

function render(){
  document.body.classList.toggle('dark', DB.settings.theme==='dark');
  if(!session){ renderLogin(); return; }
  if(session.role==='admin'){ renderAdminShell(); return; }
  renderUserShell();
}

/* ==============================
   LOGIN
   ============================== */
function renderLogin(){
  $('#app').innerHTML = `
    <div class="login-shell">
      <section class="login-hero">
        <div class="hero-content">
          <div class="brand-mark">${esc(APP_CONFIG.logoText)}</div>
          <div class="hero-content h1-wrap">
            <h1>Đánh giá năng lực nhân sự.</h1>
            <p>Nền tảng đánh giá tự thân, đánh giá chéo và quản trị kết quả dành cho môi trường doanh nghiệp và sản xuất.</p>
            <div class="hero-stats">
              <div class="hero-stat"><strong>${DB.employees.length}</strong><br><small>Nhân sự</small></div>
              <div class="hero-stat"><strong>${getCriteria().length}</strong><br><small>Tiêu chí</small></div>
              <div class="hero-stat"><strong>${activePeriod().name}</strong><br><small>Kỳ hiện tại</small></div>
            </div>
          </div>
        </div>
      </section>
      <section class="login-panel">
        <div class="login-card">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div><h2 class="login-title">${loginMode==='employee'?'Chọn nhân sự':'Đăng nhập Admin'}</h2><div class="subtle">${loginMode==='employee'?'Tìm tên, mã NV, bộ phận hoặc nhóm để tiếp tục.':'Khu vực quản trị hệ thống.'}</div></div>
            <button class="icon-btn" data-action="toggle-theme" title="Đổi giao diện"><i class="fa-solid ${DB.settings.theme==='dark'?'fa-sun':'fa-moon'}"></i></button>
          </div>
          ${loginMode==='employee'?employeeLoginTemplate():adminLoginTemplate()}
          <div class="text-center mt-4"><button class="btn btn-soft btn-sm" data-action="toggle-login-mode">${loginMode==='employee'?'Đăng nhập Admin →':'← Quay lại chọn nhân sự'}</button></div>
        </div>
      </section>
    </div>`;
  renderLoginEmployeeList();
}
function employeeLoginTemplate(){
  return `<div class="search-wrap"><i class="fa-solid fa-search"></i><input id="employeeSearch" autocomplete="off" placeholder="Tìm tên nhân viên, mã, bộ phận, nhóm..."></div><div id="employeePickList" class="employee-pick-list"></div><div id="pinPanel" class="pin-panel hidden"></div>`;
}
function adminLoginTemplate(){
  return `<form id="adminLoginForm" class="mt-4" onsubmit="return doAdminLogin(event)"><div class="field mb-3"><label>Tài khoản</label><input id="adminUsername"  required></div><div class="field mb-3"><label>Mật khẩu</label><input id="adminPassword" type="password"  required></div><button class="btn btn-primary w-100 py-3">Đăng nhập quản trị</button><div class="demo-login">Demo frontend: <strong>admin / admin123</strong>. Không dùng thông tin này cho production.</div></form>`;
}
function renderLoginEmployeeList(){
  const box=$('#employeePickList'); if(!box) return;
  const q=($('#employeeSearch')?.value||'').trim().toLowerCase();
  const arr=DB.employees.filter(e=>e.status==='active' && [e.name,e.id,e.department,e.team,e.group,e.position].some(v=>String(v).toLowerCase().includes(q)));
  box.innerHTML=arr.length?arr.map(e=>`<button class="employee-pick" data-action="select-login-employee" data-id="${e.id}">${avatarHTML(e)}<div class="pick-main"><strong>${esc(e.name)}</strong><div class="pick-meta">${esc(e.id)} • ${esc(e.department)} • ${esc(e.team)}</div><span class="group-badge">${esc(e.group)}</span></div><i class="fa-solid fa-chevron-right ms-auto muted"></i></button>`).join(''):`<div class="empty">Không tìm thấy nhân sự phù hợp.</div>`;
}
function selectLoginEmployee(id){
  selectedEmployeeId=id;
  const emp=DB.employees.find(e=>e.id===id); if(!emp) return;
  $('#pinPanel').classList.remove('hidden');
  $('#pinPanel').innerHTML=`<div class="subtle mb-2">Đăng nhập với <strong>${esc(emp.name)}</strong></div><div class="pin-actions"><input id="employeePin" class="pin-input" inputmode="numeric" maxlength="8" type="password" placeholder="Nhập mã PIN"><button class="btn btn-primary" data-action="employee-login">Tiếp tục</button></div>`;
  $('#employeePin').focus();
}
function employeeLogin(){
  const emp=DB.employees.find(e=>e.id===selectedEmployeeId); const pin=$('#employeePin')?.value.trim();
  if(!emp) return; if(emp.status!=='active') return toast('error','Tài khoản đang bị khóa.');
  if(pin!==emp.pin) return toast('error','Mã PIN không đúng.');
  session={role:'user',employeeId:emp.id}; saveSession(session); currentRoute='dashboard'; render();
}
function doAdminLogin(event){
  event.preventDefault();
  const u=$('#adminUsername').value.trim(), p=$('#adminPassword').value;
  if(u===APP_CONFIG.adminCredentials.username && p===APP_CONFIG.adminCredentials.password){session={role:'admin'};saveSession(session);currentRoute='admin-dashboard';render();}
  else toast('error','Sai tài khoản hoặc mật khẩu Admin.');
  return false;
}

/* ==============================
   SHELLS
   ============================== */
function navItem(route,icon,label){return `<a href="#${route}" class="nav-link ${currentRoute===route?'active':''}" data-route="${route}"><i class="${icon}"></i><span>${label}</span></a>`}
function sidebarTemplate(admin=false){
  const employee=activeEmployee();
  return `<aside id="sidebar" class="sidebar">
    <div class="sidebar-top"><div class="brand"><div class="brand-logo">${esc(APP_CONFIG.logoText)}</div><div class="brand-text"><strong>${esc(DB.settings.companyName)}</strong><span>${admin?'CONTROL CENTER':'EVALUATION HUB'}</span></div></div></div>
    <nav class="nav">
      <div class="nav-section">Tổng quan</div>
      ${navItem(admin?'admin-dashboard':'dashboard','fa-solid fa-grid-2','Dashboard')}
      ${!admin ? navItem('profile','fa-solid fa-id-card','Thông tin cá nhân'):''}
      ${!admin ? navItem('self-evaluation','fa-solid fa-star-half-stroke','Tự đánh giá'):''}
      ${!admin ? navItem('cross-evaluation','fa-solid fa-people-arrows','Đánh giá chéo'):''}
      ${!admin ? navItem('results','fa-solid fa-chart-line','Kết quả'):''}
      ${!admin ? navItem('history','fa-solid fa-clock-rotate-left','Lịch sử'):''}
      ${admin?`<div class="nav-section">Quản trị</div>${navItem('admin-employees','fa-solid fa-users','Nhân sự')}${navItem('admin-criteria','fa-solid fa-layer-group','Tiêu chí')}${navItem('admin-questions','fa-solid fa-list-check','Câu hỏi')}${navItem('admin-permissions','fa-solid fa-user-lock','Quyền đánh giá')}${navItem('admin-periods','fa-solid fa-calendar-days','Kỳ đánh giá')}${navItem('admin-results','fa-solid fa-clipboard-check','Kết quả')}${navItem('admin-reports','fa-solid fa-file-chart-column','Báo cáo')}${navItem('admin-settings','fa-solid fa-sliders','Cài đặt')}`:''}
    </nav>
    <div class="sidebar-bottom">
      <div class="d-flex align-items-center gap-2 p-2 mb-2">${admin?`<div class="avatar">AD</div><div class="brand-text"><strong>Admin</strong><span>Administrator</span></div>`:`<div>${avatarHTML(employee)}</div><div class="brand-text"><strong>${esc(employee?.name||'')}</strong><span>${esc(employee?.id||'')}</span></div>`}</div>
      <button class="btn w-100" data-action="logout"><i class="fa-solid fa-right-from-bracket"></i> <span>Đăng xuất</span></button>
    </div>
  </aside>`;
}
function topbarTemplate(label,kicker,admin=false){return `<header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu" data-action="toggle-sidebar"><i class="fa-solid fa-bars"></i></button><div><div class="page-kicker">${kicker}</div><div class="page-title">${label}</div></div></div><div class="top-actions"><button class="icon-btn hide-mobile" data-action="toggle-theme" title="Dark mode"><i class="fa-solid ${DB.settings.theme==='dark'?'fa-sun':'fa-moon'}"></i></button>${admin?`<span class="badge badge-blue hide-mobile"><i class="fa-solid fa-shield-halved me-1"></i> ADMIN</span>`:`<span class="period-chip hide-mobile">${esc(activePeriod().name)}</span>`}</div></header>`}
function renderUserShell(){
  const labels={dashboard:'Dashboard',profile:'Thông tin cá nhân','self-evaluation':'Tự đánh giá','cross-evaluation':'Đánh giá chéo',results:'Kết quả',history:'Lịch sử'};
  $('#app').innerHTML=`<div class="app-shell">${sidebarTemplate(false)}<main class="main">${topbarTemplate(labels[currentRoute]||'Dashboard','CỔNG ĐÁNH GIÁ',false)}<div id="content" class="content"></div></main></div>`;
  renderUserRoute();
}
function renderAdminShell(){
  const labels={'admin-dashboard':'Dashboard Admin','admin-employees':'Quản lý nhân sự','admin-criteria':'Quản lý tiêu chí','admin-questions':'Quản lý câu hỏi','admin-permissions':'Quyền đánh giá','admin-periods':'Kỳ đánh giá','admin-results':'Quản lý kết quả','admin-reports':'Báo cáo','admin-settings':'Cài đặt'};
  $('#app').innerHTML=`<div class="app-shell">${sidebarTemplate(true)}<main class="main">${topbarTemplate(labels[currentRoute]||'Dashboard Admin','CONTROL CENTER',true)}<div id="content" class="content"></div></main></div>`;
  renderAdminRoute();
}
function renderUserRoute(){
  const content=$('#content');
  const renders={dashboard:renderDashboard,profile:renderProfile,'self-evaluation':renderSelfEvaluation,'cross-evaluation':renderCrossEvaluation,results:renderResults,history:renderHistory};
  (renders[currentRoute]||renderDashboard)(content);
}
function renderAdminRoute(){
  const content=$('#content');
  const renders={'admin-dashboard':renderAdminDashboard,'admin-employees':renderAdminEmployeesPage,'admin-criteria':renderAdminCriteria,'admin-questions':renderAdminQuestions,'admin-permissions':renderAdminPermissions,'admin-periods':renderAdminPeriods,'admin-results':renderAdminResults,'admin-reports':renderAdminReportsPage,'admin-settings':renderAdminSettings};
  (renders[currentRoute]||renderAdminDashboard)(content);
}

/* ==============================
   USER
   ============================== */
function renderDashboard(el){
  const me=activeEmployee(); const self= selfRecord(me.id); const cross=crossAvgRecord(me.id); const score=employeeScore(me.id); const band=resultBand(score);
  const received=cross.length; const given=DB.evaluations.filter(r=>r.evaluatorId===me.id && r.periodId===activePeriod().id).length;
  el.innerHTML=`<div class="user-summary"><div class="user-summary-main">${avatarHTML(me,'avatar profile-avatar')}<div><h2>Xin chào, ${esc(me.name.split(' ')[0])} 👋</h2><p>${esc(me.position)} · ${esc(me.department)} · ${esc(me.group)}</p></div></div><div class="period-chip"><i class="fa-regular fa-calendar me-1"></i>${esc(activePeriod().name)}</div></div>
  <div class="grid grid-4 mb-4">
    ${metricCard('fa-gauge-high',score?score.toFixed(1):'—','Điểm năng lực tổng',band.label)}
    ${metricCard('fa-star',self?'✓':'—','Tự đánh giá',self?'Hoàn thành':'Chưa hoàn thành')}
    ${metricCard('fa-people-arrows',given,'Đánh giá chéo','Đã thực hiện')}
    ${metricCard('fa-inbox',received,'Được đánh giá',received?'Lượt nhận':'Chưa có')}
  </div>
  <div class="grid grid-2">
    <div class="card"><div class="card-head"><h3 class="card-title">Năng lực tổng quan</h3><button class="btn btn-soft btn-sm" data-route="results">Xem chi tiết</button></div><div class="chart-box"><canvas id="userRadar"></canvas></div></div>
    <div class="card"><div class="card-head"><h3 class="card-title">Tự đánh giá & đánh giá chéo</h3></div>${renderSelfVsCrossTable(me.id)}</div>
  </div>`;
  drawEmployeeRadar('userRadar',me.id);
}
function metricCard(icon,num,label,sub){return `<div class="card metric"><div class="metric-top"><div><div class="metric-number">${esc(num)}</div><div class="metric-label">${esc(label)}</div></div><div class="metric-icon"><i class="fa-solid ${icon}"></i></div></div><div class="mt-3 subtle" style="font-size:11px">${esc(sub)}</div></div>`}
function renderProfile(el){
  const me=activeEmployee(); const score=employeeScore(me.id), band=resultBand(score);
  el.innerHTML=`<div class="card profile-card"><div>${avatarHTML(me,'avatar profile-avatar')}</div><div><h2 class="section-title">${esc(me.name)}</h2><div class="muted mt-1">${esc(me.position)} · ${esc(me.id)}</div><div class="profile-data"><div class="profile-item"><span>Bộ phận</span><strong>${esc(me.department)}</strong></div><div class="profile-item"><span>Tổ</span><strong>${esc(me.team)}</strong></div><div class="profile-item"><span>Nhóm</span><strong>${esc(me.group)}</strong></div><div class="profile-item"><span>Ngày vào làm</span><strong>${formatDate(me.joinDate)}</strong></div><div class="profile-item"><span>Trạng thái</span><strong>${me.status==='active'?'Đang làm việc':'Tạm khóa'}</strong></div><div class="profile-item"><span>Điểm tổng</span><strong class="${band.className}">${score?score.toFixed(1):'—'}/100</strong></div></div></div><div class="profile-actions"><div class="muted" style="font-size:12px">Kỳ hiện tại</div><div class="score-big ${band.className}">${score?score.toFixed(1):'—'}</div><div class="score-band ${band.className}">${score?band.label:'Chưa có kết quả'}</div></div></div><div class="grid grid-2 mt-4"><div class="card"><div class="card-head"><h3 class="card-title">Thông tin tài khoản</h3></div><div class="subtle" style="font-size:13px;line-height:1.8">Tài khoản frontend demo được xác định theo nhân sự và PIN. Trong hệ thống production cần backend + cơ chế xác thực an toàn.</div></div><div class="card"><div class="card-head"><h3 class="card-title">Tóm tắt đánh giá</h3></div>${renderMiniStats(me.id)}</div></div>`;
}
function renderMiniStats(id){ const self=selfRecord(id),cross=crossAvgRecord(id); return `<div class="d-flex gap-3"><div><strong>${self?'Đã hoàn thành':'Chưa làm'}</strong><div class="muted" style="font-size:11px">Tự đánh giá</div></div><div><strong>${cross.length}</strong><div class="muted" style="font-size:11px">Lượt đánh giá chéo</div></div></div>`; }

function renderSelfEvaluation(el){
  const me=activeEmployee(); const existing=selfRecord(me.id); const locked=!!existing || !isPeriodOpen() || me.status!=='active';
  el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">TỰ ĐÁNH GIÁ BẢN THÂN</h3><div class="muted mt-1" style="font-size:12px">${existing?'Bài đánh giá đã khóa sau khi gửi.':isPeriodOpen()?'Chấm từ 1 đến 5 cho từng câu hỏi.':'Kỳ đánh giá hiện không mở.'}</div></div><div class="badge ${existing?'badge-green':'badge-blue'}">${existing?'Đã hoàn thành':isPeriodOpen()?'Đang mở':'Đã khóa'}</div></div><div id="selfEvaluationForm">${buildEvaluationForm('self',me,me,existing?.answers||{},existing?.note||'',locked)}</div></div>`;
}
function buildEvaluationForm(type,evaluator,target,answers={},note='',locked=false){
  const criteria=activeQuestions();
  return `<div>${criteria.map((c,ci)=>`<div class="eval-group"><div class="eval-group-head"><div class="eval-group-name"><div class="criterion-icon"><i class="${esc(c.icon)}"></i></div><div><strong>${esc(c.name)}</strong><div class="question-help">Trọng số ${c.weight}% · ${esc(c.description)}</div></div></div><span class="badge badge-gray">${c.questions.length} câu</span></div>${c.questions.map((q,qi)=>{
    const key=q.id, val=answers[key]||'';
    return `<div class="eval-question"><div><strong>${ci+1}.${qi+1}. ${esc(q.text)}</strong><div class="question-help">Thang điểm: ${APP_CONFIG.scoreScale.map(s=>`${s.value}=${s.label}`).join(' · ')}</div></div><div class="score-row">${APP_CONFIG.scoreScale.map(s=>`<div class="score-choice"><input ${locked?'disabled':''} ${String(val)===String(s.value)?'checked':''} type="radio" id="${type}_${key}_${s.value}" name="${type}_${key}" value="${s.value}"><label for="${type}_${key}_${s.value}" title="${esc(s.description)}">${s.value}</label></div>`).join('')}</div></div>`;
  }).join('')}</div>`).join('')}<div class="comment-box field"><label>Ghi chú / Nhận xét ${DB.settings.allowComments?'':'(đã tắt)'}</label><textarea id="evaluationNote" ${locked||!DB.settings.allowComments?'disabled':''} placeholder="Viết nhận xét tổng quan...">${esc(note)}</textarea></div><div class="d-flex justify-content-end gap-2 mt-4">${!locked?`<button class="btn btn-primary" data-action="submit-${type}-evaluation"><i class="fa-solid fa-paper-plane me-1"></i>Nộp đánh giá</button>`:`<span class="badge badge-green"><i class="fa-solid fa-lock me-1"></i>Bài đánh giá đã khóa</span>`}</div></div>`;
}
async function submitSelf(){
  const me=activeEmployee(); if(me.status!=='active') return toast('error','Tài khoản đang bị khóa.'); if(!isPeriodOpen()) return toast('error','Kỳ đánh giá đã hết hạn hoặc chưa mở.'); if(alreadySelf(me.id)) return toast('info','Bạn đã hoàn thành tự đánh giá trong kỳ này.');
  const answers={}; activeQuestions().forEach(c=>c.questions.forEach(q=>{const el=$(`input[name="self_${q.id}"]:checked`); if(el) answers[q.id]=Number(el.value);}));
  const totalQuestions=activeQuestions().reduce((s,c)=>s+c.questions.length,0);
  if(Object.keys(answers).length<totalQuestions) return toast('warning','Bạn chưa hoàn thành tất cả câu hỏi.');
  if(totalWeight()!==100) return toast('warning',`Tổng trọng số hiện là ${totalWeight()}%, cần đúng 100%.`);
  if(!await confirmAction('Nộp tự đánh giá?','Sau khi gửi, bài đánh giá sẽ bị khóa trong kỳ này.','Nộp đánh giá')) return;
  const scores={}; activeQuestions().forEach(c=>{const vals=c.questions.map(q=>answers[q.id]);scores[c.id]=+avg(vals).toFixed(2);});
  DB.selfEvaluations.push({id:crypto.randomUUID(),periodId:activePeriod().id,targetId:me.id,evaluatorId:me.id,type:'self',date:new Date().toISOString(),answers,scores,note:DB.settings.allowComments?$('#evaluationNote').value.trim():''});
  persist();toast('success','Đánh giá đã được gửi thành công.');go('results');
}

function renderCrossEvaluation(el){
  const me=activeEmployee();
  el.innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-head"><div><h3 class="section-title">CHỌN NHÂN SỰ CẦN ĐÁNH GIÁ</h3><div class="muted" style="font-size:12px">Có thể đánh giá Công nhân ↔ Kỹ thuật theo quyền Admin.</div></div></div><div class="toolbar mb-3"><input id="crossSearch" class="filter-input field input" placeholder="Tìm tên, mã nhân viên..."><select id="crossGroupFilter" class="form-select" style="max-width:150px"><option value="">Tất cả nhóm</option><option>Công nhân</option><option>Kỹ thuật</option><option>Khác</option></select><select id="crossDeptFilter" class="form-select" style="max-width:170px"><option value="">Tất cả bộ phận</option>${unique(DB.employees.map(x=>x.department)).map(v=>`<option>${esc(v)}</option>`).join('')}</select><select id="crossTeamFilter" class="form-select" style="max-width:160px"><option value="">Tất cả tổ</option>${unique(DB.employees.map(x=>x.team)).map(v=>`<option>${esc(v)}</option>`).join('')}</select></div><div id="crossTargetList"></div></div><div class="card" id="crossFormCard"><div class="empty"><i class="fa-solid fa-hand-pointer fa-2x mb-3"></i><div>Chọn một nhân sự để bắt đầu đánh giá.</div></div></div></div>`;
  renderCrossTargetList();
}
function unique(arr){return [...new Set(arr)].filter(Boolean)}
function renderCrossTargetList(){
  const box=$('#crossTargetList'); if(!box) return; const me=activeEmployee();
  const q=($('#crossSearch')?.value||'').toLowerCase(); const g=$('#crossGroupFilter')?.value||''; const d=$('#crossDeptFilter')?.value||''; const t=$('#crossTeamFilter')?.value||'';
  const arr=DB.employees.filter(target=>target.status==='active'&&target.id!==me.id&&(!g||target.group===g)&&(!d||target.department===d)&&(!t||target.team===t)&&[target.name,target.id,target.department,target.team,target.group,target.position].some(v=>String(v).toLowerCase().includes(q)));
  box.innerHTML=arr.length?arr.map(t=>{const done=alreadyCross(me.id,t.id);const allowed=canCrossEvaluate(me,t);return `<div class="list-card">${avatarHTML(t)}<div class="list-main"><strong>${esc(t.name)}</strong><span>${esc(t.id)} · ${esc(t.department)} · ${esc(t.team)}</span></div>${done?`<span class="badge badge-green">Hoàn thành</span>`:!allowed?`<span class="badge badge-gray">Đang tắt</span>`:`<button class="btn btn-primary btn-sm" data-action="select-cross-target" data-id="${t.id}">Đánh giá</button>`}</div>`}).join(''):`<div class="empty">Không có nhân sự phù hợp.</div>`;
}
function selectCrossTarget(id){
  const me=activeEmployee(),target=DB.employees.find(e=>e.id===id); selectedTargetId=id; if(!target) return;
  const card=$('#crossFormCard'); const done=alreadyCross(me.id,target.id); const allowed=canCrossEvaluate(me,target); const locked=done||!allowed||!isPeriodOpen();
  card.innerHTML=`<div class="card-head"><div class="d-flex gap-3 align-items-center">${avatarHTML(target)}<div><h3 class="section-title">${esc(target.name)}</h3><div class="muted" style="font-size:12px">${esc(target.position)} · ${esc(target.group)}</div></div></div><span class="badge ${done?'badge-green':allowed?'badge-blue':'badge-gray'}">${done?'Đã đánh giá':allowed?'Được phép':'Không được phép'}</span></div>${locked&&!done&&allowed&&!isPeriodOpen()?`<div class="empty">Kỳ đánh giá không hoạt động.</div>`:buildEvaluationForm('cross',me,target,{},'',locked&&!done?true:done)}${!locked?`<div class="d-flex justify-content-end mt-3"><button class="btn btn-primary" data-action="submit-cross-evaluation">Gửi đánh giá ${esc(target.name)}</button></div>`:''}`;
}
async function submitCross(){
  const me=activeEmployee(),target=DB.employees.find(e=>e.id===selectedTargetId); if(!target) return; if(me.id===target.id) return toast('error','Không thể tự đánh giá trong phần đánh giá chéo.'); if(!canCrossEvaluate(me,target)) return toast('error','Quyền đánh giá giữa hai nhóm đang bị Admin tắt.'); if(alreadyCross(me.id,target.id)) return toast('info','Bạn đã đánh giá người này trước đó.'); if(!isPeriodOpen()) return toast('error','Kỳ đánh giá đã hết hạn.');
  const answers={}; activeQuestions().forEach(c=>c.questions.forEach(q=>{const el=$(`input[name="cross_${q.id}"]:checked`);if(el)answers[q.id]=Number(el.value);}));
  const totalQuestions=activeQuestions().reduce((s,c)=>s+c.questions.length,0); if(Object.keys(answers).length<totalQuestions)return toast('warning','Bạn chưa hoàn thành tất cả câu hỏi.'); if(totalWeight()!==100)return toast('warning',`Tổng trọng số ${totalWeight()}%, cần đúng 100%.`);
  if(!await confirmAction('Gửi đánh giá chéo?','Sau khi gửi sẽ không thể đánh giá lại người này trong kỳ hiện tại.','Gửi đánh giá')) return;
  const scores={}; activeQuestions().forEach(c=>scores[c.id]=+avg(c.questions.map(q=>answers[q.id])).toFixed(2));
  DB.evaluations.push({id:crypto.randomUUID(),periodId:activePeriod().id,evaluatorId:me.id,targetId:target.id,type:'cross',date:new Date().toISOString(),answers,scores,note:DB.settings.allowComments?$('#evaluationNote').value.trim():''});
  persist(); toast('success','Đánh giá đã được gửi thành công.'); render();
}
function renderResults(el){
  if(!DB.settings.allowUserResultView){ el.innerHTML='<div class="card"><div class="empty"><i class="fa-solid fa-eye-slash fa-2x mb-3"></i><div>Admin đang tắt quyền xem kết quả đối với người dùng.</div></div></div>'; return; }
  const me=activeEmployee(); const self=selfRecord(me.id); const cross=crossAvgRecord(me.id); const score=employeeScore(me.id), band=resultBand(score);
  el.innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-head"><h3 class="card-title">Kết quả năng lực</h3><span class="badge ${band.className==='excellent'||band.className==='good'?'badge-green':'badge-blue'}">${score?band.label:'Chưa có dữ liệu'}</span></div><div class="score-big ${band.className}">${score?score.toFixed(1):'—'}/100</div><div class="muted" style="font-size:12px">Điểm tổng hợp từ tự đánh giá và đánh giá chéo hiện có.</div><div class="chart-box mt-3"><canvas id="resultsRadar"></canvas></div></div><div class="card"><div class="card-head"><h3 class="card-title">Tự đánh giá vs đánh giá chéo</h3></div>${renderSelfVsCrossTable(me.id)}</div></div><div class="card mt-4"><div class="card-head"><h3 class="card-title">Nhận xét từ đồng nghiệp</h3></div>${renderComments(me.id)}</div>`;
  drawComparisonRadar('resultsRadar',me.id);
}
function renderSelfVsCrossTable(id){
  const self=selfRecord(id); const crossMap=criteriaScoreMap(crossAvgRecord(id)); const selfMap=self?.scores||{}; const rows=getCriteria().map(c=>`<tr><td>${esc(c.name)}</td><td>${selfMap[c.id]?Number(selfMap[c.id]).toFixed(1):'—'}</td><td>${crossMap[c.id]?Number(crossMap[c.id]).toFixed(1):'—'}</td></tr>`).join('');
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Tiêu chí</th><th>Tự</th><th>Chéo</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderComments(id){
  const records=crossAvgRecord(id); if(!records.length)return `<div class="empty">Chưa có nhận xét.</div>`;
  return records.slice().reverse().map(r=>{const evaluator=DB.employees.find(e=>e.id===r.evaluatorId);const who=DB.settings.showEvaluatorName?evaluator?.name:'Đánh giá từ đồng nghiệp';return `<div class="list-card"><div class="avatar">${evaluator?initials(evaluator.name):'CN'}</div><div class="list-main"><strong>${esc(who)}</strong><span>${formatDateTime(r.date)}</span><div class="mt-2" style="font-size:13px">${esc(r.note||'Không có nhận xét')}</div></div></div>`}).join('');
}
function renderHistory(el){
  const me=activeEmployee(); const given=DB.evaluations.filter(r=>r.evaluatorId===me.id).slice().reverse(); const received=crossAvgRecord(me.id).slice().reverse(); const self=DB.selfEvaluations.filter(r=>r.targetId===me.id).slice().reverse();
  el.innerHTML=`<div class="grid grid-3"><div class="card"><div class="card-head"><h3 class="card-title">Lịch sử tự đánh giá</h3></div>${self.length?self.map(r=>historyItem('Tự đánh giá',me,r.date,'Hoàn thành')).join(''):`<div class="empty">Chưa có.</div>`}</div><div class="card"><div class="card-head"><h3 class="card-title">Lịch sử đánh giá người khác</h3></div>${given.length?given.map(r=>{const t=DB.employees.find(e=>e.id===r.targetId);return historyItem(`Đánh giá ${t?.name||r.targetId}`,t?`${t.group} · ${t.department}`:'',r.date,'Hoàn thành')}).join(''):`<div class="empty">Chưa có.</div>`}</div><div class="card"><div class="card-head"><h3 class="card-title">Lịch sử được đánh giá</h3></div>${received.length?received.map(r=>{const e=DB.employees.find(x=>x.id===r.evaluatorId);return historyItem(DB.settings.showEvaluatorName?`Từ ${e?.name||'Nhân sự'}`:'Đánh giá từ đồng nghiệp',me,r.date,'Đã nhận')}).join(''):`<div class="empty">Chưa có.</div>`}</div></div>`;
}
function historyItem(title,sub,date,status){return `<div class="list-card"><div class="metric-icon"><i class="fa-solid fa-check"></i></div><div class="list-main"><strong>${esc(title)}</strong><span>${typeof sub==='object'?'':esc(sub)} · ${formatDateTime(date)}</span></div><span class="badge badge-green">${status}</span></div>`}

/* ==============================
   ADMIN DASHBOARD
   ============================== */
function renderAdminDashboard(el){
  const total=DB.employees.length, workers=DB.employees.filter(e=>e.group==='Công nhân').length, tech=DB.employees.filter(e=>e.group==='Kỹ thuật').length;
  const active=DB.employees.filter(e=>e.status==='active').length; const selfCount=DB.selfEvaluations.filter(r=>r.periodId===activePeriod().id).length; const crossCount=DB.evaluations.filter(r=>r.periodId===activePeriod().id).length;
  const completion=total?Math.round(selfCount/total*100):0; const scores=DB.employees.map(e=>employeeScore(e.id)).filter(Boolean); const avgScore=avg(scores);
  el.innerHTML=`<div class="grid grid-4 mb-4">${metricCard('fa-users',total,'Tổng nhân sự',`${active} đang hoạt động`)}${metricCard('fa-helmet-safety',workers,'Công nhân','Nhóm')}${metricCard('fa-gears',tech,'Kỹ thuật','Nhóm')}${metricCard('fa-star',avgScore?avgScore.toFixed(1):'—','Điểm trung bình','Toàn bộ dữ liệu')}</div><div class="grid grid-4 mb-4">${metricCard('fa-list-check',selfCount,'Đã tự đánh giá',`${completion}% hoàn thành`)}${metricCard('fa-people-arrows',crossCount,'Lượt đánh giá chéo','Trong kỳ')}${metricCard('fa-hourglass-half',total-selfCount,'Chưa tự đánh giá','Cần theo dõi')}${metricCard('fa-calendar-check',isPeriodOpen()?'Đang mở':'Đã khóa','Kỳ hiện tại',activePeriod().name)}</div><div class="grid grid-2"><div class="card"><div class="card-head"><h3 class="card-title">Điểm theo bộ phận</h3></div><div class="chart-box"><canvas id="adminDeptChart"></canvas></div></div><div class="card"><div class="card-head"><h3 class="card-title">Điểm theo nhóm</h3></div><div class="chart-box"><canvas id="adminGroupChart"></canvas></div></div><div class="card"><div class="card-head"><h3 class="card-title">Phân bố điểm theo năng lực</h3></div><div class="chart-box"><canvas id="adminCriteriaChart"></canvas></div></div><div class="card"><div class="card-head"><h3 class="card-title">Hoạt động theo thời gian</h3></div><div class="chart-box"><canvas id="adminTimelineChart"></canvas></div></div></div><div class="card mt-4"><div class="card-head"><h3 class="card-title">Hoạt động gần đây</h3><button class="btn btn-soft btn-sm" data-route="admin-results">Xem tất cả</button></div>${renderRecentAdminActivity()}</div>`;
  drawAdminDeptChart('adminDeptChart');drawAdminGroupChart('adminGroupChart');drawAdminCriteriaChart('adminCriteriaChart');drawAdminTimelineChart('adminTimelineChart');
}
function renderRecentAdminActivity(){
  const data=[...DB.selfEvaluations.map(r=>({...r,label:'Tự đánh giá'})),...DB.evaluations.map(r=>({...r,label:'Đánh giá chéo'}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8); if(!data.length)return `<div class="empty">Chưa có hoạt động.</div>`;
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Loại</th><th>Đối tượng</th><th>Ghi chú</th></tr></thead><tbody>${data.map(r=>{const e=DB.employees.find(x=>x.id===r.evaluatorId),t=DB.employees.find(x=>x.id===r.targetId);return `<tr><td>${formatDateTime(r.date)}</td><td>${esc(e?.name||r.evaluatorId)}</td><td><span class="badge badge-blue">${r.label}</span></td><td>${esc(t?.name||r.targetId)}</td><td>${esc(r.note||'—')}</td></tr>`}).join('')}</tbody></table></div>`;
}

/* ==============================
   ADMIN EMPLOYEES
   ============================== */
function renderAdminEmployeesPage(el){
  el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">Danh sách nhân sự</h3><div class="muted" style="font-size:12px">Thêm/sửa/khóa/xóa nhân sự và PIN frontend.</div></div><button class="btn btn-primary" data-action="add-employee"><i class="fa-solid fa-user-plus me-1"></i>Thêm nhân sự</button></div><div class="toolbar mb-3"><input id="adminEmployeeSearch" class="filter-input field input" placeholder="Tìm tên, mã, bộ phận..."><select id="adminEmployeeGroup" class="form-select" style="max-width:160px"><option value="">Tất cả nhóm</option><option>Công nhân</option><option>Kỹ thuật</option><option>Khác</option></select><select id="adminEmployeeStatus" class="form-select" style="max-width:160px"><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select><select id="adminEmployeeSort" class="form-select" style="max-width:180px"><option value="name">Sắp xếp: Tên A-Z</option><option value="id">Mã nhân viên</option><option value="joinDate">Ngày vào làm</option></select></div><div id="adminEmployeeTable"></div></div>`;
  renderAdminEmployees();
}
function renderAdminEmployees(){
  const box=$('#adminEmployeeTable');if(!box)return;const q=($('#adminEmployeeSearch')?.value||'').toLowerCase(),g=$('#adminEmployeeGroup')?.value||'',s=$('#adminEmployeeStatus')?.value||'',sort=$('#adminEmployeeSort')?.value||'name';
  const arr=DB.employees.filter(e=>(!q||[e.name,e.id,e.department,e.team,e.position,e.group].some(v=>String(v).toLowerCase().includes(q)))&&(!g||e.group===g)&&(!s||e.status===s)).sort((a,b)=>String(a[sort]||'').localeCompare(String(b[sort]||''),'vi'));
  box.innerHTML=`<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Ảnh</th><th>Mã NV</th><th>Họ tên</th><th>Bộ phận</th><th>Tổ</th><th>Nhóm</th><th>Chức vụ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${arr.map((e,i)=>`<tr><td>${i+1}</td><td>${avatarHTML(e)}</td><td><strong>${esc(e.id)}</strong></td><td>${esc(e.name)}</td><td>${esc(e.department)}</td><td>${esc(e.team)}</td><td><span class="badge badge-blue">${esc(e.group)}</span></td><td>${esc(e.position)}</td><td><span class="badge ${e.status==='active'?'badge-green':'badge-red'}">${e.status==='active'?'Hoạt động':'Khóa'}</span></td><td><div class="d-flex gap-1"><button class="btn btn-soft btn-sm" data-action="edit-employee" data-id="${e.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-soft btn-sm" data-action="toggle-employee-status" data-id="${e.id}"><i class="fa-solid ${e.status==='active'?'fa-lock':'fa-unlock'}"></i></button><button class="btn btn-danger btn-sm" data-action="delete-employee" data-id="${e.id}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function employeeForm(emp={}){return `<div class="grid grid-2"><div class="field"><label>Họ tên</label><input id="fName" value="${esc(emp.name||'')}" required></div><div class="field"><label>Mã nhân viên</label><input id="fId" value="${esc(emp.id||'')}" ${emp.id?'readonly':''} required></div><div class="field"><label>Bộ phận</label><input id="fDept" value="${esc(emp.department||'')}" required></div><div class="field"><label>Tổ</label><input id="fTeam" value="${esc(emp.team||'')}" required></div><div class="field"><label>Chức vụ</label><input id="fPosition" value="${esc(emp.position||'')}" required></div><div class="field"><label>Nhóm</label><select id="fGroup"><option ${emp.group==='Công nhân'?'selected':''}>Công nhân</option><option ${emp.group==='Kỹ thuật'?'selected':''}>Kỹ thuật</option><option ${emp.group==='Khác'?'selected':''}>Khác</option></select></div><div class="field"><label>Ngày vào làm</label><input id="fJoin" type="date" value="${esc(emp.joinDate||'')}"></div><div class="field"><label>PIN</label><input id="fPin" value="${esc(emp.pin||'1234')}" maxlength="8"></div><div class="field"><label>Trạng thái</label><select id="fStatus"><option value="active" ${(!emp.status||emp.status==='active')?'selected':''}>Hoạt động</option><option value="locked" ${emp.status==='locked'?'selected':''}>Đã khóa</option></select></div><div class="field"><label>Ảnh nhân viên</label><input id="employeeImageInput" type="file" accept="image/*"><small class="muted">Ảnh mới được lưu Base64 vào localStorage.</small></div></div><div class="field mt-3"><label>Ảnh hiện tại</label><div id="employeePreview" style="min-height:95px">${emp.id?avatarHTML(emp,'avatar profile-avatar'):`<div class="muted">Chưa có ảnh</div>`}</div></div>`}
function openEmployeeModal(id){const emp=id?DB.employees.find(e=>e.id===id):null; showModal(`<div class="modal-head"><h3 class="card-title">${id?'Sửa nhân sự':'Thêm nhân sự'}</h3><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body">${employeeForm(emp||{})}</div><div class="modal-foot"><button class="btn" data-action="close-modal">Hủy</button><button class="btn btn-primary" data-action="save-employee" data-id="${id||''}">Lưu</button></div>`);}
let pendingEmployeeImage='';
function previewEmployeeImage(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{pendingEmployeeImage=reader.result;$('#employeePreview').innerHTML=`<img src="${reader.result}" style="width:95px;height:95px;object-fit:cover;border-radius:22px">`;};reader.readAsDataURL(file)}
function saveEmployee(id){
  const data={id:$('#fId').value.trim(),name:$('#fName').value.trim(),department:$('#fDept').value.trim(),team:$('#fTeam').value.trim(),position:$('#fPosition').value.trim(),group:$('#fGroup').value,joinDate:$('#fJoin').value,pin:$('#fPin').value.trim()||'1234',status:$('#fStatus').value,avatar:pendingEmployeeImage||''};
  if(!data.id||!data.name||!data.department||!data.team||!data.position)return toast('warning','Vui lòng nhập đủ thông tin bắt buộc.');
  if(!id && DB.employees.some(e=>e.id===data.id))return toast('warning','Mã nhân viên đã tồn tại.');
  if(id){const e=DB.employees.find(x=>x.id===id);Object.assign(e,data);if(!pendingEmployeeImage)e.avatar=e.avatar||`images/employees/${id}.jpg`;}else{data.avatar=data.avatar||`images/employees/${data.id}.jpg`;DB.employees.push(data)}
  pendingEmployeeImage='';persist();closeModal();toast('success',id?'Đã cập nhật nhân sự.':'Đã thêm nhân sự.');render();
}
async function deleteEmployee(id){if(!await confirmAction('Xóa nhân sự?','Các đánh giá đã lưu vẫn còn dữ liệu lịch sử.','Xóa'))return;DB.employees=DB.employees.filter(e=>e.id!==id);persist();toast('success','Đã xóa nhân sự.');renderAdminEmployeesPage($('#content'));}
function toggleEmployeeStatus(id){const e=DB.employees.find(x=>x.id===id);if(!e)return;e.status=e.status==='active'?'locked':'active';persist();toast('success',`${e.status==='active'?'Đã mở khóa':'Đã khóa'} tài khoản.`);renderAdminEmployees();}

/* ==============================
   ADMIN CRITERIA / QUESTIONS
   ============================== */
function renderAdminCriteria(el){
  const tw=totalWeight();el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">Tiêu chí năng lực</h3><div class="muted" style="font-size:12px">Admin có thể thêm/sửa/xóa, đổi trọng số, icon, mô tả và thứ tự.</div></div><div class="d-flex gap-2"><span class="badge ${tw===100?'badge-green':'badge-red'}">Tổng trọng số: ${tw}%</span><button class="btn btn-primary" data-action="add-criterion"><i class="fa-solid fa-plus me-1"></i>Thêm tiêu chí</button></div></div><div class="table-wrap"><table class="table"><thead><tr><th>STT</th><th>Tiêu chí</th><th>Mô tả</th><th>Trọng số</th><th>Số câu</th><th>Thứ tự</th><th>Thao tác</th></tr></thead><tbody>${getCriteria().map((c,i)=>`<tr><td>${i+1}</td><td><div class="d-flex align-items-center gap-2"><div class="criterion-icon"><i class="${esc(c.icon)}"></i></div><strong>${esc(c.name)}</strong></div></td><td>${esc(c.description)}</td><td><strong>${c.weight}%</strong></td><td>${(c.questions||[]).length}</td><td>${c.order||i+1}</td><td><div class="d-flex gap-1"><button class="btn btn-soft btn-sm" data-action="edit-criterion" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm" data-action="delete-criterion" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join('')}</tbody></table></div>${tw!==100?`<div class="demo-login mt-3"><i class="fa-solid fa-triangle-exclamation me-1"></i> Cần điều chỉnh để tổng trọng số = 100% trước khi nộp bài đánh giá.</div>`:''}</div>`;
}
function openCriterionModal(id){const c=id?DB.criteria.find(x=>x.id===id):null;showModal(`<div class="modal-head"><h3 class="card-title">${id?'Sửa tiêu chí':'Thêm tiêu chí'}</h3><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="grid grid-2"><div class="field"><label>ID</label><input id="cId" value="${esc(c?.id||'') }" ${id?'readonly':''}></div><div class="field"><label>Tên tiêu chí</label><input id="cName" value="${esc(c?.name||'')}"></div><div class="field"><label>Icon Font Awesome</label><input id="cIcon" value="${esc(c?.icon||'fa-solid fa-star')}"></div><div class="field"><label>Trọng số (%)</label><input id="cWeight" type="number" min="0" step="0.1" value="${c?.weight??0}"></div><div class="field"><label>Thứ tự</label><input id="cOrder" type="number" value="${c?.order??DB.criteria.length+1}"></div><div class="field"><label>Mô tả</label><input id="cDesc" value="${esc(c?.description||'')}"></div></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">Hủy</button><button class="btn btn-primary" data-action="save-criterion" data-id="${id||''}">Lưu</button></div>`)}
function saveCriterion(id){const c={id:$('#cId').value.trim(),name:$('#cName').value.trim(),icon:$('#cIcon').value.trim(),weight:Number($('#cWeight').value),order:Number($('#cOrder').value),description:$('#cDesc').value.trim(),questions:[]};if(!c.id||!c.name||!c.icon||Number.isNaN(c.weight))return toast('warning','Vui lòng nhập dữ liệu tiêu chí.');if(id){const old=DB.criteria.find(x=>x.id===id);Object.assign(old,c,{questions:old.questions||[]})}else{if(DB.criteria.some(x=>x.id===c.id))return toast('warning','ID tiêu chí đã tồn tại.');DB.criteria.push(c)}persist();closeModal();renderAdminCriteria($('#content'));toast('success','Đã lưu tiêu chí.')}
async function deleteCriterion(id){if(DB.criteria.length<=1)return toast('warning','Phải có ít nhất 1 tiêu chí.');if(!await confirmAction('Xóa tiêu chí?','Các câu hỏi thuộc tiêu chí sẽ bị xóa khỏi cấu hình.','Xóa'))return;DB.criteria=DB.criteria.filter(c=>c.id!==id);persist();renderAdminCriteria($('#content'));toast('success','Đã xóa tiêu chí.')}
function renderAdminQuestions(el){
  el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">Ngân hàng câu hỏi</h3><div class="muted" style="font-size:12px">Thêm/sửa/xóa, đổi trọng số câu hỏi, bật/tắt câu hỏi.</div></div><button class="btn btn-primary" data-action="add-question"><i class="fa-solid fa-plus me-1"></i>Thêm câu hỏi</button></div>${getCriteria().map(c=>`<div class="eval-group"><div class="eval-group-head"><div class="eval-group-name"><div class="criterion-icon"><i class="${esc(c.icon)}"></i></div><div><strong>${esc(c.name)}</strong><div class="question-help">Trọng số nhóm ${c.weight}%</div></div></div><button class="btn btn-soft btn-sm" data-action="add-question" data-criterion-id="${c.id}">+ Câu hỏi</button></div>${(c.questions||[]).map((q,i)=>`<div class="eval-question"><div><strong>${i+1}. ${esc(q.text)}</strong><div class="question-help">ID: ${esc(q.id)} · Trọng số: ${q.weight} · ${q.active!==false?'Đang bật':'Đang tắt'}</div></div><div class="d-flex gap-1"><button class="btn btn-soft btn-sm" data-action="edit-question" data-criterion-id="${c.id}" data-id="${q.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-soft btn-sm" data-action="toggle-question" data-criterion-id="${c.id}" data-id="${q.id}"><i class="fa-solid ${q.active===false?'fa-toggle-off':'fa-toggle-on'}"></i></button><button class="btn btn-danger btn-sm" data-action="delete-question" data-criterion-id="${c.id}" data-id="${q.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')}</div>`).join('')}</div>`;
}
function openQuestionModal(cid,qid){const c=DB.criteria.find(x=>x.id===cid)||DB.criteria[0];const q=qid?c.questions.find(x=>x.id===qid):null;showModal(`<div class="modal-head"><h3 class="card-title">${qid?'Sửa câu hỏi':'Thêm câu hỏi'}</h3><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="grid grid-2"><div class="field"><label>Tiêu chí</label><select id="qCriterion">${getCriteria().map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div><div class="field"><label>ID câu hỏi</label><input id="qId" value="${esc(q?.id||'')}"></div><div class="field" style="grid-column:1/-1"><label>Nội dung câu hỏi</label><textarea id="qText">${esc(q?.text||'')}</textarea></div><div class="field"><label>Trọng số câu hỏi</label><input id="qWeight" type="number" step="0.1" value="${q?.weight??1}"></div><div class="field"><label>Trạng thái</label><select id="qActive"><option value="true" ${q?.active!==false?'selected':''}>Bật</option><option value="false" ${q?.active===false?'selected':''}>Tắt</option></select></div></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">Hủy</button><button class="btn btn-primary" data-action="save-question" data-old-criterion-id="${cid}" data-id="${qid||''}">Lưu</button></div>`)}
function saveQuestion(oldCid,qid){const cid=$('#qCriterion').value;const data={id:$('#qId').value.trim(),text:$('#qText').value.trim(),weight:Number($('#qWeight').value),active:$('#qActive').value==='true'};if(!data.id||!data.text)return toast('warning','Vui lòng nhập ID và nội dung câu hỏi.');const targetC=DB.criteria.find(c=>c.id===cid);if(!targetC)return; if(qid){const oldC=DB.criteria.find(c=>c.id===oldCid);const old=oldC.questions.find(q=>q.id===qid);oldC.questions=oldC.questions.filter(q=>q.id!==qid);targetC.questions=(targetC.questions||[]).filter(q=>q.id!==data.id);targetC.questions.push({...old,...data});}else{if(targetC.questions?.some(q=>q.id===data.id))return toast('warning','ID câu hỏi đã tồn tại trong tiêu chí.');targetC.questions=targetC.questions||[];targetC.questions.push(data)}persist();closeModal();renderAdminQuestions($('#content'));toast('success','Đã lưu câu hỏi.')}
async function deleteQuestion(cid,qid){const c=DB.criteria.find(x=>x.id===cid);if(!c)return;if(!await confirmAction('Xóa câu hỏi?','Câu hỏi sẽ không còn xuất hiện ở các bài đánh giá mới.','Xóa'))return;c.questions=c.questions.filter(q=>q.id!==qid);persist();renderAdminQuestions($('#content'));toast('success','Đã xóa câu hỏi.')}
function toggleQuestion(cid,qid){const c=DB.criteria.find(x=>x.id===cid),q=c?.questions.find(x=>x.id===qid);if(q){q.active=q.active===false;persist();renderAdminQuestions($('#content'));}}

/* ==============================
   PERMISSIONS / PERIODS
   ============================== */
function renderAdminPermissions(el){const pairs=[['Công nhân','Công nhân','worker_to_worker'],['Công nhân','Kỹ thuật','worker_to_technical'],['Kỹ thuật','Công nhân','technical_to_worker'],['Kỹ thuật','Kỹ thuật','technical_to_technical']];el.innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-head"><div><h3 class="section-title">Quyền đánh giá chéo</h3><div class="muted" style="font-size:12px">Bật/tắt độc lập từng hướng đánh giá.</div></div></div><div class="table-wrap"><table class="table permission-table"><thead><tr><th>Người đánh giá ↓ / Đối tượng →</th><th>Công nhân</th><th>Kỹ thuật</th></tr></thead><tbody>${[['Công nhân','worker'],['Kỹ thuật','technical']].map(([from,keyFrom])=>`<tr><td><strong>${from}</strong></td>${[['Công nhân','worker'],['Kỹ thuật','technical']].map(([to,keyTo])=>{const k=`${keyFrom}_to_${keyTo}`;return `<td><input class="toggle" type="checkbox" ${DB.permissions[k]?'checked':''} data-action="toggle-permission" data-key="${k}"></td>`}).join('')}</tr>`).join('')}</tbody></table></div></div><div class="card"><div class="card-head"><h3 class="card-title">Trạng thái hiện tại</h3></div>${pairs.map(([a,b,k])=>`<div class="list-card"><div class="list-main"><strong>${a} → ${b}</strong><span>${DB.permissions[k]?'Cho phép đánh giá':'Đang tắt quyền'}</span></div><span class="badge ${DB.permissions[k]?'badge-green':'badge-gray'}">${DB.permissions[k]?'ON':'OFF'}</span></div>`).join('')}</div></div>`}
function togglePermission(key){DB.permissions[key]=!DB.permissions[key];persist();renderAdminPermissions($('#content'));}
function renderAdminPeriods(el){el.innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-head"><div><h3 class="section-title">Kỳ đánh giá</h3><div class="muted" style="font-size:12px">Mỗi kỳ có dữ liệu độc lập.</div></div><button class="btn btn-primary" data-action="add-period"><i class="fa-solid fa-plus me-1"></i>Tạo kỳ mới</button></div>${DB.periods.slice().reverse().map(p=>`<div class="list-card"><div class="metric-icon"><i class="fa-regular fa-calendar"></i></div><div class="list-main"><strong>${esc(p.name)}</strong><span>${formatDate(p.startDate)} → ${formatDate(p.endDate)} · ${p.id}</span></div><span class="badge ${p.status==='active'?'badge-green':'badge-gray'}">${p.status==='active'?'ACTIVE':'CLOSED'}</span><button class="btn btn-soft btn-sm" data-action="edit-period" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button></div>`).join('')}</div><div class="card"><div class="card-head"><h3 class="card-title">Kỳ đang sử dụng</h3></div><div class="score-big">${esc(activePeriod().id)}</div><div class="muted">${esc(activePeriod().name)}</div><div class="mt-3">Bắt đầu: <strong>${formatDate(activePeriod().startDate)}</strong></div><div>Kết thúc: <strong>${formatDate(activePeriod().endDate)}</strong></div><div class="mt-3"><span class="badge ${isPeriodOpen()?'badge-green':'badge-amber'}">${isPeriodOpen()?'Đang nhận đánh giá':'Không nhận đánh giá'}</span></div></div></div>`}
function openPeriodModal(id){const p=id?DB.periods.find(x=>x.id===id):null;showModal(`<div class="modal-head"><h3 class="card-title">${id?'Sửa kỳ đánh giá':'Tạo kỳ đánh giá'}</h3><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="grid grid-2"><div class="field"><label>ID kỳ</label><input id="pId" value="${esc(p?.id||'')}" ${id?'readonly':''}></div><div class="field"><label>Tên kỳ</label><input id="pName" value="${esc(p?.name||'')}"></div><div class="field"><label>Ngày bắt đầu</label><input id="pStart" type="date" value="${esc(p?.startDate||'')}"></div><div class="field"><label>Ngày kết thúc</label><input id="pEnd" type="date" value="${esc(p?.endDate||'')}"></div><div class="field"><label>Trạng thái</label><select id="pStatus"><option value="active" ${p?.status==='active'?'selected':''}>Active</option><option value="closed" ${p?.status==='closed'?'selected':''}>Closed</option></select></div></div></div><div class="modal-foot"><button class="btn" data-action="close-modal">Hủy</button><button class="btn btn-primary" data-action="save-period" data-id="${id||''}">Lưu</button></div>`)}
function savePeriod(id){const p={id:$('#pId').value.trim(),name:$('#pName').value.trim(),startDate:$('#pStart').value,endDate:$('#pEnd').value,status:$('#pStatus').value};if(!p.id||!p.name||!p.startDate||!p.endDate)return toast('warning','Nhập đủ thông tin kỳ.');if(p.startDate>p.endDate)return toast('warning','Ngày kết thúc phải sau ngày bắt đầu.');if(p.status==='active')DB.periods.forEach(x=>x.status='closed');if(id)Object.assign(DB.periods.find(x=>x.id===id),p);else DB.periods.push(p);persist();closeModal();renderAdminPeriods($('#content'));toast('success','Đã lưu kỳ đánh giá.')}

/* ==============================
   ADMIN RESULTS / REPORTS
   ============================== */
function renderAdminResults(el){
  const rows=DB.employees.map(e=>{const self=selfRecord(e.id),cross=crossAvgRecord(e.id),score=employeeScore(e.id),band=resultBand(score);return {e,self,cross,score,band}});
  const evaluationLog=[...DB.selfEvaluations.map(r=>({...r,evalLabel:'Tự đánh giá'})),...DB.evaluations.map(r=>({...r,evalLabel:'Đánh giá chéo'}))].filter(r=>r.periodId===activePeriod().id).sort((a,b)=>new Date(b.date)-new Date(a.date));
  el.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">Kết quả tổng hợp</h3><div class="muted" style="font-size:12px">Điểm = kết quả đã ghi nhận trong kỳ, hiển thị theo cấu hình.</div></div><button class="btn btn-soft" data-action="export-results-xlsx"><i class="fa-solid fa-file-excel me-1"></i>Xuất Excel</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Nhân sự</th><th>Nhóm</th><th>Tự đánh giá</th><th>Đánh giá chéo</th><th>Điểm tổng</th><th>Xếp loại</th><th>Chi tiết</th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="d-flex align-items-center gap-2">${avatarHTML(r.e)}<div><strong>${esc(r.e.name)}</strong><div class="muted" style="font-size:11px">${esc(r.e.id)}</div></div></div></td><td>${esc(r.e.group)}</td><td>${r.self?weightedScore(r.self.scores).toFixed(1):'—'}</td><td>${r.cross.length?weightedScore(criteriaScoreMap(r.cross)).toFixed(1):'—'}</td><td><strong>${r.score?r.score.toFixed(1):'—'}</strong></td><td><span class="badge ${r.band.className==='excellent'||r.band.className==='good'?'badge-green':'badge-blue'}">${r.score?r.band.label:'Chưa có'}</span></td><td><button class="btn btn-soft btn-sm" data-action="view-employee-result" data-id="${r.e.id}"><i class="fa-solid fa-eye"></i></button></td></tr>`).join('')}</tbody></table></div></div><div class="card mt-4"><div class="card-head"><h3 class="card-title">Nhật ký lượt đánh giá trong kỳ</h3></div>${evaluationLog.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Thời gian</th><th>Người đánh giá</th><th>Đối tượng</th><th>Loại</th><th>Chi tiết</th></tr></thead><tbody>${evaluationLog.map(r=>{const ev=DB.employees.find(e=>e.id===r.evaluatorId),ta=DB.employees.find(e=>e.id===r.targetId);return `<tr><td>${formatDateTime(r.date)}</td><td>${esc(ev?.name||'Tự đánh giá')}</td><td>${esc(ta?.name||r.targetId)}</td><td><span class="badge badge-blue">${r.evalLabel}</span></td><td><button class="btn btn-soft btn-sm" data-action="view-evaluation-detail" data-id="${r.id}"><i class="fa-solid fa-eye"></i></button></td></tr>`}).join('')}</tbody></table></div>`:`<div class="empty">Chưa có lượt đánh giá trong kỳ.</div>`}</div></div>`;
}
function showEvaluationDetailModal(evalId){
  const r=[...DB.evaluations,...DB.selfEvaluations].find(x=>x.id===evalId); if(!r)return;
  const evaluator=DB.employees.find(e=>e.id===r.evaluatorId),target=DB.employees.find(e=>e.id===r.targetId);
  showModal(`<div class="modal-head"><div><h3 class="card-title">${esc(r.type==='self'?'Chi tiết tự đánh giá':'Chi tiết đánh giá chéo')}</h3><div class="muted">${formatDateTime(r.date)} · ${esc(activePeriod().name)}</div></div><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="grid grid-2 mb-4"><div><div class="muted" style="font-size:11px">Người đánh giá</div><strong>${esc(evaluator?.name||'Tự đánh giá')}</strong></div><div><div class="muted" style="font-size:11px">Người được đánh giá</div><strong>${esc(target?.name||r.targetId)}</strong></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Tiêu chí</th><th>Điểm</th></tr></thead><tbody>${getCriteria().map(c=>`<tr><td>${esc(c.name)}</td><td><strong>${r.scores?.[c.id]!=null?Number(r.scores[c.id]).toFixed(2):'—'}</strong></td></tr>`).join('')}</tbody></table></div><div class="comment-box field mt-3"><label>Nhận xét</label><textarea disabled>${esc(r.note||'Không có nhận xét')}</textarea></div><div class="mt-3"><span class="badge badge-blue">Điểm tổng: ${weightedScore(r.scores).toFixed(1)}/100</span></div></div>`);
}
function showEmployeeResultModal(id){const e=DB.employees.find(x=>x.id===id);if(!e)return;const score=employeeScore(id),band=resultBand(score),self=selfRecord(id),cross=crossAvgRecord(id);showModal(`<div class="modal-head"><div><h3 class="card-title">${esc(e.name)}</h3><div class="muted">${esc(e.id)} · ${esc(e.group)} · ${esc(e.department)}</div></div><button class="icon-btn" data-action="close-modal"><i class="fa-solid fa-xmark"></i></button></div><div class="modal-body"><div class="grid grid-3 mb-4"><div class="card"><div class="muted" style="font-size:11px">Điểm tổng</div><div class="score-big ${band.className}">${score?score.toFixed(1):'—'}</div><div class="score-band ${band.className}">${score?band.label:'Chưa có'}</div></div><div class="card"><div class="muted" style="font-size:11px">Tự đánh giá</div><div class="score-big">${self?weightedScore(self.scores).toFixed(1):'—'}</div></div><div class="card"><div class="muted" style="font-size:11px">Đánh giá chéo</div><div class="score-big">${cross.length?weightedScore(criteriaScoreMap(cross)).toFixed(1):'—'}</div></div></div><div class="chart-box"><canvas id="employeeDetailRadar"></canvas></div><div class="table-wrap mt-4"><table class="table"><thead><tr><th>Tiêu chí</th><th>Tự</th><th>Chéo</th></tr></thead><tbody>${getCriteria().map(c=>`<tr><td>${esc(c.name)}</td><td>${self?.scores?.[c.id]?Number(self.scores[c.id]).toFixed(2):'—'}</td><td>${cross.length&&criteriaScoreMap(cross)[c.id]?Number(criteriaScoreMap(cross)[c.id]).toFixed(2):'—'}</td></tr>`).join('')}</tbody></table></div></div>`);drawComparisonRadar('employeeDetailRadar',id);}
function renderAdminReportsPage(el){el.innerHTML=`<div id="reportsRoot"></div>`;renderAdminReports();}
function renderAdminReports(){const box=$('#reportsRoot');if(!box)return;const q=($('#reportEmployeeSearch')?.value||'').toLowerCase();const dept=$('#reportDeptFilter')?.value||'';const group=$('#reportGroupFilter')?.value||'';const crit=$('#reportCriteriaFilter')?.value||'';const period=$('#reportPeriodFilter')?.value||activePeriod().id;const rows=DB.employees.filter(e=>{const hit=!q||[e.name,e.id].some(v=>String(v).toLowerCase().includes(q));return hit&&(!dept||e.department===dept)&&(!group||e.group===group)});
  const criteria=crit?getCriteria().filter(c=>c.id===crit):getCriteria();
  const periodId=period||activePeriod().id;
  box.innerHTML=`<div class="card"><div class="card-head"><div><h3 class="section-title">BÁO CÁO ĐÁNH GIÁ NĂNG LỰC</h3><div class="muted" style="font-size:12px">Lọc theo kỳ, bộ phận, nhóm, nhân viên và tiêu chí.</div></div><div class="d-flex gap-2"><button class="btn btn-soft" data-action="export-results-xlsx"><i class="fa-solid fa-file-excel me-1"></i>Xuất Excel</button><button class="btn btn-soft" data-action="print-report"><i class="fa-solid fa-print me-1"></i>In</button><button class="btn btn-primary" data-action="export-report-pdf"><i class="fa-solid fa-file-pdf me-1"></i>Xuất PDF</button></div></div><div class="toolbar mb-3"><select id="reportPeriodFilter" class="form-select" style="max-width:220px"><option value="">Tất cả kỳ</option>${DB.periods.map(p=>`<option value="${p.id}" ${period===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select id="reportDeptFilter" class="form-select" style="max-width:180px"><option value="">Tất cả bộ phận</option>${unique(DB.employees.map(x=>x.department)).map(v=>`<option ${dept===v?'selected':''}>${esc(v)}</option>`).join('')}</select><select id="reportGroupFilter" class="form-select" style="max-width:150px"><option value="">Tất cả nhóm</option><option ${group==='Công nhân'?'selected':''}>Công nhân</option><option ${group==='Kỹ thuật'?'selected':''}>Kỹ thuật</option><option ${group==='Khác'?'selected':''}>Khác</option></select><select id="reportCriteriaFilter" class="form-select" style="max-width:220px"><option value="">Tất cả tiêu chí</option>${getCriteria().map(c=>`<option value="${c.id}" ${crit===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select><input id="reportEmployeeSearch" class="filter-input field input" placeholder="Tìm nhân viên..."></div><div class="table-wrap"><table class="table"><thead><tr><th>Nhân sự</th><th>Bộ phận</th><th>Nhóm</th><th>Điểm tổng</th>${criteria.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(e=>{const selfP=recordsForPeriod(e.id,'self',periodId)[0];const crossP=recordsForPeriod(e.id,'cross',periodId);const cross=criteriaScoreMap(crossP);const selfScore=selfP?weightedScore(selfP.scores):0;const crossScore=crossP.length?weightedScore(cross):0;let score=0;if(selfP&&crossP.length){const sc=APP_CONFIG.scoreComposition,total=Number(sc.self)+Number(sc.cross)||100;score=+((selfScore*(Number(sc.self)||0)+crossScore*(Number(sc.cross)||0))/total).toFixed(1)}else score=+(selfScore||crossScore||0).toFixed(1);return `<tr><td>${esc(e.name)}<div class="muted" style="font-size:10px">${esc(e.id)}</div></td><td>${esc(e.department)}</td><td>${esc(e.group)}</td><td><strong>${score?score.toFixed(1):'—'}</strong></td>${criteria.map(c=>`<td>${cross[c.id]?Number(cross[c.id]).toFixed(2):'—'}</td>`).join('')}</tr>`}).join('')}</tbody></table></div></div>`;
}
function renderAdminSettings(el){const s=DB.settings;el.innerHTML=`<div class="grid grid-2"><div class="card"><div class="card-head"><h3 class="card-title">Cấu hình hệ thống</h3></div><div class="field mb-3"><label>Người điều hành dữ liệu</label><input id="setCompany" value="${esc(s.companyName)}"></div><div class="d-flex justify-content-between align-items-center py-2"><div><strong style="font-size:13px">Cho người dùng xem kết quả</strong><div class="muted" style="font-size:11px">true → hiển thị trang kết quả người dùng.</div></div><input id="setResult" class="toggle" type="checkbox" ${s.allowUserResultView?'checked':''}></div><div class="d-flex justify-content-between align-items-center py-2"><div><strong style="font-size:13px">Hiển thị tên người đánh giá</strong><div class="muted" style="font-size:11px">false → người nhận chỉ thấy “Đánh giá từ đồng nghiệp”.</div></div><input id="setEvaluator" class="toggle" type="checkbox" ${s.showEvaluatorName?'checked':''}></div><div class="d-flex justify-content-between align-items-center py-2"><div><strong style="font-size:13px">Cho phép nhận xét</strong><div class="muted" style="font-size:11px">Bật/tắt ô ghi chú trong bài đánh giá.</div></div><input id="setComments" class="toggle" type="checkbox" ${s.allowComments?'checked':''}></div><button class="btn btn-primary mt-3" data-action="save-settings">Lưu cài đặt</button></div><div class="card"><div class="card-head"><h3 class="card-title">Backup / Restore</h3></div><p class="muted" style="font-size:12px">Toàn bộ nhân sự, tiêu chí, câu hỏi, kỳ đánh giá, quyền và kết quả được lưu ở localStorage.</p><div class="d-grid gap-2"><button class="btn" data-action="export-data"><i class="fa-solid fa-download me-1"></i>EXPORT DATA JSON</button><label class="btn mb-0"><i class="fa-solid fa-upload me-1"></i>IMPORT DATA JSON<input id="importDataInput" type="file" accept="application/json" class="hidden"></label><button class="btn btn-danger" data-action="reset-data"><i class="fa-solid fa-rotate-left me-1"></i>RESET DỮ LIỆU DEMO</button></div><div class="demo-login mt-3"><strong>Lưu ý bảo mật frontend:</strong> localStorage + JavaScript không đủ an toàn cho hệ thống doanh nghiệp thực tế; PIN/admin password trong phiên bản này chỉ phục vụ demo.</div></div></div>`}
function saveSettings(){DB.settings.companyName=$('#setCompany').value.trim()||APP_CONFIG.companyName;DB.settings.allowUserResultView=$('#setResult').checked;DB.settings.showEvaluatorName=$('#setEvaluator').checked;DB.settings.allowComments=$('#setComments').checked;persist();toast('success','Đã lưu cài đặt.');render();}
async function doImport(file){if(!file)return; if(!await confirmAction('Import dữ liệu?','Dữ liệu hiện tại sẽ được thay thế bởi file JSON.','Import'))return;try{DB=await importDataFile(file);closeModal();toast('success','Import dữ liệu thành công.');render();}catch(e){toast('error','File JSON không hợp lệ.');}}
async function resetAll(){if(!await confirmAction('Reset dữ liệu?','Toàn bộ thay đổi localStorage sẽ trở về dữ liệu demo ban đầu.','Reset'))return;DB=resetData();toast('success','Đã reset dữ liệu demo.');render();}

/* ==============================
   EXPORT
   ============================== */
function exportResultsXlsx(){
  if(!window.XLSX)return toast('error','Không tải được thư viện Excel.');
  const rows=DB.employees.map(e=>{const self=selfRecord(e.id),cross=criteriaScoreMap(crossAvgRecord(e.id));const row={MaNV:e.id,HoTen:e.name,BoPhan:e.department,To:e.team,Nhom:e.group,ChucVu:e.position,DiemTuDanhGia:self?weightedScore(self.scores):'',DiemDanhGiaCheo:crossAvgRecord(e.id).length?weightedScore(cross):'',DiemTong:employeeScore(e.id)||''};getCriteria().forEach(c=>row[c.name]=cross[c.id]?Number(cross[c.id]).toFixed(2):'');return row});
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'KetQua');XLSX.writeFile(wb,`bao_cao_danh_gia_${new Date().toISOString().slice(0,10)}.xlsx`);toast('success','Đã xuất Excel.');
}
function exportReportPdf(){
  if(!window.jspdf)return toast('error','Không tải được thư viện PDF.');
  const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'landscape'}); doc.setFont('helvetica');doc.setFontSize(15);doc.text('BAO CAO DANH GIA NANG LUC NHAN SU',14,16);doc.setFontSize(9);doc.text(`${DB.settings.companyName} - ${activePeriod().name}`,14,23);
  const body=DB.employees.map(e=>[e.id,e.name,e.department,e.group,(employeeScore(e.id)||0).toFixed(1)]);
  doc.autoTable({head:[['Ma NV','Ho ten','Bo phan','Nhom','Diem tong']],body,startY:28,styles:{font:'helvetica',fontSize:8}});doc.save(`bao_cao_danh_gia_${new Date().toISOString().slice(0,10)}.pdf`);toast('success','Đã xuất PDF.');
}
function printReport(){window.print()}

/* ==============================
   CHARTS
   ============================== */
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function radarData(id){const self=selfRecord(id)?.scores||{};const cross=criteriaScoreMap(crossAvgRecord(id));return {labels:getCriteria().map(c=>c.name),datasets:[{label:'Tự đánh giá',data:getCriteria().map(c=>self[c.id]?scoreTo100(self[c.id]):0),borderWidth:2,backgroundColor:'rgba(37,99,235,.13)',borderColor:'#2563eb',pointBackgroundColor:'#2563eb'},{label:'Đánh giá chéo',data:getCriteria().map(c=>cross[c.id]?scoreTo100(cross[c.id]):0),borderWidth:2,backgroundColor:'rgba(6,182,212,.11)',borderColor:'#06b6d4',pointBackgroundColor:'#06b6d4'}]}}
function drawEmployeeRadar(canvasId,id){const c=document.getElementById(canvasId);if(!c||!window.Chart)return;destroyChart(canvasId);const d=radarData(id);charts[canvasId]=new Chart(c,{type:'radar',data:d,options:{responsive:true,maintainAspectRatio:false,scales:{r:{beginAtZero:true,max:100,ticks:{stepSize:20}}},plugins:{legend:{position:'bottom'}}}})}
function drawComparisonRadar(canvasId,id){drawEmployeeRadar(canvasId,id)}
function drawAdminDeptChart(canvasId){const c=document.getElementById(canvasId);if(!c||!window.Chart)return;destroyChart(canvasId);const depts=unique(DB.employees.map(e=>e.department));charts[canvasId]=new Chart(c,{type:'bar',data:{labels:depts,datasets:[{label:'Điểm trung bình',data:depts.map(d=>avg(DB.employees.filter(e=>e.department===d).map(e=>employeeScore(e.id)).filter(Boolean))),borderWidth:0,borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}}}})}
function drawAdminGroupChart(canvasId){const c=document.getElementById(canvasId);if(!c||!window.Chart)return;destroyChart(canvasId);const groups=unique(DB.employees.map(e=>e.group));charts[canvasId]=new Chart(c,{type:'doughnut',data:{labels:groups,datasets:[{label:'Nhân sự',data:groups.map(g=>DB.employees.filter(e=>e.group===g).length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}})}
function drawAdminTimelineChart(canvasId){const c=document.getElementById(canvasId);if(!c||!window.Chart)return;destroyChart(canvasId);const p=activePeriod(),start=new Date(p.startDate+'T00:00:00'),end=new Date(p.endDate+'T00:00:00');const days=[];for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1))days.push(new Date(d));const all=[...DB.selfEvaluations,...DB.evaluations].filter(r=>r.periodId===p.id);charts[canvasId]=new Chart(c,{type:'line',data:{labels:days.map(d=>d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})),datasets:[{label:'Lượt đánh giá',data:days.map(d=>{const key=d.toISOString().slice(0,10);return all.filter(r=>r.date.slice(0,10)===key).length}),borderWidth:3,tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}}}})}
function drawAdminCriteriaChart(canvasId){const c=document.getElementById(canvasId);if(!c||!window.Chart)return;destroyChart(canvasId);const data=criteriaScoreMap(DB.employees.flatMap(e=>crossAvgRecord(e.id)));charts[canvasId]=new Chart(c,{type:'line',data:{labels:getCriteria().map(c=>c.name),datasets:[{label:'Điểm đánh giá chéo',data:getCriteria().map(c=>scoreTo100(data[c.id]||0)),borderWidth:3,tension:.3,fill:false}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}}}})}

/* ==============================
   ACTION ROUTER
   ============================== */
function handleAction(action,data){
  switch(action){
    case 'toggle-theme':DB.settings.theme=DB.settings.theme==='dark'?'light':'dark';persist();render();break;
    case 'toggle-login-mode':loginMode=loginMode==='employee'?'admin':'employee';renderLogin();break;
    case 'select-login-employee':selectLoginEmployee(data.id);break;
    case 'employee-login':employeeLogin();break;
    case 'logout':clearSession();session=null;selectedEmployeeId=null;currentRoute='login';render();break;
    case 'toggle-sidebar':$('#sidebar')?.classList.toggle('open');break;
    case 'submit-self-evaluation':submitSelf();break;
    case 'select-cross-target':selectCrossTarget(data.id);break;
    case 'submit-cross-evaluation':submitCross();break;
    case 'add-employee':openEmployeeModal();break;
    case 'edit-employee':openEmployeeModal(data.id);break;
    case 'save-employee':saveEmployee(data.id||null);break;
    case 'delete-employee':deleteEmployee(data.id);break;
    case 'toggle-employee-status':toggleEmployeeStatus(data.id);break;
    case 'add-criterion':openCriterionModal();break;
    case 'edit-criterion':openCriterionModal(data.id);break;
    case 'save-criterion':saveCriterion(data.id||null);break;
    case 'delete-criterion':deleteCriterion(data.id);break;
    case 'add-question':openQuestionModal(data.criterionId);break;
    case 'edit-question':openQuestionModal(data.criterionId,data.id);break;
    case 'save-question':saveQuestion(data.oldCriterionId,data.id||null);break;
    case 'delete-question':deleteQuestion(data.criterionId,data.id);break;
    case 'toggle-question':toggleQuestion(data.criterionId,data.id);break;
    case 'toggle-permission':togglePermission(data.key);break;
    case 'add-period':openPeriodModal();break;
    case 'edit-period':openPeriodModal(data.id);break;
    case 'save-period':savePeriod(data.id||null);break;
    case 'view-employee-result':showEmployeeResultModal(data.id);break;
    case 'view-evaluation-detail':showEvaluationDetailModal(data.id);break;
    case 'export-results-xlsx':exportResultsXlsx();break;
    case 'export-report-pdf':exportReportPdf();break;
    case 'print-report':printReport();break;
    case 'save-settings':saveSettings();break;
    case 'export-data':exportDataFile(DB);toast('success','Đã xuất backup JSON.');break;
    case 'reset-data':resetAll();break;
    case 'close-modal':closeModal();break;
  }
}

// Keyboard shortcuts / initial route
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Enter'&&document.activeElement?.id==='employeePin')employeeLogin()});
window.addEventListener('hashchange',()=>{if(session){const h=location.hash.replace('#','');currentRoute=h|| (session.role==='admin'?'admin-dashboard':'dashboard');render();}});
(function init(){ const hash=location.hash.replace('#','');if(hash && session)currentRoute=hash; else currentRoute=session?.role==='admin'?'admin-dashboard':'dashboard';render(); })();
