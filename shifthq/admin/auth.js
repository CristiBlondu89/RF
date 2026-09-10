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


