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


