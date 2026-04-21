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
    var tickPosRaw = root.getAttribute("data-ticks") || "none";
    var tickMinorRaw = root.getAttribute("data-tick-minor");
    var tickMajorRaw = root.getAttribute("data-tick-major");
    var tickCustomRaw = root.getAttribute("data-tick-custom");
    var tickLabelSizeRaw = root.getAttribute("data-tick-label-size") || "0.62rem";
    var tickLabelRotateRaw = parseNum(root.getAttribute("data-tick-label-rotate"), 0);
    var snapModeRaw = root.getAttribute("data-snap") || "increment";
    /** @type {Record<string, string>} */
    var tickPosClassByName = {
      none: "percent-slider--ticks-none",
      above: "percent-slider--ticks-above",
      below: "percent-slider--ticks-below",
    };
    /** @type {Record<string, boolean>} */
    var snapModeByName = {
      none: true,
      increment: true,
      minor: true,
      major: true,
      custom: true,
    };
    var snapMode = snapModeByName[snapModeRaw] ? snapModeRaw : "increment";
    var tickPos = tickPosClassByName[tickPosRaw] ? tickPosRaw : "none";
    var tickPosClassList = Object.keys(tickPosClassByName).map(function (k) {
      return tickPosClassByName[k];
    });
    var ticksContainer = root.querySelector("[data-slider-ticks]");

    if (!knobMin && knobSingle) {
      knobMin = knobSingle;
    }
    if (isRange && !knobMax) {
      isRange = false;
    }

    if (!track || !fill || !knobMin) {
      return;
    }
    if (!ticksContainer) {
      ticksContainer = document.createElement("div");
      ticksContainer.className = "percent-slider__ticks";
      ticksContainer.setAttribute("data-slider-ticks", "");
      if (track.parentElement) {
        track.parentElement.appendChild(ticksContainer);
      }
    }

    var min = parseNum(root.getAttribute("data-min"), 0);
    var max = parseNum(root.getAttribute("data-max"), 100);
    var step = parseNum(root.getAttribute("data-step"), 5);
    var fillAttr = root.getAttribute("data-fill");
    var fillEnabled = fillAttr !== "false" && fillAttr !== "0";
    var fillColor = root.getAttribute("data-fill-color") || "#8b0000";
    var trackColorRaw = root.getAttribute("data-track-color");
    var trackBaseDefault = "#3a3a3a";
    function isHexColorToken(s) {
      return (
        typeof s === "string" &&
        /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(s.trim())
      );
    }
    var trackBase =
      trackColorRaw && isHexColorToken(trackColorRaw)
        ? trackColorRaw.trim()
        : trackBaseDefault;
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
      "house-inverted": "percent-slider--knob-house-inverted",
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
    root.style.setProperty("--percent-slider-track-base", trackBase);
    root.style.setProperty("--percent-slider-tick-label-size", tickLabelSizeRaw);
    root.style.setProperty(
      "--percent-slider-tick-label-rotate",
      String(tickLabelRotateRaw) + "deg"
    );
    for (var tp = 0; tp < tickPosClassList.length; tp++) {
      root.classList.remove(tickPosClassList[tp]);
    }
    root.classList.add(tickPosClassByName[tickPos]);
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
      valueMin = clamp(initialMin, min, max);
      valueMax = clamp(initialMax, min, max);
      if (valueMin > valueMax) {
        valueMin = valueMax;
      }
    } else {
      var initial = parseNum(root.getAttribute("data-value"), Number.NaN);
      if (!Number.isFinite(initial)) {
        initial = min;
      }
      value = clamp(initial, min, max);
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

    function parseTickInterval(raw) {
      if (raw === null || raw === undefined || raw === "") {
        return null;
      }
      var n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        return null;
      }
      return n;
    }

    function readCustomTicks() {
      if (!tickCustomRaw) {
        return [];
      }
      var parsed;
      try {
        parsed = JSON.parse(tickCustomRaw);
      } catch (e) {
        return [];
      }
      if (!Array.isArray(parsed)) {
        return [];
      }
      /** @type {Array<{ pct: number, label: string }>} */
      var out = [];
      for (var i = 0; i < parsed.length; i++) {
        var entry = parsed[i];
        if (!entry || typeof entry !== "object") {
          continue;
        }
        var v = Number(entry.value);
        if (!Number.isFinite(v)) {
          continue;
        }
        var pct = clamp(v, 0, 1) * 100;
        var label = "";
        if (entry.label !== undefined && entry.label !== null) {
          label = String(entry.label);
        }
        out.push({ pct: pct, label: label });
      }
      return out;
    }

    function tickPctToValue(pct) {
      return min + (max - min) * (pct / 100);
    }

    function snapToNearest(valueToSnap, points) {
      if (!points.length) {
        return valueToSnap;
      }
      var best = points[0];
      var bestDist = Math.abs(valueToSnap - points[0]);
      for (var i = 1; i < points.length; i++) {
        var d = Math.abs(valueToSnap - points[i]);
        if (d < bestDist) {
          bestDist = d;
          best = points[i];
        }
      }
      return best;
    }

    function snapByIntervalPercent(valueToSnap, intervalPct) {
      if (intervalPct === null) {
        return valueToSnap;
      }
      var valueStep = ((max - min) * intervalPct) / 100;
      if (!(valueStep > 0)) {
        return valueToSnap;
      }
      return snapToStep(valueToSnap, min, max, valueStep);
    }

    var tickMinorInterval = parseTickInterval(tickMinorRaw);
    var tickMajorInterval = parseTickInterval(tickMajorRaw);
    var customTicks = readCustomTicks();
    /** @type {number[]} */
    var customTickSnapValues = [];
    for (var csi = 0; csi < customTicks.length; csi++) {
      customTickSnapValues.push(tickPctToValue(customTicks[csi].pct));
    }

    function normalizeBySnapMode(next) {
      var clamped = clamp(next, min, max);
      if (snapMode === "none") {
        return clamped;
      }
      if (snapMode === "increment") {
        return snapToStep(clamped, min, max, step);
      }
      if (snapMode === "minor") {
        return snapByIntervalPercent(clamped, tickMinorInterval);
      }
      if (snapMode === "major") {
        return snapByIntervalPercent(clamped, tickMajorInterval);
      }
      if (snapMode === "custom") {
        if (!customTickSnapValues.length) {
          return clamped;
        }
        return clamp(snapToNearest(clamped, customTickSnapValues), min, max);
      }
      return clamped;
    }

    function buildIntervalTicks(interval) {
      if (interval === null) {
        return [];
      }
      /** @type {number[]} */
      var out = [];
      var stepCount = Math.floor(100 / interval);
      for (var i = 0; i <= stepCount; i++) {
        out.push(i * interval);
      }
      if (out.length === 0 || Math.abs(out[out.length - 1] - 100) > 0.0001) {
        out.push(100);
      }
      return out;
    }

    function renderTicks() {
      if (!ticksContainer) {
        return;
      }
      ticksContainer.textContent = "";
      if (tickPos === "none") {
        return;
      }
      var minorTicks = buildIntervalTicks(tickMinorInterval);
      var majorTicks = buildIntervalTicks(tickMajorInterval);

      function addTick(type, pct, label) {
        var clampedPct = clamp(pct, 0, 100);
        var tickEl = document.createElement("div");
        tickEl.className = "percent-slider__tick percent-slider__tick--" + type;
        tickEl.style.left = clampedPct + "%";
        ticksContainer.appendChild(tickEl);
        if (type === "custom" && label) {
          var labelEl = document.createElement("span");
          labelEl.className =
            "percent-slider__tick-label percent-slider__tick-label--custom";
          labelEl.style.left = clampedPct + "%";
          labelEl.textContent = label;
          ticksContainer.appendChild(labelEl);
        }
      }

      for (var mi = 0; mi < minorTicks.length; mi++) {
        addTick("minor", minorTicks[mi], "");
      }
      for (var ma = 0; ma < majorTicks.length; ma++) {
        addTick("major", majorTicks[ma], "");
      }
      for (var cu = 0; cu < customTicks.length; cu++) {
        addTick("custom", customTicks[cu].pct, customTicks[cu].label);
      }
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
      value = normalizeBySnapMode(next);
      render(emit);
    }

    function setMin(next, emit) {
      var snapped = normalizeBySnapMode(next);
      valueMin = clamp(snapped, min, valueMax);
      render(emit);
    }

    function setMax(next, emit) {
      var snapped = normalizeBySnapMode(next);
      valueMax = clamp(snapped, valueMin, max);
      render(emit);
    }

    function setRange(nextMin, nextMax, emit) {
      var snappedMin = normalizeBySnapMode(nextMin);
      var snappedMax = normalizeBySnapMode(nextMax);
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
    renderTicks();

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
