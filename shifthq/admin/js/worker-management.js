(function () {
  "use strict";

  let invitations = [];

  async function callWorkerApi(action, payload = {}) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error("Your admin session has expired. Sign in again.");

    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-workers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({ action, company_id: companyId, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Worker action failed.");
    return result;
  }

  function setActionMessage(text, type = "") {
    showMessage("workerActionMessage", text, type);
  }

  async function load() {
    if (!companyId) return;
    const memberResult = await sb
      .from("company_members")
      .select(`id,user_id,role,active,joined_at,profiles(full_name,email)`)
      .eq("company_id", companyId)
      .order("joined_at", { ascending: true });

    if (memberResult.error) {
      console.error("Members:", memberResult.error);
      document.getElementById("membersList").innerHTML =
        '<div class="emptyState">Could not load team members.</div>';
    } else {
      members = Array.isArray(memberResult.data) ? memberResult.data : [];
      renderMembers();
    }

    await loadInvitations();
  }

  function renderMembers() {
    const workers = members.filter(member => member.role === "worker");
    document.getElementById("workerCountText").textContent =
      `${workers.length} worker${workers.length === 1 ? "" : "s"}`;
    const container = document.getElementById("membersList");
    if (!workers.length) {
      container.innerHTML = '<div class="emptyState">No workers yet.</div>';
      return;
    }

    container.innerHTML = workers.map(member => {
      const profile = member.profiles || {};
      const name = profile.full_name?.trim() || "Worker";
      const email = profile.email || "No email";
      return `
        <div class="memberRow">
          <div class="avatar">${escapeHtml(initials(name))}</div>
          <div class="workerName">${escapeHtml(name)}</div>
          <div class="memberEmail">${escapeHtml(email)}</div>
          <div class="memberActions">
            <button class="dangerButton" data-remove-worker="${escapeHtml(member.user_id)}"
              data-worker-name="${escapeHtml(name)}">Remove</button>
          </div>
        </div>`;
    }).join("");
  }

  async function loadInvitations() {
    const container = document.getElementById("pendingInvitationsList");
    try {
      const result = await callWorkerApi("list");
      invitations = result.invitations || [];
      document.getElementById("invitationCountText").textContent =
        `${invitations.length} pending invitation${invitations.length === 1 ? "" : "s"}`;
      if (!invitations.length) {
        container.innerHTML = '<div class="emptyState">No pending invitations.</div>';
        return;
      }
      container.innerHTML = invitations.map(invitation => `
        <div class="invitationRow">
          <div class="workerName">${escapeHtml(invitation.full_name || "Worker")}</div>
          <div class="memberEmail">${escapeHtml(invitation.email)}</div>
          <div class="memberEmail">${escapeHtml(formatInviteDate(invitation.created_at))}</div>
          <div class="invitationActions">
            <button class="secondaryButton" data-resend-invite="${escapeHtml(invitation.id)}">Resend</button>
            <button class="dangerButton" data-cancel-invite="${escapeHtml(invitation.id)}">Cancel</button>
          </div>
        </div>`).join("");
    } catch (error) {
      console.error("Invitations:", error);
      container.innerHTML = `<div class="emptyState">Could not load invitations: ${escapeHtml(error.message || String(error))}</div>`;
      setActionMessage(error.message);
    }
  }

  function formatInviteDate(value) {
    if (!value) return "Pending";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  }

  async function sendInvitation() {
    clearMessage("inviteMessage");
    const fullName = document.getElementById("workerName").value.trim();
    const email = document.getElementById("workerEmail").value.trim().toLowerCase();
    const button = document.getElementById("sendInviteButton");
    if (!email) return showMessage("inviteMessage", "Enter the worker's email address.");
    if (!companyId) return showMessage("inviteMessage", "No company is loaded.");

    button.disabled = true;
    button.textContent = "Sending…";
    showMessage("inviteMessage", "Creating invitation…", "info");
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Your admin session has expired. Sign in again.");
      const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify({ company_id: companyId, email, full_name: fullName || null })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Invitation failed.");
      showMessage("inviteMessage", result.message || "Invitation sent successfully.", "success");
      document.getElementById("workerName").value = "";
      document.getElementById("workerEmail").value = "";
      await load();
    } catch (error) {
      showMessage("inviteMessage", error.message || "Invitation failed.");
    } finally {
      button.disabled = false;
      button.textContent = "Send invitation";
    }
  }

  async function removeWorker(userId, name) {
    if (!confirm(`Remove ${name} from this company? Their ShiftHQ account will not be deleted.`)) return;
    setActionMessage("Removing worker…", "info");
    try {
      await callWorkerApi("remove", { user_id: userId });
      setActionMessage(`${name} was removed.`, "success");
      await load();
      if (typeof loadLiveWorkers === "function") await loadLiveWorkers();
    } catch (error) {
      setActionMessage(error.message);
      alert(`Could not remove worker: ${error.message || String(error)}`);
    }
  }

  async function resendInvitation(id) {
    setActionMessage("Resending invitation…", "info");
    try {
      await callWorkerApi("resend", { invitation_id: id });
      setActionMessage("Invitation resent.", "success");
      await loadInvitations();
    } catch (error) {
      setActionMessage(error.message);
    }
  }

  async function cancelInvitation(id) {
    const invitation = invitations.find(item => item.id === id);
    if (!confirm(`Cancel the invitation for ${invitation?.email || "this worker"}?`)) return;
    setActionMessage("Cancelling invitation…", "info");
    try {
      await callWorkerApi("cancel", { invitation_id: id });
      setActionMessage("Invitation cancelled.", "success");
      await loadInvitations();
    } catch (error) {
      setActionMessage(error.message);
    }
  }

  document.addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-worker]");
    if (remove) removeWorker(remove.dataset.removeWorker, remove.dataset.workerName);
    const resend = event.target.closest("[data-resend-invite]");
    if (resend) resendInvitation(resend.dataset.resendInvite);
    const cancel = event.target.closest("[data-cancel-invite]");
    if (cancel) cancelInvitation(cancel.dataset.cancelInvite);
  });

  window.WorkerManagement = { load, renderMembers, sendInvitation, loadInvitations };
})();
