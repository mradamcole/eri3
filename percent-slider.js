(function () {
  "use strict";

  /**
   * @param {number} value
   * @param {number} lo
   * @param {number} hi
   * @returns {number}
   */
  function clamp(value, lo, hi) {
    if (value < lo) {
      return lo;
    }
    if (value > hi) {
      return hi;
    }
    return value;
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @returns {number}
   */
  function snapToStep(value, min, max, step) {
    var steps = Math.round((value - min) / step);
    var snapped = min + steps * step;
    snapped = clamp(snapped, min, max);
    var stepStr = String(step);
    var dot = stepStr.indexOf(".");
    var places = dot === -1 ? 0 : stepStr.length - dot - 1;
    var m = Math.pow(10, places);
    return Math.round(snapped * m) / m;
  }

  /**
   * @param {string|undefined} raw
   * @param {number} fallback
   * @returns {number}
   */
  function parseNum(raw, fallback) {
    if (raw === undefined || raw === null || raw === "") {
      return fallback;
    }
    var n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * @param {HTMLElement} root
   * @returns {void}
   */
  function initOne(root) {
    if (root.getAttribute("data-percent-slider-init") === "1") {
      return;
    }

    var track = root.querySelector("[data-slider-track]");
    var fill = root.querySelector("[data-slider-fill]");
    var knob = root.querySelector("[data-slider-knob]");
    var input = root.querySelector("[data-slider-input]");

    if (!track || !fill || !knob || !input) {
      return;
    }

    var min = parseNum(root.getAttribute("data-min"), 0);
    var max = parseNum(root.getAttribute("data-max"), 100);
    var step = parseNum(root.getAttribute("data-step"), 5);
    var fillAttr = root.getAttribute("data-fill");
    var fillEnabled = fillAttr !== "false" && fillAttr !== "0";
    var fillColor = root.getAttribute("data-fill-color") || "#8b0000";
    var trackStyleRaw = root.getAttribute("data-track-style") || "standard";
    /** @type {Record<string, string>} */
    var trackStyleClassByName = {
      standard: "percent-slider--track-standard",
      depressed: "percent-slider--track-depressed",
    };
    var trackStyle =
      trackStyleClassByName[trackStyleRaw] ? trackStyleRaw : "standard";
    var trackClassList = Object.keys(trackStyleClassByName).map(function (k) {
      return trackStyleClassByName[k];
    });
    var knobStyleRaw = root.getAttribute("data-knob-style") || "depressed-circle";
    /** @type {Record<string, string>} */
    var knobStyleClassByName = {
      "as-is": "percent-slider--knob-as-is",
      "simple-circle": "percent-slider--knob-circle",
      "grip-box": "percent-slider--knob-grip-box",
      "depressed-circle": "percent-slider--knob-depressed-circle",
      house: "percent-slider--knob-house",
    };
    var knobStyle =
      knobStyleClassByName[knobStyleRaw] ? knobStyleRaw : "depressed-circle";
    var knobClassList = Object.keys(knobStyleClassByName).map(function (k) {
      return knobStyleClassByName[k];
    });

    if (!(max > min) || !(step > 0)) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          "[percent-slider] Invalid min/max/step; using 0–100 step 5.",
          root
        );
      }
      min = 0;
      max = 100;
      step = 5;
    }

    root.style.setProperty("--percent-slider-fill", fillColor);
    for (var tc = 0; tc < trackClassList.length; tc++) {
      root.classList.remove(trackClassList[tc]);
    }
    root.classList.add(trackStyleClassByName[trackStyle]);
    for (var kc = 0; kc < knobClassList.length; kc++) {
      root.classList.remove(knobClassList[kc]);
    }
    root.classList.add(knobStyleClassByName[knobStyle]);
    if (!fillEnabled) {
      root.classList.add("percent-slider--no-fill");
    } else {
      root.classList.remove("percent-slider--no-fill");
    }

    var initial = parseNum(
      root.getAttribute("data-value"),
      Number.NaN
    );
    if (!Number.isFinite(initial)) {
      initial = min;
    }
    var value = snapToStep(initial, min, max, step);

    input.setAttribute("min", String(min));
    input.setAttribute("max", String(max));
    input.setAttribute("step", String(step));

    knob.setAttribute("role", "slider");
    knob.setAttribute("tabindex", "0");
    knob.setAttribute("aria-valuemin", String(min));
    knob.setAttribute("aria-valuemax", String(max));

    var labelId = root.getAttribute("aria-labelledby");
    if (labelId) {
      knob.setAttribute("aria-labelledby", labelId);
    }
    var labelText = root.getAttribute("aria-label");
    if (labelText) {
      knob.setAttribute("aria-label", labelText);
    }

    /**
     * @returns {number}
     */
    function ratioFromValue() {
      if (max === min) {
        return 0;
      }
      return (value - min) / (max - min);
    }

    /**
     * @param {number} next
     * @param {boolean} [fromInput]
     * @returns {void}
     */
    function applyValue(next, fromInput) {
      value = snapToStep(next, min, max, step);
      var r = ratioFromValue();
      var pct = r * 100;
      fill.style.width = pct + "%";
      root.style.setProperty("--percent-slider-pos", pct + "%");
      knob.setAttribute("aria-valuenow", String(value));
      knob.setAttribute("aria-valuetext", value + "%");
      if (!fromInput) {
        input.value = String(value);
      }
      root.dispatchEvent(
        new CustomEvent("percent-slider-change", {
          bubbles: true,
          detail: { value: value },
        })
      );
    }

    /**
     * @param {number} clientX
     * @returns {void}
     */
    function setFromClientX(clientX) {
      var rect = track.getBoundingClientRect();
      var w = rect.width;
      if (w <= 0) {
        return;
      }
      var ratio = (clientX - rect.left) / w;
      ratio = clamp(ratio, 0, 1);
      var raw = min + ratio * (max - min);
      applyValue(raw, false);
    }

    var dragging = false;

    knob.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) {
        return;
      }
      ev.preventDefault();
      dragging = true;
      try {
        knob.setPointerCapture(ev.pointerId);
      } catch (e) {
        /* ignore */
      }
    });

    knob.addEventListener("pointermove", function (ev) {
      if (!dragging) {
        return;
      }
      ev.preventDefault();
      setFromClientX(ev.clientX);
    });

    function endDrag(ev) {
      if (!dragging) {
        return;
      }
      dragging = false;
      try {
        if (ev.pointerId !== undefined) {
          knob.releasePointerCapture(ev.pointerId);
        }
      } catch (e) {
        /* ignore */
      }
    }

    knob.addEventListener("pointerup", endDrag);
    knob.addEventListener("pointercancel", endDrag);

    track.addEventListener("pointerdown", function (ev) {
      if (ev.target instanceof Node && knob.contains(ev.target)) {
        return;
      }
      if (ev.button !== 0) {
        return;
      }
      ev.preventDefault();
      track.setPointerCapture(ev.pointerId);
      setFromClientX(ev.clientX);
    });

    track.addEventListener("pointermove", function (ev) {
      if (!track.hasPointerCapture(ev.pointerId)) {
        return;
      }
      setFromClientX(ev.clientX);
    });

    track.addEventListener("pointerup", function (ev) {
      if (track.hasPointerCapture(ev.pointerId)) {
        track.releasePointerCapture(ev.pointerId);
      }
    });
    track.addEventListener("pointercancel", function (ev) {
      if (track.hasPointerCapture(ev.pointerId)) {
        track.releasePointerCapture(ev.pointerId);
      }
    });

    var pageStep = Math.max(step, Math.round((max - min) / 10 / step) * step);

    knob.addEventListener("keydown", function (ev) {
      var next = value;
      var handled = false;
      if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
        next = value + step;
        handled = true;
      } else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
        next = value - step;
        handled = true;
      } else if (ev.key === "Home") {
        next = min;
        handled = true;
      } else if (ev.key === "End") {
        next = max;
        handled = true;
      } else if (ev.key === "PageUp") {
        next = value + pageStep;
        handled = true;
      } else if (ev.key === "PageDown") {
        next = value - pageStep;
        handled = true;
      }
      if (handled) {
        ev.preventDefault();
        applyValue(next, false);
      }
    });

    function commitInput() {
      var raw = input.value.trim();
      if (raw === "") {
        applyValue(value, false);
        return;
      }
      var n = Number(raw);
      if (!Number.isFinite(n)) {
        applyValue(value, false);
        return;
      }
      applyValue(n, true);
      input.value = String(value);
    }

    input.addEventListener("change", commitInput);
    input.addEventListener("blur", commitInput);

    root.setAttribute("data-percent-slider-init", "1");

    /** @type {{ getValue: () => number; setValue: (n: number) => void; destroy: () => void }} */
    var api = {
      getValue: function () {
        return value;
      },
      setValue: function (n) {
        applyValue(n, false);
      },
      destroy: function () {
        root.removeAttribute("data-percent-slider-init");
        delete root.percentSlider;
      },
    };
    root.percentSlider = api;

    applyValue(value, false);
  }

  /**
   * @param {ParentNode} [root]
   * @returns {void}
   */
  function initPercentSliders(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll(".percent-slider");
    for (var i = 0; i < nodes.length; i++) {
      initOne(nodes[i]);
    }
  }

  if (typeof window !== "undefined") {
    window.initPercentSliders = initPercentSliders;
    function boot() {
      initPercentSliders(document);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
