(function () {
  "use strict";
  const section = document.getElementById("page-former-workers");
  let people = [], selected = null, shifts = [], snapshot = null, page = 0, version = 0;
  let deletion = null;
  const deleteDialog = document.createElement("dialog");
  deleteDialog.className = "formerDeleteDialog";
  deleteDialog.setAttribute("aria-labelledby", "formerDeleteTitle");
  deleteDialog.setAttribute("aria-describedby", "formerDeleteWarning");
  document.body.appendChild(deleteDialog);
  function closeDelete(force = false) {
    if (deletion?.busy && !force) return;
    deletion = null;
    if (deleteDialog.open) deleteDialog.close();
    deleteDialog.replaceChildren();
  }
  const escape = value => escapeHtml(value);
  const duration = value => formatReportCSVTime(Number(value) || 0);
  const date = value => value ? new Date(value).toLocaleString() : "—";
  const status = person => person.removed_at ? "Removed" : "Deactivated";
  const name = person => person.profiles?.full_name?.trim() || "Worker";
  function clear() { closeDelete(true); version++; people = []; selected = null; shifts = []; snapshot = null; section.replaceChildren(); }
  function shell() {
    section.innerHTML = `<div class="workersTop"><div><div class="pageHeading">Former workers</div>
      <div class="pageDescription">Deactivated and removed workers, with their shift history and exports.</div></div>
      <button class="refreshButton" data-former-refresh>Refresh</button></div>
      <div class="formerLayout"><div class="sectionCard formerPeople"><label for="formerSearch">Find a worker</label>
        <input id="formerSearch" type="search" placeholder="Name or email"><div id="formerPeopleList"></div></div>
        <div class="sectionCard formerDetail" id="formerDetail"><div class="emptyState">Select a worker to view their history.</div></div></div>`;
  }
  function renderPeople() {
    const query = document.getElementById("formerSearch").value.trim().toLowerCase();
    const filtered = people.filter(p => `${name(p)} ${p.profiles?.email || ""} ${p.user_id}`.toLowerCase().includes(query));
    document.getElementById("formerPeopleList").innerHTML = filtered.length ? filtered.map(p => `<button class="formerPerson ${p.user_id === selected?.user_id ? "selected" : ""}" data-former-person="${escape(p.user_id)}" aria-pressed="${p.user_id === selected?.user_id}">
      <strong>${escape(name(p))}</strong><span>${escape(p.profiles?.email || `ID: ${p.user_id}`)}</span><small>${status(p)}</small></button>`).join("") : '<div class="emptyState">No former workers found.</div>';
  }
  async function load() {
    if (!companyId) return;
    const token = ++version, company = companyId;
    people = []; selected = null; shifts = []; snapshot = null; shell();
    document.getElementById("formerPeopleList").innerHTML = '<div class="emptyState" role="status">Loading workers…</div>';
    try {
      const result = await sb.from("company_members").select("id,user_id,role,active,joined_at,removed_at,profiles(full_name,email)").eq("company_id", company).order("joined_at", {ascending:false});
      if (token !== version || company !== companyId) return;
      if (result.error) throw result.error;
      people = (result.data || []).filter(p => p.role === "worker" && (p.active === false || p.removed_at));
      renderPeople();
    } catch (error) {
      if (token === version && company === companyId) document.getElementById("formerPeopleList").innerHTML = `<div class="emptyState" role="alert">${escape(error.message || "Could not load workers. Use Refresh to try again.")}</div>`;
    }
  }
  function select(userId) {
    selected = people.find(p => p.user_id === userId);
    if (!selected) return;
    renderPeople();
    document.getElementById("formerDetail").innerHTML = `<header><span class="inactivePill">${status(selected)}</span><h2>${escape(name(selected))}</h2>
      <p>${escape(selected.profiles?.email || "No email recorded")}</p><p class="formerMuted">Joined ${escape(date(selected.joined_at))}${selected.removed_at ? ` · Removed ${escape(date(selected.removed_at))}` : ""}</p>
      <p class="formerMuted">Worker ID: ${escape(selected.user_id)}</p>
      ${!selected.removed_at ? '<button class="secondaryButton" data-former-access>Manage access</button>' : ''}</header>
      <form id="formerFilters"><label>From<input type="date" id="formerStart"></label><label>To<input type="date" id="formerEnd"></label><button class="secondaryButton" type="submit">Apply dates</button><button class="secondaryButton" type="button" data-former-all>All time</button></form>
      <div class="formerExport"><button class="secondaryButton" data-former-csv disabled>Export CSV</button><button class="secondaryButton" data-former-pdf disabled>Export PDF</button></div>
      <div id="formerHistory" aria-live="polite"></div>
      <div class="formerDeleteArea"><h3>Permanent deletion</h3><p class="formerMuted">Workers with recorded hours stay archived. Only workers with no work records can be permanently deleted.</p><button class="dangerButton" data-former-delete>Delete unused worker</button></div>`;
    history();
  }
  async function history() {
    if (!selected || !companyId) return;
    const start = document.getElementById("formerStart").value;
    const end = document.getElementById("formerEnd").value;
    const token = ++version, company = companyId, person = selected;
    shifts = []; snapshot = null; page = 0;
    section.querySelectorAll('[data-former-csv], [data-former-pdf]').forEach(b => b.disabled = true);
    const container = document.getElementById("formerHistory");
    if (start && end && start > end) { container.innerHTML = '<p role="alert">End date must be on or after start date.</p>'; return; }
    container.innerHTML = '<div class="emptyState" role="status">Loading all matching shifts…</div>';
    try {
      const result = await sb.rpc("get_admin_former_worker_history", {p_company_id:company, p_user_id:person.user_id, p_start_date:start || null, p_end_date:end || null});
      if (token !== version || company !== companyId) return;
      if (result.error) throw result.error;
      if (!result.data || result.data.user_id !== person.user_id || !Array.isArray(result.data.shifts)) throw new Error("Worker history is unavailable.");
      shifts = result.data.shifts;
      snapshot = {person, company, start, end, asOf:result.data.as_of};
      renderHistory();
      section.querySelectorAll('[data-former-csv], [data-former-pdf]').forEach(b => b.disabled = !shifts.length);
    } catch (error) {
      if (token === version && company === companyId) container.innerHTML = `<div class="emptyState" role="alert">${escape(error.message || "Could not load history.")}<br><button class="secondaryButton" data-former-retry>Try again</button></div>`;
    }
  }
  function range() { return snapshot.start || snapshot.end ? `${snapshot.start || "Beginning"} – ${snapshot.end || "Present"}` : "All time"; }
  function totals() { return shifts.reduce((t,s) => ({worked:t.worked+(Number(s.worked_seconds)||0), breaks:t.breaks+(Number(s.total_break_seconds)||0)}),{worked:0,breaks:0}); }
  function rows(list, interactive) {
    return list.map(s => `<tr><td>${interactive ? `<button class="workerProfileLink" data-former-shift="${escape(s.shift_id)}">${escape(date(s.clock_in))}</button>` : escape(date(s.clock_in))}</td><td>${s.clock_out ? escape(date(s.clock_out)) : "Open shift"}</td><td>${escape(s.break_count ?? 0)}</td><td>${escape(duration(s.total_break_seconds))}</td><td>${escape(duration(s.worked_seconds))}</td></tr>`).join("");
  }
  function table(list, interactive) {
    return `<table class="formerTable"><thead><tr><th>Clock in</th><th>Clock out</th><th>Breaks</th><th>Break time</th><th>Worked</th></tr></thead><tbody>${rows(list,interactive)}</tbody></table>`;
  }
  function renderHistory() {
    const total = totals(), pages = Math.max(1,Math.ceil(shifts.length / 50));
    page = Math.max(0,Math.min(page,pages-1));
    document.getElementById("formerHistory").innerHTML = `<p class="formerMuted">${escape(range())} · Snapshot ${escape(date(snapshot.asOf))}</p>
      <div class="formerStats"><div><strong>${shifts.length}</strong><span>Shifts</span></div><div><strong>${escape(duration(total.worked))}</strong><span>Worked</span></div><div><strong>${escape(duration(total.breaks))}</strong><span>Break time</span></div></div>
      <p class="formerMuted">Worked time excludes breaks. Exports include all ${shifts.length} matching shifts.</p>
      ${shifts.length ? `<div class="formerTableWrap">${table(shifts.slice(page*50,(page+1)*50),true)}</div>
      <div class="formerPages"><button class="secondaryButton" data-former-prev ${page===0 ? "disabled" : ""}>Previous</button><span>Page ${page+1} of ${pages}</span><button class="secondaryButton" data-former-next ${page===pages-1 ? "disabled" : ""}>Next</button></div>` : '<div class="emptyState">No shifts in this range.</div>'}`;
  }
  function exportCSV() {
    if (!snapshot || snapshot.company !== companyId || !shifts.length) return;
    const csvRows = [["Worker","Email","Worker ID","Status","Shift ID","Clock in (ISO)","Clock out (ISO)","Break count","Break time (HH:MM)","Worked (HH:MM)","Worked seconds"]];
    for (const s of shifts) csvRows.push([name(snapshot.person),snapshot.person.profiles?.email || "",snapshot.person.user_id,status(snapshot.person),s.shift_id,s.clock_in,s.clock_out || "",s.break_count || 0,duration(s.total_break_seconds),duration(s.worked_seconds),s.worked_seconds]);
    // Keep spreadsheet applications from treating user-entered names as formulas.
    const cell = value => csvEscapeValue(/^[\s]*[=+\-@]/.test(String(value ?? "")) ? "'"+value : value);
    const blob = new Blob(["\uFEFF",csvRows.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `ShiftHQ-former-worker-${snapshot.person.user_id}-${snapshot.start || "all"}-${snapshot.end || "time"}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportPDF() {
    if (!snapshot || snapshot.company !== companyId || !shifts.length) return;
    const popup = window.open("","_blank");
    if (!popup) { alert("Allow pop-ups for this site to export PDF, then try again."); return; }
    popup.opener = null;
    const total = totals();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Worker shift history</title><style>@page{size:A4 landscape;margin:14mm}body{font:12px Arial;color:#172231}h1{font-size:23px}p{line-height:1.6}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #ddd;padding:8px}th{background:#f4f6f8}thead{display:table-header-group}tr{break-inside:avoid}button{padding:10px}@media print{button{display:none}}</style></head><body><h1>${escape(name(snapshot.person))} — shift history</h1><p>${escape(snapshot.person.profiles?.email || "No email recorded")} · ${status(snapshot.person)}<br>Worker ID: ${escape(snapshot.person.user_id)}<br>${escape(range())} · Snapshot ${escape(date(snapshot.asOf))}<br>${shifts.length} shifts · Worked ${escape(duration(total.worked))} · Breaks ${escape(duration(total.breaks))}</p>${table(shifts,false)}</body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  }
  function confirmDelete() {
    if (!selected || !companyId) return;
    deletion = {userId:selected.user_id, company:companyId, busy:false};
    deleteDialog.innerHTML = `<h2 id="formerDeleteTitle">Permanently delete ${escape(name(selected))}?</h2>
      <p>${escape(selected.profiles?.email || "No email recorded")}<br><small>Worker ID: ${escape(selected.user_id)}</small></p>
      <p id="formerDeleteWarning"><strong>This cannot be undone. Deleted records cannot be recovered in ShiftHQ.</strong></p>
      <p>This deletes an unused worker’s company membership and PIN. <strong>Deletion is blocked if the worker has any shifts or preserved work-record history, from any date.</strong> Keep workers with recorded hours archived.</p>
      <p>Their shared account and records in other companies are kept. Export any records you need before continuing.</p>
      <form id="formerDeleteForm"><label for="formerDeleteText">Type DELETE to confirm</label><input id="formerDeleteText" autocomplete="off" spellcheck="false" required>
        <div class="formerDeleteButtons"><button type="button" class="secondaryButton" data-delete-cancel autofocus>Cancel</button><button type="submit" class="dangerButton" id="formerDeleteSubmit" disabled>Delete permanently</button></div>
      </form><p id="formerDeleteMessage" role="status" aria-live="polite"></p>`;
    deleteDialog.showModal();
  }
  deleteDialog.addEventListener("cancel",event=>{event.preventDefault();closeDelete();});
  deleteDialog.addEventListener("click",event=>{if(event.target.closest("[data-delete-cancel]")) closeDelete();});
  deleteDialog.addEventListener("input",()=>{if(!deletion?.busy) document.getElementById("formerDeleteSubmit").disabled = document.getElementById("formerDeleteText").value !== "DELETE";});
  deleteDialog.addEventListener("submit",async event=>{
    event.preventDefault();
    if (!deletion || deletion.busy || deletion.company !== companyId || document.getElementById("formerDeleteText").value !== "DELETE") return;
    const target = deletion;
    target.busy = true;
    deleteDialog.querySelectorAll("button,input").forEach(el=>el.disabled=true);
    document.getElementById("formerDeleteMessage").textContent="Deleting permanently…";
    try {
      const result=await sb.rpc("admin_delete_former_worker", {p_company_id:target.company,p_user_id:target.userId,p_confirmation:"DELETE"});
      if(result.error) throw result.error;
      if(deletion !== target || companyId !== target.company) return;
      closeDelete(true);
      // Clear cached totals and exports; the original pages reload through their normal flows.
      members = members.filter(m=>m.user_id !== target.userId);
      timesheets = []; timesheetsInitialized = false;
      reportRows = [];
      if(typeof renderTimesheets === "function") renderTimesheets();
      if(typeof updateTimesheetStats === "function") updateTimesheetStats();
      if(typeof renderReportRows === "function") renderReportRows();
      if(typeof resetReportStats === "function") resetReportStats();
      await load();
      if(companyId === target.company && document.getElementById("formerDetail")) document.getElementById("formerDetail").innerHTML='<div class="emptyState" role="status">Unused worker permanently deleted.</div>';
    } catch(error) {
      if(deletion !== target || companyId !== target.company) return;
      target.busy=false;
      document.getElementById("formerDeleteMessage").textContent=error.message || "Deletion could not be confirmed. Refresh the list before trying again.";
      deleteDialog.querySelectorAll("button,input").forEach(el=>el.disabled=false);
    }
  });
  section.addEventListener("input",e=>{
    if(e.target.id === "formerSearch") renderPeople();
    if(e.target.id === "formerStart" || e.target.id === "formerEnd") {
      version++; snapshot = null; shifts = [];
      section.querySelectorAll('[data-former-csv], [data-former-pdf]').forEach(b => b.disabled = true);
      document.getElementById("formerHistory").innerHTML = '<p class="formerMuted">Apply dates to load this range.</p>';
    }
  });
  section.addEventListener("submit",e=>{if(e.target.id === "formerFilters") {e.preventDefault();history();}});
  section.addEventListener("click",async e=>{
    const button=e.target.closest("button");if(!button) return;
    if(button.hasAttribute("data-former-delete")) return confirmDelete();
    if(button.hasAttribute("data-former-refresh")) return load();
    if(button.dataset.formerPerson) return select(button.dataset.formerPerson);
    if(button.hasAttribute("data-former-all")) {document.getElementById("formerStart").value="";document.getElementById("formerEnd").value="";return history();}
    if(button.hasAttribute("data-former-retry")) return history();
    if(button.hasAttribute("data-former-prev")) {page--;return renderHistory();}
    if(button.hasAttribute("data-former-next")) {page++;return renderHistory();}
    if(button.hasAttribute("data-former-csv")) return exportCSV();
    if(button.hasAttribute("data-former-pdf")) return exportPDF();
    if(button.dataset.formerShift) return openShiftDetails(button.dataset.formerShift);
    if(button.hasAttribute("data-former-access") && selected) { const id=selected.user_id, company=companyId; await loadMembers(); if(company===companyId) WorkerProfile.open(id); }
  });
  sb.auth.onAuthStateChange(event=>{if(event === "SIGNED_OUT") clear();});
  window.FormerWorkers = {load,clear};
})();
