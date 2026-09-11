/* ============================================
   REPORTS
============================================ */

let reportRows = [];
let reportsInitialized = false;


/* ============================================
   INITIALIZE
============================================ */

function initializeReports() {

  if (reportsInitialized) {
    return;
  }

  const section =
    document.getElementById(
      "page-reports"
    );

  if (!section) {
    return;
  }

  reportsInitialized = true;

  section.innerHTML = `
    <div class="workersTop">

  <div>

    <div class="pageHeading">
      Reports
    </div>

    <div class="pageDescription">
      Review worked hours and performance across your team.
    </div>

  </div>

  <div style="display: flex; gap: 10px;">

    <button
      class="refreshButton"
      type="button"
      onclick="exportReportPDF()"
    >
      Export PDF
    </button>

    <button
      class="inviteButton"
      type="button"
      onclick="exportReportCSV()"
    >
      Export CSV
    </button>

  </div>

</div>

    <div class="sectionCard">

      <div class="timesheetFilters">

        <div class="filterField">

          <label for="reportStart">
            From
          </label>

          <input
            id="reportStart"
            type="date"
          >

        </div>


        <div class="filterField">

          <label for="reportEnd">
            To
          </label>

          <input
            id="reportEnd"
            type="date"
          >

        </div>


        <button
          id="loadReportsButton"
          class="refreshButton timesheetLoadButton"
          type="button"
        >
          Apply
        </button>

      </div>

    </div>


    <div class="timesheetStats">

      <div class="statCard">

        <div class="statLabel">
          Total worked
        </div>

        <div
          id="reportTotalWorked"
          class="timesheetStatValue"
        >
          00:00
        </div>

      </div>


      <div class="statCard">

        <div class="statLabel">
          Break time
        </div>

        <div
          id="reportTotalBreaks"
          class="timesheetStatValue"
        >
          00:00
        </div>

      </div>


      <div class="statCard">

        <div class="statLabel">
          Shifts
        </div>

        <div
          id="reportShiftCount"
          class="timesheetStatValue"
        >
          0
        </div>

      </div>


      <div class="statCard">

        <div class="statLabel">
          Average shift
        </div>

        <div
          id="reportAverageShift"
          class="timesheetStatValue"
        >
          00:00
        </div>

      </div>

    </div>


    <div class="sectionCard">

      <div class="sectionHeader">

        <div>

          <div class="sectionTitle">
            Worker breakdown
          </div>

          <div
            id="reportRangeText"
            class="sectionSubtitle"
          >
            —
          </div>

        </div>

      </div>


      <div class="timesheetTableWrap">

        <table class="timesheetTable">

          <thead>

            <tr>
              <th>Worker</th>
              <th>Shifts</th>
              <th>Total shift</th>
              <th>Break time</th>
              <th>Worked</th>
              <th>Avg worked</th>
            </tr>

          </thead>

          <tbody id="reportRows">

            <tr>

              <td
                colspan="6"
                class="tableEmpty"
              >
                Loading report…
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </div>
  `;

  document
    .getElementById(
      "loadReportsButton"
    )
    .addEventListener(
      "click",
      loadReports
    );

  initializeReportDates();

  loadReports();
}


/* ============================================
   DEFAULT DATES
============================================ */

function initializeReportDates() {

  const startInput =
    document.getElementById(
      "reportStart"
    );

  const endInput =
    document.getElementById(
      "reportEnd"
    );

  if (
    !startInput ||
    !endInput
  ) {
    return;
  }

  if (
    startInput.value &&
    endInput.value
  ) {
    return;
  }

  const today =
    new Date();

  const firstDay =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

  startInput.value =
    formatDateInput(
      firstDay
    );

  endInput.value =
    formatDateInput(
      today
    );
}


/* ============================================
   LOAD REPORT
============================================ */

async function loadReports() {

  if (!companyId) {
    return;
  }

  const startInput =
    document.getElementById(
      "reportStart"
    );

  const endInput =
    document.getElementById(
      "reportEnd"
    );

  const button =
    document.getElementById(
      "loadReportsButton"
    );

  const rows =
    document.getElementById(
      "reportRows"
    );

  if (
    !startInput ||
    !endInput ||
    !button ||
    !rows
  ) {
    return;
  }

  const start =
    startInput.value;

  const end =
    endInput.value;

  if (
    !start ||
    !end
  ) {

    rows.innerHTML = `
      <tr>
        <td
          colspan="6"
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
          colspan="6"
          class="tableEmpty"
        >
          The end date cannot be before the start date.
        </td>
      </tr>
    `;

    return;
  }

  button.disabled =
    true;

  button.textContent =
    "Loading…";

  rows.innerHTML = `
    <tr>
      <td
        colspan="6"
        class="tableEmpty"
      >
        Loading report…
      </td>
    </tr>
  `;

  updateReportRangeText(
    start,
    end
  );

  try {

    const {
      data,
      error
    } =
      await sb.rpc(
        "get_admin_report_summary",
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

    reportRows =
      Array.isArray(data)
        ? data
        : [];

    renderReportRows();

    updateReportStats();

  } catch (error) {

    console.error(
      "Reports:",
      error
    );

    reportRows = [];

    resetReportStats();

    rows.innerHTML = `
      <tr>
        <td
          colspan="6"
          class="tableEmpty"
        >
          Could not load report.
        </td>
      </tr>
    `;

  } finally {

    button.disabled =
      false;

    button.textContent =
      "Apply";
  }
}


/* ============================================
   RENDER WORKER BREAKDOWN
============================================ */

function renderReportRows() {

  const rows =
    document.getElementById(
      "reportRows"
    );

  if (!rows) {
    return;
  }

  if (!reportRows.length) {

    rows.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="tableEmpty"
        >
          No shifts found for this date range.
        </td>

      </tr>
    `;

    return;
  }

  rows.innerHTML =
    reportRows
      .map(
        worker => {

          const shifts =
            Number(
              worker.shift_count
            ) || 0;

          const totalShift =
            Number(
              worker.total_shift_seconds
            ) || 0;

          const breaks =
            Number(
              worker.total_break_seconds
            ) || 0;

          const worked =
            Number(
              worker.worked_seconds
            ) || 0;

          const averageWorked =
            shifts > 0
              ? Math.floor(
                  worked /
                  shifts
                )
              : 0;

          return `
            <tr>

              <td class="timesheetWorker">

                ${escapeHtml(
                  worker.worker_name ||
                  "Worker"
                )}

              </td>

              <td>
                ${escapeHtml(
                  String(
                    shifts
                  )
                )}
              </td>

              <td class="timesheetTime">

                ${escapeHtml(
                  formatHoursMinutes(
                    totalShift
                  )
                )}

              </td>

              <td class="timesheetTime">

                ${escapeHtml(
                  formatHoursMinutes(
                    breaks
                  )
                )}

              </td>

              <td class="timesheetWorked">

                ${escapeHtml(
                  formatHoursMinutes(
                    worked
                  )
                )}

              </td>

              <td class="timesheetTime">

                ${escapeHtml(
                  formatHoursMinutes(
                    averageWorked
                  )
                )}

              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* ============================================
   REPORT TOTALS
============================================ */

function updateReportStats() {

  let totalWorked = 0;
  let totalBreaks = 0;
  let totalShiftTime = 0;
  let shiftCount = 0;

  reportRows.forEach(
    worker => {

      totalWorked +=
        Number(
          worker.worked_seconds
        ) || 0;

      totalBreaks +=
        Number(
          worker.total_break_seconds
        ) || 0;

      totalShiftTime +=
        Number(
          worker.total_shift_seconds
        ) || 0;

      shiftCount +=
        Number(
          worker.shift_count
        ) || 0;
    }
  );

  const averageShift =
    shiftCount > 0
      ? Math.floor(
          totalShiftTime /
          shiftCount
        )
      : 0;

  const workedElement =
    document.getElementById(
      "reportTotalWorked"
    );

  const breaksElement =
    document.getElementById(
      "reportTotalBreaks"
    );

  const shiftsElement =
    document.getElementById(
      "reportShiftCount"
    );

  const averageElement =
    document.getElementById(
      "reportAverageShift"
    );

  if (workedElement) {

    workedElement.textContent =
      formatHoursMinutes(
        totalWorked
      );
  }

  if (breaksElement) {

    breaksElement.textContent =
      formatHoursMinutes(
        totalBreaks
      );
  }

  if (shiftsElement) {

    shiftsElement.textContent =
      String(
        shiftCount
      );
  }

  if (averageElement) {

    averageElement.textContent =
      formatHoursMinutes(
        averageShift
      );
  }
}


function resetReportStats() {

  const workedElement =
    document.getElementById(
      "reportTotalWorked"
    );

  const breaksElement =
    document.getElementById(
      "reportTotalBreaks"
    );

  const shiftsElement =
    document.getElementById(
      "reportShiftCount"
    );

  const averageElement =
    document.getElementById(
      "reportAverageShift"
    );

  if (workedElement) {
    workedElement.textContent =
      "00:00";
  }

  if (breaksElement) {
    breaksElement.textContent =
      "00:00";
  }

  if (shiftsElement) {
    shiftsElement.textContent =
      "0";
  }

  if (averageElement) {
    averageElement.textContent =
      "00:00";
  }
}


/* ============================================
   RANGE TEXT
============================================ */

function updateReportRangeText(
  start,
  end
) {

  const element =
    document.getElementById(
      "reportRangeText"
    );

  if (!element) {
    return;
  }

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
   REPORT NAVIGATION
============================================ */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        '.navButton[data-page="reports"]'
      );

    if (!button) {
      return;
    }

    setTimeout(
      () => {
        initializeReports();
      },
      0
    );
  }
);

/* ============================================
   CSV EXPORT
============================================ */

function exportReportCSV() {

  if (!reportRows.length) {
    window.alert(
      "There is no report data to export."
    );
    return;
  }

  const start =
    document.getElementById(
      "reportStart"
    )?.value || "";

  const end =
    document.getElementById(
      "reportEnd"
    )?.value || "";

  const csvRows = [
    [
      "Worker",
      "Shifts",
      "Total Shift",
      "Break Time",
      "Worked",
      "Average Worked"
    ]
  ];

  reportRows.forEach(worker => {

    const shifts =
      Number(
        worker.shift_count
      ) || 0;

    const totalShift =
      Number(
        worker.total_shift_seconds
      ) || 0;

    const totalBreak =
      Number(
        worker.total_break_seconds
      ) || 0;

    const worked =
      Number(
        worker.worked_seconds
      ) || 0;

    const averageWorked =
      shifts > 0
        ? Math.floor(
            worked / shifts
          )
        : 0;

    csvRows.push([
      worker.worker_name || "Worker",
      shifts,
      formatReportCSVTime(
        totalShift
      ),
      formatReportCSVTime(
        totalBreak
      ),
      formatReportCSVTime(
        worked
      ),
      formatReportCSVTime(
        averageWorked
      )
    ]);
  });

  const csv =
    csvRows
      .map(row =>
        row
          .map(
            csvEscapeValue
          )
          .join(",")
      )
      .join("\r\n");

  /*
    UTF-8 BOM helps Excel correctly
    recognise names containing characters
    such as æ, ø, å, etc.
  */

  const blob =
    new Blob(
      [
        "\uFEFF",
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  const companyName =
    (
      document.getElementById(
        "topCompanyName"
      )?.textContent ||
      "ShiftHQ"
    )
      .trim()
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  link.href =
    url;

  link.download =
    `${companyName || "ShiftHQ"}-report-${start || "start"}-${end || "end"}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );
}


function formatReportCSVTime(
  seconds
) {

  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const hours =
    Math.floor(
      safeSeconds / 3600
    );

  const minutes =
    Math.floor(
      (
        safeSeconds % 3600
      ) / 60
    );

  return (
    String(hours)
      .padStart(
        2,
        "0"
      )
    +
    ":"
    +
    String(minutes)
      .padStart(
        2,
        "0"
      )
  );
}


function csvEscapeValue(
  value
) {

  const text =
    String(
      value ?? ""
    );

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {

    return (
      '"' +
      text.replace(
        /"/g,
        '""'
      ) +
      '"'
    );
  }

  return text;
}

/* ============================================
   PDF EXPORT
============================================ */

function exportReportPDF() {

  if (!reportRows.length) {

    window.alert(
      "There is no report data to export."
    );

    return;
  }

  const start =
    document.getElementById(
      "reportStart"
    )?.value || "";

  const end =
    document.getElementById(
      "reportEnd"
    )?.value || "";

  const companyName =
    document.getElementById(
      "topCompanyName"
    )?.textContent?.trim()
    || "ShiftHQ";

  let totalWorked = 0;
  let totalBreaks = 0;
  let totalShiftTime = 0;
  let shiftCount = 0;

  reportRows.forEach(worker => {

    totalWorked +=
      Number(
        worker.worked_seconds
      ) || 0;

    totalBreaks +=
      Number(
        worker.total_break_seconds
      ) || 0;

    totalShiftTime +=
      Number(
        worker.total_shift_seconds
      ) || 0;

    shiftCount +=
      Number(
        worker.shift_count
      ) || 0;
  });

  const averageShift =
    shiftCount > 0
      ? Math.floor(
          totalShiftTime /
          shiftCount
        )
      : 0;


  const workerRows =
    reportRows
      .map(worker => {

        const shifts =
          Number(
            worker.shift_count
          ) || 0;

        const totalShift =
          Number(
            worker.total_shift_seconds
          ) || 0;

        const breakTime =
          Number(
            worker.total_break_seconds
          ) || 0;

        const worked =
          Number(
            worker.worked_seconds
          ) || 0;

        const averageWorked =
          shifts > 0
            ? Math.floor(
                worked /
                shifts
              )
            : 0;

        return `
          <tr>

            <td>
              ${escapeHtml(
                worker.worker_name ||
                "Worker"
              )}
            </td>

            <td>
              ${shifts}
            </td>

            <td>
              ${escapeHtml(
                formatHoursMinutes(
                  totalShift
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                formatHoursMinutes(
                  breakTime
                )
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  formatHoursMinutes(
                    worked
                  )
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                formatHoursMinutes(
                  averageWorked
                )
              )}
            </td>

          </tr>
        `;
      })
      .join("");


  const printWindow =
    window.open(
      "",
      "_blank"
    );

  if (!printWindow) {

    window.alert(
      "Your browser blocked the PDF window. Allow pop-ups for this site and try again."
    );

    return;
  }


  printWindow.document.write(`
    <!DOCTYPE html>

    <html lang="en">

    <head>

      <meta charset="UTF-8">

      <title>
        ${escapeHtml(companyName)} Report
      </title>

      <style>

        * {
          box-sizing: border-box;
        }

        @page {
          size: A4 landscape;
          margin: 14mm;
        }

        body {
          margin: 0;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Arial,
            sans-serif;

          color: #111827;
          background: #ffffff;
          font-size: 12px;
        }

        .report {
          width: 100%;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          padding-bottom: 18px;
          margin-bottom: 22px;
          border-bottom: 2px solid #111827;
        }

        .brand {
          font-size: 25px;
          font-weight: 800;
        }

        .pro {
          display: inline-block;
          margin-left: 7px;
          padding: 3px 6px;
          border: 1px solid #111827;
          border-radius: 5px;
          font-size: 9px;
          letter-spacing: 1px;
          vertical-align: middle;
        }

        .company {
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
        }

        .reportMeta {
          text-align: right;
        }

        .reportTitle {
          font-size: 20px;
          font-weight: 750;
        }

        .reportRange {
          margin-top: 5px;
          color: #64748b;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 26px;
        }

        .stat {
          padding: 15px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
        }

        .statLabel {
          margin-bottom: 7px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .statValue {
          font-size: 22px;
          font-weight: 800;
        }

        .sectionTitle {
          margin-bottom: 10px;
          font-size: 15px;
          font-weight: 750;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #dbe2ea;
        }

        th {
          padding: 10px;
          text-align: left;
          background: #f8fafc;
          border-bottom: 1px solid #dbe2ea;
          color: #64748b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 11px 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          color: #94a3b8;
          font-size: 9px;
        }

        @media print {

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

        }

      </style>

    </head>


    <body>

      <div class="report">

        <div class="header">

          <div>

            <div class="brand">
              ShiftHQ

              <span class="pro">
                PRO
              </span>
            </div>

            <div class="company">
              ${escapeHtml(companyName)}
            </div>

          </div>


          <div class="reportMeta">

            <div class="reportTitle">
              Work Report
            </div>

            <div class="reportRange">
              ${escapeHtml(
                formatReportDateRange(
                  start,
                  end
                )
              )}
            </div>

          </div>

        </div>


        <div class="stats">

          <div class="stat">

            <div class="statLabel">
              Total worked
            </div>

            <div class="statValue">
              ${escapeHtml(
                formatHoursMinutes(
                  totalWorked
                )
              )}
            </div>

          </div>


          <div class="stat">

            <div class="statLabel">
              Break time
            </div>

            <div class="statValue">
              ${escapeHtml(
                formatHoursMinutes(
                  totalBreaks
                )
              )}
            </div>

          </div>


          <div class="stat">

            <div class="statLabel">
              Shifts
            </div>

            <div class="statValue">
              ${shiftCount}
            </div>

          </div>


          <div class="stat">

            <div class="statLabel">
              Average shift
            </div>

            <div class="statValue">
              ${escapeHtml(
                formatHoursMinutes(
                  averageShift
                )
              )}
            </div>

          </div>

        </div>


        <div class="sectionTitle">
          Worker breakdown
        </div>


        <table>

          <thead>

            <tr>
              <th>Worker</th>
              <th>Shifts</th>
              <th>Total shift</th>
              <th>Break time</th>
              <th>Worked</th>
              <th>Avg worked</th>
            </tr>

          </thead>

          <tbody>
            ${workerRows}
          </tbody>

        </table>


        <div class="footer">

          <div>
            Generated by ShiftHQ PRO
          </div>

          <div>
            ${escapeHtml(
              new Date().toLocaleString()
            )}
          </div>

        </div>

      </div>


      <script>

        window.onload = function () {

          setTimeout(
            function () {
              window.print();
            },
            250
          );

        };

      <\/script>

    </body>

    </html>
  `);

  printWindow.document.close();
}


function formatReportDateRange(
  start,
  end
) {

  if (!start || !end) {
    return "";
  }

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

    return (
      start +
      " – " +
      end
    );
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

    return formatter.format(
      startDate
    );
  }

  return (
    formatter.format(
      startDate
    )
    +
    " – "
    +
    formatter.format(
      endDate
    )
  );
}
