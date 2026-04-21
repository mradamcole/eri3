(function () {
  "use strict";

  var MIN_STEPS = 2;
  var MAX_STEPS = 10;

  var NS = "chevron-progress";
  var GEOM = [NS + "__step--first", NS + "__step--middle", NS + "__step--last"];
  var STATE = [
    NS + "__step--before",
    NS + "__step--current",
    NS + "__step--after",
  ];

  function validateSteps(steps) {
    if (!Array.isArray(steps)) {
      throw new TypeError("ChevronProgress: steps must be an array of strings.");
    }
    if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) {
      throw new Error(
        "ChevronProgress: steps length must be between " +
          MIN_STEPS +
          " and " +
          MAX_STEPS +
          " (inclusive)."
      );
    }
    for (var i = 0; i < steps.length; i++) {
      if (typeof steps[i] !== "string") {
        throw new TypeError(
          "ChevronProgress: each step must be a string (index " + i + ")."
        );
      }
    }
  }

  function geometryClass(index, n) {
    if (index === 0) {
      return GEOM[0];
    }
    if (index === n - 1) {
      return GEOM[2];
    }
    return GEOM[1];
  }

  function stateClass(index, activeIndex) {
    if (index < activeIndex) {
      return STATE[0];
    }
    if (index === activeIndex) {
      return STATE[1];
    }
    return STATE[2];
  }

  function stripStateClasses(el) {
    for (var s = 0; s < STATE.length; s++) {
      el.classList.remove(STATE[s]);
    }
  }

  function applyStepState(stepEl, index, activeIndex, tabsMode) {
    stripStateClasses(stepEl);
    stepEl.classList.add(stateClass(index, activeIndex));
    if (tabsMode) {
      var on = index === activeIndex;
      stepEl.setAttribute("aria-selected", on ? "true" : "false");
      stepEl.tabIndex = on ? 0 : -1;
      stepEl.removeAttribute("aria-current");
    } else {
      if (index === activeIndex) {
        stepEl.setAttribute("aria-current", "step");
      } else {
        stepEl.removeAttribute("aria-current");
      }
    }
  }

  function validateTabsOptions(tabs, n) {
    if (!tabs || typeof tabs !== "object") {
      return null;
    }
    var ids = tabs.tabIds;
    var panels = tabs.panelIds;
    if (!Array.isArray(ids) || !Array.isArray(panels)) {
      throw new TypeError(
        "ChevronProgress.tabs: tabIds and panelIds must be arrays."
      );
    }
    if (ids.length !== n || panels.length !== n) {
      throw new Error(
        "ChevronProgress.tabs: tabIds and panelIds must have the same length as steps."
      );
    }
    for (var t = 0; t < n; t++) {
      if (typeof ids[t] !== "string" || typeof panels[t] !== "string") {
        throw new TypeError(
          "ChevronProgress.tabs: each tab id and panel id must be a string."
        );
      }
    }
    return tabs;
  }

  /**
   * @param {HTMLElement} container
   * @param {{
   *   steps: string[],
   *   activeIndex?: number,
   *   tabs?: { tablistLabel?: string, tabIds: string[], panelIds: string[] }
   * }} options
   * @returns {{ setActiveIndex: function(number): void, getActiveIndex: function(): number, destroy: function(): void }}
   */
  function init(container, options) {
    if (!container || !container.appendChild) {
      throw new TypeError("ChevronProgress: container must be a DOM element.");
    }
    var steps = options && options.steps ? options.steps : [];
    validateSteps(steps);

    var n = steps.length;
    var activeIndex =
      options && typeof options.activeIndex === "number"
        ? options.activeIndex
        : 0;
    if (activeIndex < 0 || activeIndex > n - 1 || !Number.isFinite(activeIndex)) {
      activeIndex = 0;
    }
    activeIndex = Math.floor(activeIndex);

    var tabsOpt = options && options.tabs ? validateTabsOptions(options.tabs, n) : null;
    var tabsMode = tabsOpt !== null;

    var outer = document.createElement(tabsMode ? "div" : "nav");
    outer.className = NS;
    if (!tabsMode) {
      outer.setAttribute("aria-label", "Progress");
    }

    var list = document.createElement("ol");
    list.className = NS + "__list";
    if (tabsMode) {
      list.setAttribute("role", "tablist");
      list.setAttribute(
        "aria-label",
        typeof tabsOpt.tablistLabel === "string" && tabsOpt.tablistLabel
          ? tabsOpt.tablistLabel
          : "Progress"
      );
      list.setAttribute("aria-orientation", "horizontal");
    }

    var stepEls = [];

    for (var i = 0; i < n; i++) {
      var li = document.createElement("li");
      li.className = NS + "__step " + geometryClass(i, n);
      if (tabsMode) {
        li.setAttribute("role", "tab");
        li.setAttribute("id", tabsOpt.tabIds[i]);
        li.setAttribute("aria-controls", tabsOpt.panelIds[i]);
      }
      applyStepState(li, i, activeIndex, tabsMode);

      var span = document.createElement("span");
      span.className = NS + "__label";
      span.textContent = steps[i];
      li.appendChild(span);

      list.appendChild(li);
      stepEls.push(li);
    }

    outer.appendChild(list);
    container.appendChild(outer);

    function setActiveIndex(i) {
      if (typeof i !== "number" || !Number.isFinite(i)) {
        return;
      }
      var next = Math.floor(i);
      if (next < 0) {
        next = 0;
      }
      if (next > n - 1) {
        next = n - 1;
      }
      activeIndex = next;
      for (var j = 0; j < stepEls.length; j++) {
        applyStepState(stepEls[j], j, activeIndex, tabsMode);
      }
    }

    function getActiveIndex() {
      return activeIndex;
    }

    function destroy() {
      if (outer.parentNode) {
        outer.parentNode.removeChild(outer);
      }
    }

    return {
      setActiveIndex: setActiveIndex,
      getActiveIndex: getActiveIndex,
      destroy: destroy,
    };
  }

  window.ChevronProgress = {
    init: init,
  };
})();
