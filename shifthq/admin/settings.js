/* ============================================
   SETTINGS
============================================ */

let settingsInitialized = false;


/* ============================================
   INITIALIZE
============================================ */

function initializeSettings() {

  if (settingsInitialized) {
    refreshSettingsValues();
    return;
  }

  const section =
    document.getElementById(
      "page-settings"
    );

  if (!section) {
    return;
  }

  settingsInitialized = true;

  section.innerHTML = `
    <div class="workersTop">

      <div>

        <div class="pageHeading">
          Settings
        </div>

        <div class="pageDescription">
          Manage your company, kiosk and account settings.
        </div>

      </div>

    </div>


    <!-- COMPANY SETTINGS -->

    <div class="sectionCard">

      <div class="sectionHeader">

        <div>

          <div class="sectionTitle">
            Company
          </div>

          <div class="sectionSubtitle">
            Your company information used throughout ShiftHQ PRO.
          </div>

        </div>

      </div>


      <div class="companyInfoGrid">

        <div class="infoBox">

          <div class="infoLabel">
            COMPANY NAME
          </div>

          <div
            id="settingsCompanyName"
            class="infoValue"
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
              font-size: 13px;
              word-break: break-all;
            "
          >
            —
          </div>

        </div>

      </div>

    </div>


    <!-- KIOSK SETTINGS -->

    <div class="sectionCard">

      <div class="sectionHeader">

        <div>

          <div class="sectionTitle">
            Kiosk
          </div>

          <div class="sectionSubtitle">
            Information workers use to connect to this company.
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
            style="font-size: 14px;"
          >
            rusticflight.com/shifthq/worker/
          </div>

        </div>

      </div>

    </div>


    <!-- ACCOUNT -->

    <div class="sectionCard">

      <div class="sectionHeader">

        <div>

          <div class="sectionTitle">
            Account
          </div>

          <div class="sectionSubtitle">
            The administrator currently signed in.
          </div>

        </div>

      </div>


      <div class="companyInfoGrid">

        <div class="infoBox">

          <div class="infoLabel">
            NAME
          </div>

          <div
            id="settingsAdminName"
            class="infoValue"
          >
            —
          </div>

        </div>


        <div class="infoBox">

          <div class="infoLabel">
            EMAIL
          </div>

          <div
            id="settingsAdminEmail"
            class="infoValue"
            style="font-size: 14px;"
          >
            —
          </div>

        </div>

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
            Administration and workforce management.
          </div>

        </div>

      </div>


      <div class="companyInfoGrid">

        <div class="infoBox">

          <div class="infoLabel">
            PRODUCT
          </div>

          <div class="infoValue">
            ShiftHQ PRO
          </div>

        </div>


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

      </div>

    </div>
  `;

  refreshSettingsValues();
}


/* ============================================
   REFRESH VALUES
============================================ */

function refreshSettingsValues() {

  const companyName =
    document.getElementById(
      "topCompanyName"
    )?.textContent?.trim()
    ||
    document.getElementById(
      "sidebarCompanyName"
    )?.textContent?.trim()
    ||
    "—";


  const kioskCode =
    document.getElementById(
      "dashboardCompanyCode"
    )?.textContent?.trim()
    ||
    "—";


  const adminName =
    document.getElementById(
      "adminName"
    )?.textContent?.trim()
    ||
    "Admin";


  const adminEmail =
    document.getElementById(
      "adminEmail"
    )?.textContent?.trim()
    ||
    "—";


  const companyNameElement =
    document.getElementById(
      "settingsCompanyName"
    );

  const companyIdElement =
    document.getElementById(
      "settingsCompanyId"
    );

  const kioskCodeElement =
    document.getElementById(
      "settingsKioskCode"
    );

  const adminNameElement =
    document.getElementById(
      "settingsAdminName"
    );

  const adminEmailElement =
    document.getElementById(
      "settingsAdminEmail"
    );


  if (companyNameElement) {
    companyNameElement.textContent =
      companyName;
  }


  if (companyIdElement) {
    companyIdElement.textContent =
      companyId || "—";
  }


  if (kioskCodeElement) {
    kioskCodeElement.textContent =
      kioskCode;
  }


  if (adminNameElement) {
    adminNameElement.textContent =
      adminName;
  }


  if (adminEmailElement) {
    adminEmailElement.textContent =
      adminEmail;
  }
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
