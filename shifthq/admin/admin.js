const SUPABASE_URL =
      "https://diqxssqucdylekeexaxk.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_zWxqAQuOq2l_3mnj0T4Cnw_FUL9Yvqn";


    const sb =
      supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );


    let companyId = null;
    let company = null;

    let currentUser = null;

    let liveWorkers = [];
    let members = [];
    let timesheets = [];

    let liveLoadedAt =
      Date.now();

    let liveTimerInterval = null;

    let timesheetsInitialized = false;

    let selectedShiftId = null;
    let selectedShift = null;
    let selectedShiftBreaks = [];


    /* ============================================
       MESSAGES
    ============================================ */

    function showMessage(
      elementId,
      text,
      type = "error"
    ) {

      const element =
        document.getElementById(
          elementId
        );

      element.textContent =
        text;

      element.className =
        "message " + type;

    }


    function clearMessage(
      elementId
    ) {

      const element =
        document.getElementById(
          elementId
        );

      element.textContent = "";

      element.className =
        "message";

    }


    /* ============================================
       LOGIN
    ============================================ */

    async function login() {

      clearMessage(
        "loginMessage"
      );


      const email =
        document
          .getElementById("email")
          .value
          .trim();


      const password =
        document
          .getElementById("password")
          .value;


      const button =
        document.getElementById(
          "loginButton"
        );


      if (
        !email ||
        !password
      ) {

        showMessage(
          "loginMessage",
          "Enter your email and password."
        );

        return;
      }


      button.disabled = true;

      button.textContent =
        "Signing in…";


      const {
        data,
        error
      } =
        await sb.auth
          .signInWithPassword({
            email,
            password
          });


      button.disabled = false;

      button.textContent =
        "Sign in";


      if (error) {

        showMessage(
          "loginMessage",
          error.message
        );

        return;
      }


      await loadAdmin(
        data.user
      );

    }


    /* ============================================
       LOAD ADMIN COMPANY
    ============================================ */

    async function loadAdmin(user) {

      if (!user) {

        showLogin();

        return;
      }


      currentUser = user;


      const {
        data,
        error
      } =
        await sb
          .from("company_members")
          .select(`
            company_id,
            role,
            active,
            companies (
              id,
              name,
              company_code
            ),
            profiles (
              full_name,
              email
            )
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "role",
            "admin"
          )
          .eq(
            "active",
            true
          )
          .limit(1)
          .maybeSingle();


      if (error) {

        await sb.auth.signOut();

        showLogin();

        showMessage(
          "loginMessage",
          "Company access could not be loaded: " +
          error.message
        );

        return;
      }


      if (!data) {

        await sb.auth.signOut();

        showLogin();

        showMessage(
          "loginMessage",
          "This account is not an active company admin."
        );

        return;
      }


      companyId =
        data.company_id;


      company =
        data.companies;


      const profile =
        data.profiles || {};


      document.getElementById(
        "sidebarCompanyName"
      ).textContent =
        company?.name || "Company";


      document.getElementById(
        "topCompanyName"
      ).textContent =
        company?.name || "Company";


      document.getElementById(
        "dashboardCompanyName"
      ).textContent =
        company?.name || "Company";


      document.getElementById(
        "dashboardCompanyCode"
      ).textContent =
        company?.company_code || "—";


      document.getElementById(
        "adminName"
      ).textContent =
        profile.full_name?.trim() ||
        "Admin";


      document.getElementById(
        "adminEmail"
      ).textContent =
        profile.email ||
        user.email ||
        "";


      showAdmin();


      await Promise.all([
        loadLiveWorkers(),
        loadMembers()
      ]);

    }


    /* ============================================
       LIVE WORKFORCE
    ============================================ */

    async function loadLiveWorkers() {

      if (!companyId) {
        return;
      }


      const {
        data,
        error
      } =
        await sb.rpc(
          "get_admin_live_workers",
          {
            p_company_id:
              companyId
          }
        );


      if (error) {

        console.error(
          "Live workers:",
          error
        );

        document.getElementById(
          "liveWorkers"
        ).innerHTML = `
          <div class="emptyState">
            Could not load live workforce.
          </div>
        `;

        return;
      }


      liveWorkers =
        Array.isArray(data)
          ? data
          : [];


      liveLoadedAt =
        Date.now();


      renderLiveWorkers();

      updateStats();

      startLiveTimer();

    }


    function renderLiveWorkers() {

      const container =
        document.getElementById(
          "liveWorkers"
        );


      if (!liveWorkers.length) {

        container.innerHTML = `
          <div class="emptyState">
            No active workers found.
          </div>
        `;

        return;
      }


      container.innerHTML =
        liveWorkers
          .map(worker => {

            const status =
              normalizeStatus(
                worker.shift_status
              );


            let detail = "";


            if (
              status === "working" &&
              worker.clock_in
            ) {

              detail =
                "Clocked in " +
                formatClockTime(
                  worker.clock_in
                );

            } else if (
              status === "on_break" &&
              worker.break_start
            ) {

              detail =
                "Break started " +
                formatClockTime(
                  worker.break_start
                );

            } else {

              detail =
                worker.worker_email ||
                "Worker";

            }


            return `
              <div
                class="liveWorker"
                data-worker-id="${escapeHtml(
                  worker.worker_id
                )}"
              >

                <div class="avatar">
                  ${escapeHtml(
                    initials(
                      worker.worker_name
                    )
                  )}
                </div>

                <div class="workerPrimary">

                  <div class="workerName">
                    ${escapeHtml(
                      worker.worker_name
                    )}
                  </div>

                  <div class="workerDetail">
                    ${escapeHtml(detail)}
                  </div>

                </div>

                <div
                  class="statusPill ${status}"
                >

                  <span class="miniDot"></span>

                  ${escapeHtml(
                    formatStatus(status)
                  )}

                </div>

                <div class="workerTimer">

                  <div
                    class="timerValue"
                    data-live-timer
                  >
                    ${formatWorkerTimer(
                      worker
                    )}
                  </div>

                  <div class="timerLabel">
                    ${
                      status === "on_break"
                        ? "current break"
                        : status === "working"
                          ? "worked today"
                          : "not working"
                    }
                  </div>

                </div>

              </div>
            `;

          })
          .join("");

    }


    function updateStats() {

      let working = 0;
      let onBreak = 0;
      let off = 0;


      liveWorkers.forEach(
        worker => {

          const status =
            normalizeStatus(
              worker.shift_status
            );


          if (
            status === "working"
          ) {

            working += 1;

          } else if (
            status === "on_break"
          ) {

            onBreak += 1;

          } else {

            off += 1;

          }

        }
      );


      document.getElementById(
        "workingCount"
      ).textContent =
        working;


      document.getElementById(
        "breakCount"
      ).textContent =
        onBreak;


      document.getElementById(
        "offCount"
      ).textContent =
        off;

    }


    function startLiveTimer() {

      if (liveTimerInterval) {

        clearInterval(
          liveTimerInterval
        );

      }


      liveTimerInterval =
        setInterval(
          updateLiveTimers,
          1000
        );

    }


    function updateLiveTimers() {

      const elapsed =
        Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              liveLoadedAt
            ) / 1000
          )
        );


      liveWorkers.forEach(
        worker => {

          const row =
            document.querySelector(
              `[data-worker-id="${CSS.escape(
                worker.worker_id
              )}"]`
            );


          if (!row) {
            return;
          }


          const timer =
            row.querySelector(
              "[data-live-timer]"
            );


          if (!timer) {
            return;
          }


          const status =
            normalizeStatus(
              worker.shift_status
            );


          if (
            status === "working"
          ) {

            timer.textContent =
              formatTimer(
                (
                  Number(
                    worker.worked_seconds
                  ) || 0
                )
                +
                elapsed
              );

          } else if (
            status === "on_break"
          ) {

            timer.textContent =
              formatTimer(
                (
                  Number(
                    worker.current_break_seconds
                  ) || 0
                )
                +
                elapsed
              );

          } else {

            timer.textContent =
              "—";

          }

        }
      );

    }


    function formatWorkerTimer(
      worker
    ) {

      const status =
        normalizeStatus(
          worker.shift_status
        );


      if (
        status === "working"
      ) {

        return formatTimer(
          worker.worked_seconds
        );

      }


      if (
        status === "on_break"
      ) {

        return formatTimer(
          worker.current_break_seconds
        );

      }


      return "—";

    }


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


    /* ============================================
       TIMESHEETS
    ============================================ */

    function initializeTimesheetDates() {

      const startInput =
        document.getElementById(
          "timesheetStart"
        );

      const endInput =
        document.getElementById(
          "timesheetEnd"
        );


      if (
        startInput.value &&
        endInput.value
      ) {
        return;
      }


      const today =
        new Date();


      const monday =
        new Date(today);


      const day =
        monday.getDay();


      const difference =
        day === 0
          ? -6
          : 1 - day;


      monday.setDate(
        monday.getDate() +
        difference
      );


      startInput.value =
        formatDateInput(
          monday
        );


      endInput.value =
        formatDateInput(
          today
        );

    }


    async function loadTimesheets() {

      if (!companyId) {
        return;
      }


      initializeTimesheetDates();


      const start =
        document
          .getElementById(
            "timesheetStart"
          )
          .value;


      const end =
        document
          .getElementById(
            "timesheetEnd"
          )
          .value;


      const button =
        document.getElementById(
          "loadTimesheetsButton"
        );


      const rows =
        document.getElementById(
          "timesheetRows"
        );


      if (
        !start ||
        !end
      ) {

        rows.innerHTML = `
          <tr>
            <td
              colspan="8"
              class="tableEmpty"
            >
              Choose both a start and end date.
            </td>
          </tr>
        `;

        return;
      }


      if (end < start) {

        rows.innerHTML = `
          <tr>
            <td
              colspan="8"
              class="tableEmpty"
            >
              The end date cannot be before the start date.
            </td>
          </tr>
        `;

        return;
      }


      button.disabled = true;

      button.textContent =
        "Loading…";


      rows.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="tableEmpty"
          >
            Loading timesheets…
          </td>
        </tr>
      `;


      updateTimesheetRangeText(
        start,
        end
      );


      try {

        const {
          data,
          error
        } =
          await sb.rpc(
            "get_admin_timesheets",
            {
              p_company_id:
                companyId,

              p_start_date:
                start,

              p_end_date:
                end
            }
          );


        if (error) {

          throw error;

        }


        timesheets =
          Array.isArray(data)
            ? data
            : [];


        renderTimesheets();

        updateTimesheetStats();


      } catch (error) {

        console.error(
          "Timesheets:",
          error
        );


        timesheets = [];


        document.getElementById(
          "timesheetTotalWorked"
        ).textContent =
          "00:00";


        document.getElementById(
          "timesheetTotalBreaks"
        ).textContent =
          "00:00";


        document.getElementById(
          "timesheetShiftCount"
        ).textContent =
          "0";


        rows.innerHTML = `
          <tr>
            <td
              colspan="8"
              class="tableEmpty"
            >
              Could not load timesheets.
            </td>
          </tr>
        `;


      } finally {

        button.disabled = false;

        button.textContent =
          "Apply";

      }

    }


    function renderTimesheets() {

      const rows =
        document.getElementById(
          "timesheetRows"
        );


      if (!timesheets.length) {

        rows.innerHTML = `
          <tr>
            <td
              colspan="8"
              class="tableEmpty"
            >
              No shifts found for this date range.
            </td>
          </tr>
        `;

        return;
      }

      rows.innerHTML =
        timesheets
          .map(shift => {

            const breakCount =
              Number(
                shift.break_count
              ) || 0;


            const breakLabel =
              `${breakCount} ${
                breakCount === 1
                  ? "break"
                  : "breaks"
              }`;


            const statusHtml =
              shift.is_active
                ? `
                  <span class="activeShiftPill">
                    <span class="miniDot"></span>
                    Active
                  </span>
                `
                : `
                  <span class="completedShiftPill">
                    Completed
                  </span>
                `;


            return `
              <tr
                class="timesheetRow"
                data-shift-id="${escapeHtml(shift.shift_id)}"
                onclick="openShiftDetails('${escapeHtml(shift.shift_id)}')"
              >
                <td class="timesheetWorker">
                  ${escapeHtml(
                    shift.worker_name ||
                    "Worker"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    formatShiftDate(
                      shift.clock_in
                    )
                  )}
                </td>

                <td class="timesheetTime">
                  ${escapeHtml(
                    formatClockTime(
                      shift.clock_in
                    )
                  )}
                </td>

                <td class="timesheetTime">
                  ${escapeHtml(
                    shift.clock_out
                      ? formatClockTime(
                          shift.clock_out
                        )
                      : "—"
                  )}
                </td>

                <td class="timesheetBreaks">
                  ${escapeHtml(
                    breakLabel
                  )}
                </td>

                <td class="timesheetTime">
                  ${escapeHtml(
                    formatHoursMinutes(
                      shift.total_break_seconds
                    )
                  )}
                </td>

                <td class="timesheetWorked">
                  ${escapeHtml(
                    formatHoursMinutes(
                      shift.worked_seconds
                    )
                  )}
                </td>

                <td>
                  ${statusHtml}
                </td>

              </tr>
            `;

          })
          .join("");

    }


    function updateTimesheetStats() {

      let totalWorked = 0;

      let totalBreaks = 0;


      timesheets.forEach(
        shift => {

          totalWorked +=
            Number(
              shift.worked_seconds
            ) || 0;


          totalBreaks +=
            Number(
              shift.total_break_seconds
            ) || 0;

        }
      );


      document.getElementById(
        "timesheetTotalWorked"
      ).textContent =
        formatHoursMinutes(
          totalWorked
        );


      document.getElementById(
        "timesheetTotalBreaks"
      ).textContent =
        formatHoursMinutes(
          totalBreaks
        );


      document.getElementById(
        "timesheetShiftCount"
      ).textContent =
        String(
          timesheets.length
        );

    }


    function updateTimesheetRangeText(
      start,
      end
    ) {

      const element =
        document.getElementById(
          "timesheetRangeText"
        );


      const startDate =
        parseDateInput(
          start
        );


      const endDate =
        parseDateInput(
          end
        );


      if (
        !startDate ||
        !endDate
      ) {

        element.textContent =
          "—";

        return;
      }


      const formatter =
        new Intl.DateTimeFormat(
          undefined,
          {
            day: "numeric",
            month: "short",
            year: "numeric"
          }
        );


      if (start === end) {

  element.textContent =
    formatter.format(
      startDate
    );

  return;
}


element.textContent =
        formatter.format(
          startDate
        )
        +
        " – "
        +
        formatter.format(
          endDate
        );

    }


    /* ============================================
       NAVIGATION
    ============================================ */

    function showPage(pageName) {

      document
        .querySelectorAll(
          ".pageSection"
        )
        .forEach(section => {

          section.classList.remove(
            "active"
          );

        });


      const target =
        document.getElementById(
          "page-" + pageName
        );


      if (target) {

        target.classList.add(
          "active"
        );

      }


      document
        .querySelectorAll(
          ".navButton"
        )
        .forEach(button => {

          button.classList.toggle(
            "active",
            button.dataset.page ===
              pageName
          );

        });


      const titles = {
        dashboard: "Dashboard",
        workers: "Workers",
        timesheets: "Timesheets",
        reports: "Reports",
        settings: "Settings"
      };


      document.getElementById(
        "topPageTitle"
      ).textContent =
        titles[pageName] ||
        "ShiftHQ PRO";


      if (
        pageName === "dashboard"
      ) {

        loadLiveWorkers();

      }


      if (
        pageName === "workers"
      ) {

        loadMembers();

      }


      if (
        pageName === "timesheets"
      ) {

        initializeTimesheetDates();

        if (!timesheetsInitialized) {

          timesheetsInitialized =
            true;

          loadTimesheets();

        }

      }

    }


    document
      .querySelectorAll(
        ".navButton"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.page
            );

          }
        );

      });


    /* ============================================
       UTILITIES
    ============================================ */

    function normalizeStatus(
      status
    ) {

      if (
        status === "working" ||
        status === "on_break"
      ) {

        return status;

      }


      return "off";

    }


    function formatStatus(
      status
    ) {

      switch (
        normalizeStatus(status)
      ) {

        case "working":
          return "Working";

        case "on_break":
          return "On break";

        default:
          return "Clocked out";

      }

    }


    function initials(name) {

      return String(name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();

    }


    function formatClockTime(
      value
    ) {

      if (!value) {
        return "—";
      }


      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "—";

      }


      return date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    }


    function formatShiftDate(
      value
    ) {

      if (!value) {
        return "—";
      }


      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "—";

      }


      return date.toLocaleDateString(
        [],
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    }


    function formatTimer(
      seconds
    ) {

      const safe =
        Math.max(
          0,
          Math.floor(
            Number(seconds) || 0
          )
        );


      const hours =
        Math.floor(
          safe / 3600
        );


      const minutes =
        Math.floor(
          (safe % 3600) / 60
        );


      const secs =
        safe % 60;


      return (
        String(hours)
          .padStart(2, "0")
        + ":"
        + String(minutes)
          .padStart(2, "0")
        + ":"
        + String(secs)
          .padStart(2, "0")
      );

    }


    function formatHoursMinutes(
      seconds
    ) {

      const safe =
        Math.max(
          0,
          Math.floor(
            Number(seconds) || 0
          )
        );


      const hours =
        Math.floor(
          safe / 3600
        );


      const minutes =
        Math.floor(
          (safe % 3600) / 60
        );


      return (
        String(hours)
          .padStart(2, "0")
        + ":"
        + String(minutes)
          .padStart(2, "0")
      );

    }


    function formatDateInput(
      date
    ) {

      const year =
        date.getFullYear();


      const month =
        String(
          date.getMonth() + 1
        ).padStart(
          2,
          "0"
        );


      const day =
        String(
          date.getDate()
        ).padStart(
          2,
          "0"
        );


      return (
        year +
        "-" +
        month +
        "-" +
        day
      );

    }


    function parseDateInput(
      value
    ) {

      if (!value) {
        return null;
      }


      const parts =
        value
          .split("-")
          .map(Number);


      if (
        parts.length !== 3 ||
        parts.some(
          part =>
            !Number.isFinite(part)
        )
      ) {

        return null;

      }


      return new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

    }


    function escapeHtml(value) {

      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }


    /* ============================================
       APP STATE
    ============================================ */

    function showAdmin() {

      document.getElementById(
        "loginScreen"
      ).classList.add(
        "hidden"
      );


      document.getElementById(
        "adminApp"
      ).classList.remove(
        "hidden"
      );

    }


    function showLogin() {

      companyId = null;
      company = null;
      currentUser = null;

      liveWorkers = [];
      members = [];
      timesheets = [];

      timesheetsInitialized =
        false;


      if (liveTimerInterval) {

        clearInterval(
          liveTimerInterval
        );

        liveTimerInterval = null;

      }


      document.getElementById(
        "adminApp"
      ).classList.add(
        "hidden"
      );


      document.getElementById(
        "loginScreen"
      ).classList.remove(
        "hidden"
      );

    }


    async function logout() {

      await sb.auth.signOut();


      document.getElementById(
        "password"
      ).value = "";


      showLogin();


      showMessage(
        "loginMessage",
        "Signed out.",
        "success"
      );

    }


    async function checkExistingSession() {

      const {
        data: {
          session
        }
      } =
        await sb.auth.getSession();


      if (
        session?.user
      ) {

        await loadAdmin(
          session.user
        );

      }

    }


    /* ============================================
       EVENTS
    ============================================ */

    document.getElementById(
      "loginButton"
    ).addEventListener(
      "click",
      login
    );


    document.getElementById(
      "password"
    ).addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {

          login();

        }

      }
    );


    document.getElementById(
      "logoutButton"
    ).addEventListener(
      "click",
      logout
    );


    document.getElementById(
      "refreshLiveButton"
    ).addEventListener(
      "click",
      loadLiveWorkers
    );


    document.getElementById(
      "toggleInviteButton"
    ).addEventListener(
      "click",
      () => {

        document.getElementById(
          "inviteForm"
        ).classList.toggle(
          "hidden"
        );

      }
    );


    document.getElementById(
      "sendInviteButton"
    ).addEventListener(
      "click",
      sendInvitation
    );


    document.getElementById(
      "loadTimesheetsButton"
    ).addEventListener(
      "click",
      loadTimesheets
    );


    /* ============================================
       AUTO REFRESH
    ============================================ */

    setInterval(
      () => {

        if (
          companyId &&
          document.getElementById(
            "page-dashboard"
          ).classList.contains(
            "active"
          )
        ) {

          loadLiveWorkers();

        }

      },
      30000
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState !==
            "visible" ||
          !companyId
        ) {

          return;

        }


        if (
          document.getElementById(
            "page-dashboard"
          ).classList.contains(
            "active"
          )
        ) {

          loadLiveWorkers();

        }

      }
    );


    /* ============================================
       START
    ============================================ */

    checkExistingSession();
    async function openShiftDetails(shiftId) {

  const modal = document.getElementById("shiftDetailsModal");
  const content = document.getElementById("shiftDetailsContent");
  const workerElement = document.getElementById("shiftDetailsWorker");
  const editButton = document.getElementById("editShiftButton");

  selectedShiftId = shiftId;
  selectedShift = null;
  selectedShiftBreaks = [];

  if (editButton) {
    editButton.disabled = true;
    editButton.textContent = "Edit shift";
    editButton.onclick = startEditShift;
  }

  modal.classList.remove("hidden");
  workerElement.textContent = "Loading…";

  content.innerHTML = `
    <div class="emptyState">
      Loading shift…
    </div>
  `;

  const { data, error } = await sb.rpc(
    "get_admin_shift_details",
    {
      p_shift_id: shiftId
    }
  );

  if (error || !Array.isArray(data) || data.length === 0) {

    console.error("Shift details error:", error);

    workerElement.textContent = "Could not load shift";

    content.innerHTML = `
      <div class="emptyState">
        Could not load shift details.
      </div>
    `;

    return;
  }

  const shift = data[0];

  selectedShift = shift;

  if (editButton) {
    editButton.disabled = false;
  }

  const breaks = data.filter(
    row => row.break_id
  );

  selectedShiftBreaks = breaks;

  workerElement.textContent =
    shift.worker_name || "Worker";

  const shiftStart =
    new Date(shift.clock_in).getTime();

  const shiftEnd =
    shift.clock_out
      ? new Date(shift.clock_out).getTime()
      : Date.now();

  const totalShiftSeconds =
    Math.max(
      0,
      Math.floor((shiftEnd - shiftStart) / 1000)
    );

  const totalBreakSeconds =
    breaks.reduce(
      (total, breakItem) => {

        const breakStart =
          new Date(breakItem.break_start).getTime();

        const breakEnd =
          breakItem.break_end
            ? new Date(breakItem.break_end).getTime()
            : Date.now();

        return total + Math.max(
          0,
          Math.floor((breakEnd - breakStart) / 1000)
        );
      },
      0
    );

  const workedSeconds =
    Math.max(
      0,
      totalShiftSeconds - totalBreakSeconds
    );

  const breaksHtml =
    breaks.length
      ? breaks.map(
          (breakItem, index) => {

            const breakStart =
              new Date(breakItem.break_start).getTime();

            const breakEnd =
              breakItem.break_end
                ? new Date(breakItem.break_end).getTime()
                : Date.now();

            const duration =
              Math.max(
                0,
                Math.floor((breakEnd - breakStart) / 1000)
              );

            return `
              <div
                class="shiftBreakRow"
                id="shiftBreakRow-${escapeHtml(breakItem.break_id)}"
              >

                <div>
                  <div class="shiftBreakTime">
                    Break ${index + 1}
                  </div>

                  <div class="shiftBreakDuration">
                    ${escapeHtml(formatClockTime(breakItem.break_start))}
                    –
                    ${
                      breakItem.break_end
                        ? escapeHtml(formatClockTime(breakItem.break_end))
                        : "Active"
                    }
                  </div>
                </div>

                <div>
                  <div class="shiftBreakTime">
                    ${escapeHtml(formatHoursMinutes(duration))}
                  </div>

                  <button
                    class="shiftEditButton"
                    type="button"
                    onclick="startEditBreak('${escapeHtml(breakItem.break_id)}')"
                  >
                    Edit
                  </button>
                </div>

              </div>
            `;
          }
        ).join("")
      : `
          <div class="shiftDetailEmpty">
            No breaks recorded.
          </div>
        `;

  content.innerHTML = `

    <div class="shiftDetailGrid">

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Date</div>
        <div class="shiftDetailValue">
          ${escapeHtml(formatShiftDate(shift.clock_in))}
        </div>
      </div>

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Status</div>
        <div class="shiftDetailValue">
          ${shift.is_active ? "Active" : "Completed"}
        </div>
      </div>

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Clock in</div>
        <div class="shiftDetailValue">
          ${escapeHtml(formatClockTime(shift.clock_in))}
        </div>
      </div>

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Clock out</div>
        <div class="shiftDetailValue">
          ${
            shift.clock_out
              ? escapeHtml(formatClockTime(shift.clock_out))
              : "Still working"
          }
        </div>
      </div>

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Total shift</div>
        <div class="shiftDetailValue">
          ${escapeHtml(formatHoursMinutes(totalShiftSeconds))}
        </div>
      </div>

      <div class="shiftDetailBox">
        <div class="shiftDetailLabel">Worked</div>
        <div class="shiftDetailValue">
          ${escapeHtml(formatHoursMinutes(workedSeconds))}
        </div>
      </div>

    </div>

    <div class="shiftDetailSection">

      <div class="shiftDetailSectionTitle">
        Breaks · ${breaks.length}
      </div>

      ${breaksHtml}

      <div class="shiftBreakRow">

        <div class="shiftBreakTime">
          Total break time
        </div>

        <div class="shiftBreakTime">
          ${escapeHtml(formatHoursMinutes(totalBreakSeconds))}
        </div>

      </div>

    </div>

    <div class="shiftDetailSection">

      <div class="shiftDetailSectionTitle">
        Note
      </div>

      <div class="shiftNoteBox">
        ${
          shift.note
            ? escapeHtml(shift.note)
            : "No note"
        }
      </div>

    </div>

  `;
}


function toDateTimeLocalValue(value) {

  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}


function startEditShift() {

  if (!selectedShift || !selectedShiftId) {
    return;
  }

  const content =
    document.getElementById("shiftDetailsContent");

  const editButton =
    document.getElementById("editShiftButton");

  if (editButton) {
    editButton.disabled = true;
  }

  content.innerHTML = `
    <div class="shiftEditForm">
      <div class="shiftEditField">
        <label for="editShiftClockIn">Clock in</label>
        <input
          id="editShiftClockIn"
          type="datetime-local"
          value="${escapeHtml(toDateTimeLocalValue(selectedShift.clock_in))}"
        >
      </div>

      <div class="shiftEditField">
        <label for="editShiftClockOut">Clock out</label>
        <input
          id="editShiftClockOut"
          type="datetime-local"
          value="${escapeHtml(toDateTimeLocalValue(selectedShift.clock_out))}"
        >
      </div>

      <div class="shiftEditField shiftEditFieldFull">
        <label for="editShiftNote">Note</label>
        <textarea
          id="editShiftNote"
          rows="4"
          placeholder="No note"
        >${escapeHtml(selectedShift.note || "")}</textarea>
      </div>

      <div id="editShiftMessage" class="message"></div>

      <div class="shiftEditActions">
        <button
          class="shiftEditCancelButton"
          type="button"
          onclick="cancelEditShift()"
        >
          Cancel
        </button>

        <button
          id="saveShiftButton"
          class="shiftEditSaveButton"
          type="button"
          onclick="saveShiftChanges()"
        >
          Save changes
        </button>
      </div>
    </div>
  `;
}


async function cancelEditShift() {

  if (selectedShiftId) {
    await openShiftDetails(selectedShiftId);
  }
}


async function saveShiftChanges() {

  if (!selectedShiftId) {
    return;
  }

  const clockInValue =
    document.getElementById("editShiftClockIn").value;

  const clockOutValue =
    document.getElementById("editShiftClockOut").value;

  const note =
    document.getElementById("editShiftNote").value.trim();

  const button =
    document.getElementById("saveShiftButton");

  if (!clockInValue) {
    showMessage("editShiftMessage", "Clock in is required.");
    return;
  }

  const clockIn = new Date(clockInValue);
  const clockOut = clockOutValue ? new Date(clockOutValue) : null;

  if (clockOut && clockOut <= clockIn) {
    showMessage(
      "editShiftMessage",
      "Clock out must be after clock in."
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";
  clearMessage("editShiftMessage");

  const { error } = await sb.rpc(
    "admin_update_shift",
    {
      p_shift_id: selectedShiftId,
      p_clock_in: clockIn.toISOString(),
      p_clock_out: clockOut ? clockOut.toISOString() : null,
      p_note: note || null
    }
  );

  if (error) {
    console.error("Update shift:", error);
    showMessage("editShiftMessage", error.message || "Could not save shift.");
    button.disabled = false;
    button.textContent = "Save changes";
    return;
  }

  await loadTimesheets();
  await openShiftDetails(selectedShiftId);
}


function startEditBreak(breakId) {

  if (!selectedShift || !selectedShiftId) {
    return;
  }

  const breakItem = selectedShiftBreaks.find(
    item => item.break_id === breakId
  );

  const row = document.getElementById(
    `shiftBreakRow-${breakId}`
  );

  if (!breakItem || !row) {
    return;
  }

  document
    .querySelectorAll(".shiftBreakRow .shiftEditButton")
    .forEach(button => {
      button.disabled = true;
    });

  row.innerHTML = `
    <div class="shiftEditForm">
      <div class="shiftEditField">
        <label for="editBreakStart-${escapeHtml(breakId)}">
          Break start
        </label>
        <input
          id="editBreakStart-${escapeHtml(breakId)}"
          type="datetime-local"
          value="${escapeHtml(toDateTimeLocalValue(breakItem.break_start))}"
        >
      </div>

      <div class="shiftEditField">
        <label for="editBreakEnd-${escapeHtml(breakId)}">
          Break end
        </label>
        <input
          id="editBreakEnd-${escapeHtml(breakId)}"
          type="datetime-local"
          value="${escapeHtml(toDateTimeLocalValue(breakItem.break_end))}"
        >
      </div>

      <div
        id="editBreakMessage-${escapeHtml(breakId)}"
        class="message"
      ></div>

      <div class="shiftEditActions">
        <button
          class="shiftEditCancelButton"
          type="button"
          onclick="cancelEditBreak()"
        >
          Cancel
        </button>

        <button
          id="saveBreakButton-${escapeHtml(breakId)}"
          class="shiftEditSaveButton"
          type="button"
          onclick="saveBreakChanges('${escapeHtml(breakId)}')"
        >
          Save
        </button>
      </div>
    </div>
  `;
}


async function cancelEditBreak() {

  if (selectedShiftId) {
    await openShiftDetails(selectedShiftId);
  }
}


async function saveBreakChanges(breakId) {

  if (!selectedShiftId || !selectedShift) {
    return;
  }

  const breakItem = selectedShiftBreaks.find(
    item => item.break_id === breakId
  );

  if (!breakItem) {
    return;
  }

  const startInput = document.getElementById(
    `editBreakStart-${breakId}`
  );

  const endInput = document.getElementById(
    `editBreakEnd-${breakId}`
  );

  const button = document.getElementById(
    `saveBreakButton-${breakId}`
  );

  const messageId = `editBreakMessage-${breakId}`;
  const startValue = startInput.value;
  const endValue = endInput.value;

  if (!startValue) {
    showMessage(messageId, "Break start is required.");
    return;
  }

  const breakStart = new Date(startValue);
  const breakEnd = endValue ? new Date(endValue) : null;

  if (Number.isNaN(breakStart.getTime())) {
    showMessage(messageId, "Enter a valid break start.");
    return;
  }

  if (breakEnd && Number.isNaN(breakEnd.getTime())) {
    showMessage(messageId, "Enter a valid break end.");
    return;
  }

  if (breakEnd && breakEnd <= breakStart) {
    showMessage(messageId, "Break end must be after break start.");
    return;
  }

  const mayRemainActive =
    selectedShift.is_active && !breakItem.break_end;

  if (!breakEnd && !mayRemainActive) {
    showMessage(
      messageId,
      "Break end is required unless this is the active break on an active shift."
    );
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";
  clearMessage(messageId);

  const shiftId = selectedShiftId;

  const { error } = await sb.rpc(
    "admin_update_break",
    {
      p_break_id: breakId,
      p_break_start: breakStart.toISOString(),
      p_break_end: breakEnd ? breakEnd.toISOString() : null
    }
  );

  if (error) {
    console.error("Update break:", error);
    showMessage(messageId, error.message || "Could not save break.");
    button.disabled = false;
    button.textContent = "Save";
    return;
  }

  await loadTimesheets();
  await openShiftDetails(shiftId);
}


function closeShiftDetails() {

  const modal =
    document.getElementById("shiftDetailsModal");

  modal.classList.add("hidden");

  selectedShiftId = null;
  selectedShift = null;
  selectedShiftBreaks = [];
}
