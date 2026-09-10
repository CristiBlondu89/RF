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


