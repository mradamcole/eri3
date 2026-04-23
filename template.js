(function () {
  "use strict";

  /** @type {{ label: string, description: string }[]} */
  const CONDITIONS = [
    {
      label: "Multiple sclerosis - Neuropathic pain (8A40)",
      description:
        "Chronic inflammatory demyelinating disease of the central nervous system.",
    },
    {
      label: "Multiple sclerosis - Muscle spasticity (8A40)",
      description:
        "Chronic inflammatory demyelinating disease of the central nervous system.",
    },
    {
      label: "Epilepsy - Adjunct seizure control (8A61.0)",
      description:
        "Recurrent unprovoked seizures due to abnormal cortical excitability.",
    },
    {
      label: "Fibromyalgia - Widespread pain (MG22.6)",
      description:
        "Chronic widespread pain with multifactorial central sensitization.",
    },
    {
      label: "Post-traumatic stress disorder - Hyperarousal and sleep (6B40)",
      description:
        "Trauma-related disorder with intrusive symptoms and heightened vigilance.",
    },
    {
      label: "Chronic non-cancer pain - Nociceptive back pain (ME93.0)",
      description:
        "Persistent pain beyond expected tissue healing with mechanical contributors.",
    },
    {
      label: "Parkinson disease - Motor fluctuations (8A00.0)",
      description:
        "Neurodegenerative parkinsonism with progressive dopaminergic cell loss.",
    },
    {
      label: "Cancer-related pain - Breakthrough pain (2D42)",
      description:
        "Pain related to malignancy or its treatment, including episodic worsening.",
    },
  ];

  function normalize(s) {
    return s.trim().toLowerCase();
  }

  function filterConditions(query) {
    const q = normalize(query);
    if (!q) return CONDITIONS.map((_, i) => i);
    return CONDITIONS.map((c, i) => (normalize(c.label).includes(q) ? i : -1)).filter(
      (i) => i >= 0
    );
  }

  function findExactIndex(value) {
    const v = value.trim();
    const idx = CONDITIONS.findIndex((c) => c.label === v);
    return idx;
  }

  function initConditionCombobox() {
    const root = document.getElementById("conditionCombobox");
    const input = document.getElementById("conditionInput");
    const listbox = document.getElementById("conditionListbox");
    const hint = document.getElementById("conditionHint");
    const toggleBtn = document.getElementById("conditionToggleBtn");
    if (!root || !input || !listbox || !hint || !toggleBtn) return;

    /** @type {number[]} */
    let openIndices = [];
    let activeIdx = -1;
    let listOpen = false;

    function setListOpen(open) {
      listOpen = open;
      listbox.hidden = !open;
      input.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        activeIdx = -1;
        input.setAttribute("aria-activedescendant", "");
      }
    }

    function renderOptions(indices) {
      listbox.textContent = "";
      openIndices = indices;
      indices.forEach((condIdx, i) => {
        const c = CONDITIONS[condIdx];
        const li = document.createElement("li");
        li.id = "condition-opt-" + i;
        li.className = "clinical-context__listbox-option";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.textContent = c.label;
        li.dataset.condIndex = String(condIdx);
        li.addEventListener("mousedown", function (e) {
          e.preventDefault();
          applySelection(condIdx);
          setListOpen(false);
          input.focus();
        });
        listbox.appendChild(li);
      });
    }

    function highlightActive() {
      const items = listbox.querySelectorAll('[role="option"]');
      items.forEach((el, i) => {
        el.setAttribute("aria-selected", i === activeIdx ? "true" : "false");
      });
      const active = listbox.querySelector("#condition-opt-" + activeIdx);
      if (active && listOpen && activeIdx >= 0) {
        input.setAttribute("aria-activedescendant", active.id);
      } else {
        input.setAttribute("aria-activedescendant", "");
      }
    }

    function applySelection(condIndex) {
      const c = CONDITIONS[condIndex];
      input.value = c.label;
      hint.textContent = c.description;
    }

    function syncHintFromValue() {
      const exact = findExactIndex(input.value);
      if (exact >= 0) {
        hint.textContent = CONDITIONS[exact].description;
      } else {
        hint.textContent = "";
      }
    }

    function openWithFilter() {
      const indices = filterConditions(input.value);
      if (indices.length === 0) {
        listbox.textContent = "";
        openIndices = [];
        setListOpen(false);
        return;
      }
      renderOptions(indices);
      activeIdx = 0;
      setListOpen(true);
      highlightActive();
    }

    function moveActive(delta) {
      if (!listOpen || openIndices.length === 0) return;
      activeIdx = (activeIdx + delta + openIndices.length) % openIndices.length;
      highlightActive();
      const opt = listbox.querySelector("#condition-opt-" + activeIdx);
      if (opt) opt.scrollIntoView({ block: "nearest" });
    }

    function commitActive() {
      if (!listOpen || activeIdx < 0 || activeIdx >= openIndices.length) return;
      const condIndex = openIndices[activeIdx];
      applySelection(condIndex);
      setListOpen(false);
    }

    input.addEventListener("input", function () {
      syncHintFromValue();
      openWithFilter();
    });

    input.addEventListener("focus", function () {
      openWithFilter();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!listOpen) openWithFilter();
        else moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!listOpen) openWithFilter();
        else moveActive(-1);
      } else if (e.key === "Enter") {
        if (listOpen && activeIdx >= 0) {
          e.preventDefault();
          commitActive();
        }
      } else if (e.key === "Escape") {
        if (listOpen) {
          e.preventDefault();
          setListOpen(false);
        }
      }
    });

    toggleBtn.addEventListener("click", function () {
      if (listOpen) {
        setListOpen(false);
      } else {
        openWithFilter();
        input.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!root.contains(/** @type {Node} */ (e.target))) {
        setListOpen(false);
      }
    });

    applySelection(0);
  }

  function initEvidenceCard() {
    const root = document.querySelector("[data-evidence-card]");
    if (!root || !window.ChevronProgress) return;

    const host = root.querySelector("[data-evidence-stepper-host]");
    if (!host) return;

    const steps = [
      "Evidence Synthesis",
      "Safety",
      "Monitoring",
      "Key References",
    ];
    const tabIds = [
      "evidence-tab-0",
      "evidence-tab-1",
      "evidence-tab-2",
      "evidence-tab-3",
    ];
    const panelIds = [
      "evidence-panel-0",
      "evidence-panel-1",
      "evidence-panel-2",
      "evidence-panel-3",
    ];

    /** @type {(HTMLElement|null)[]} */
    const panels = panelIds.map(function (id) {
      return document.getElementById(id);
    });
    if (panels.some(function (p) { return !p; })) return;

    const chevronApi = window.ChevronProgress.init(host, {
      steps: steps,
      activeIndex: 0,
      tabs: {
        tablistLabel: "Evidence review steps",
        tabIds: tabIds,
        panelIds: panelIds,
      },
    });

    const tablist = host.querySelector('[role="tablist"]');
    /** @type {HTMLElement[]} */
    const tabs = Array.from(host.querySelectorAll('[role="tab"]'));
    if (!tablist || tabs.length === 0) return;

    let selected = 0;

    function selectTab(index) {
      const n = tabs.length;
      if (n === 0) return;
      selected = ((index % n) + n) % n;

      chevronApi.setActiveIndex(selected);

      panels.forEach(function (panel, i) {
        if (!panel) return;
        if (i === selected) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        selectTab(i);
        tab.focus();
      });
    });

    tablist.addEventListener("keydown", function (e) {
      const key = e.key;
      if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") return;
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.getAttribute("role") !== "tab") return;
      e.preventDefault();
      const i = tabs.indexOf(t);
      if (i < 0) return;
      if (key === "ArrowRight") selectTab(i + 1);
      else if (key === "ArrowLeft") selectTab(i - 1);
      else if (key === "Home") selectTab(0);
      else selectTab(tabs.length - 1);
      tabs[selected].focus();
    });

    selectTab(0);
  }

  function initFormulationFormatSelect() {
    const mount = document.getElementById("formulationFormatTmsd");
    const api = window.TableMultiselectDropdown;
    if (!mount || !api || typeof api.create !== "function") return;
    api.create(mount, {
      ...api.EXAMPLE_FORMAT_OPTIONS,
      placeholder: "Search delivery formats…",
      ariaLabel: "Delivery formats",
      multiple: true,
      selectAllButton: true,
      clearAllButton: true,
      selectAllSingleClickGroupIndexes: [0],
    });
  }

  function initFormulationCannabinoidSelect() {
    const mount = document.getElementById("formulationCannabinoidTmsd");
    const api = window.TableMultiselectDropdown;
    if (!mount || !api || typeof api.create !== "function") return;
    api.create(mount, {
      ...api.EXAMPLE_CANNABINOID_OPTIONS,
      placeholder: "Search cannabinoids…",
      ariaLabel: "Cannabinoids of interest",
      multiple: true,
      selectAllButton: true,
      clearAllButton: true,
      selectAllSingleClickGroupIndexes: [0],
    });
  }

  const FORMULATION_THC_MSG_ZERO =
    "Clinical note: THC-free products may be appropriate for patients avoiding psychoactive effects. However, evidence suggests that small amounts of THC can enhance or modify the effects of other cannabinoids ('entourage effect').";

  const FORMULATION_THC_MSG_HIGH =
    "Higher THC levels may increase the risk of adverse effects, including anxiety, dizziness, cognitive impairment, and sedation. Consider whether a lower THC dose or inclusion of CBD may better support tolerability, especially for cannabis-naïve or sensitive patients.";

  function initFormulationThcNote() {
    const slider = document.getElementById("formulationThcSlider");
    const note = document.getElementById("formulationThcNote");
    const exposure = document.querySelector(
      'input[name="ccChar"][value="cannabinoid_exposure"]'
    );
    if (!slider || !note || !exposure) return;

    function readSliderPercent() {
      const input = slider.querySelector("[data-slider-input]");
      if (!input) return Number.NaN;
      const n = Number(String(input.value).trim());
      return Number.isFinite(n) ? n : Number.NaN;
    }

    function refreshFormulationThcNote() {
      const v = readSliderPercent();
      if (!Number.isFinite(v)) {
        note.textContent = "";
        return;
      }
      if (v === 0) {
        note.textContent = FORMULATION_THC_MSG_ZERO;
        return;
      }
      const threshold = exposure.checked ? 10 : 5;
      note.textContent = v > threshold ? FORMULATION_THC_MSG_HIGH : "";
    }

    slider.addEventListener("percent-slider-change", refreshFormulationThcNote);
    exposure.addEventListener("change", refreshFormulationThcNote);
    queueMicrotask(refreshFormulationThcNote);
  }

  function initTemplatePage() {
    initConditionCombobox();
    initEvidenceCard();
    initFormulationFormatSelect();
    initFormulationCannabinoidSelect();
    initFormulationThcNote();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTemplatePage);
  } else {
    initTemplatePage();
  }
})();
