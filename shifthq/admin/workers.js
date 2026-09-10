    /* ============================================
       MEMBERS
    ============================================ */

    async function loadMembers() {

      if (!companyId) {
        return;
      }


      const {
        data,
        error
      } =
        await sb
          .from("company_members")
          .select(`
            id,
            user_id,
            role,
            active,
            joined_at,
            profiles (
              full_name,
              email
            )
          `)
          .eq(
            "company_id",
            companyId
          )
          .order(
            "joined_at",
            {
              ascending: true
            }
          );


      if (error) {

        console.error(
          "Members:",
          error
        );

        document.getElementById(
          "membersList"
        ).innerHTML = `
          <div class="emptyState">
            Could not load team members.
          </div>
        `;

        return;
      }


      members =
        Array.isArray(data)
          ? data
          : [];


      renderMembers();

    }


    function renderMembers() {

      const workers =
        members.filter(
          member =>
            member.role === "worker"
        );


      document.getElementById(
        "workerCountText"
      ).textContent =
        `${workers.length} worker${
          workers.length === 1
            ? ""
            : "s"
        }`;


      const container =
        document.getElementById(
          "membersList"
        );


      if (!workers.length) {

        container.innerHTML = `
          <div class="emptyState">
            No workers yet.
          </div>
        `;

        return;
      }


      container.innerHTML =
        workers
          .map(member => {

            const profile =
              member.profiles || {};


            const name =
              profile.full_name?.trim() ||
              "Worker";


            const email =
              profile.email ||
              "No email";


            return `
              <div class="memberRow">

                <div class="avatar">
                  ${escapeHtml(
                    initials(name)
                  )}
                </div>

                <div class="workerName">
                  ${escapeHtml(name)}
                </div>

                <div class="memberEmail">
                  ${escapeHtml(email)}
                </div>

                <div
                  class="${
                    member.active
                      ? "activePill"
                      : "inactivePill"
                  }"
                >
                  ${
                    member.active
                      ? "Active"
                      : "Inactive"
                  }
                </div>

              </div>
            `;

          })
          .join("");

    }


    /* ============================================
       INVITATIONS
    ============================================ */

    async function sendInvitation() {

      clearMessage(
        "inviteMessage"
      );


      const workerName =
        document
          .getElementById(
            "workerName"
          )
          .value
          .trim();


      const workerEmail =
        document
          .getElementById(
            "workerEmail"
          )
          .value
          .trim();


      const button =
        document.getElementById(
          "sendInviteButton"
        );


      if (!workerEmail) {

        showMessage(
          "inviteMessage",
          "Enter the worker's email address."
        );

        return;
      }


      if (!companyId) {

        showMessage(
          "inviteMessage",
          "No company is loaded."
        );

        return;
      }


      const {
        data: {
          session
        }
      } =
        await sb.auth.getSession();


      if (!session) {

        showMessage(
          "inviteMessage",
          "Your admin session has expired. Sign in again."
        );

        return;
      }


      button.disabled = true;

      button.textContent =
        "Sending…";


      showMessage(
        "inviteMessage",
        "Creating invitation…",
        "info"
      );


      try {

        const response =
          await fetch(
            SUPABASE_URL +
            "/functions/v1/invite-worker",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Authorization":
                  "Bearer " +
                  session.access_token,

                "apikey":
                  SUPABASE_PUBLISHABLE_KEY
              },

              body:
                JSON.stringify({
                  company_id:
                    companyId,

                  email:
                    workerEmail,

                  full_name:
                    workerName || null
                })
            }
          );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.error ||
            "Invitation failed."
          );

        }


        showMessage(
          "inviteMessage",
          "Invitation sent successfully.",
          "success"
        );


        document.getElementById(
          "workerName"
        ).value = "";


        document.getElementById(
          "workerEmail"
        ).value = "";


        await loadMembers();


      } catch (error) {

        showMessage(
          "inviteMessage",
          error.message ||
          "Invitation failed."
        );


      } finally {

        button.disabled = false;

        button.textContent =
          "Send invitation";

      }

    }


