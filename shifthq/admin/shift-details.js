/* ============================================
   SHIFT DETAILS
============================================ */

async function openShiftDetails(shiftId) {

  const modal =
    document.getElementById(
      "shiftDetailsModal"
    );

  const content =
    document.getElementById(
      "shiftDetailsContent"
    );

  const workerElement =
    document.getElementById(
      "shiftDetailsWorker"
    );

  const editButton =
    document.getElementById(
      "editShiftButton"
    );

  selectedShiftId = shiftId;
  selectedShift = null;
  selectedShiftBreaks = [];

  ensureDeleteShiftButton();

  const deleteButton =
    document.getElementById(
      "deleteShiftButton"
    );

  if (editButton) {
    editButton.disabled = true;
    editButton.textContent = "Edit shift";
    editButton.onclick = startEditShift;
  }

  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.textContent = "Delete shift";
  }

  modal.classList.remove(
    "hidden"
  );

  workerElement.textContent =
    "Loading…";

  content.innerHTML = `
    <div class="emptyState">
      Loading shift…
    </div>
  `;

  const {
    data,
    error
  } =
    await sb.rpc(
      "get_admin_shift_details",
      {
        p_shift_id:
          shiftId
      }
    );

  if (
    error ||
    !Array.isArray(data) ||
    data.length === 0
  ) {

    console.error(
      "Shift details error:",
      error
    );

    workerElement.textContent =
      "Could not load shift";

    content.innerHTML = `
      <div class="emptyState">
        Could not load shift details.
      </div>
    `;

    return;
  }

  const shift =
    data[0];

  selectedShift =
    shift;

  if (editButton) {
    editButton.disabled = false;
  }

  if (deleteButton) {
    deleteButton.disabled = false;
  }

  const breaks =
    data.filter(
      row =>
        row.break_id
    );

  selectedShiftBreaks =
    breaks;

  workerElement.textContent =
    shift.worker_name ||
    "Worker";

  const shiftStart =
    new Date(
      shift.clock_in
    ).getTime();

  const shiftEnd =
    shift.clock_out
      ? new Date(
          shift.clock_out
        ).getTime()
      : Date.now();

  const totalShiftSeconds =
    Math.max(
      0,
      Math.floor(
        (
          shiftEnd -
          shiftStart
        ) / 1000
      )
    );

  const totalBreakSeconds =
    breaks.reduce(
      (
        total,
        breakItem
      ) => {

        const breakStart =
          new Date(
            breakItem.break_start
          ).getTime();

        const breakEnd =
          breakItem.break_end
            ? new Date(
                breakItem.break_end
              ).getTime()
            : Date.now();

        return (
          total +
          Math.max(
            0,
            Math.floor(
              (
                breakEnd -
                breakStart
              ) / 1000
            )
          )
        );
      },
      0
    );

  const workedSeconds =
    Math.max(
      0,
      totalShiftSeconds -
      totalBreakSeconds
    );

  const breaksHtml =
    breaks.length
      ? breaks
          .map(
            (
              breakItem,
              index
            ) => {

              const breakStart =
                new Date(
                  breakItem.break_start
                ).getTime();

              const breakEnd =
                breakItem.break_end
                  ? new Date(
                      breakItem.break_end
                    ).getTime()
                  : Date.now();

              const duration =
                Math.max(
                  0,
                  Math.floor(
                    (
                      breakEnd -
                      breakStart
                    ) / 1000
                  )
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

                      ${escapeHtml(
                        formatClockTime(
                          breakItem.break_start
                        )
                      )}

                      –

                      ${
                        breakItem.break_end
                          ? escapeHtml(
                              formatClockTime(
                                breakItem.break_end
                              )
                            )
                          : "Active"
                      }

                    </div>

                  </div>

                  <div>

                    <div class="shiftBreakTime">

                      ${escapeHtml(
                        formatHoursMinutes(
                          duration
                        )
                      )}

                    </div>

                    <div class="shiftBreakActions">

                      <button
                        class="shiftEditButton"
                        type="button"
                        onclick="startEditBreak('${escapeHtml(breakItem.break_id)}')"
                      >
                        Edit
                      </button>

                      <button
                        id="deleteBreakButton-${escapeHtml(breakItem.break_id)}"
                        class="shiftEditButton shiftDeleteButton"
                        type="button"
                        onclick="deleteBreak('${escapeHtml(breakItem.break_id)}')"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              `;
            }
          )
          .join("")
      : `
          <div class="shiftDetailEmpty">
            No breaks recorded.
          </div>
        `;

  content.innerHTML = `

    <div class="shiftDetailGrid">

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Date
        </div>

        <div class="shiftDetailValue">
          ${escapeHtml(
            formatShiftDate(
              shift.clock_in
            )
          )}
        </div>

      </div>

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Status
        </div>

        <div class="shiftDetailValue">
          ${
            shift.is_active
              ? "Active"
              : "Completed"
          }
        </div>

      </div>

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Clock in
        </div>

        <div class="shiftDetailValue">
          ${escapeHtml(
            formatClockTime(
              shift.clock_in
            )
          )}
        </div>

      </div>

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Clock out
        </div>

        <div class="shiftDetailValue">

          ${
            shift.clock_out
              ? escapeHtml(
                  formatClockTime(
                    shift.clock_out
                  )
                )
              : "Still working"
          }

        </div>

      </div>

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Total shift
        </div>

        <div class="shiftDetailValue">
          ${escapeHtml(
            formatHoursMinutes(
              totalShiftSeconds
            )
          )}
        </div>

      </div>

      <div class="shiftDetailBox">

        <div class="shiftDetailLabel">
          Worked
        </div>

        <div class="shiftDetailValue">
          ${escapeHtml(
            formatHoursMinutes(
              workedSeconds
            )
          )}
        </div>

      </div>

    </div>


    <div class="shiftDetailSection">

      <div class="shiftBreakHeader">

        <div class="shiftDetailSectionTitle">
          Breaks · ${breaks.length}
        </div>

        <button
          class="shiftEditButton"
          type="button"
          onclick="startAddBreak()"
        >
          + Add break
        </button>

      </div>

      <div id="addBreakContainer"></div>

      ${breaksHtml}

      <div class="shiftBreakRow">

        <div class="shiftBreakTime">
          Total break time
        </div>

        <div class="shiftBreakTime">
          ${escapeHtml(
            formatHoursMinutes(
              totalBreakSeconds
            )
          )}
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
            ? escapeHtml(
                shift.note
              )
            : "No note"
        }

      </div>

    </div>

  `;
}


/* ============================================
   DELETE SHIFT BUTTON
============================================ */

function ensureDeleteShiftButton() {

  const editButton =
    document.getElementById(
      "editShiftButton"
    );

  if (!editButton) {
    return;
  }

  if (
    document.getElementById(
      "deleteShiftButton"
    )
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "deleteShiftButton";

  button.type =
    "button";

  button.className =
    "shiftEditButton shiftDeleteButton";

  button.textContent =
    "Delete shift";

  button.onclick =
    deleteShift;

  editButton.insertAdjacentElement(
    "afterend",
    button
  );
}


/* ============================================
   DELETE SHIFT
============================================ */

async function deleteShift() {

  if (
    !selectedShiftId ||
    !selectedShift
  ) {
    return;
  }

  const workerName =
    selectedShift.worker_name ||
    "this worker";

  const shiftDate =
    formatShiftDate(
      selectedShift.clock_in
    );

  const confirmed =
    window.confirm(
      `Delete this shift for ${workerName} on ${shiftDate}?\n\nAll breaks belonging to this shift will also be deleted.\n\nThis cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  const deleteButton =
    document.getElementById(
      "deleteShiftButton"
    );

  const editButton =
    document.getElementById(
      "editShiftButton"
    );

  if (deleteButton) {

    deleteButton.disabled =
      true;

    deleteButton.textContent =
      "Deleting…";
  }

  if (editButton) {
    editButton.disabled = true;
  }

  const shiftId =
    selectedShiftId;

  const {
    error
  } =
    await sb.rpc(
      "admin_delete_shift",
      {
        p_shift_id:
          shiftId
      }
    );

  if (error) {

    console.error(
      "Delete shift:",
      error
    );

    window.alert(
      error.message ||
      "Could not delete shift."
    );

    if (deleteButton) {

      deleteButton.disabled =
        false;

      deleteButton.textContent =
        "Delete shift";
    }

    if (editButton) {
      editButton.disabled = false;
    }

    return;
  }

  closeShiftDetails();

  await loadTimesheets();
}


/* ============================================
   DATE/TIME HELPER
============================================ */

function toDateTimeLocalValue(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() *
    60000;

  return new Date(
    date.getTime() -
    offset
  )
    .toISOString()
    .slice(
      0,
      16
    );
}


/* ============================================
   EDIT SHIFT
============================================ */

function startEditShift() {

  if (
    !selectedShift ||
    !selectedShiftId
  ) {
    return;
  }

  const content =
    document.getElementById(
      "shiftDetailsContent"
    );

  const editButton =
    document.getElementById(
      "editShiftButton"
    );

  const deleteButton =
    document.getElementById(
      "deleteShiftButton"
    );

  if (editButton) {
    editButton.disabled = true;
  }

  if (deleteButton) {
    deleteButton.disabled = true;
  }

  content.innerHTML = `
    <div class="shiftEditForm">

      <div class="shiftEditField">

        <label for="editShiftClockIn">
          Clock in
        </label>

        <input
          id="editShiftClockIn"
          type="datetime-local"
          value="${escapeHtml(
            toDateTimeLocalValue(
              selectedShift.clock_in
            )
          )}"
        >

      </div>

      <div class="shiftEditField">

        <label for="editShiftClockOut">
          Clock out
        </label>

        <input
          id="editShiftClockOut"
          type="datetime-local"
          value="${escapeHtml(
            toDateTimeLocalValue(
              selectedShift.clock_out
            )
          )}"
        >

      </div>

      <div class="shiftEditField shiftEditFieldFull">

        <label for="editShiftNote">
          Note
        </label>

        <textarea
          id="editShiftNote"
          rows="4"
          placeholder="No note"
        >${escapeHtml(
          selectedShift.note ||
          ""
        )}</textarea>

      </div>

      <div
        id="editShiftMessage"
        class="message"
      ></div>

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

    await openShiftDetails(
      selectedShiftId
    );
  }
}


async function saveShiftChanges() {

  if (!selectedShiftId) {
    return;
  }

  const clockInValue =
    document.getElementById(
      "editShiftClockIn"
    ).value;

  const clockOutValue =
    document.getElementById(
      "editShiftClockOut"
    ).value;

  const note =
    document.getElementById(
      "editShiftNote"
    ).value.trim();

  const button =
    document.getElementById(
      "saveShiftButton"
    );

  if (!clockInValue) {

    showMessage(
      "editShiftMessage",
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
      "editShiftMessage",
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
      "editShiftMessage",
      "Enter a valid clock out time."
    );

    return;
  }

  if (
    clockOut &&
    clockOut <= clockIn
  ) {

    showMessage(
      "editShiftMessage",
      "Clock out must be after clock in."
    );

    return;
  }

  button.disabled =
    true;

  button.textContent =
    "Saving…";

  clearMessage(
    "editShiftMessage"
  );

  const {
    error
  } =
    await sb.rpc(
      "admin_update_shift",
      {
        p_shift_id:
          selectedShiftId,

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
      "Update shift:",
      error
    );

    showMessage(
      "editShiftMessage",
      error.message ||
      "Could not save shift."
    );

    button.disabled =
      false;

    button.textContent =
      "Save changes";

    return;
  }

  await loadTimesheets();

  await openShiftDetails(
    selectedShiftId
  );
}


/* ============================================
   ADD BREAK
============================================ */

function startAddBreak() {

  if (
    !selectedShift ||
    !selectedShiftId
  ) {
    return;
  }

  const container =
    document.getElementById(
      "addBreakContainer"
    );

  if (!container) {
    return;
  }

  const existingStart =
    document.getElementById(
      "addBreakStart"
    );

  if (existingStart) {

    existingStart.focus();

    return;
  }

  const defaultStart =
    selectedShift.clock_in
      ? toDateTimeLocalValue(
          selectedShift.clock_in
        )
      : "";

  const defaultEnd =
    selectedShift.clock_out
      ? toDateTimeLocalValue(
          selectedShift.clock_out
        )
      : "";

  container.innerHTML = `
    <div class="shiftAddBreakForm">

      <div class="shiftEditForm">

        <div class="shiftEditField">

          <label for="addBreakStart">
            Break start
          </label>

          <input
            id="addBreakStart"
            type="datetime-local"
            value="${escapeHtml(defaultStart)}"
          >

        </div>

        <div class="shiftEditField">

          <label for="addBreakEnd">
            Break end
          </label>

          <input
            id="addBreakEnd"
            type="datetime-local"
            value="${escapeHtml(defaultEnd)}"
          >

        </div>

        <div
          id="addBreakMessage"
          class="message"
        ></div>

        <div class="shiftEditActions">

          <button
            class="shiftEditCancelButton"
            type="button"
            onclick="cancelAddBreak()"
          >
            Cancel
          </button>

          <button
            id="saveAddBreakButton"
            class="shiftEditSaveButton"
            type="button"
            onclick="saveNewBreak()"
          >
            Add break
          </button>

        </div>

      </div>

    </div>
  `;
}


function cancelAddBreak() {

  const container =
    document.getElementById(
      "addBreakContainer"
    );

  if (container) {
    container.innerHTML = "";
  }
}


async function saveNewBreak() {

  if (
    !selectedShiftId ||
    !selectedShift
  ) {
    return;
  }

  const startInput =
    document.getElementById(
      "addBreakStart"
    );

  const endInput =
    document.getElementById(
      "addBreakEnd"
    );

  const button =
    document.getElementById(
      "saveAddBreakButton"
    );

  if (
    !startInput ||
    !endInput ||
    !button
  ) {
    return;
  }

  const startValue =
    startInput.value;

  const endValue =
    endInput.value;

  if (!startValue) {

    showMessage(
      "addBreakMessage",
      "Break start is required."
    );

    return;
  }

  const breakStart =
    new Date(
      startValue
    );

  const breakEnd =
    endValue
      ? new Date(
          endValue
        )
      : null;

  if (
    Number.isNaN(
      breakStart.getTime()
    )
  ) {

    showMessage(
      "addBreakMessage",
      "Enter a valid break start."
    );

    return;
  }

  if (
    breakEnd &&
    Number.isNaN(
      breakEnd.getTime()
    )
  ) {

    showMessage(
      "addBreakMessage",
      "Enter a valid break end."
    );

    return;
  }

  if (
    breakEnd &&
    breakEnd <= breakStart
  ) {

    showMessage(
      "addBreakMessage",
      "Break end must be after break start."
    );

    return;
  }

  if (
    !breakEnd &&
    !selectedShift.is_active
  ) {

    showMessage(
      "addBreakMessage",
      "Break end is required for a completed shift."
    );

    return;
  }

  if (!breakEnd) {

    const hasActiveBreak =
      selectedShiftBreaks.some(
        item =>
          !item.break_end
      );

    if (hasActiveBreak) {

      showMessage(
        "addBreakMessage",
        "This shift already has an active break."
      );

      return;
    }
  }

  button.disabled =
    true;

  button.textContent =
    "Adding…";

  clearMessage(
    "addBreakMessage"
  );

  const shiftId =
    selectedShiftId;

  const {
    error
  } =
    await sb.rpc(
      "admin_add_break",
      {
        p_shift_id:
          shiftId,

        p_break_start:
          breakStart.toISOString(),

        p_break_end:
          breakEnd
            ? breakEnd.toISOString()
            : null
      }
    );

  if (error) {

    console.error(
      "Add break:",
      error
    );

    showMessage(
      "addBreakMessage",
      error.message ||
      "Could not add break."
    );

    button.disabled =
      false;

    button.textContent =
      "Add break";

    return;
  }

  await loadTimesheets();

  await openShiftDetails(
    shiftId
  );
}


/* ============================================
   EDIT BREAK
============================================ */

function startEditBreak(breakId) {

  if (
    !selectedShift ||
    !selectedShiftId
  ) {
    return;
  }

  const breakItem =
    selectedShiftBreaks.find(
      item =>
        item.break_id ===
        breakId
    );

  const row =
    document.getElementById(
      `shiftBreakRow-${breakId}`
    );

  if (
    !breakItem ||
    !row
  ) {
    return;
  }

  document
    .querySelectorAll(
      ".shiftBreakRow .shiftEditButton"
    )
    .forEach(
      button => {

        button.disabled =
          true;
      }
    );

  row.innerHTML = `
    <div class="shiftEditForm">

      <div class="shiftEditField">

        <label for="editBreakStart-${escapeHtml(breakId)}">
          Break start
        </label>

        <input
          id="editBreakStart-${escapeHtml(breakId)}"
          type="datetime-local"
          value="${escapeHtml(
            toDateTimeLocalValue(
              breakItem.break_start
            )
          )}"
        >

      </div>

      <div class="shiftEditField">

        <label for="editBreakEnd-${escapeHtml(breakId)}">
          Break end
        </label>

        <input
          id="editBreakEnd-${escapeHtml(breakId)}"
          type="datetime-local"
          value="${escapeHtml(
            toDateTimeLocalValue(
              breakItem.break_end
            )
          )}"
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

    await openShiftDetails(
      selectedShiftId
    );
  }
}


async function saveBreakChanges(
  breakId
) {

  if (
    !selectedShiftId ||
    !selectedShift
  ) {
    return;
  }

  const breakItem =
    selectedShiftBreaks.find(
      item =>
        item.break_id ===
        breakId
    );

  if (!breakItem) {
    return;
  }

  const startInput =
    document.getElementById(
      `editBreakStart-${breakId}`
    );

  const endInput =
    document.getElementById(
      `editBreakEnd-${breakId}`
    );

  const button =
    document.getElementById(
      `saveBreakButton-${breakId}`
    );

  const messageId =
    `editBreakMessage-${breakId}`;

  if (
    !startInput ||
    !endInput ||
    !button
  ) {
    return;
  }

  const startValue =
    startInput.value;

  const endValue =
    endInput.value;

  if (!startValue) {

    showMessage(
      messageId,
      "Break start is required."
    );

    return;
  }

  const breakStart =
    new Date(
      startValue
    );

  const breakEnd =
    endValue
      ? new Date(
          endValue
        )
      : null;

  if (
    Number.isNaN(
      breakStart.getTime()
    )
  ) {

    showMessage(
      messageId,
      "Enter a valid break start."
    );

    return;
  }

  if (
    breakEnd &&
    Number.isNaN(
      breakEnd.getTime()
    )
  ) {

    showMessage(
      messageId,
      "Enter a valid break end."
    );

    return;
  }

  if (
    breakEnd &&
    breakEnd <= breakStart
  ) {

    showMessage(
      messageId,
      "Break end must be after break start."
    );

    return;
  }

  const mayRemainActive =
    selectedShift.is_active &&
    !breakItem.break_end;

  if (
    !breakEnd &&
    !mayRemainActive
  ) {

    showMessage(
      messageId,
      "Break end is required unless this is the active break on an active shift."
    );

    return;
  }

  button.disabled =
    true;

  button.textContent =
    "Saving…";

  clearMessage(
    messageId
  );

  const shiftId =
    selectedShiftId;

  const {
    error
  } =
    await sb.rpc(
      "admin_update_break",
      {
        p_break_id:
          breakId,

        p_break_start:
          breakStart.toISOString(),

        p_break_end:
          breakEnd
            ? breakEnd.toISOString()
            : null
      }
    );

  if (error) {

    console.error(
      "Update break:",
      error
    );

    showMessage(
      messageId,
      error.message ||
      "Could not save break."
    );

    button.disabled =
      false;

    button.textContent =
      "Save";

    return;
  }

  await loadTimesheets();

  await openShiftDetails(
    shiftId
  );
}


/* ============================================
   DELETE BREAK
============================================ */

async function deleteBreak(
  breakId
) {

  if (
    !selectedShiftId ||
    !breakId
  ) {
    return;
  }

  const breakItem =
    selectedShiftBreaks.find(
      item =>
        item.break_id ===
        breakId
    );

  if (!breakItem) {
    return;
  }

  const confirmed =
    window.confirm(
      "Delete this break?\n\nThis cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  const button =
    document.getElementById(
      `deleteBreakButton-${breakId}`
    );

  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Deleting…";
  }

  const shiftId =
    selectedShiftId;

  const {
    error
  } =
    await sb.rpc(
      "admin_delete_break",
      {
        p_break_id:
          breakId
      }
    );

  if (error) {

    console.error(
      "Delete break:",
      error
    );

    window.alert(
      error.message ||
      "Could not delete break."
    );

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Delete";
    }

    return;
  }

  await loadTimesheets();

  await openShiftDetails(
    shiftId
  );
}


/* ============================================
   CLOSE SHIFT DETAILS
============================================ */

function closeShiftDetails() {

  const modal =
    document.getElementById(
      "shiftDetailsModal"
    );

  if (modal) {

    modal.classList.add(
      "hidden"
    );
  }

  selectedShiftId =
    null;

  selectedShift =
    null;

  selectedShiftBreaks =
    [];
}
