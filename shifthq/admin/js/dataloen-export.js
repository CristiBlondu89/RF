(function () {
  "use strict";
  const dialog=document.createElement("dialog");
  dialog.className="dataloenDialog";dialog.setAttribute("aria-labelledby","dataloenTitle");document.body.appendChild(dialog);
  const esc=value=>escapeHtml(value);
  const $=id=>dialog.querySelector('#'+id);
  let version=0,state=null,busy=false,preview=null;
  function clear() {version++;state=null;busy=false;preview=null;if(dialog.open)dialog.close();dialog.replaceChildren();}
  function lock(value) {busy=value;dialog.querySelectorAll('input,select,button').forEach(e=>{if(!e.hasAttribute('data-dl-close'))e.disabled=value;});}
  async function rpc(name,args) {const result=await sb.rpc(name,args);if(result.error)throw result.error;return result.data;}
  async function open(approvalId) {
    if(!companyId || !approvalId)return;
    clear();const token=version,company=companyId;
    dialog.innerHTML='<h2 id="dataloenTitle">DataLøn export</h2><p role="status">Loading approved hours…</p><button class="secondaryButton" data-dl-close>Close</button>';dialog.showModal();
    try {
      const result=await rpc('admin_get_dataloen_setup',{p_company_id:company,p_approval_id:approvalId});
      if(token!==version || company!==companyId)return;
      if(!Array.isArray(result?.workers))throw new Error('Worker details are unavailable.');
      state={...result,company,approvalId};render();
    } catch(error) {if(token===version)dialog.innerHTML=`<h2 id="dataloenTitle">DataLøn export unavailable</h2><p role="alert">${esc(error.message || 'Please refresh the period and try again.')}</p><button class="secondaryButton" data-dl-close>Close</button>`;}
  }
  function render() {
    dialog.innerHTML=`<div class="dlHeading"><div><h2 id="dataloenTitle">Export to DataLøn</h2><p>${esc(state.start_date)} – ${esc(state.end_date)} · Approved hours</p></div><button class="secondaryButton" data-dl-close>Close</button></div>
      <p class="formerMuted">Use the identifiers and pay codes from your company's DataLøn setup. One total per worker is exported, so one pay code and rate must apply to all of that worker's exported hours. Handle premiums, absence and hours requiring different rates separately in your payroll preparation.</p>
      ${state.exports.length?`<p class="payNotice">Files have already been generated for this approval (${state.exports.length}). Downloading again does not replace anything in DataLøn. Check whether these hours have already been imported before importing another file.</p>`:''}
      <form id="dlForm"><label class="dlCompany">DataLøn company number<input id="dlCompany" inputmode="numeric" pattern="[0-9]{1,8}" maxlength="8" required value="${esc(state.company_number || '')}"></label>
      <p class="formerMuted">Employee numbers, salary period codes and input codes must match DataLøn. For an hours-only code, choose Hours only. For an hours × rate code, enter the hourly rate that applies to this period. Rates are not copied into later periods.</p>
      <div class="dlWorkers">${state.workers.map((w,i)=>`<fieldset data-dl-worker="${esc(w.worker_id)}"><legend>${esc(w.worker_name)}</legend><p class="formerMuted">${esc(formatReportCSVTime(w.worked_seconds))} worked · ${esc(w.worked_seconds)} seconds</p><div class="dlFields">
        <label>Employee number<input data-field="employee_number" maxlength="32" pattern="[A-Za-z0-9_-]{1,32}" required value="${esc(w.employee_number || '')}"></label>
        <label>Salary period code<input data-field="salary_period_code" inputmode="numeric" pattern="[0-9]{2}" maxlength="2" required placeholder="2 digits" value="${esc(w.salary_period_code || '')}"></label>
        <label>Input code<input data-field="input_code" pattern="[A-Za-z0-9]{4}" maxlength="4" required placeholder="4 characters" value="${esc(w.input_code || '')}"></label>
        <label>Pay item type<select data-field="mode" required><option value="">Choose type…</option><option value="hours_only" ${w.mode==='hours_only'?'selected':''}>Hours only</option><option value="hourly_rate" ${w.mode==='hourly_rate'?'selected':''}>Hours × hourly rate</option></select></label>
        <label>Hourly rate (DKK)<input data-field="rate" inputmode="decimal" pattern="[0-9]{1,6}([.,][0-9]{1,2})?" placeholder="Only for hours × rate"></label></div></fieldset>`).join('')}</div>
      <p class="formerMuted">Hours are summed from the approved shifts, then rounded once per worker to two decimal places for DataLøn. The original seconds remain in ShiftHQ.</p>
      <button class="inviteButton" type="submit">Preview DataLøn file</button></form><p id="dlMessage" role="status" aria-live="polite"></p><div id="dlPreview"></div>`;
    dialog.querySelectorAll('[data-field=mode]').forEach(updateRate);
  }
  function updateRate(select) {const input=select.closest('fieldset').querySelector('[data-field=rate]');input.required=select.value==='hourly_rate';input.readOnly=select.value!=='hourly_rate';if(input.readOnly)input.value='';}
  function fields() {
    const rows=[...dialog.querySelectorAll('[data-dl-worker]')].map(el=>{
      const row={worker_id:el.dataset.dlWorker};
      for(const input of el.querySelectorAll('[data-field]')) {
        const value=input.value.trim();
        row[input.dataset.field]=input.dataset.field==='rate'?value.replace(',','.'):value;
      }
      return row;
    });
    return {p_company_id:state.company,p_approval_id:state.approvalId,p_company_number:$('dlCompany').value.trim(),p_rows:rows};
  }
  function invalidate() {version++;preview=null;$('dlPreview')?.replaceChildren();if($('dlMessage'))$('dlMessage').textContent='';}
  function showPreview(result,args) {
    preview={...result,args};const p=result.preview;
    $('dlPreview').innerHTML=`<h3>Check before downloading</h3><p class="formerMuted">DataLøn company ${esc(p.company_number)} · ${esc(p.start_date)} – ${esc(p.end_date)}</p>
      <div class="formerTableWrap"><table class="formerTable"><thead><tr><th>Worker</th><th>Employee</th><th>Period code</th><th>Input code</th><th>Hours</th><th>Rate (DKK)</th></tr></thead><tbody>${p.rows.map(r=>`<tr><td>${esc(r.worker_name)}</td><td>${esc(r.employee_number)}</td><td>${esc(r.salary_period_code)}</td><td>${esc(r.input_code)}</td><td>${esc(r.hours)}</td><td>${esc(r.amount || 'Not included')}</td></tr>`).join('')}</tbody></table></div>
      <p class="payNotice">In DataLøn choose “DataLøn fil - fleksible løndele”. Review its import report before completing the import. Existing fixed pay items can be added alongside imported items, so check the resulting hours and pay for duplicates.</p>
      <form id="dlDownload"><label class="dlConfirm"><input type="checkbox" required> I checked the employee numbers, pay codes and rates for this period, and that these hours will not be counted twice.</label><button class="inviteButton" type="submit">Download DataLøn file</button></form>`;
  }
  dialog.addEventListener('input',event=>{if(event.target.closest('#dlForm'))invalidate();});
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-field=mode]'))updateRate(event.target);});
  dialog.addEventListener('click',event=>{if(event.target.closest('[data-dl-close]'))clear();});
  dialog.addEventListener('cancel',event=>{event.preventDefault();clear();});
  dialog.addEventListener('submit',async event=>{
    event.preventDefault();if(!state || busy)return;
    const token=version,company=state.company;
    if(event.target.id==='dlForm') {
      lock(true);$('dlMessage').textContent='Checking mappings and approved hours…';
      const args=fields();
      try {
        const result=await rpc('admin_preview_dataloen_export',args);
        if(token!==version || company!==companyId)return;
        showPreview(result,args);$('dlMessage').textContent='Preview ready. Nothing has been sent to DataLøn.';
      } catch(error) {if(token===version){preview=null;$('dlPreview').replaceChildren();$('dlMessage').textContent=error.message || 'Could not prepare the file.';}}
      finally {if(token===version)lock(false);}
    } else if(event.target.id==='dlDownload' && preview) {
      lock(true);const saved=preview;$('dlMessage').textContent='Rechecking approval and generating file…';
      try {
        const result=await rpc('admin_create_dataloen_export',{...saved.args,p_fingerprint:saved.fingerprint});
        if(token!==version || company!==companyId)return;
        const p=result.payload,url=URL.createObjectURL(new Blob([p.csv],{type:'text/csv;charset=utf-8'}));
        const a=document.createElement('a');a.href=url;a.download=`DataLoen-${p.company_number}-${p.start_date}-${p.end_date}-${result.export_id}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
        preview=null;$('dlPreview').replaceChildren();$('dlMessage').textContent='File downloaded. Import it once in DataLøn and check the result. No payroll has been submitted by ShiftHQ.';
        $('dlForm').insertAdjacentHTML('beforebegin','<p class="payNotice">A file has been generated for this approval. Check for a previous import before generating or importing another.</p>');
      } catch(error) {if(token===version){preview=null;$('dlPreview').replaceChildren();$('dlMessage').textContent=error.message || 'Download failed. Preview again to retry.';}}
      finally {if(token===version)lock(false);}
    }
  });
  window.DataLoenExport={open,clear};
})();
