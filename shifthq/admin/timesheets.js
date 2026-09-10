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


/* ============================================
   ADD SHIFT BUTTON
============================================ */

function ensureAddShiftButton() {

  const applyButton =
    document.getElementById(
      "loadTimesheetsButton"
    );

  if (!applyButton) {
    return;
  }

  if (
    document.getElementById(
      "addShiftButton"
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "addShiftButton";

  button.type =
    "button";

  button.className =
    applyButton.className;

  button.textContent =
    "+ Add shift";

  button.style.marginLeft =
    "8px";

  button.onclick =
    openAddShiftModal;

  applyButton.insertAdjacentElement(
    "afterend",
    button
  );
}


/* ============================================
   LOAD TIMESHEETS
============================================ */

async function loadTimesheets() {

  if (!companyId) {
    return;
  }

  ensureAddShiftButton();

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


/* ============================================
   RENDER TIMESHEETS
============================================ */

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


/* ============================================
   TIMESHEET STATS
============================================ */

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


/* ============================================
   RANGE TEXT
============================================ */

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
   ADD SHIFT
============================================ */

function getAddShiftWorkers() {

  if (!Array.isArray(members)) {
    return [];
  }

  return members.filter(
    member => {

      const role =
        member.role ||
        member.member_role ||
        "";

      const active =
        member.active !== false;

      return (
        role === "worker" &&
        active
      );
    }
  );
}


function getMemberUserId(member) {

  return (
    member.user_id ||
    member.worker_id ||
    member.id ||
    ""
  );
}


function getMemberName(member) {

  return (
    member.full_name ||
    member.worker_name ||
    member.name ||
    member.email ||
    "Worker"
  );
}


function openAddShiftModal() {

  if (!companyId) {
    return;
  }

  closeAddShiftModal();

  const workers =
    getAddShiftWorkers();

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "addShiftModal";

  overlay.style.position =
    "fixed";

  overlay.style.inset =
    "0";

  overlay.style.zIndex =
    "9999";

  overlay.style.display =
    "flex";

  overlay.style.alignItems =
    "center";

  overlay.style.justifyContent =
    "center";

  overlay.style.padding =
    "20px";

  overlay.style.background =
    "rgba(15, 23, 34, 0.55)";

  overlay.onclick =
    event => {

      if (
        event.target === overlay
      ) {
        closeAddShiftModal();
      }
    };

  const workerOptions =
    workers.length
      ? workers
          .map(worker => {

            const workerId =
              getMemberUserId(
                worker
              );

            const workerName =
              getMemberName(
                worker
              );

            return `
              <option
                value="${escapeHtml(workerId)}"
              >
                ${escapeHtml(workerName)}
              </option>
            `;
          })
          .join("")
      : `
          <option value="">
            No active workers
          </option>
        `;

  overlay.innerHTML = `
    <div
      class="shiftEditForm"
      style="
        width: min(560px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        background: white;
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 24px 60px rgba(0,0,0,.22);
      "
    >

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:20px;
        "
      >

        <div>
          <div
            style="
              font-size:20px;
              font-weight:700;
            "
          >
            Add shift
          </div>

          <div
            style="
              margin-top:4px;
              font-size:13px;
              color:#64748b;
            "
          >
            Manually create a worker shift.
          </div>
        </div>

        <button
          type="button"
          class="shiftEditCancelButton"
          onclick="closeAddShiftModal()"
        >
          Close
        </button>

      </div>

      <div class="shiftEditField shiftEditFieldFull">

        <label for="addShiftWorker">
          Worker
        </label>

        <select
          id="addShiftWorker"
          ${workers.length ? "" : "disabled"}
          style="
            width:100%;
            min-height:42px;
          "
        >
          ${workerOptions}
        </select>

      </div>

      <div class="shiftEditField">

        <label for="addShiftClockIn">
          Clock in
        </label>

        <input
          id="addShiftClockIn"
          type="datetime-local"
        >

      </div>

      <div class="shiftEditField">

        <label for="addShiftClockOut">
          Clock out
        </label>

        <input
          id="addShiftClockOut"
          type="datetime-local"
        >

      </div>

      <div
        style="
          font-size:12px;
          color:#64748b;
          margin-top:-4px;
          margin-bottom:14px;
        "
      >
        Leave clock out empty to create an active shift.
      </div>

      <div class="shiftEditField shiftEditFieldFull">

        <label for="addShiftNote">
          Note
        </label>

        <textarea
          id="addShiftNote"
          rows="4"
          placeholder="Optional note"
        ></textarea>

      </div>

      <div
        id="addShiftMessage"
        class="message"
      ></div>

      <div class="shiftEditActions">

        <button
          type="button"
          class="shiftEditCancelButton"
          onclick="closeAddShiftModal()"
        >
          Cancel
        </button>

        <button
          id="saveAddShiftButton"
          type="button"
          class="shiftEditSaveButton"
          onclick="saveNewShift()"
          ${workers.length ? "" : "disabled"}
        >
          Add shift
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  setDefaultAddShiftTimes();
}


function setDefaultAddShiftTimes() {

  const clockInInput =
    document.getElementById(
      "addShiftClockIn"
    );

  const clockOutInput =
    document.getElementById(
      "addShiftClockOut"
    );

  if (
    !clockInInput ||
    !clockOutInput
  ) {
    return;
  }

  const now =
    new Date();

  now.setSeconds(
    0,
    0
  );

  const oneHourAgo =
    new Date(
      now.getTime() -
      60 * 60 * 1000
    );

  clockInInput.value =
    toDateTimeLocalValue(
      oneHourAgo
    );

  clockOutInput.value =
    toDateTimeLocalValue(
      now
    );
}


function closeAddShiftModal() {

  const modal =
    document.getElementById(
      "addShiftModal"
    );

  if (modal) {
    modal.remove();
  }
}


async function saveNewShift() {

  if (!companyId) {
    return;
  }

  const workerInput =
    document.getElementById(
      "addShiftWorker"
    );

  const clockInInput =
    document.getElementById(
      "addShiftClockIn"
    );

  const clockOutInput =
    document.getElementById(
      "addShiftClockOut"
    );

  const noteInput =
    document.getElementById(
      "addShiftNote"
    );

  const button =
    document.getElementById(
      "saveAddShiftButton"
    );

  if (
    !workerInput ||
    !clockInInput ||
    !clockOutInput ||
    !noteInput ||
    !button
  ) {
    return;
  }

  const workerId =
    workerInput.value;

  const clockInValue =
    clockInInput.value;

  const clockOutValue =
    clockOutInput.value;

  const note =
    noteInput.value.trim();

  if (!workerId) {

    showMessage(
      "addShiftMessage",
      "Choose a worker."
    );

    return;
  }

  if (!clockInValue) {

    showMessage(
      "addShiftMessage",
      "Clock in is required."
    );

    return;
  }

  const clockIn =
    new Date(
      clockInValue
    );

  const clockOut =
    clockOutValue
      ? new Date(
          clockOutValue
        )
      : null;

  if (
    Number.isNaN(
      clockIn.getTime()
    )
  ) {

    showMessage(
      "addShiftMessage",
      "Enter a valid clock in time."
    );

    return;
  }

  if (
    clockOut &&
    Number.isNaN(
      clockOut.getTime()
    )
  ) {

    showMessage(
      "addShiftMessage",
      "Enter a valid clock out time."
    );

    return;
  }

  if (
    clockOut &&
    clockOut <= clockIn
  ) {

    showMessage(
      "addShiftMessage",
      "Clock out must be after clock in."
    );

    return;
  }

  button.disabled = true;

  button.textContent =
    "Adding…";

  clearMessage(
    "addShiftMessage"
  );

  const {
    data,
    error
  } =
    await sb.rpc(
      "admin_add_shift",
      {
        p_company_id:
          companyId,

        p_worker_id:
          workerId,

        p_clock_in:
          clockIn.toISOString(),

        p_clock_out:
          clockOut
            ? clockOut.toISOString()
            : null,

        p_note:
          note || null
      }
    );

  if (error) {

    console.error(
      "Add shift:",
      error
    );

    showMessage(
      "addShiftMessage",
      error.message ||
        "Could not add shift."
    );

    button.disabled = false;

    button.textContent =
      "Add shift";

    return;
  }

  const newShiftId =
    Array.isArray(data)
      ? data[0]
      : data;

  closeAddShiftModal();

  await loadTimesheets();

  if (newShiftId) {

    await openShiftDetails(
      newShiftId
    );
  }
}


/* ============================================
   ESCAPE KEY
============================================ */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      document.getElementById(
        "addShiftModal"
      )
    ) {

      closeAddShiftModal();
    }
  }
);
