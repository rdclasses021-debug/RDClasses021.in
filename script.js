let students = JSON.parse(localStorage.getItem('rd_classes_db_final')) || [];
let settings = JSON.parse(localStorage.getItem('rd_classes_settings_final')) || { instName: "RD CLASSES", tagline: "Excellence in Education", address: "123 Education Lane", adminUser: "admin", adminPass: "admin" };
let classList = JSON.parse(localStorage.getItem('rd_classes_list')) || ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let tempImageBase64 = "", deleteId = null, currentStudentId = null, chartInstancePie = null, chartInstanceBar = null;
let alertInterval = null; // Store Interval ID for General
let feeAlertInterval = null; // Store Interval ID for Fee
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    loadSettings(); renderClassUI();
    const params = new URLSearchParams(window.location.search);
    if(params.get('id')) { document.getElementById('auth-view').remove(); loadStudentDashboard(params.get('id')); currentStudentId = params.get('id'); } 
    else { document.getElementById('auth-view').style.display = 'flex'; }
});

// MODIFIED TOAST FUNCTION
function showToast(msg, type="success") { 
    const t = document.getElementById('custom-toast'); 
    document.getElementById('toast-msg').innerText = msg; 
    
    // Set Icon
    const icon = t.querySelector('i');
    if(type === "error") {
        icon.className = "fas fa-exclamation-circle me-2 text-danger";
    } else {
        icon.className = "fas fa-check-circle me-2 text-success";
    }

    t.classList.add('show'); 
    setTimeout(() => t.classList.remove('show'), 3000); 
}

function handleLogin() { if(document.getElementById('loginUser').value===settings.adminUser && document.getElementById('loginPass').value===settings.adminPass) { document.getElementById('auth-view').style.display='none'; document.getElementById('dashboard-view').style.display='block'; renderTable(); renderCharts(); } else showToast("Invalid Credentials", "error"); }
function logout() { location.reload(); }
function switchPage(page) { 
    document.querySelectorAll('.page-section, .nav-link').forEach(el=>el.classList.remove('active')); 
    document.getElementById('page-'+page).classList.add('active'); 
    document.getElementById('nav-'+page).classList.add('active'); 
    if(page==='analytics') setTimeout(renderCharts, 100); 
}

function addExtraRow(name='', fee='') { const div=document.createElement('div'); div.className="row g-2 mb-2 extra-class-row"; div.innerHTML=`<div class="col-6"><input type="text" class="form-control form-control-sm ex-name" placeholder="Subject" value="${name}"></div><div class="col-5"><input type="number" class="form-control form-control-sm ex-fee" placeholder="Fee" value="${fee}"></div><div class="col-1"><button type="button" class="btn btn-sm btn-light text-danger" onclick="this.parentElement.parentElement.remove()"><i class="fas fa-times"></i></button></div>`; document.getElementById('extraClassesContainer').appendChild(div); }
function getStudentTotalFee(s) { let t=parseFloat(s.monthlyFee)||0; if(s.extras) s.extras.forEach(e=>t+=parseFloat(e.fee)); return t; }

function saveStudent() { 
    const id=document.getElementById('editId').value, name=document.getElementById('inpName').value, cls=document.getElementById('inpClass').value, adm=document.getElementById('inpAdm').value, fee=Number(document.getElementById('inpFee').value), mob=document.getElementById('inpMobile').value;
    const extras=[]; document.querySelectorAll('.extra-class-row').forEach(r=>{ const n=r.querySelector('.ex-name').value, f=parseFloat(r.querySelector('.ex-fee').value)||0; if(n)extras.push({name:n, fee:f}); });
    if(!name) return showToast("Name Required", "error");
    const obj = { id: id?Number(id):Date.now(), name, class:cls, adm, monthlyFee:fee, mobile:mob, extras:extras, photo:tempImageBase64 };
    if(id){ const idx=students.findIndex(x=>x.id==id); 
        if(idx>-1){ 
            obj.fees=students[idx].fees; 
            obj.alertMsg=students[idx].alertMsg; 
            obj.feeAlert=students[idx].feeAlert; // Keep existing Fee Alert
            if(!tempImageBase64)obj.photo=students[idx].photo; 
            students[idx]=obj; 
        } 
    }
    else { obj.fees=Array(12).fill(false); students.push(obj); }
    localStorage.setItem('rd_classes_db_final',JSON.stringify(students)); bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide(); renderTable(); showToast("Saved!");
}

function openAddModal() { document.getElementById('studentForm').reset(); document.getElementById('editId').value=''; document.getElementById('inpAdm').value=`RDC-${Math.floor(100000+Math.random()*900000)}`; document.getElementById('previewImg').src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; tempImageBase64=""; document.getElementById('extraClassesContainer').innerHTML=''; new bootstrap.Modal(document.getElementById('studentModal')).show(); }
function editStu(id) { const s=students.find(x=>x.id===id); document.getElementById('editId').value=s.id; document.getElementById('inpName').value=s.name; document.getElementById('inpClass').value=s.class; document.getElementById('inpAdm').value=s.adm; document.getElementById('inpFee').value=s.monthlyFee; document.getElementById('inpMobile').value=s.mobile; document.getElementById('previewImg').src=s.photo||"https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; tempImageBase64=""; const c=document.getElementById('extraClassesContainer'); c.innerHTML=''; if(s.extras)s.extras.forEach(e=>addExtraRow(e.name,e.fee)); else if(s.extraName)addExtraRow(s.extraName,s.extraFee); new bootstrap.Modal(document.getElementById('studentModal')).show(); }

function renderCharts() { 
    let p=0, d=0, c={}; students.forEach(s=>{ let t=getStudentTotalFee(s), pa=s.fees.filter(Boolean).length*t; p+=pa; d+=((t*12)-pa); let k=s.class||"Other"; if(!c[k])c[k]=0; c[k]+=pa; });
    document.getElementById('stat-count').innerText=students.length; document.getElementById('stat-collected').innerText='₹'+p.toLocaleString(); document.getElementById('stat-pending').innerText='₹'+d.toLocaleString();
    if(chartInstancePie)chartInstancePie.destroy(); if(chartInstanceBar)chartInstanceBar.destroy();
    chartInstancePie=new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels:['Paid','Due'],datasets:[{data:[p,d],backgroundColor:['#10B981','#EF4444']}]},options:{responsive:true,maintainAspectRatio:false}});
    chartInstanceBar=new Chart(document.getElementById('barChart'),{type:'bar',data:{labels:Object.keys(c),datasets:[{label:'Collected',data:Object.values(c),backgroundColor:'#4F46E5',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false}});
}

function renderTable() {
    const tbody=document.getElementById('admin-table-body'), term=document.getElementById('searchBox').value.toLowerCase(), filter=document.getElementById('filterClass').value; tbody.innerHTML='';
    students.filter(s=>(s.name.toLowerCase().includes(term)||s.adm.toLowerCase().includes(term))&&(filter===''||s.class===filter)).forEach(s=>{
        const t=getStudentTotalFee(s), p=s.fees.filter(Boolean).length*t;
        let chk=''; s.fees.forEach((f,i)=>chk+=`<td class="text-center p-0"><input type="checkbox" ${f?'checked':''} onchange="toggleFee(${s.id},${i})"></td>`);
        
        // NOTIFICATION BUTTON LOGIC
        const alertActive = s.alertMsg ? 'text-warning' : 'text-muted'; // Orange if active
        
        // FEE ALERT BUTTON LOGIC
        const feeActive = s.feeAlert ? 'text-danger' : 'text-muted'; // Red if active

        tbody.insertAdjacentHTML('beforeend',`<tr>
            <td class="sticky-col ps-4">
                <div class="d-flex align-items-center"><img src="${s.photo||'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" class="avatar-circle me-3"><div class="fw-bold text-dark">${s.name}<div class="small text-muted fw-normal">${s.class} | ${s.adm}</div></div></div>
                <div class="mt-2 text-center">
                    <i class="fas fa-pen text-primary me-3" style="cursor:pointer" onclick="editStu(${s.id})"></i>
                    <i class="fab fa-whatsapp text-success me-3" style="cursor:pointer" onclick="shareStudentDetails(${s.id})"></i>
                    <i class="fas fa-bell ${alertActive} me-3" style="cursor:pointer" onclick="setNotification(${s.id})"></i>
                    <i class="fas fa-hand-holding-usd ${feeActive} me-3" style="cursor:pointer" onclick="toggleFeeAlert(${s.id})"></i>
                    <i class="fas fa-trash text-danger" style="cursor:pointer" onclick="requestDelete(${s.id})"></i>
                </div>
            </td>
            ${chk}
            <td class="text-end fw-bold text-success">₹${p}</td>
            <td class="text-end fw-bold text-danger">₹${(t*12)-p}</td>
            <td class="text-center"><a href="?id=${s.id}" target="_blank" class="btn btn-sm btn-light border rounded-pill">View</a></td>
        </tr>`);
    });
}

// --- NOTIFICATION LOGIC (BELL) ---
function setNotification(id) {
    const s = students.find(x => x.id === id);
    const defaultMsg = "Dear Student, please contact the office.";
    const currentMsg = s.alertMsg || defaultMsg;
    const newMsg = prompt("Enter Notification Message (Clear to remove):", currentMsg);
    
    if (newMsg !== null) { 
        s.alertMsg = newMsg.trim(); 
        localStorage.setItem('rd_classes_db_final', JSON.stringify(students));
        renderTable(); 
        if(s.alertMsg) showToast("Notification Active");
        else showToast("Notification Removed", "error");
    }
}

// --- FEE REMINDER LOGIC (MONEY ICON) ---
function toggleFeeAlert(id) {
    const s = students.find(x => x.id === id);
    
    // Calculate pending dues
    const t = getStudentTotalFee(s);
    const paid = s.fees.filter(Boolean).length * t;
    const due = (t * 12) - paid;

    const defaultFeeMsg = `Dear Student, you have pending dues of ₹${due}. Please pay immediately.`;
    
    // Check if alert already exists, then ask to remove or edit
    let msg = s.feeAlert || defaultFeeMsg;
    
    const newFeeMsg = prompt("Set Fee Reminder Message (Clear to remove):", msg);

    if(newFeeMsg !== null) {
        s.feeAlert = newFeeMsg.trim(); // Save string or empty
        localStorage.setItem('rd_classes_db_final', JSON.stringify(students));
        renderTable();
        if(s.feeAlert) showToast("Fee Reminder Active");
        else showToast("Fee Reminder Removed", "error");
    }
}

function showStudentAlert(msg) {
    const box = document.getElementById('student-alert-box');
    const txt = document.getElementById('student-alert-text');
    if(box && txt) {
        txt.innerText = msg;
        box.classList.add('active'); 
        setTimeout(() => { box.classList.remove('active'); }, 5000); // Hide after 5s
    }
}

function showFeeAlert(msg) {
    const box = document.getElementById('fee-alert-box');
    const txt = document.getElementById('fee-alert-text');
    if(box && txt) {
        txt.innerText = msg;
        box.classList.add('active'); 
        setTimeout(() => { box.classList.remove('active'); }, 5000); // Hide after 5s
    }
}

function viewReceipt(id, idx) { 
    const s = students.find(x => x.id == id); const date = new Date(); const totalMonthly = getStudentTotalFee(s);
    document.getElementById('rec-tagline').innerText = settings.tagline; document.getElementById('rec-address').innerText = settings.address; document.getElementById('rec-date').innerText = date.toLocaleDateString(); document.getElementById('rec-id').innerText = `RCV-${id}-${idx+1}`; document.getElementById('rec-name').innerText = s.name; document.getElementById('rec-class').innerText = s.class; document.getElementById('rec-adm').innerText = s.adm; document.getElementById('rec-mobile').innerText = s.mobile || 'N/A'; 
    document.getElementById('rec-month').innerText = MONTHS[idx]; 
    document.getElementById('rec-total').innerText = '₹' + totalMonthly; document.getElementById('rec-photo-img').src = s.photo || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    let rows = `<tr><td class="py-3">Tuition Fee (${s.class})</td><td class="text-end fw-bold py-3">₹${s.monthlyFee}</td></tr>`;
    if (s.extras) s.extras.forEach(e => { rows += `<tr><td class="py-3">Extra: ${e.name}</td><td class="text-end fw-bold py-3">₹${e.fee}</td></tr>`; });
    else if (s.extraName) rows += `<tr><td class="py-3">Extra: ${s.extraName}</td><td class="text-end fw-bold py-3">₹${s.extraFee}</td></tr>`;
    document.getElementById('rec-items-body').innerHTML = rows;
    const container = document.getElementById('doc-preview-container'); 
    container.innerHTML = '<div class="spinner-border text-primary m-5"></div>';
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
    setTimeout(() => {
        const element = document.getElementById('receipt-capture-area');
        html2canvas(element, { scale: 2 }).then(canvas => {
            container.innerHTML = '';
            const img = document.createElement('img');
            img.src = canvas.toDataURL("image/png");
            img.style.maxWidth = "100%";
            img.className = "rounded shadow-sm border";
            container.appendChild(img);
            document.getElementById('finalDownloadBtn').onclick = () => {
                const link = document.createElement('a');
                link.download = `Receipt_${s.name}_${MONTHS[idx]}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            };
        });
    }, 500); 
}

function renderClassUI() { const c=document.getElementById('classListContainer'), o=document.getElementById('filterClass'), i=document.getElementById('inpClass'); c.innerHTML=classList.map(x=>`<span class="badge bg-white text-dark border p-2 me-1 mb-1 shadow-sm">${x} <i class="fas fa-times text-danger ms-2" onclick="deleteClass('${x}')" style="cursor:pointer"></i></span>`).join(''); o.innerHTML=`<option value="">All</option>`+classList.map(x=>`<option>${x}</option>`).join(''); i.innerHTML=classList.map(x=>`<option>${x}</option>`).join(''); }
function addNewClass() { const v=document.getElementById('newClassInput').value.trim(); if(v&&!classList.includes(v)){classList.push(v); localStorage.setItem('rd_classes_list',JSON.stringify(classList)); document.getElementById('newClassInput').value=''; renderClassUI(); showToast("Class Added");} }
function deleteClass(c) { if(confirm("Remove?")){classList=classList.filter(x=>x!==c); localStorage.setItem('rd_classes_list',JSON.stringify(classList)); renderClassUI();} }
function loadSettings() { document.querySelectorAll('.inst-name-display').forEach(el=>el.innerText=settings.instName); document.getElementById('setInstName').value=settings.instName; document.getElementById('setTagline').value=settings.tagline; document.getElementById('setAddress').value=settings.address; document.getElementById('setAdminUser').value=settings.adminUser; document.getElementById('setAdminPass').value=settings.adminPass; 
document.getElementById('profile-user-display').innerText = settings.adminUser;
}
function saveInstitute() { settings.instName=document.getElementById('setInstName').value; settings.tagline=document.getElementById('setTagline').value; settings.address=document.getElementById('setAddress').value; localStorage.setItem('rd_classes_settings_final',JSON.stringify(settings)); loadSettings(); showToast("Saved!"); }
function updateAdmin() { const u=document.getElementById('setAdminUser').value, p=document.getElementById('setAdminPass').value; if(u&&p){settings.adminUser=u; settings.adminPass=p; localStorage.setItem('rd_classes_settings_final',JSON.stringify(settings)); alert("Login Updated"); location.reload();} }
function shareAdminLink() { navigator.clipboard.writeText(window.location.href.split('?')[0]).then(()=>showToast("Link Copied!")); }
function handleImageUpload(i) { if(i.files[0]){const r=new FileReader(); r.onload=(e)=>{tempImageBase64=e.target.result; document.getElementById('previewImg').src=tempImageBase64;}; r.readAsDataURL(i.files[0]);} }

// --- DELETE FUNCTIONALITY RESTORED ---
function requestDelete(id){ 
    deleteId = id; 
    new bootstrap.Modal(document.getElementById('deleteModal')).show(); 
}

function confirmDelete(){ 
    if(deleteId){ 
        students = students.filter(s => s.id !== deleteId); 
        localStorage.setItem('rd_classes_db_final', JSON.stringify(students)); 
        renderTable(); 
        renderCharts(); // Update stats
        
        // Hide Modal Safely
        const modalEl = document.getElementById('deleteModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();

        showToast("Student Deleted", "error"); 
        deleteId = null;
    } 
}

function toggleFee(id,i){ const s=students.find(x=>x.id===id); if(s){ s.fees[i]=!s.fees[i]; localStorage.setItem('rd_classes_db_final',JSON.stringify(students)); renderTable(); } }
function shareStudentDetails(id) { const s=students.find(x=>x.id===id), t=getStudentTotalFee(s), d=(t*12)-(s.fees.filter(Boolean).length*t), l=`${window.location.origin}${window.location.pathname}?id=${id}`; window.open(`https://wa.me/?text=*${settings.instName}*%0AStudent: ${s.name}%0ADue: ₹${d}%0ALink: ${l}`, '_blank'); }
function shareMonthDetail(n,m,f) { window.open(`https://wa.me/?text=*Fee Receipt*%0A${n} - ${m}%0APaid: ₹${f}`, '_blank'); }

function populateYearReport(sId) { const s=students.find(x=>x.id==sId), d=new Date(), t=getStudentTotalFee(s); document.getElementById('yr-name').innerText=s.name; document.getElementById('yr-class').innerText=s.class; document.getElementById('yr-adm').innerText=s.adm; document.getElementById('yr-date').innerText=d.toLocaleDateString(); const tb=document.getElementById('yr-tbody'); tb.innerHTML=''; let tp=0; s.fees.forEach((p,i)=>{ if(p)tp+=t; tb.insertAdjacentHTML('beforeend',`<tr><td>${MONTHS[i]}</td><td>₹${t}</td><td>${p?'PAID':'PENDING'}</td></tr>`); }); document.getElementById('yr-paid-total').innerText='₹'+tp; document.getElementById('yr-due-total').innerText='₹'+((t*12)-tp); }
function viewYearReport() { if(!currentStudentId)return; populateYearReport(currentStudentId); const c=document.getElementById('doc-preview-container'); c.innerHTML='<div class="spinner-border m-5"></div>'; new bootstrap.Modal(document.getElementById('previewModal')).show(); setTimeout(()=>{ html2canvas(document.getElementById('year-report-capture-area'),{scale:1.5}).then(canvas=>{ c.innerHTML=''; const img=document.createElement('img'); img.src=canvas.toDataURL("image/png"); img.style.maxWidth="100%"; img.className="rounded shadow-sm border"; c.appendChild(img); document.getElementById('finalDownloadBtn').onclick=()=>{ const l=document.createElement('a'); l.download=`Report.png`; l.href=canvas.toDataURL("image/png"); l.click(); }; }); },500); }
async function downloadYearPDF() { 
    if(!currentStudentId)return; 
    populateYearReport(currentStudentId); 
    showToast("Generating Report..."); 
    setTimeout(async () => {
        const c=await html2canvas(document.getElementById('year-report-capture-area'),{scale:2}); 
        const pdf=new jsPDF('p','mm','a4'); 
        pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,pdf.internal.pageSize.getWidth(),(c.height*pdf.internal.pageSize.getWidth())/c.width); 
        pdf.save(`Student_Report_${currentStudentId}.pdf`); 
        showToast("Report Saved!");
    }, 100);
}
async function shareYearPDF() { if(!currentStudentId)return; if(!navigator.share)return showToast("Use Download","error"); populateYearReport(currentStudentId); const c=await html2canvas(document.getElementById('year-report-capture-area'),{scale:2}); c.toBlob(async(b)=>{ try{await navigator.share({files:[new File([b],"Report.png",{type:"image/png"})]});}catch(e){} }); }
function exportToExcel() { const d=students.map(s=>{let r={"Name":s.name,"Class":s.class}; s.fees.forEach((f,i)=>r[MONTHS[i]]=f?"PAID":"DUE"); return r;}); const w=XLSX.utils.json_to_sheet(d), b=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(b,w,"Fees"); XLSX.writeFile(b,"Data.xlsx"); }
function exportToWord() { const h="<html><body>"+document.getElementById("mainFeeTable").outerHTML+"</body></html>", b=new Blob(['\ufeff',h],{type:'application/msword'}), u=URL.createObjectURL(b), l=document.createElement('a'); l.href=u; l.download='Report.doc'; l.click(); }
function exportToImage() { showToast("Capturing..."); html2canvas(document.getElementById("exportTableContainer")).then(c=>{const l=document.createElement('a'); l.download='Table.png'; l.href=c.toDataURL(); l.click();}); }

function loadStudentDashboard(id) {
    const s=students.find(x=>x.id==id); if(!s)return;
    document.getElementById('student-view').style.display='block'; document.getElementById('stu-name').innerText=s.name; document.getElementById('stu-adm').innerText=s.adm; document.getElementById('stu-class').innerText=s.class; document.getElementById('stu-mobile-display').innerText=s.mobile||'N/A'; document.getElementById('stu-image').src=s.photo||"https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    const t=getStudentTotalFee(s); document.getElementById('stu-monthly').innerText='₹'+t;
    let h=''; if(s.extras) s.extras.forEach(e=>h+=`<span class="badge bg-warning text-dark me-1 border">${e.name}</span>`);
    document.getElementById('stu-multi-classes').innerHTML=h;
    let p=0; const g=document.getElementById('student-month-grid'); g.innerHTML='';
    s.fees.forEach((f,i)=>{
        if(f)p+=t;
        const btn = f ? `<div class="d-flex gap-2 mt-2"><button onclick="viewReceipt(${s.id},${i})" class="btn btn-sm btn-brand rounded-pill w-100 shadow-sm"><i class="fas fa-eye me-1"></i>View</button><button onclick="shareMonthDetail('${s.name}','${MONTHS[i]}',${t})" class="btn btn-sm btn-success rounded-circle shadow-sm"><i class="fab fa-whatsapp"></i></button></div>` : `<button class="btn btn-sm btn-light rounded-pill w-100 text-muted border" disabled>Due</button>`;
        g.insertAdjacentHTML('beforeend',`<div class="col-md-3 col-6"><div class="month-grid-item p-3 text-center h-100"><h6 class="fw-bold text-dark mb-1">${MONTHS[i]}</h6><div class="mb-2 ${f?'text-success':'text-danger'} small fw-bold">${f?'PAID':'PENDING'}</div>${btn}</div></div>`);
    });
    document.getElementById('stu-total-paid').innerText='₹'+p; document.getElementById('stu-total-pending').innerText='₹'+((t*12)-p);

    // Handle General Notifications (10s Loop)
    if(alertInterval) clearInterval(alertInterval);
    if(s.alertMsg && s.alertMsg.length > 0) {
        showStudentAlert(s.alertMsg);
        alertInterval = setInterval(() => { showStudentAlert(s.alertMsg); }, 10000); 
    }

    // Handle Fee Notifications (7s Loop)
    if(feeAlertInterval) clearInterval(feeAlertInterval);
    if(s.feeAlert && s.feeAlert.length > 0) {
        setTimeout(() => showFeeAlert(s.feeAlert), 3000); // Start offset
        feeAlertInterval = setInterval(() => { showFeeAlert(s.feeAlert); }, 7000); 
    }
}