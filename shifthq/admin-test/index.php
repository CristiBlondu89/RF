<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShiftHQ PRO – Admin Test</title>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f3f5f8;
      color: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      width: 100%;
      max-width: 430px;
      background: white;
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
    }

    h1 {
      margin: 0 0 4px;
      font-size: 34px;
    }

    .subtitle {
      margin: 0 0 28px;
      color: #777;
      font-size: 17px;
    }

    label {
      display: block;
      margin: 16px 0 7px;
      font-weight: 600;
    }

    input {
      width: 100%;
      padding: 14px 15px;
      border: 1px solid #d5d8dd;
      border-radius: 12px;
      font-size: 16px;
      outline: none;
    }

    input:focus {
      border-color: #111;
    }

    button {
      width: 100%;
      margin-top: 20px;
      padding: 15px;
      border: 0;
      border-radius: 12px;
      background: #111;
      color: white;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.6;
    }

    .message {
      margin-top: 18px;
      padding: 13px;
      border-radius: 12px;
      display: none;
      line-height: 1.4;
    }

    .error {
      display: block;
      background: #fdecec;
      color: #a12622;
    }

    .success {
      display: block;
      background: #e9f8ee;
      color: #176b34;
    }

    .company {
      margin-top: 20px;
      padding: 16px;
      border-radius: 14px;
      background: #f4f5f7;
      display: none;
    }

    .company strong {
      display: block;
      font-size: 18px;
      margin-bottom: 5px;
    }

    .logout {
      background: #eceef1;
      color: #111;
      margin-top: 12px;
    }

    #dashboard {
      display: none;
    }
  </style>
</head>

<body>

  <div class="card">

    <div id="loginView">
      <h1>ShiftHQ PRO</h1>
      <p class="subtitle">Admin Test</p>

      <label for="email">Email</label>
      <input
        id="email"
        type="email"
        placeholder="admin@example.com"
        autocomplete="email"
      >

      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      >

      <button id="loginButton" onclick="login()">
        Sign in
      </button>

      <div id="loginMessage" class="message"></div>
    </div>


    <div id="dashboard">
      <h1>ShiftHQ PRO</h1>
      <p class="subtitle">Admin Dashboard</p>

      <div id="companyBox" class="company">
        <strong id="companyName">Company</strong>
        <div>
          Company code:
          <span id="companyCode">—</span>
        </div>
        <div>
          Role:
          <span id="userRole">—</span>
        </div>
      </div>

      <div id="dashboardMessage" class="message"></div>

      <button class="logout" onclick="logout()">
        Sign out
      </button>
    </div>

  </div>


  <script>
    const SUPABASE_URL =
      "https://diqxssqucdylekeexaxk.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_zWxqAQuOq2l_3mnj0T4Cnw_FUL9Yvqn";

    const sb = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );


    function showMessage(elementId, text, type = "error") {
      const element = document.getElementById(elementId);

      element.textContent = text;
      element.className = "message " + type;
    }


    function clearMessage(elementId) {
      const element = document.getElementById(elementId);

      element.textContent = "";
      element.className = "message";
    }


    async function login() {
      clearMessage("loginMessage");

      const email =
        document.getElementById("email").value.trim();

      const password =
        document.getElementById("password").value;

      const button =
        document.getElementById("loginButton");

      if (!email || !password) {
        showMessage(
          "loginMessage",
          "Enter your email and password."
        );
        return;
      }

      button.disabled = true;
      button.textContent = "Signing in…";

      const { data, error } =
        await sb.auth.signInWithPassword({
          email,
          password
        });

      button.disabled = false;
      button.textContent = "Sign in";

      if (error) {
        showMessage(
          "loginMessage",
          error.message
        );
        return;
      }

      await loadDashboard(data.user);
    }


    async function loadDashboard(user) {
      if (!user) {
        showLogin();
        return;
      }

      const { data, error } = await sb
        .from("company_members")
        .select(`
          role,
          active,
          companies (
            id,
            name,
            company_code
          )
        `)
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        showMessage(
          "loginMessage",
          "Signed in, but company access could not be loaded: " +
          error.message
        );

        await sb.auth.signOut();
        return;
      }

      if (!data) {
        showMessage(
          "loginMessage",
          "Your account is not assigned to an active company."
        );

        await sb.auth.signOut();
        return;
      }

      if (data.role !== "admin") {
        showMessage(
          "loginMessage",
          "This account does not have admin access."
        );

        await sb.auth.signOut();
        return;
      }

      document.getElementById("loginView").style.display =
        "none";

      document.getElementById("dashboard").style.display =
        "block";

      document.getElementById("companyBox").style.display =
        "block";

      document.getElementById("companyName").textContent =
        data.companies?.name || "Company";

      document.getElementById("companyCode").textContent =
        data.companies?.company_code || "—";

      document.getElementById("userRole").textContent =
        data.role || "—";
    }


    function showLogin() {
      document.getElementById("dashboard").style.display =
        "none";

      document.getElementById("loginView").style.display =
        "block";
    }


    async function logout() {
      await sb.auth.signOut();
      showLogin();

      document.getElementById("password").value = "";

      showMessage(
        "loginMessage",
        "Signed out.",
        "success"
      );
    }


    async function checkExistingSession() {
      const {
        data: { session }
      } = await sb.auth.getSession();

      if (session?.user) {
        await loadDashboard(session.user);
      }
    }


    document
      .getElementById("password")
      .addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
          login();
        }
      });


    checkExistingSession();
  </script>

</body>
</html>