(function () {
  "use strict";
  const client = supabase.createClient("https://diqxssqucdylekeexaxk.supabase.co", "sb_publishable_zWxqAQuOq2l_3mnj0T4Cnw_FUL9Yvqn", {
    auth: {storageKey:"shifthq-my-hours",persistSession:false,detectSessionInUrl:true}
  });
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const duration = n => {n=Math.max(0,Number(n)||0);return `${Math.floor(n/3600)}:${String(Math.floor(n%3600/60)).padStart(2,"0")}`;};
  const date = v => !v ? "—" : new Date(v).toLocaleString("da-DK",{timeZone:"Europe/Copenhagen"});
  let authEvent = 0, currentUser = null, request = 0, authRequest = 0, rows = [], changes = [], view = null, page = 0, idleTimer = null;
  function message(text) {$("message").textContent=text;}
  function reset() {authEvent++;request++;authRequest++;currentUser=null;rows=[];changes=[];view=null;clearTimeout(idleTimer);$("history").replaceChildren();$("companies").replaceChildren();$("records").classList.add("hidden");$("signOut").classList.add("hidden");$("login").classList.remove("hidden");$("signedInAs").textContent="";$("export").disabled=true;}
  async function signOut() {reset();await client.auth.signOut({scope:"local"});message("Signed out.");}
  function idle() {clearTimeout(idleTimer);if(currentUser)idleTimer=setTimeout(signOut,5*60*1000);}
  document.addEventListener("pointerdown",idle);document.addEventListener("keydown",idle);
  window.addEventListener("pagehide",()=>{reset();client.auth.signOut({scope:"local"});});
  window.addEventListener("pageshow",event=>{if(event.persisted) {reset();message("Please sign in again.");}});
  $("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();$("sendLink").disabled=true;message("Sending sign-in link…");
    try {
      const result=await client.auth.signInWithOtp({email:$("email").value.trim(),options:{shouldCreateUser:false,emailRedirectTo:location.origin+"/shifthq/my-hours/"}});
      if(result.error) throw result.error;
      message("Check your email and open the sign-in link on your own device.");
    } catch(error) {message("Could not send a sign-in link. Check your email address, or wait a moment and try again. Contact your employer if you cannot sign in.");}
    finally {$("sendLink").disabled=false;}
  });
  async function signedIn(session) {
    if(!session) {reset();return;}
    const token=++authRequest;
    currentUser=session.user.id;idle();
    $("login").classList.add("hidden");$("signOut").classList.remove("hidden");$("signedInAs").textContent=session.user.email || "";
    message("Loading your companies…");
    try {
      const result=await client.rpc("get_my_worker_companies");
      if(token!==authRequest)return;
      if(result.error)throw result.error;
      const companies=result.data || [];
      if(!companies.length) {message("No worker records are linked to this account. Contact your employer if you expect to see hours here.");return;}
      $("companies").innerHTML=companies.map(c=>`<option value="${esc(c.company_id)}">${esc(c.company_name || "Company")}${c.active && !c.removed ? "" : " · Former employer"}</option>`).join("");
      $("records").classList.remove("hidden");message("");await load();
    } catch(error) {if(token===authRequest)message("Could not load your records. Sign out and request a new link to try again.");}
  }
  async function load() {
    if(!currentUser || !$("companies").value)return;
    const token=++request,user=currentUser;
    rows=[];changes=[];view=null;page=0;$("export").disabled=true;
    const company=$("companies").value,start=$("start").value,end=$("end").value;
    if(start && end && start>end) {$("history").innerHTML='<p role="alert">End date must be on or after start date.</p>';return;}
    $("history").innerHTML='<p class="empty" role="status">Loading your hours…</p>';message("");
    try {
      const result=await client.rpc("get_my_work_records",{p_company_id:company,p_start_date:start||null,p_end_date:end||null});
      if(token!==request || user!==currentUser)return;
      if(result.error)throw result.error;
      if(!Array.isArray(result.data?.shifts) || !Array.isArray(result.data?.changes))throw new Error("Invalid history response");
      rows=result.data.shifts;changes=result.data.changes;view={company,start,end,asOf:result.data.as_of};render();$("export").disabled=!rows.length;
    } catch(error) {if(token===request && user===currentUser)$("history").innerHTML='<p class="empty" role="alert">Could not load your hours. <button data-retry type="button">Try again</button></p>';}
  }
  function recordText(record,type) {
    if(!record)return "No record";
    return type==="shift" ? `Clock in: ${date(record.clock_in)} · Clock out: ${date(record.clock_out)}` : `Break start: ${date(record.break_start)} · Break end: ${date(record.break_end)}`;
  }
  function render() {
    const total=rows.reduce((t,s)=>({work:t.work+(Number(s.worked_seconds)||0),breaks:t.breaks+(Number(s.break_seconds)||0)}),{work:0,breaks:0});
    const pages=Math.max(1,Math.ceil(rows.length/50));page=Math.min(Math.max(page,0),pages-1);
    $("history").innerHTML=`<p class="muted">${esc(view.start || "Beginning")} – ${esc(view.end || "Present")} · Updated ${esc(date(view.asOf))}</p>
      <div class="stats"><div><strong>${rows.length}</strong><span>Shifts</span></div><div><strong>${duration(total.work)}</strong><span>Worked · hours:minutes</span></div><div><strong>${duration(total.breaks)}</strong><span>Breaks · hours:minutes</span></div></div><p class="muted">Times shown in Denmark time. Worked time excludes breaks. Open shifts are included up to the update time above.</p>
      ${rows.length ? `<div class="tableWrap"><table><thead><tr><th>Clock in</th><th>Clock out</th><th>Breaks</th><th>Worked</th></tr></thead><tbody>${rows.slice(page*50,(page+1)*50).map(s=>`<tr><td>${esc(date(s.clock_in))}</td><td>${s.clock_out ? esc(date(s.clock_out)) : "Open shift"}</td><td><details><summary>${duration(s.break_seconds)}</summary>${s.breaks.map(b=>`<p>${esc(date(b.break_start))} – ${esc(date(b.break_end))}</p>`).join("") || "No breaks"}</details></td><td>${duration(s.worked_seconds)}</td></tr>`).join("")}</tbody></table></div><div class="pager"><button data-prev ${page===0 ? "disabled" : ""}>Previous</button><span>${page+1} / ${pages}</span><button data-next ${page===pages-1 ? "disabled" : ""}>Next</button></div>` : '<p class="empty">No shifts in this range.</p>'}
      <details><summary>Record changes (${changes.length})</summary><p class="muted">All dates. Changes recorded after record protection was enabled, including corrected and deleted entries.</p>${changes.slice(0,100).map(c=>`<div class="change"><strong>${esc(c.action)} · ${esc(c.record_type)}</strong><p>${esc(date(c.recorded_at))}</p><p>Before: ${esc(recordText(c.before,c.record_type))}</p><p>After: ${esc(recordText(c.after,c.record_type))}</p></div>`).join("") || '<p>No recorded changes.</p>'}<p class="muted">Showing ${Math.min(100,changes.length)} of ${changes.length} changes. Download the full record to keep all changes and break details.</p></details>
      <button data-full-export class="secondary" type="button">Download full record (JSON)</button><p class="muted">Contact your employer if a record needs correcting.</p>`;
  }
  function download(text,type,filename) {const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $("export").addEventListener("click",()=>{
    if(!view || !currentUser)return;
    const values=[["Shift ID","Clock in (ISO)","Clock out (ISO)","Worked seconds","Break seconds"],...rows.map(s=>[s.shift_id,s.clock_in,s.clock_out||"",s.worked_seconds,s.break_seconds])];
    const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
    download("\uFEFF"+values.map(row=>row.map(cell).join(",")).join("\r\n"),"text/csv;charset=utf-8",`ShiftHQ-my-hours-${view.company}.csv`);
  });
  $("history").addEventListener("click",event=>{const b=event.target.closest("button");if(!b)return;if(b.hasAttribute("data-retry"))return load();if(!view)return;if(b.hasAttribute("data-prev")){page--;render();}if(b.hasAttribute("data-next")){page++;render();}if(b.hasAttribute("data-full-export"))download(JSON.stringify({company_id:view.company,period_start:view.start,period_end:view.end,as_of:view.asOf,shifts:rows,changes},null,2),"application/json",`ShiftHQ-my-records-${view.company}.json`);});
  $("filters").addEventListener("submit",event=>{event.preventDefault();load();});
  $("filters").addEventListener("input",()=>{request++;rows=[];changes=[];view=null;$("export").disabled=true;$("history").innerHTML='<p>Apply dates to load this range.</p>';});
  $("companies").addEventListener("change",load);
  $("allTime").addEventListener("click",()=>{$("start").value="";$("end").value="";load();});
  $("signOut").addEventListener("click",signOut);
  client.auth.onAuthStateChange((event,session)=>{
    // Schedule API calls outside the Auth callback to avoid holding its internal lock.
    if(event==="SIGNED_OUT") {reset();return;}
    if(event==="INITIAL_SESSION" || event==="SIGNED_IN") {
      const ticket=++authEvent;
      setTimeout(()=>{if(ticket===authEvent)signedIn(session);},0);
    }
  });
})();
