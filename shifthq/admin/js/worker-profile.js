/* Worker details stays separate from invitations, removal and shared admin state. */
(function () {
  "use strict";
  const dialog = document.getElementById("workerProfileDialog");
  const body = document.getElementById("workerProfileBody");
  const title = document.getElementById("workerProfileTitle");
  let selection = null;
  let generation = 0;
  let opener = null;
  let busy = false;
  const html = value => escapeHtml(value);
  const hours = seconds => `${(Math.max(0, Number(seconds) || 0) / 3600).toFixed(2)} h`;
  function date(value, time = false) {
    if (!value) return "Not recorded";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Not recorded" : new Intl.DateTimeFormat(undefined,
      time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(parsed);
  }
  function current(ticket, company) {
    return dialog.open && ticket === generation && company === companyId;
  }
  function close() {
    generation++;
    selection = null;
    busy = false;
    body.replaceChildren(); // Includes any entered PINs.
    if (dialog.open) dialog.close();
    if (opener?.isConnected) opener.focus();
    opener = null;
  }
  function message(text, error = false) {
    const target = document.getElementById("workerProfileMessage");
    if (target) {
      target.textContent = text;
      target.className = `workerProfileMessage${error ? " error" : ""}`;
    }
  }
  function render(data) {
    const name = data.profile?.full_name?.trim() || "Worker";
    title.textContent = name;
    const clock = { working: "Clocked in", on_break: "On break", off: "Clocked out" }[data.clock_status] || "Unknown";
    const shifts = Array.isArray(data.recent_shifts) ? data.recent_shifts : [];
    body.innerHTML = `
      <div class="workerProfileIdentity">
        <div class="avatar">${html(initials(name))}</div>
        <div><div class="workerProfileEmail">${html(data.profile?.email || "No email recorded")}</div>
          <div class="workerProfileMuted">Joined ${html(date(data.joined_at))}</div></div>
        <span class="${data.active ? "activePill" : "inactivePill"}">${data.active ? "Active" : "Inactive"}</span>
      </div>
      <div class="workerProfileClock"><span class="workerClockDot ${html(data.clock_status)}"></span>
        <strong>${html(clock)}</strong><span class="workerProfileMuted">As of ${html(date(data.as_of, true))}</span>
        <button type="button" class="secondaryButton" data-profile-refresh>Refresh</button></div>
      <section aria-labelledby="workerSummaryTitle"><h3 id="workerSummaryTitle">Last 30 days</h3>
        <p class="workerProfileMuted">${html(data.period_start)} – ${html(data.period_end)} · Shifts starting in this range, using the Timesheets date boundaries.</p>
        <div class="workerProfileStats">
          <div><span>Hours worked</span><strong>${hours(data.summary?.worked_seconds)}</strong></div>
          <div><span>Shifts</span><strong>${html(data.summary?.shift_count ?? 0)}</strong></div>
          <div><span>Break time</span><strong>${hours(data.summary?.break_seconds)}</strong></div>
        </div><p class="workerProfileMuted">Worked time excludes breaks. Open shifts are included through the snapshot time above.</p>
      </section>
      <section aria-labelledby="workerRecentTitle"><h3 id="workerRecentTitle">Recent shifts</h3>
        <p class="workerProfileMuted">Latest 10 shifts across all dates. Select a shift to view or edit it.</p>
        ${shifts.length ? `<div class="workerProfileTableWrap"><table class="workerProfileTable"><thead><tr><th>Clock in</th><th>Clock out</th><th>Breaks</th><th>Worked</th></tr></thead><tbody>${shifts.map(shift => `<tr>
          <td><button type="button" class="workerProfileLink" data-profile-shift="${html(shift.shift_id)}">${html(date(shift.clock_in, true))}</button></td>
          <td>${shift.clock_out ? html(date(shift.clock_out, true)) : '<span class="activePill">Open shift</span>'}</td>
          <td>${hours(shift.total_break_seconds)}</td><td>${hours(shift.worked_seconds)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="workerProfileEmpty">No shifts recorded yet.</div>'}
      </section>
      <section class="workerProfileAccess" aria-labelledby="workerAccessTitle"><h3 id="workerAccessTitle">Worker access</h3>
        <p class="workerProfileMuted">Deactivation keeps shift history and the existing PIN. The worker must be clocked out first.</p>
        <button type="button" class="secondaryButton" data-profile-status ${data.active && data.clock_status !== "off" ? "disabled" : ""}>${data.active ? "Deactivate worker" : "Reactivate worker"}</button>
        ${!data.has_pin ? '<p class="workerProfileMuted">No PIN is set. Set a new PIN before reactivating this worker.</p>' : ''}
        <details id="workerPinDetails"><summary>Set / change kiosk PIN</summary>
          <p class="workerProfileMuted">Enter a new 4-digit PIN twice. It replaces the old PIN immediately and clears any PIN lockout. Share it privately with the worker. Existing PINs cannot be viewed.</p>
          <form id="workerPinForm" autocomplete="off"><div class="workerPinFields">
            <label>New PIN<input id="workerNewPin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required></label>
            <label>Confirm PIN<input id="workerConfirmPin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" required></label>
          </div><button type="submit" class="secondaryButton">Save new PIN</button>
          <button type="button" class="secondaryButton" data-profile-pin-cancel>Cancel</button></form>
        </details>
      </section><div id="workerProfileMessage" class="workerProfileMessage" role="status" aria-live="polite"></div>`;
  }
  async function load(userId, selectedCompany) {
    const ticket = ++generation;
    busy = false;
    selection = { userId, company: selectedCompany, data: null };
    title.textContent = "Worker details";
    body.innerHTML = '<div class="workerProfileEmpty" role="status">Loading worker profile…</div>';
    try {
      const result = await sb.rpc("get_admin_worker_profile", { p_company_id: selectedCompany, p_user_id: userId });
      if (!current(ticket, selectedCompany)) return;
      if (result.error) throw result.error;
      if (!result.data || result.data.user_id !== userId) throw new Error("Worker profile is unavailable.");
      selection.data = result.data;
      render(result.data);
    } catch (error) {
      if (!current(ticket, selectedCompany)) return;
      body.innerHTML = `<div class="workerProfileEmpty" role="alert">Could not load this profile. ${html(error.message || "Please try again.")}</div><button class="secondaryButton" data-profile-refresh>Try again</button>`;
    }
  }
  async function open(userId) {
    if (!companyId || !members.some(m => m.user_id === userId && m.role === "worker")) return;
    opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    await load(userId, companyId);
  }
  async function mutate(kind, pin) {
    if (busy || !selection?.data || selection.company !== companyId) return;
    const selected = selection;
    const ticket = generation;
    busy = true;
    body.querySelectorAll("button, input").forEach(el => el.disabled = true);
    message("Saving…");
    let saved = false;
    try {
      const args = { p_company_id: selected.company, p_user_id: selected.userId };
      const result = kind === "pin"
        ? await sb.rpc("admin_set_worker_pin", { ...args, p_pin: pin })
        : await sb.rpc("admin_set_worker_active", { ...args, p_active: !selected.data.active, p_expected_active: selected.data.active });
      pin = null;
      if (result.error) throw result.error;
      saved = true;
      if (selected.company === companyId) {
        await Promise.allSettled([loadMembers(), loadLiveWorkers()]);
      }
      if (!current(ticket, selected.company)) return;
      await load(selected.userId, selected.company);
      message(kind === "pin" ? "New PIN saved. Share it privately with the worker." : "Worker status updated.");
    } catch (error) {
      if (current(ticket, selected.company)) message(saved ? "Saved, but refresh failed. Refresh the profile." : (error.message || "Could not save. Please try again."), true);
    } finally {
      pin = null;
      if (current(ticket, selected.company)) {
        busy = false;
        body.querySelectorAll("button, input").forEach(el => el.disabled = false);
        const status = body.querySelector("[data-profile-status]");
        if (status) status.disabled = selected.data.active && selected.data.clock_status !== "off";
      }
    }
  }
  document.addEventListener("click", event => {
    const row = event.target.closest("[data-worker-profile]");
    if (!row || event.target.closest("[data-remove-worker]")) return;
    // The name is a native keyboard-accessible button; the rest of the row also opens it.
    if (event.target.closest("button") && !event.target.closest("[data-open-profile]")) return;
    open(row.dataset.workerProfile);
  });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  dialog.addEventListener("click", event => {
    if (event.target.closest("[data-profile-close]")) return close();
    if (busy) return;
    if (event.target.closest("[data-profile-refresh]") && selection) return load(selection.userId, selection.company);
    const shift = event.target.closest("[data-profile-shift]");
    if (shift) { close(); openShiftDetails(shift.dataset.profileShift); return; }
    if (event.target.closest("[data-profile-pin-cancel]")) {
      document.getElementById("workerPinForm").reset();
      document.getElementById("workerPinDetails").open = false;
    }
    if (event.target.closest("[data-profile-status]") && selection?.data) {
      const verb = selection.data.active ? "Deactivate" : "Reactivate";
      if (confirm(`${verb} ${selection.data.profile?.full_name || "this worker"}?`)) mutate("status");
    }
  });
  dialog.addEventListener("submit", event => {
    if (event.target.id !== "workerPinForm") return;
    event.preventDefault();
    const first = document.getElementById("workerNewPin");
    const second = document.getElementById("workerConfirmPin");
    if (!/^[0-9]{4}$/.test(first.value) || first.value !== second.value) {
      message("Enter matching 4-digit PINs.", true);
      return;
    }
    let pin = first.value;
    event.target.reset();
    mutate("pin", pin);
    pin = null;
  });
  // Clear secrets even when a user merely collapses the PIN form.
  dialog.addEventListener("toggle", event => {
    if (event.target.id === "workerPinDetails" && !event.target.open) document.getElementById("workerPinForm")?.reset();
  }, true);
  sb.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") close();
  });
  window.WorkerProfile = { open, close };
})();
