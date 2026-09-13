(function () {
  "use strict";
  const section = document.getElementById("page-pay-periods");
  const esc = value => escapeHtml(value);
  const hours = value => formatReportCSVTime(Number(value) || 0);
  const date = value => new Date(value).toLocaleString("da-DK", {timeZone:"Europe/Copenhagen"});
  const iso = d => d.toISOString().slice(0,10);
  const day = value => new Date(value+"T12:00:00Z");
  const add = (value,n) => {const d=day(value);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
  const today = () => {const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Copenhagen",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const get=type=>parts.find(p=>p.type===type).value;return `${get("year")}-${get("month")}-${get("day")}`;};
  let version=0, data=null, schedule=null, busy=false, page=0;
  const dialog=document.createElement("dialog");
  dialog.className="payDialog";dialog.setAttribute("aria-labelledby","payDialogTitle");document.body.appendChild(dialog);
  const $ = id => document.getElementById(id);
  function clear() {version++;data=null;schedule=null;busy=false;section.replaceChildren();if(dialog.open)dialog.close();dialog.replaceChildren();}
  function message(value) {$("payMessage").textContent=value;}
  function invalidate() {version++;data=null;page=0;$("payReview").innerHTML='<p class="formerMuted">Load this period to review its hours.</p>';}
  function periodFor(value,config=schedule) {
    if(config.frequency!=="monthly") {
      const size=config.frequency==="weekly"?7:14;
      const offset=Math.floor((day(value)-day(config.anchor_date))/86400000/size)*size;
      const start=add(config.anchor_date,offset);return {start,end:add(start,size-1)};
    }
    const ref=day(value),wanted=day(config.anchor_date).getUTCDate();
    const boundary=(year,month)=>{const last=new Date(Date.UTC(year,month+1,0,12));return iso(new Date(Date.UTC(year,month,Math.min(wanted,last.getUTCDate()),12)));};
    let year=ref.getUTCFullYear(),month=ref.getUTCMonth();
    let start=boundary(year,month);
    if(value<start){month--;start=boundary(year,month);}
    return {start,end:add(boundary(year,month+1),-1)};
  }
  function setRange(range) {$("payStart").value=range.start;$("payEnd").value=range.end;}
  async function rpc(name,args={}) {const result=await sb.rpc(name,{p_company_id:companyId,...args});if(result.error)throw result.error;return result.data;}
  async function load() {
    if(!companyId)return;
    clear();const token=version,company=companyId;
    section.innerHTML=`<div class="workersTop"><div><div class="pageHeading">Pay periods</div><div class="pageDescription">Review hours, approve a completed period and export the approved totals.</div></div></div>
      <p id="payMessage" role="status" aria-live="polite">Loading…</p>
      <details class="sectionCard paySchedule"><summary>Period schedule</summary><p class="formerMuted">Choose the first day of a period. Monthly periods start on that day each month, using the last day in shorter months. Changing this schedule does not change past approvals.</p>
      <form id="payScheduleForm"><label>Frequency<select id="payFrequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="fortnightly">Every two weeks</option></select></label><label>First period starts<input id="payAnchor" type="date" required></label><button class="secondaryButton">Save schedule</button></form></details>
      <div class="sectionCard payControls"><form id="payRange"><label>From<input id="payStart" type="date" required></label><label>To<input id="payEnd" type="date" required></label><button class="inviteButton">Review hours</button></form>
      <div class="payActions"><button class="secondaryButton" data-previous>Previous period</button><button class="secondaryButton" data-current>Current period</button><button class="secondaryButton" data-next>Next period</button></div>
      <p class="formerMuted">Dates and times use Denmark time. Each shift belongs to the period in which it starts. Breaks are excluded from worked hours.</p>
      <label>Past approvals<select id="payPast"><option value="">Choose a period…</option></select></label></div><div id="payReview" aria-live="polite"></div>`;
    try {
      const [config,past]=await Promise.all([rpc("admin_pay_period_settings"),rpc("admin_list_pay_periods")]);
      if(token!==version || company!==companyId)return;
      schedule=config;$("payFrequency").value=config.frequency;$("payAnchor").value=config.anchor_date;
      renderPast(past);setRange(periodFor(add(periodFor(today()).start,-1)));message("");await review();
    } catch(error) {if(token===version)message(error.message || "Could not load pay periods. Open this tab again to retry.");}
  }
  function renderPast(past) {
    const unique=new Map();for(const p of past) {const key=p.start_date+"/"+p.end_date;if(!unique.has(key))unique.set(key,p);}
    $("payPast").innerHTML='<option value="">Choose a period…</option>'+[...unique].map(([key,p])=>`<option value="${esc(key)}">${esc(p.start_date)} – ${esc(p.end_date)} · ${p.reopened_at?"Reopened":"Approval recorded"}</option>`).join("");
  }
  async function review() {
    const start=$("payStart").value,end=$("payEnd").value;
    invalidate();const token=version,company=companyId;
    if(!start || !end || end<start){message("Choose a valid start and end date.");return;}
    message("Loading hours…");
    try {
      const result=await rpc("admin_review_pay_period",{p_start_date:start,p_end_date:end});
      if(token!==version || company!==companyId)return;
      if(!Array.isArray(result?.snapshot?.shifts))throw new Error("Invalid period response");
      data=result;page=0;render();message("");
    } catch(error) {if(token===version)message(error.message || "Could not load this period. Try Review hours again.");}
  }
  function workers(shifts) {
    const people=new Map();
    for(const shift of shifts) {
      if(!people.has(shift.worker_id))people.set(shift.worker_id,{id:shift.worker_id,name:shift.worker_name,shifts:0,work:0,breaks:0});
      const p=people.get(shift.worker_id);p.shifts++;p.work+=Number(shift.worked_seconds)||0;p.breaks+=Number(shift.break_seconds)||0;
    }
    return [...people.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }
  function render() {
    const shifts=data.snapshot.shifts,people=workers(shifts),issues=shifts.filter(s=>s.issue);
    const status={draft:"Needs approval",approved:"Approved",changed:"Hours changed — approval needed"}[data.status];
    const canApprove=data.status==="draft" && data.completed && shifts.length>0 && !issues.length;
    const pages=Math.max(1,Math.ceil(shifts.length/50));page=Math.max(0,Math.min(page,pages-1));
    $("payReview").innerHTML=`<div class="sectionCard paySummary"><div class="payReviewHeading"><div><span class="payBadge ${data.status=== "approved"?"approved":""}">${esc(status)}</span><h2>${esc(data.snapshot.start_date)} – ${esc(data.snapshot.end_date)}</h2></div><button class="secondaryButton" data-refresh>Refresh hours</button></div>
      <div class="formerStats"><div><strong>${people.length}</strong><span>Workers</span></div><div><strong>${shifts.length}</strong><span>Shifts</span></div><div><strong>${hours(people.reduce((sum,p)=>sum+p.work,0))}</strong><span>Worked · hours:minutes</span></div></div>
      ${!data.completed?'<p class="payNotice">This period is still running or has not started. Approval is available after its end date.</p>':""}
      ${issues.length?`<p class="payNotice">${issues.length} shift(s) need attention. Correct the marked times in Timesheets, then refresh this period.</p>`:""}
      ${data.status==="changed"?'<p class="payNotice">Records changed after approval. Reopen this period, review the updated hours, then approve again.</p>':""}
      ${data.approved_at?`<p class="formerMuted">Approval recorded ${esc(date(data.approved_at))}. Export rechecks the records before downloading.</p>`:""}
      <div class="payActions">${data.approval_id?'<button class="secondaryButton" data-reopen>Reopen period</button>':`<button class="inviteButton" data-approve ${canApprove?"":"disabled"}>Approve hours</button>`}<button class="secondaryButton" data-export ${data.status==="approved"?"":"disabled"}>Export approved hours (CSV)</button><button class="secondaryButton" data-dataloen ${data.status==="approved"?"":"disabled"}>Export to DataLøn</button></div>
      <p class="formerMuted">Hours summary for payroll preparation. This export contains no pay rates, tax calculations or payroll-provider-specific format.</p>
      <div class="formerTableWrap"><table class="formerTable"><thead><tr><th>Worker</th><th>Shifts</th><th>Breaks</th><th>Worked</th></tr></thead><tbody>${people.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.shifts}</td><td>${hours(p.breaks)}</td><td><strong>${hours(p.work)}</strong></td></tr>`).join("") || '<tr><td colspan="4">No shifts in this period.</td></tr>'}</tbody></table></div>
      <details class="payShifts"><summary>Review individual shifts (${shifts.length})</summary><div class="formerTableWrap"><table class="formerTable"><thead><tr><th>Worker</th><th>Clock in</th><th>Clock out</th><th>Breaks</th><th>Worked</th><th>Check</th></tr></thead><tbody>${shifts.slice(page*50,(page+1)*50).map(s=>`<tr><td>${esc(s.worker_name)}</td><td>${esc(date(s.clock_in))}</td><td>${s.clock_out?esc(date(s.clock_out)):"Open"}</td><td><details><summary>${hours(s.break_seconds)}</summary>${s.breaks.map(b=>`<p>${esc(date(b.break_start))} – ${b.break_end?esc(date(b.break_end)):"Open"}</p>`).join("") || "No breaks"}</details></td><td>${hours(s.worked_seconds)}</td><td>${esc(s.issue || "Ready")}</td></tr>`).join("")}</tbody></table></div><div class="payActions"><button class="secondaryButton" data-page-prev ${page===0?"disabled":""}>Previous</button><span>${page+1} / ${pages}</span><button class="secondaryButton" data-page-next ${page===pages-1?"disabled":""}>Next</button></div></details>
      <details class="payShifts"><summary>Approval history (${data.history.length})</summary>${data.history.map(h=>`<p class="formerMuted">Approved ${esc(date(h.approved_at))}${h.reopened_at?` · Reopened ${esc(date(h.reopened_at))}: ${esc(h.reopen_reason)}`:""}</p>`).join("") || '<p class="formerMuted">No approvals yet.</p>'}</details></div>`;
  }
  function confirmAction(action) {
    if(!data || busy)return;
    const saved=data,token=version,company=companyId;
    const reopen=action==="reopen";
    dialog.innerHTML=`<form id="payConfirm"><h2 id="payDialogTitle">${reopen?"Reopen this period?":"Approve these hours?"}</h2><p>${esc(saved.snapshot.start_date)} – ${esc(saved.snapshot.end_date)}</p>
      ${reopen?'<p>Exports will pause until the period is approved again. The previous approval stays in the history.</p><label>Reason<textarea id="payReason" required minlength="3" maxlength="500"></textarea></label>':'<p>Confirm that you have reviewed the shifts and breaks. Later changes will require a new approval before export.</p><label class="payCheck"><input type="checkbox" required> I have reviewed these hours.</label>'}
      <p id="payDialogMessage" role="alert"></p><div class="payActions"><button type="button" class="secondaryButton" data-cancel>Cancel</button><button class="inviteButton" type="submit">${reopen?"Reopen period":"Approve hours"}</button></div></form>`;
    dialog.showModal();
    $("payConfirm").addEventListener("submit",async event=>{
      event.preventDefault();if(busy)return;
      if(token!==version || company!==companyId){dialog.close();return;}
      busy=true;dialog.querySelectorAll("button").forEach(b=>b.disabled=true);
      try {
        if(reopen)await rpc("admin_reopen_pay_period",{p_approval_id:saved.approval_id,p_reason:$("payReason").value.trim()});
        else await rpc("admin_approve_pay_period",{p_start_date:saved.snapshot.start_date,p_end_date:saved.snapshot.end_date,p_fingerprint:saved.fingerprint});
        if(token!==version || company!==companyId)return;
        dialog.close();busy=false;await review();
        const past=await rpc("admin_list_pay_periods");if(company===companyId && $("payPast"))renderPast(past);
      } catch(error) {if(token===version)$("payDialogMessage").textContent=error.message || "Could not save. Try again.";}
      finally {busy=false;dialog.querySelectorAll("button").forEach(b=>b.disabled=false);}
    });
  }
  async function exportCSV() {
    if(!data || data.status!=="approved" || busy)return;
    const token=version,company=companyId;busy=true;
    section.querySelector('[data-export]').disabled=true;message("Checking the approved hours…");
    try {
      const result=await rpc("admin_export_pay_period",{p_approval_id:data.approval_id});
      if(token!==version || company!==companyId)return;
      const s=result.snapshot;
      const rows=[["Approval ID","Approved at (ISO)","Period start (Denmark)","Period end (Denmark)","Worker ID","Worker","Shifts","Break seconds","Worked seconds","Worked hours (decimal)"],...workers(s.shifts).map(p=>[result.approval_id,result.approved_at,s.start_date,s.end_date,p.id,p.name,p.shifts,p.breaks,p.work,(p.work/3600).toFixed(4)])];
      // Neutralize spreadsheet formulas in worker-supplied text, including leading whitespace.
      const cell=value=>'"'+String(value??"").replace(/^[\s]*[=+@-]/,match=>"'"+match).replace(/"/g,'""')+'"';
      const url=URL.createObjectURL(new Blob(["\uFEFF"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
      const a=document.createElement("a");a.href=url;a.download=`ShiftHQ-approved-hours-${s.start_date}-${s.end_date}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message("Approved hours exported.");
    } catch(error) {if(token===version){data=null;$("payReview").innerHTML='<p class="payNotice">Export stopped. Use Review hours to reload the period.</p>';message(error.message || "Export failed. Please refresh.");}}
    finally {busy=false;if(token===version && data)section.querySelector('[data-export]').disabled=false;}
  }
  dialog.addEventListener("cancel",event=>{if(busy)event.preventDefault();});
  dialog.addEventListener("click",event=>{if(event.target.closest('[data-cancel]') && !busy)dialog.close();});
  section.addEventListener("input",event=>{if(event.target.closest('#payRange')){invalidate();message("");}});
  section.addEventListener("change",event=>{if(event.target.id==="payPast" && event.target.value){const [start,end]=event.target.value.split('/');setRange({start,end});review();}});
  section.addEventListener("submit",async event=>{
    event.preventDefault();
    if(event.target.id==="payRange")return review();
    if(event.target.id!=="payScheduleForm" || busy)return;
    const token=version,company=companyId;busy=true;
    try {
      const result=await rpc("admin_pay_period_settings",{p_frequency:$("payFrequency").value,p_anchor_date:$("payAnchor").value});
      if(token!==version || company!==companyId)return;
      schedule=result;setRange(periodFor(add(periodFor(today()).start,-1)));await review();message("Schedule saved. Showing the last completed period.");
    } catch(error) {if(token===version)message(error.message || "Could not save schedule.");}finally{busy=false;}
  });
  section.addEventListener("click",event=>{
    const b=event.target.closest("button");if(!b)return;
    if(b.hasAttribute('data-refresh'))return review();
    if(b.hasAttribute('data-approve'))return confirmAction('approve');
    if(b.hasAttribute('data-reopen'))return confirmAction('reopen');
    if(b.hasAttribute('data-export'))return exportCSV();
    if(b.hasAttribute('data-dataloen') && data?.status==='approved')return window.DataLoenExport?.open(data.approval_id);
    if(b.hasAttribute('data-page-prev') || b.hasAttribute('data-page-next')){page+=b.hasAttribute('data-page-next')?1:-1;render();section.querySelector('.payShifts').open=true;return;}
    if(!schedule)return;
    let target=null;
    if((b.hasAttribute("data-previous") && !$("payStart").value) || (b.hasAttribute("data-next") && !$("payEnd").value)){message("Choose dates or use Current period.");return;}
    if(b.hasAttribute('data-previous'))target=add($("payStart").value,-1);
    if(b.hasAttribute('data-next'))target=add($("payEnd").value,1);
    if(b.hasAttribute('data-current'))target=today();
    if(target){setRange(periodFor(target));review();}
  });
  window.PayPeriods={load,clear,periodFor};
})();
