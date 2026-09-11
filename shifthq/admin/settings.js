/* ============================================
   SETTINGS
============================================ */

let settingsInitialized = false;
let settingsData = null;


/* ============================================
   INITIALIZE
============================================ */

function initializeSettings() {

  const section =
    document.getElementById(
      "page-settings"
    );

  if (!section) {
    return;
  }

  if (!settingsInitialized) {

    settingsInitialized = true;

    section.innerHTML = `
      <div class="workersTop">

        <div>

          <div class="pageHeading">
            Settings
          </div>

          <div class="pageDescription">
            Manage your company, kiosk and administrator account.
          </div>

        </div>

      </div>


      <!-- COMPANY -->

      <div class="sectionCard">

        <div class="sectionHeader">

          <div>

            <div class="sectionTitle">
              Company
            </div>

            <div class="sectionSubtitle">
              Company information shown throughout ShiftHQ PRO.
            </div>

          </div>

        </div>


        <div
          style="
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 18px;
            max-width: 650px;
          "
        >

          <div class="field">

            <label for="settingsCompanyNameInput">
              Company name
            </label>

            <input
              id="settingsCompanyNameInput"
              type="text"
              maxlength="100"
              placeholder="Company name"
            >

          </div>


          <div>

            <button
              id="saveCompanyNameButton"
              class="inviteButton"
              type="button"
            >
              Save company name
            </button>

          </div>


          <div
            id="settingsCompanyMessage"
            class="message"
          ></div>

        </div>

      </div>


      <!-- KIOSK -->

      <div class="sectionCard">

        <div class="sectionHeader">

          <div>

            <div class="sectionTitle">
              Kiosk
            </div>

            <div class="sectionSubtitle">
              Configure the shared worker clock-in terminal.
            </div>

          </div>

        </div>


        <div class="companyInfoGrid">

          <div class="infoBox">

            <div class="infoLabel">
              KIOSK CODE
            </div>

            <div
              id="settingsKioskCode"
              class="infoValue"
            >
              —
            </div>

          </div>


          <div class="infoBox">

            <div class="infoLabel">
              KIOSK ADDRESS
            </div>

            <div
              class="infoValue"
              style="
                font-size: 14px;
                word-break: break-all;
              "
            >
              https://rusticflight.com/shifthq/worker/
            </div>

          </div>

        </div>


        <div
          style="
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
          "
        >

          <button
            id="copyKioskCodeButton"
            class="refreshButton"
            type="button"
          >
            Copy code
          </button>


          <button
            id="copyKioskUrlButton"
            class="refreshButton"
            type="button"
          >
            Copy kiosk address
          </button>


          <button
            id="openKioskButton"
            class="refreshButton"
            type="button"
          >
            Open kiosk
          </button>


          <button
            id="regenerateKioskCodeButton"
            class="refreshButton"
            type="button"
          >
            Generate new code
          </button>

        </div>


        <div
          id="settingsKioskMessage"
          class="message"
          style="margin-top: 12px;"
        ></div>

      </div>


      <!-- ACCOUNT -->

      <div class="sectionCard">

        <div class="sectionHeader">

          <div>

            <div class="sectionTitle">
              Administrator account
            </div>

            <div class="sectionSubtitle">
              Information and security for your ShiftHQ PRO account.
            </div>

          </div>

        </div>


        <div class="companyInfoGrid">

          <div class="infoBox">

            <div class="infoLabel">
              EMAIL
            </div>

            <div
              id="settingsAdminEmail"
              class="infoValue"
              style="
                font-size: 14px;
                word-break: break-all;
              "
            >
              —
            </div>

          </div>


          <div class="infoBox">

            <div class="infoLabel">
              COMPANY ID
            </div>

            <div
              id="settingsCompanyId"
              class="infoValue"
              style="
                font-size: 12px;
                word-break: break-all;
              "
            >
              —
            </div>

          </div>

        </div>


        <div
          style="
            margin-top: 24px;
            max-width: 650px;
          "
        >

          <div
            class="sectionTitle"
            style="
              font-size: 15px;
              margin-bottom: 14px;
            "
          >
            Change password
          </div>


          <div
            style="
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
            "
          >

            <div class="field">

              <label for="settingsPassword">
                New password
              </label>

              <input
                id="settingsPassword"
                type="password"
                autocomplete="new-password"
                placeholder="New password"
              >

            </div>


            <div class="field">

              <label for="settingsPasswordConfirm">
                Confirm password
              </label>

              <input
                id="settingsPasswordConfirm"
                type="password"
                autocomplete="new-password"
                placeholder="Repeat password"
              >

            </div>

          </div>


          <button
            id="changePasswordButton"
            class="inviteButton"
            type="button"
            style="margin-top: 14px;"
          >
            Change password
          </button>


          <div
            id="settingsPasswordMessage"
            class="message"
            style="margin-top: 10px;"
          ></div>

        </div>

      </div>


      <!-- ABOUT -->

      <div class="sectionCard">

        <div class="sectionHeader">

          <div>

            <div class="sectionTitle">
              ShiftHQ PRO
            </div>

            <div class="sectionSubtitle">
              Workforce management and shared kiosk system.
            </div>

          </div>

        </div>


        <div class="companyInfoGrid">

          <div class="infoBox">

            <div class="infoLabel">
              ADMIN PORTAL
            </div>

            <div
              class="infoValue"
              style="font-size: 14px;"
            >
              rusticflight.com/shifthq/admin/
            </div>

          </div>


          <div class="infoBox">

            <div class="infoLabel">
              WORKER KIOSK
            </div>

            <div
              class="infoValue"
              style="font-size: 14px;"
            >
              rusticflight.com/shifthq/worker/
            </div>

          </div>

        </div>

      </div>
    `;


    document
      .getElementById(
        "saveCompanyNameButton"
      )
      ?.addEventListener(
        "click",
        saveCompanyName
      );


    document
      .getElementById(
        "copyKioskCodeButton"
      )
      ?.addEventListener(
        "click",
        copyKioskCode
      );


    document
      .getElementById(
        "copyKioskUrlButton"
      )
      ?.addEventListener(
        "click",
        copyKioskUrl
      );


    document
      .getElementById(
        "openKioskButton"
      )
      ?.addEventListener(
        "click",
        openKiosk
      );


    document
      .getElementById(
        "regenerateKioskCodeButton"
      )
      ?.addEventListener(
        "click",
        regenerateKioskCode
      );


    document
      .getElementById(
        "changePasswordButton"
      )
      ?.addEventListener(
        "click",
        changeAdminPassword
      );
  }


  loadSettings();
}


/* ============================================
   LOAD SETTINGS
============================================ */

async function loadSettings() {

  if (!companyId) {
    return;
  }

  const {
    data,
    error
  } =
    await sb.rpc(
      "get_admin_settings",
      {
        p_company_id:
          companyId
      }
    );


  if (error) {

    console.error(
      "Settings:",
      error
    );

    setSettingsMessage(
      "settingsCompanyMessage",
      "Could not load settings.",
      true
    );

    return;
  }


  const row =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!row) {
    return;
  }


  settingsData = row;


  const nameInput =
    document.getElementById(
      "settingsCompanyNameInput"
    );

  const codeElement =
    document.getElementById(
      "settingsKioskCode"
    );

  const companyIdElement =
    document.getElementById(
      "settingsCompanyId"
    );


  if (nameInput) {
    nameInput.value =
      row.company_name || "";
  }


  if (codeElement) {
    codeElement.textContent =
      row.company_code || "—";
  }


  if (companyIdElement) {
    companyIdElement.textContent =
      row.company_id || companyId;
  }


  const {
    data: userData
  } =
    await sb.auth.getUser();


  const emailElement =
    document.getElementById(
      "settingsAdminEmail"
    );


  if (emailElement) {

    emailElement.textContent =
      userData?.user?.email
      ||
      document.getElementById(
        "adminEmail"
      )?.textContent
      ||
      "—";
  }
}


/* ============================================
   SAVE COMPANY NAME
============================================ */

async function saveCompanyName() {

  const input =
    document.getElementById(
      "settingsCompanyNameInput"
    );

  const button =
    document.getElementById(
      "saveCompanyNameButton"
    );


  if (
    !input ||
    !button
  ) {
    return;
  }


  const name =
    input.value.trim();


  if (name.length < 2) {

    setSettingsMessage(
      "settingsCompanyMessage",
      "Enter a valid company name.",
      true
    );

    return;
  }


  button.disabled = true;
  button.textContent =
    "Saving…";


  try {

    const {
      error
    } =
      await sb.rpc(
        "admin_update_company_name",
        {
          p_company_id:
            companyId,

          p_name:
            name
        }
      );


    if (error) {
      throw error;
    }


    if (settingsData) {
      settingsData.company_name =
        name;
    }


    updateCompanyNameEverywhere(
      name
    );


    setSettingsMessage(
      "settingsCompanyMessage",
      "Company name saved.",
      false
    );

  } catch (error) {

    console.error(
      "Save company name:",
      error
    );

    setSettingsMessage(
      "settingsCompanyMessage",
      error.message ||
      "Could not save company name.",
      true
    );

  } finally {

    button.disabled = false;
    button.textContent =
      "Save company name";
  }
}


/* ============================================
   UPDATE NAME THROUGHOUT ADMIN
============================================ */

function updateCompanyNameEverywhere(
  name
) {

  const ids = [
    "sidebarCompanyName",
    "topCompanyName",
    "dashboardCompanyName"
  ];


  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        name;
    }
  });
}


/* ============================================
   COPY KIOSK CODE
============================================ */

async function copyKioskCode() {

  const code =
    settingsData?.company_code;


  if (!code) {
    return;
  }


  try {

    await navigator.clipboard.writeText(
      code
    );


    setSettingsMessage(
      "settingsKioskMessage",
      "Kiosk code copied.",
      false
    );

  } catch {

    setSettingsMessage(
      "settingsKioskMessage",
      "Could not copy the kiosk code.",
      true
    );
  }
}


/* ============================================
   COPY KIOSK URL
============================================ */

async function copyKioskUrl() {

  const url =
    "https://rusticflight.com/shifthq/worker/";


  try {

    await navigator.clipboard.writeText(
      url
    );


    setSettingsMessage(
      "settingsKioskMessage",
      "Kiosk address copied.",
      false
    );

  } catch {

    setSettingsMessage(
      "settingsKioskMessage",
      "Could not copy the kiosk address.",
      true
    );
  }
}


/* ============================================
   OPEN KIOSK
============================================ */

function openKiosk() {

  window.open(
    "https://rusticflight.com/shifthq/worker/",
    "_blank",
    "noopener"
  );
}


/* ============================================
   REGENERATE KIOSK CODE
============================================ */

async function regenerateKioskCode() {

  const confirmed =
    window.confirm(
      "Generate a new kiosk code?\n\nAny kiosk currently using the old code may need to be configured again."
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "regenerateKioskCodeButton"
    );


  if (!button) {
    return;
  }


  button.disabled = true;
  button.textContent =
    "Generating…";


  try {

    const {
      data,
      error
    } =
      await sb.rpc(
        "admin_regenerate_company_code",
        {
          p_company_id:
            companyId
        }
      );


    if (error) {
      throw error;
    }


    const code =
      typeof data === "string"
        ? data
        : String(data || "");


    if (settingsData) {
      settingsData.company_code =
        code;
    }


    const codeElement =
      document.getElementById(
        "settingsKioskCode"
      );


    if (codeElement) {
      codeElement.textContent =
        code;
    }


    const dashboardCode =
      document.getElementById(
        "dashboardCompanyCode"
      );


    if (dashboardCode) {
      dashboardCode.textContent =
        code;
    }


    setSettingsMessage(
      "settingsKioskMessage",
      "A new kiosk code was generated.",
      false
    );

  } catch (error) {

    console.error(
      "Regenerate kiosk code:",
      error
    );


    setSettingsMessage(
      "settingsKioskMessage",
      error.message ||
      "Could not generate a new kiosk code.",
      true
    );

  } finally {

    button.disabled = false;
    button.textContent =
      "Generate new code";
  }
}


/* ============================================
   CHANGE PASSWORD
============================================ */

async function changeAdminPassword() {

  const passwordInput =
    document.getElementById(
      "settingsPassword"
    );

  const confirmInput =
    document.getElementById(
      "settingsPasswordConfirm"
    );

  const button =
    document.getElementById(
      "changePasswordButton"
    );


  if (
    !passwordInput ||
    !confirmInput ||
    !button
  ) {
    return;
  }


  const password =
    passwordInput.value;

  const confirmation =
    confirmInput.value;


  if (password.length < 8) {

    setSettingsMessage(
      "settingsPasswordMessage",
      "Password must be at least 8 characters.",
      true
    );

    return;
  }


  if (password !== confirmation) {

    setSettingsMessage(
      "settingsPasswordMessage",
      "Passwords do not match.",
      true
    );

    return;
  }


  button.disabled = true;
  button.textContent =
    "Changing…";


  try {

    const {
      error
    } =
      await sb.auth.updateUser({
        password:
          password
      });


    if (error) {
      throw error;
    }


    passwordInput.value = "";
    confirmInput.value = "";


    setSettingsMessage(
      "settingsPasswordMessage",
      "Password changed successfully.",
      false
    );

  } catch (error) {

    console.error(
      "Change password:",
      error
    );


    setSettingsMessage(
      "settingsPasswordMessage",
      error.message ||
      "Could not change password.",
      true
    );

  } finally {

    button.disabled = false;
    button.textContent =
      "Change password";
  }
}


/* ============================================
   SETTINGS MESSAGE
============================================ */

function setSettingsMessage(
  elementId,
  message,
  isError
) {

  const element =
    document.getElementById(
      elementId
    );


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.style.color =
    isError
      ? "#dc2626"
      : "#15803d";
}


/* ============================================
   SETTINGS NAVIGATION
============================================ */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        '.navButton[data-page="settings"]'
      );


    if (!button) {
      return;
    }


    setTimeout(
      () => {
        initializeSettings();
      },
      0
    );
  }
);
