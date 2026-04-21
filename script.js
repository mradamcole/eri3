(function () {
  "use strict";

  /** Set true to log session metadata to the console on START. */
  var DEBUG = false;

  var STORAGE_KEY = "eri_session_meta";

  var startBtn = document.getElementById("startBtn");
  var dialog = document.getElementById("entryDialog");
  var proceedBtn = document.getElementById("proceedBtn");
  var persistCheckbox = document.getElementById("ackPersist");
  var roleInputs = document.querySelectorAll('input[name="ackRole"]');

  if (!startBtn || !dialog || !proceedBtn || !persistCheckbox) {
    return;
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
    dialog.close();
    window.location.href = "template.html";
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
