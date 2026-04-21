(function () {
  "use strict";

  /** Set true to log session metadata to the console on START. */
  var DEBUG = false;

  var STORAGE_KEY = "eri_session_meta";
  var ACK_NOTICE_KEY = "eri_ack_suppress_until";
  var ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  var startBtn = document.getElementById("startBtn");
  var dialog = document.getElementById("entryDialog");
  var proceedBtn = document.getElementById("proceedBtn");
  var persistCheckbox = document.getElementById("ackPersist");
  var roleInputs = document.querySelectorAll('input[name="ackRole"]');

  if (!startBtn || !dialog || !proceedBtn || !persistCheckbox) {
    return;
  }

  function readAckNotice() {
    try {
      var raw = localStorage.getItem(ACK_NOTICE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function shouldSkipAcknowledgment() {
    var data = readAckNotice();
    if (!data || !data.acknowledgedAt) {
      return false;
    }
    var t = Date.parse(data.acknowledgedAt);
    if (Number.isNaN(t)) {
      return false;
    }
    return Date.now() < t + ONE_YEAR_MS;
  }

  function setProceedEnabled(enabled) {
    proceedBtn.disabled = !enabled;
  }

  function updateProceedFromRoles() {
    var any = false;
    for (var i = 0; i < roleInputs.length; i++) {
      if (roleInputs[i].checked) {
        any = true;
        break;
      }
    }
    setProceedEnabled(any);
  }

  function persistAckPreference(role) {
    if (persistCheckbox.checked) {
      try {
        localStorage.setItem(
          ACK_NOTICE_KEY,
          JSON.stringify({
            acknowledgedAt: new Date().toISOString(),
            role: role,
          })
        );
      } catch (e) {
        /* ignore quota / private mode */
      }
    } else {
      try {
        localStorage.removeItem(ACK_NOTICE_KEY);
      } catch (e) {
        /* ignore */
      }
    }
  }

  function getSelectedRole() {
    for (var i = 0; i < roleInputs.length; i++) {
      if (roleInputs[i].checked) {
        return roleInputs[i].value;
      }
    }
    return null;
  }

  /**
   * ipAddress is always null in this static mockup. A production backend
   * should capture the client IP from the request (never trust client-supplied IP).
   */
  function recordSessionAndOpen() {
    var meta = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      ipAddress: null,
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch (e) {
      /* ignore quota / private mode */
    }

    if (DEBUG) {
      console.info("[ERI]", meta);
    }

    if (shouldSkipAcknowledgment()) {
      return;
    }

    dialog.showModal();
  }

  for (var r = 0; r < roleInputs.length; r++) {
    roleInputs[r].addEventListener("change", updateProceedFromRoles);
  }

  proceedBtn.addEventListener("click", function () {
    var role = getSelectedRole();
    if (!role) {
      return;
    }
    persistAckPreference(role);
    dialog.close();
  });

  dialog.addEventListener("close", function () {
    /* Reset for next open so stale selections are not left behind */
    for (var i = 0; i < roleInputs.length; i++) {
      roleInputs[i].checked = false;
    }
    persistCheckbox.checked = false;
    setProceedEnabled(false);
  });

  startBtn.addEventListener("click", recordSessionAndOpen);
})();
