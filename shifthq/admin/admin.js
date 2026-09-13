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
       BOOTSTRAP
    ============================================ */

    function initializeAdminApp() {
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

    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeAdminApp);
    } else {
      initializeAdminApp();
    }
