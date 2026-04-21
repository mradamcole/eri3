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
    var knobSingle = root.querySelector("[data-slider-knob]");
    var knobMin = root.querySelector("[data-slider-knob-min]");
    var knobMax = root.querySelector("[data-slider-knob-max]");
    var inputSingle = root.querySelector("[data-slider-input]");
    var inputMin = root.querySelector("[data-slider-input-min]");
    var inputMax = root.querySelector("[data-slider-input-max]");
    var rangeAttr = root.getAttribute("data-range");
    var isRange = rangeAttr === "true" || rangeAttr === "1";

    if (!knobMin && knobSingle) {
      knobMin = knobSingle;
    }
    if (isRange && !knobMax) {
      isRange = false;
    }

    if (!track || !fill || !knobMin) {
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
    if (isRange) {
      root.classList.add("percent-slider--range");
    } else {
      root.classList.remove("percent-slider--range");
    }

    var value = min;
    var valueMin = min;
    var valueMax = max;

    if (isRange) {
      var initialMin = parseNum(root.getAttribute("data-value-min"), min);
      var initialMax = parseNum(
        root.getAttribute("data-value-max"),
        parseNum(root.getAttribute("data-value"), max)
      );
      valueMin = snapToStep(initialMin, min, max, step);
      valueMax = snapToStep(initialMax, min, max, step);
      if (valueMin > valueMax) {
        valueMin = valueMax;
      }
    } else {
      var initial = parseNum(root.getAttribute("data-value"), Number.NaN);
      if (!Number.isFinite(initial)) {
        initial = min;
      }
      value = snapToStep(initial, min, max, step);
    }

    var labelId = root.getAttribute("aria-labelledby");
    var labelText = root.getAttribute("aria-label");
    var pageStep = Math.max(step, Math.round((max - min) / 10 / step) * step);
    var trackDragTarget = "single";

    function setupKnobA11y(knobEl, suffix) {
      if (!knobEl) {
        return;
      }
      knobEl.setAttribute("role", "slider");
      knobEl.setAttribute("tabindex", "0");
      if (labelId) {
        knobEl.setAttribute("aria-labelledby", labelId);
      }
      if (labelText) {
        knobEl.setAttribute(
          "aria-label",
          suffix ? labelText + " " + suffix : labelText
        );
      }
    }

    setupKnobA11y(knobMin, isRange ? "minimum" : "");
    if (isRange) {
      setupKnobA11y(knobMax, "maximum");
    }

    function ratioFromValue(current) {
      if (max === min) {
        return 0;
      }
      return (current - min) / (max - min);
    }

    function refreshInputs() {
      if (isRange) {
        if (inputMin) {
          inputMin.setAttribute("min", String(min));
          inputMin.setAttribute("max", String(valueMax));
          inputMin.setAttribute("step", String(step));
          inputMin.value = String(valueMin);
        }
        if (inputMax) {
          inputMax.setAttribute("min", String(valueMin));
          inputMax.setAttribute("max", String(max));
          inputMax.setAttribute("step", String(step));
          inputMax.value = String(valueMax);
        }
      } else if (inputSingle) {
        inputSingle.setAttribute("min", String(min));
        inputSingle.setAttribute("max", String(max));
        inputSingle.setAttribute("step", String(step));
        inputSingle.value = String(value);
      }
    }

    function updateA11y() {
      if (isRange) {
        knobMin.setAttribute("aria-valuemin", String(min));
        knobMin.setAttribute("aria-valuemax", String(valueMax));
        knobMin.setAttribute("aria-valuenow", String(valueMin));
        knobMin.setAttribute("aria-valuetext", valueMin + "%");

        if (knobMax) {
          knobMax.setAttribute("aria-valuemin", String(valueMin));
          knobMax.setAttribute("aria-valuemax", String(max));
          knobMax.setAttribute("aria-valuenow", String(valueMax));
          knobMax.setAttribute("aria-valuetext", valueMax + "%");
        }
      } else {
        knobMin.setAttribute("aria-valuemin", String(min));
        knobMin.setAttribute("aria-valuemax", String(max));
        knobMin.setAttribute("aria-valuenow", String(value));
        knobMin.setAttribute("aria-valuetext", value + "%");
      }
    }

    function emitChange() {
      root.dispatchEvent(
        new CustomEvent("percent-slider-change", {
          bubbles: true,
          detail: isRange ? { min: valueMin, max: valueMax } : { value: value },
        })
      );
    }

    function render(emit) {
      if (isRange) {
        var pctMin = ratioFromValue(valueMin) * 100;
        var pctMax = ratioFromValue(valueMax) * 100;
        fill.style.left = pctMin + "%";
        fill.style.width = pctMax - pctMin + "%";
        knobMin.style.setProperty("--percent-slider-pos", pctMin + "%");
        if (knobMax) {
          knobMax.style.setProperty("--percent-slider-pos", pctMax + "%");
        }
      } else {
        var pct = ratioFromValue(value) * 100;
        fill.style.left = "0%";
        fill.style.width = pct + "%";
        knobMin.style.setProperty("--percent-slider-pos", pct + "%");
      }
      refreshInputs();
      updateA11y();
      if (emit) {
        emitChange();
      }
    }

    function setSingle(next, emit) {
      value = snapToStep(next, min, max, step);
      render(emit);
    }

    function setMin(next, emit) {
      var snapped = snapToStep(next, min, max, step);
      valueMin = clamp(snapped, min, valueMax);
      render(emit);
    }

    function setMax(next, emit) {
      var snapped = snapToStep(next, min, max, step);
      valueMax = clamp(snapped, valueMin, max);
      render(emit);
    }

    function setRange(nextMin, nextMax, emit) {
      var snappedMin = snapToStep(nextMin, min, max, step);
      var snappedMax = snapToStep(nextMax, min, max, step);
      valueMin = clamp(snappedMin, min, max);
      valueMax = clamp(snappedMax, min, max);
      if (valueMin > valueMax) {
        valueMin = valueMax;
      }
      render(emit);
    }

    function nearestRangeTarget(raw) {
      return Math.abs(raw - valueMin) <= Math.abs(raw - valueMax) ? "min" : "max";
    }

    function setFromClientX(clientX, target) {
      var rect = track.getBoundingClientRect();
      var w = rect.width;
      if (w <= 0) {
        return;
      }
      var ratio = (clientX - rect.left) / w;
      ratio = clamp(ratio, 0, 1);
      var raw = min + ratio * (max - min);
      if (isRange) {
        var resolved = target || nearestRangeTarget(raw);
        if (resolved === "max") {
          setMax(raw, true);
        } else {
          setMin(raw, true);
        }
      } else {
        setSingle(raw, true);
      }
    }

    function bindKnobPointer(knobEl, target) {
      var dragging = false;
      if (!knobEl) {
        return;
      }
      knobEl.addEventListener("pointerdown", function (ev) {
        if (ev.button !== 0) {
          return;
        }
        ev.preventDefault();
        dragging = true;
        try {
          knobEl.setPointerCapture(ev.pointerId);
        } catch (e) {
          /* ignore */
        }
      });

      knobEl.addEventListener("pointermove", function (ev) {
        if (!dragging) {
          return;
        }
        ev.preventDefault();
        setFromClientX(ev.clientX, target);
      });

      function endDrag(ev) {
        if (!dragging) {
          return;
        }
        dragging = false;
        try {
          if (ev.pointerId !== undefined) {
            knobEl.releasePointerCapture(ev.pointerId);
          }
        } catch (e) {
          /* ignore */
        }
      }

      knobEl.addEventListener("pointerup", endDrag);
      knobEl.addEventListener("pointercancel", endDrag);
    }

    bindKnobPointer(knobMin, "min");
    if (isRange) {
      bindKnobPointer(knobMax, "max");
    }

    track.addEventListener("pointerdown", function (ev) {
      if (
        (ev.target instanceof Node && knobMin.contains(ev.target)) ||
        (knobMax && ev.target instanceof Node && knobMax.contains(ev.target))
      ) {
        return;
      }
      if (ev.button !== 0) {
        return;
      }
      ev.preventDefault();
      if (isRange) {
        var rect = track.getBoundingClientRect();
        var ratio = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
        var raw = min + ratio * (max - min);
        trackDragTarget = nearestRangeTarget(raw);
      } else {
        trackDragTarget = "single";
      }
      try {
        track.setPointerCapture(ev.pointerId);
      } catch (e) {
        /* ignore */
      }
      setFromClientX(ev.clientX, trackDragTarget);
    });

    track.addEventListener("pointermove", function (ev) {
      if (!track.hasPointerCapture(ev.pointerId)) {
        return;
      }
      setFromClientX(ev.clientX, trackDragTarget);
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

    function bindKnobKeyboard(knobEl, target) {
      if (!knobEl) {
        return;
      }
      knobEl.addEventListener("keydown", function (ev) {
      var next = isRange
        ? target === "max"
          ? valueMax
          : valueMin
        : value;
      var handled = false;
      if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
        next = next + step;
        handled = true;
      } else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
        next = next - step;
        handled = true;
      } else if (ev.key === "Home") {
        next = target === "max" ? valueMin : min;
        handled = true;
      } else if (ev.key === "End") {
        next = target === "min" ? valueMax : max;
        handled = true;
      } else if (ev.key === "PageUp") {
        next = next + pageStep;
        handled = true;
      } else if (ev.key === "PageDown") {
        next = next - pageStep;
        handled = true;
      }
      if (handled) {
        ev.preventDefault();
        if (isRange) {
          if (target === "max") {
            setMax(next, true);
          } else {
            setMin(next, true);
          }
        } else {
          setSingle(next, true);
        }
      }
    });
    }

    bindKnobKeyboard(knobMin, "min");
    if (isRange) {
      bindKnobKeyboard(knobMax, "max");
    }

    function commitInputSingle() {
      if (!inputSingle) {
        return;
      }
      var raw = inputSingle.value.trim();
      if (raw === "") {
        render(false);
        return;
      }
      var n = Number(raw);
      if (!Number.isFinite(n)) {
        render(false);
        return;
      }
      setSingle(n, true);
    }

    function commitInputMin() {
      if (!inputMin) {
        return;
      }
      var raw = inputMin.value.trim();
      if (raw === "") {
        render(false);
        return;
      }
      var n = Number(raw);
      if (!Number.isFinite(n)) {
        render(false);
        return;
      }
      setMin(n, true);
    }

    function commitInputMax() {
      if (!inputMax) {
        return;
      }
      var raw = inputMax.value.trim();
      if (raw === "") {
        render(false);
        return;
      }
      var n = Number(raw);
      if (!Number.isFinite(n)) {
        render(false);
        return;
      }
      setMax(n, true);
    }

    if (isRange) {
      if (inputMin) {
        inputMin.addEventListener("change", commitInputMin);
        inputMin.addEventListener("blur", commitInputMin);
      }
      if (inputMax) {
        inputMax.addEventListener("change", commitInputMax);
        inputMax.addEventListener("blur", commitInputMax);
      }
    } else if (inputSingle) {
      inputSingle.addEventListener("change", commitInputSingle);
      inputSingle.addEventListener("blur", commitInputSingle);
    }

    root.setAttribute("data-percent-slider-init", "1");

    /** @type {{ getValue: () => number | { min: number; max: number }; setValue: (n: number) => void; setRange: (minValue: number, maxValue: number) => void; destroy: () => void }} */
    var api = {
      getValue: function () {
        return isRange ? { min: valueMin, max: valueMax } : value;
      },
      setValue: function (n) {
        if (!isRange) {
          setSingle(n, false);
        }
      },
      setRange: function (minValue, maxValue) {
        if (isRange) {
          setRange(minValue, maxValue, false);
        }
      },
      destroy: function () {
        root.removeAttribute("data-percent-slider-init");
        delete root.percentSlider;
      },
    };
    root.percentSlider = api;

    if (isRange) {
      setRange(valueMin, valueMax, false);
    } else {
      setSingle(value, false);
    }
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
