(function () {
  "use strict";

  /**
   * Table + multiselect combobox widget.
   * Columns: { label: string, sortable?: boolean, sortOrder?: string[] }[].
   * Data rows: string[] or { type: 'data', cells: string[], id?: string }.
   * Dividers: { type: 'divider', text: string, colspan?: number }.
   * Grid pattern: role="grid" on table, aria-selected on data rows (see WAI-ARIA grid).
   */

  var MARGIN = 12;
  var GAP = 4;

  /**
   * @param {unknown} row
   * @returns {boolean}
   */
  function isDividerRow(row) {
    return (
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      /** @type {{ type?: string }} */ (row).type === "divider"
    );
  }

  /**
   * @param {unknown} row
   * @returns {boolean}
   */
  function isDataRow(row) {
    if (Array.isArray(row)) {
      return true;
    }
    if (
      row !== null &&
      typeof row === "object" &&
      /** @type {{ type?: string, cells?: unknown }} */ (row).type === "data" &&
      Array.isArray(/** @type {{ cells: unknown[] }} */ (row).cells)
    ) {
      return true;
    }
    return false;
  }

  /**
   * @param {unknown} row
   * @returns {string[]}
   */
  function getCells(row) {
    if (Array.isArray(row)) {
      return /** @type {string[]} */ (row);
    }
    return /** @type {string[]} */ (
      /** @type {{ cells: string[] }} */ (row).cells
    );
  }

  /**
   * @param {unknown} row
   * @returns {string | null}
   */
  function getUserId(row) {
    if (
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      /** @type {{ id?: string }} */ (row).id
    ) {
      var id = /** @type {{ id?: string }} */ (row).id;
      return typeof id === "string" && id ? id : null;
    }
    return null;
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  function escId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  /**
   * @typedef {{ kind: 'data', id: string, cells: string[], tr: HTMLTableRowElement | null }} TmsdDataModel
   * @typedef {{ kind: 'divider', id: string, text: string, colspan: number, tr: HTMLTableRowElement | null }} TmsdDividerModel
   * @typedef {TmsdDataModel | TmsdDividerModel} TmsdNormalizedRow
   */

  /**
   * @param {TmsdNormalizedRow[]} model
   * @param {Record<string, boolean>} dataVisibleById
   * @returns {Record<string, boolean>}
   */
  function dividerVisibility(model, dataVisibleById) {
    /** @type {Record<string, boolean>} */
    var out = {};
    var i;
    var j;
    for (i = 0; i < model.length; i++) {
      if (model[i].kind !== "divider") {
        continue;
      }
      var id = model[i].id;
      var show = false;
      for (j = i + 1; j < model.length; j++) {
        if (model[j].kind === "divider") {
          break;
        }
        if (model[j].kind === "data" && dataVisibleById[model[j].id]) {
          show = true;
          break;
        }
      }
      out[id] = show;
    }
    return out;
  }

  /**
   * @param {string} q
   * @param {string[]} cells
   * @returns {boolean}
   */
  function rowMatchesFilter(q, cells) {
    if (!q) {
      return true;
    }
    var i;
    var needle = q.toLowerCase();
    for (i = 0; i < cells.length; i++) {
      if (String(cells[i]).toLowerCase().indexOf(needle) !== -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {string} value
   * @returns {number | null}
   */
  function parseSortableNumber(value) {
    var normalized = String(value).replace(/,/g, "").trim();
    if (!normalized) {
      return null;
    }
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
      return null;
    }
    var num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function normalizeSortValue(value) {
    return String(value).trim().toLowerCase();
  }

  /**
   * @param {TmsdDataModel} a
   * @param {TmsdDataModel} b
   * @param {{ index: number, sortOrder: string[], sortRankByValue: Record<string, number> }} column
   * @returns {number}
   */
  function compareDataRows(a, b, column) {
    var av = a.cells[column.index] || "";
    var bv = b.cells[column.index] || "";
    if (column.sortOrder.length) {
      var aKey = normalizeSortValue(av);
      var bKey = normalizeSortValue(bv);
      var aRank = column.sortRankByValue[aKey];
      var bRank = column.sortRankByValue[bKey];
      var aInOrder = Object.prototype.hasOwnProperty.call(
        column.sortRankByValue,
        aKey
      );
      var bInOrder = Object.prototype.hasOwnProperty.call(
        column.sortRankByValue,
        bKey
      );
      if (aInOrder && bInOrder) {
        if (aRank < bRank) {
          return -1;
        }
        if (aRank > bRank) {
          return 1;
        }
        return 0;
      }
      return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
    }
    var an = parseSortableNumber(av);
    var bn = parseSortableNumber(bv);
    if (an !== null && bn !== null) {
      if (an < bn) {
        return -1;
      }
      if (an > bn) {
        return 1;
      }
      return 0;
    }
    return String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
  }

  /**
   * @param {object} options
   * @param {{ label: string, sortable?: boolean, sortOrder?: string[] }[]} options.columns
   * @param {unknown[]} options.rows
   * @param {boolean} [options.multiple]
   * @param {string} [options.placeholder]
   * @param {function (selected: { id: string, cells: string[] }[]): void} [options.onChange]
   * @param {number} [options.maxSelections]
   * @param {string} [options.ariaLabel]
   * @param {boolean} [options.clearFilterOnClose]
   * @param {boolean} [options.selectAllButton]
   * @param {boolean} [options.clearAllButton]
   * @returns {{ destroy: function (): void, getValue: function (): { id: string, cells: string[] }[], setValue: function (ids: string[]): void, open: function (): void, close: function (): void, root: HTMLElement }}
   */
  function create(container, options) {
    if (!container || !options || !Array.isArray(options.columns)) {
      throw new Error("[table-multiselect-dropdown] container and options.columns required");
    }
    var columns = options.columns.map(function (col, idx) {
      if (!col || typeof col !== "object" || Array.isArray(col)) {
        throw new Error(
          "[table-multiselect-dropdown] columns[" +
            idx +
            "] must be an object: { label: string, sortable?: boolean, sortOrder?: string[] }"
        );
      }
      var label = /** @type {{ label?: unknown }} */ (col).label;
      if (typeof label !== "string") {
        throw new Error(
          "[table-multiselect-dropdown] columns[" + idx + "].label must be a string"
        );
      }
      var rawSortOrder = /** @type {{ sortOrder?: unknown }} */ (col).sortOrder;
      if (typeof rawSortOrder !== "undefined" && !Array.isArray(rawSortOrder)) {
        throw new Error(
          "[table-multiselect-dropdown] columns[" + idx + "].sortOrder must be a string[]"
        );
      }
      var sortOrder = Array.isArray(rawSortOrder)
        ? rawSortOrder.map(function (v) {
            return String(v);
          })
        : [];
      /** @type {Record<string, number>} */
      var sortRankByValue = {};
      var rankIndex;
      for (rankIndex = 0; rankIndex < sortOrder.length; rankIndex++) {
        var token = normalizeSortValue(sortOrder[rankIndex]);
        if (!Object.prototype.hasOwnProperty.call(sortRankByValue, token)) {
          sortRankByValue[token] = rankIndex;
        }
      }
      return {
        index: idx,
        label: label,
        sortable: /** @type {{ sortable?: boolean }} */ (col).sortable === true,
        sortOrder: sortOrder,
        sortRankByValue: sortRankByValue,
      };
    });
    var rawRows = Array.isArray(options.rows) ? options.rows : [];
    var multiple = options.multiple !== false;
    var placeholder = options.placeholder || "Search…";
    var onChange = typeof options.onChange === "function" ? options.onChange : null;
    var maxSelections =
      typeof options.maxSelections === "number" && options.maxSelections > 0
        ? options.maxSelections
        : Infinity;
    var ariaLabel = options.ariaLabel || "Options";
    var clearFilterOnClose = options.clearFilterOnClose === true;
    var selectAllButtonEnabled = multiple && options.selectAllButton === true;
    var clearAllButtonEnabled = multiple && options.clearAllButton === true;
    var showBulk = selectAllButtonEnabled || clearAllButtonEnabled;

    var colCount = columns.length;

    /** @type {TmsdNormalizedRow[]} */
    var model = [];
    var dataRowIndex = 0;
    var dividerIndex = 0;
    var r;
    for (r = 0; r < rawRows.length; r++) {
      var row = rawRows[r];
      if (isDividerRow(row)) {
        var dText = String(/** @type {{ text?: string }} */ (row).text || "");
        var dCol =
          typeof /** @type {{ colspan?: number }} */ (row).colspan === "number"
            ? /** @type {{ colspan: number }} */ (row).colspan
            : colCount;
        model.push({
          kind: "divider",
          id: "divider-" + dividerIndex++,
          text: dText,
          colspan: Math.max(1, dCol),
          tr: null,
        });
      } else if (isDataRow(row)) {
        var cells = getCells(row).map(function (c) {
          return String(c);
        });
        while (cells.length < colCount) {
          cells.push("");
        }
        if (cells.length > colCount) {
          cells.length = colCount;
        }
        var uid = getUserId(row);
        var id = uid || "row-" + dataRowIndex++;
        model.push({
          kind: "data",
          id: id,
          cells: cells,
          tr: null,
        });
      } else if (typeof console !== "undefined" && console.warn) {
        console.warn("[table-multiselect-dropdown] Skipping invalid row", row);
      }
    }

    /** @type {Set<string>} */
    var selected = new Set();
    var open = false;
    var filterQuery = "";
    /** @type {string | null} */
    var activeRowId = null;
    /** @type {number | null} */
    var activeSortColumnIndex = null;
    /** @type {'asc' | 'desc' | null} */
    var sortDirection = null;
    /** @type {HTMLTableCellElement[]} */
    var headerCells = [];
    var baseModelOrder = model.slice();
    var uidSuffix = "-" + Math.random().toString(36).slice(2, 9);
    var listId = "tmsd-list-" + uidSuffix;

    var root = document.createElement("div");
    root.className = "tmsd";
    root.setAttribute("data-tmsd-root", "1");

    var bar = document.createElement("div");
    bar.className = "tmsd__bar";

    var pillsWrap = document.createElement("div");
    pillsWrap.className = "tmsd__pills";
    pillsWrap.setAttribute("aria-label", "Selected items");

    var inputWrap = document.createElement("div");
    inputWrap.className = "tmsd__input-wrap";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "tmsd__input";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.setAttribute("aria-haspopup", "grid");
    input.placeholder = placeholder;
    input.autocomplete = "off";
    input.spellcheck = false;

    var toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "tmsd__toggle";
    toggleBtn.setAttribute("aria-label", "Toggle list");
    toggleBtn.setAttribute("aria-expanded", "false");
    var toggleIcon = document.createElement("span");
    toggleIcon.className = "tmsd__toggle-icon";
    toggleIcon.setAttribute("aria-hidden", "true");
    toggleBtn.appendChild(toggleIcon);

    inputWrap.appendChild(input);
    bar.appendChild(pillsWrap);
    bar.appendChild(inputWrap);
    bar.appendChild(toggleBtn);

    /** @type {HTMLDivElement | null} */
    var bulkWrap = null;
    /** @type {HTMLButtonElement | null} */
    var selectAllBtn = null;
    /** @type {HTMLButtonElement | null} */
    var clearAllBtn = null;

    if (showBulk) {
      root.classList.add("tmsd--bulk");
      bulkWrap = document.createElement("div");
      bulkWrap.className = "tmsd__bulk";

      if (selectAllButtonEnabled) {
        selectAllBtn = document.createElement("button");
        selectAllBtn.type = "button";
        selectAllBtn.className = "tmsd__icon-btn";
        selectAllBtn.setAttribute("aria-label", "Select all visible options");
        selectAllBtn.title = "Select all visible options";
        selectAllBtn.innerHTML =
          '<span class="tmsd__icon-btn-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none">' +
          '<path d="M2.75 2.75h10.5v10.5H2.75z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<path d="M5.25 8.25 7.25 10.1 11.25 5.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          "</svg></span>" +
          '<span class="tmsd__icon-btn-label">All</span>';
        selectAllBtn.addEventListener("click", function () {
          selectAllVisible();
        });
        bulkWrap.appendChild(selectAllBtn);
      }

      if (clearAllButtonEnabled) {
        clearAllBtn = document.createElement("button");
        clearAllBtn.type = "button";
        clearAllBtn.className = "tmsd__icon-btn";
        clearAllBtn.setAttribute("aria-label", "Clear selection");
        clearAllBtn.title = "Clear selection";
        clearAllBtn.innerHTML =
          '<span class="tmsd__icon-btn-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none">' +
          '<circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.5"/>' +
          '<path d="M6.1 6.1 9.9 9.9M9.9 6.1 6.1 9.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
          "</svg></span>" +
          '<span class="tmsd__icon-btn-label">None</span>';
        clearAllBtn.addEventListener("click", function () {
          clearAllSelection();
        });
        bulkWrap.appendChild(clearAllBtn);
      }
    }

    var panel = document.createElement("div");
    panel.className = "tmsd__panel";
    panel.id = listId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", ariaLabel + " list");
    panel.hidden = true;

    var panelInner = document.createElement("div");
    panelInner.className = "tmsd__panelInner";

    var table = document.createElement("table");
    table.className = "tmsd__table";
    table.setAttribute("role", "grid");
    table.setAttribute("aria-label", ariaLabel);
    table.setAttribute("aria-multiselectable", multiple ? "true" : "false");

    var thead = document.createElement("thead");
    var thr = document.createElement("tr");
    var c;
    for (c = 0; c < columns.length; c++) {
      var th = document.createElement("th");
      var col = columns[c];
      headerCells.push(th);
      th.scope = "col";
      th.textContent = col.label;
      th.className = "tmsd__th";
      if (col.sortable) {
        th.classList.add("tmsd__th--sortable");
        th.setAttribute("aria-sort", "none");
        th.setAttribute("data-sort-state", "none");
        th.tabIndex = 0;
      }
      thr.appendChild(th);
    }
    thead.appendChild(thr);

    var tbody = document.createElement("tbody");
    var m;
    for (m = 0; m < model.length; m++) {
      var item = model[m];
      if (item.kind === "divider") {
        var dtr = document.createElement("tr");
        dtr.className = "tmsd__divider-row";
        dtr.setAttribute("role", "row");
        var dtd = document.createElement("td");
        dtd.colSpan = item.colspan;
        dtd.textContent = item.text;
        dtr.appendChild(dtd);
        tbody.appendChild(dtr);
        item.tr = dtr;
      } else {
        var tr = document.createElement("tr");
        tr.className = "tmsd__data-row";
        tr.setAttribute("role", "row");
        tr.dataset.rowId = item.id;
        tr.id = "tmsd-row-" + escId(item.id) + uidSuffix;
        tr.tabIndex = -1;
        var t;
        for (t = 0; t < item.cells.length; t++) {
          var td = document.createElement("td");
          if (t === 0) {
            td.className = "tmsd__cell--primary";
          }
          td.textContent = item.cells[t];
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
        item.tr = tr;
      }
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    panelInner.appendChild(table);
    panel.appendChild(panelInner);

    root.appendChild(bar);
    if (bulkWrap) {
      root.appendChild(bulkWrap);
    }
    root.appendChild(panel);
    container.appendChild(root);

    function getDataRowById(id) {
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind === "data" && model[k].id === id) {
          return model[k];
        }
      }
      return null;
    }

    function getVisibleDataIdsInOrder() {
      var ids = [];
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind !== "data" || !model[k].tr) {
          continue;
        }
        if (model[k].tr.hidden) {
          continue;
        }
        ids.push(model[k].id);
      }
      return ids;
    }

    function updateHeaderSortState() {
      var i;
      for (i = 0; i < columns.length; i++) {
        if (!columns[i].sortable || !headerCells[i]) {
          continue;
        }
        var state = "none";
        if (activeSortColumnIndex === i && sortDirection) {
          state = sortDirection === "asc" ? "ascending" : "descending";
        }
        headerCells[i].setAttribute("aria-sort", state);
        headerCells[i].setAttribute("data-sort-state", state);
      }
    }

    function reorderBodyRowsToModelOrder() {
      var i;
      for (i = 0; i < model.length; i++) {
        if (model[i].tr) {
          tbody.appendChild(model[i].tr);
        }
      }
    }

    function getModelForCurrentSort() {
      if (activeSortColumnIndex === null || !sortDirection) {
        return baseModelOrder.slice();
      }
      var direction = sortDirection === "asc" ? 1 : -1;
      /** @type {TmsdNormalizedRow[]} */
      var next = [];
      /** @type {TmsdDividerModel | null} */
      var currentDivider = null;
      /** @type {TmsdDataModel[]} */
      var currentData = [];

      function flushGroup() {
        if (currentDivider) {
          next.push(currentDivider);
        }
        if (!currentData.length) {
          return;
        }
        var stabilized = currentData.map(function (row, index) {
          return { row: row, index: index };
        });
        var activeColumn = columns[activeSortColumnIndex];
        stabilized.sort(function (a, b) {
          var cmp = compareDataRows(a.row, b.row, activeColumn);
          if (cmp === 0) {
            return a.index - b.index;
          }
          return cmp * direction;
        });
        var i;
        for (i = 0; i < stabilized.length; i++) {
          next.push(stabilized[i].row);
        }
      }

      var i;
      for (i = 0; i < baseModelOrder.length; i++) {
        var item = baseModelOrder[i];
        if (item.kind === "divider") {
          flushGroup();
          currentDivider = item;
          currentData = [];
        } else {
          currentData.push(item);
        }
      }
      flushGroup();
      return next;
    }

    function applySortModel() {
      model = getModelForCurrentSort();
      reorderBodyRowsToModelOrder();
      updateHeaderSortState();
      applyFilter();
    }

    function toggleSortForColumn(columnIndex) {
      if (!columns[columnIndex] || !columns[columnIndex].sortable) {
        return;
      }
      if (activeSortColumnIndex !== columnIndex) {
        activeSortColumnIndex = columnIndex;
        sortDirection = "asc";
      } else if (sortDirection === "asc") {
        sortDirection = "desc";
      } else if (sortDirection === "desc") {
        activeSortColumnIndex = null;
        sortDirection = null;
      } else {
        sortDirection = "asc";
      }
      applySortModel();
      positionPanel();
    }

    function setActiveRow(id) {
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind !== "data" || !model[k].tr) {
          continue;
        }
        model[k].tr.classList.toggle(
          "tmsd__data-row--active",
          id !== null && model[k].id === id
        );
      }
      activeRowId = id;
      if (id) {
        var rowEl = document.getElementById("tmsd-row-" + escId(id) + uidSuffix);
        if (rowEl) {
          input.setAttribute("aria-activedescendant", rowEl.id);
        }
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function applyFilter() {
      var q = filterQuery.trim();
      /** @type {Record<string, boolean>} */
      var dataVis = {};
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind !== "data" || !model[k].tr) {
          continue;
        }
        var vis = rowMatchesFilter(q, model[k].cells);
        dataVis[model[k].id] = vis;
        model[k].tr.hidden = !vis;
      }
      var divMap = dividerVisibility(model, dataVis);
      for (k = 0; k < model.length; k++) {
        if (model[k].kind === "divider" && model[k].tr) {
          model[k].tr.hidden = !divMap[model[k].id];
        }
      }
      var visibleIds = getVisibleDataIdsInOrder();
      if (activeRowId && visibleIds.indexOf(activeRowId) === -1) {
        setActiveRow(visibleIds.length ? visibleIds[0] : null);
      }
      if (!activeRowId && visibleIds.length) {
        setActiveRow(visibleIds[0]);
      }
      syncRowAriaSelected();
      updateBulkActionButtons();
    }

    function syncRowAriaSelected() {
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind !== "data" || !model[k].tr) {
          continue;
        }
        model[k].tr.setAttribute(
          "aria-selected",
          selected.has(model[k].id) ? "true" : "false"
        );
      }
    }

    function emitChange() {
      var out = getValue();
      if (onChange) {
        onChange(out);
      }
    }

    function getValue() {
      var out = [];
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind === "data" && selected.has(model[k].id)) {
          out.push({ id: model[k].id, cells: model[k].cells.slice() });
        }
      }
      return out;
    }

    function setValue(ids) {
      selected.clear();
      if (Array.isArray(ids)) {
        var i;
        for (i = 0; i < ids.length; i++) {
          if (getDataRowById(ids[i])) {
            selected.add(ids[i]);
          }
        }
      }
      syncRowAriaSelected();
      syncRowSelectedClass();
      renderPills();
      emitChange();
    }

    function syncRowSelectedClass() {
      var k;
      for (k = 0; k < model.length; k++) {
        if (model[k].kind !== "data" || !model[k].tr) {
          continue;
        }
        model[k].tr.classList.toggle(
          "tmsd__data-row--selected",
          selected.has(model[k].id)
        );
      }
    }

    function renderPills() {
      pillsWrap.innerHTML = "";
      var ids = Array.from(selected);
      var i;
      for (i = 0; i < ids.length; i++) {
        var dr = getDataRowById(ids[i]);
        if (!dr) {
          continue;
        }
        var pill = document.createElement("span");
        pill.className = "tmsd__pill";
        pill.dataset.pillFor = dr.id;

        var label = document.createElement("span");
        label.className = "tmsd__pill-label";
        label.textContent = dr.cells[0] || dr.id;

        var rm = document.createElement("button");
        rm.type = "button";
        rm.className = "tmsd__pill-remove";
        rm.setAttribute("aria-label", "Remove " + (dr.cells[0] || dr.id));
        rm.textContent = "\u00d7";
        rm.addEventListener("click", function (ev) {
          ev.stopPropagation();
          var rid = /** @type {HTMLElement} */ (ev.currentTarget).closest(
            ".tmsd__pill"
          );
          var idToRemove = rid ? rid.dataset.pillFor : null;
          if (idToRemove) {
            selected.delete(idToRemove);
            syncRowAriaSelected();
            syncRowSelectedClass();
            renderPills();
            emitChange();
          }
        });

        pill.appendChild(label);
        pill.appendChild(rm);
        pillsWrap.appendChild(pill);
      }
      updateBulkActionButtons();
    }

    function updateBulkActionButtons() {
      if (!showBulk) {
        return;
      }
      if (selectAllBtn) {
        var visible = getVisibleDataIdsInOrder();
        var canAdd = false;
        if (visible.length && selected.size < maxSelections) {
          var vi;
          for (vi = 0; vi < visible.length; vi++) {
            if (!selected.has(visible[vi])) {
              canAdd = true;
              break;
            }
          }
        }
        selectAllBtn.disabled = !canAdd;
      }
      if (clearAllBtn) {
        clearAllBtn.disabled = selected.size === 0;
      }
    }

    function selectAllVisible() {
      var visible = getVisibleDataIdsInOrder();
      var beforeSize = selected.size;
      var i;
      for (i = 0; i < visible.length; i++) {
        if (selected.size >= maxSelections) {
          break;
        }
        var vid = visible[i];
        if (!selected.has(vid)) {
          selected.add(vid);
        }
      }
      if (selected.size === beforeSize) {
        return;
      }
      syncRowAriaSelected();
      syncRowSelectedClass();
      renderPills();
      emitChange();
    }

    function clearAllSelection() {
      if (selected.size === 0) {
        return;
      }
      selected.clear();
      syncRowAriaSelected();
      syncRowSelectedClass();
      renderPills();
      emitChange();
    }

    function positionPanel() {
      if (!open) {
        return;
      }
      var barRect = bar.getBoundingClientRect();
      panel.style.visibility = "hidden";
      panel.hidden = false;
      panel.style.left = "0px";
      panel.style.top = "0px";
      panel.style.width = "auto";
      panel.style.maxWidth = "none";

      var prevTableWidth = table.style.width;
      var prevTableMinWidth = table.style.minWidth;
      var prevTableLayout = table.style.tableLayout;
      table.style.width = "max-content";
      table.style.minWidth = "0";
      table.style.tableLayout = "auto";
      var measuredTableWidth = table.getBoundingClientRect().width;
      table.style.width = prevTableWidth;
      table.style.minWidth = prevTableMinWidth;
      table.style.tableLayout = prevTableLayout;

      var panelComputed = window.getComputedStyle(panel);
      var borderX =
        parseFloat(panelComputed.borderLeftWidth || "0") +
        parseFloat(panelComputed.borderRightWidth || "0");
      var natural = Math.ceil(measuredTableWidth + borderX);
      var availRight = window.innerWidth - MARGIN - barRect.left;
      var w = Math.min(natural, Math.max(120, availRight));
      var left = barRect.left;
      if (left + w > window.innerWidth - MARGIN) {
        left = Math.max(MARGIN, window.innerWidth - MARGIN - w);
      }
      left = Math.max(MARGIN, left);

      var top = barRect.bottom + GAP;
      var maxH = window.innerHeight - MARGIN - top;
      if (maxH < 120) {
        maxH = Math.max(80, window.innerHeight - MARGIN * 2);
        top = Math.max(MARGIN, window.innerHeight - MARGIN - maxH);
      }

      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.width = w + "px";
      panel.style.maxHeight = maxH + "px";
      panel.style.visibility = "visible";
    }

    function openPanel() {
      if (open) {
        positionPanel();
        return;
      }
      open = true;
      root.classList.add("tmsd--open");
      input.setAttribute("aria-expanded", "true");
      toggleBtn.setAttribute("aria-expanded", "true");
      applyFilter();
      positionPanel();
    }

    function closePanel() {
      if (!open) {
        return;
      }
      open = false;
      root.classList.remove("tmsd--open");
      input.setAttribute("aria-expanded", "false");
      toggleBtn.setAttribute("aria-expanded", "false");
      panel.hidden = true;
      panel.style.visibility = "";
      setActiveRow(null);
      if (clearFilterOnClose) {
        filterQuery = "";
        input.value = "";
        applyFilter();
      }
    }

    function togglePanel() {
      if (open) {
        closePanel();
      } else {
        openPanel();
      }
    }

    function toggleSelectById(id) {
      var dr = getDataRowById(id);
      if (!dr || !dr.tr || dr.tr.hidden) {
        return;
      }
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        if (!multiple) {
          selected.clear();
          selected.add(id);
        } else if (selected.size < maxSelections) {
          selected.add(id);
        }
      }
      syncRowAriaSelected();
      syncRowSelectedClass();
      renderPills();
      emitChange();
      if (!multiple && selected.has(id)) {
        filterQuery = "";
        input.value = "";
        applyFilter();
        closePanel();
      }
    }

    function moveActive(delta) {
      var ids = getVisibleDataIdsInOrder();
      if (!ids.length) {
        return;
      }
      var idx = activeRowId ? ids.indexOf(activeRowId) : -1;
      if (idx === -1) {
        idx = delta > 0 ? 0 : ids.length - 1;
      } else {
        idx = idx + delta;
        if (idx < 0) {
          idx = 0;
        }
        if (idx >= ids.length) {
          idx = ids.length - 1;
        }
      }
      setActiveRow(ids[idx]);
      var el = document.getElementById(
        "tmsd-row-" + escId(ids[idx]) + uidSuffix
      );
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest" });
      }
    }

    function onDocPointerDown(ev) {
      if (!open) {
        return;
      }
      var t = /** @type {Node} */ (ev.target);
      if (root.contains(t)) {
        return;
      }
      closePanel();
    }

    function onWinReposition(ev) {
      if (open) {
        var tgt = ev && ev.target ? /** @type {HTMLElement} */ (ev.target) : null;
        if (ev && ev.type === "scroll" && tgt === panelInner) {
          return;
        }
        positionPanel();
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown, true);
    window.addEventListener("resize", onWinReposition);
    window.addEventListener("scroll", onWinReposition, true);

    input.addEventListener("input", function () {
      filterQuery = input.value;
      if (!open) {
        openPanel();
      } else {
        applyFilter();
        positionPanel();
      }
    });

    input.addEventListener("focus", function () {
      if (!open) {
        openPanel();
      }
    });

    input.addEventListener("keydown", function (ev) {
      var key = ev.key;
      if (key === "Escape") {
        if (open) {
          ev.preventDefault();
          closePanel();
        }
        return;
      }
      if (!open && (key === "ArrowDown" || key === "ArrowUp")) {
        openPanel();
      }
      if (!open) {
        return;
      }
      if (key === "ArrowDown") {
        ev.preventDefault();
        moveActive(1);
      } else if (key === "ArrowUp") {
        ev.preventDefault();
        moveActive(-1);
      } else if (key === " " || key === "Enter") {
        if (activeRowId) {
          ev.preventDefault();
          toggleSelectById(activeRowId);
        }
      }
    });

    toggleBtn.addEventListener("click", function () {
      togglePanel();
      if (open) {
        input.focus();
      }
    });

    var hc;
    for (hc = 0; hc < headerCells.length; hc++) {
      if (!columns[hc].sortable) {
        continue;
      }
      (function (columnIndex) {
        var th = headerCells[columnIndex];
        th.addEventListener("click", function () {
          toggleSortForColumn(columnIndex);
        });
        th.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggleSortForColumn(columnIndex);
          }
        });
      })(hc);
    }

    tbody.addEventListener("click", function (ev) {
      var tr = /** @type {HTMLElement} */ (ev.target).closest("tr");
      if (!tr || !tr.classList.contains("tmsd__data-row")) {
        return;
      }
      if (tr.hidden) {
        return;
      }
      var rid = tr.dataset.rowId;
      if (!rid) {
        return;
      }
      toggleSelectById(rid);
      setActiveRow(rid);
    });

    updateHeaderSortState();
    applyFilter();
    syncRowAriaSelected();
    syncRowSelectedClass();
    renderPills();

    return {
      destroy: function () {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        window.removeEventListener("resize", onWinReposition);
        window.removeEventListener("scroll", onWinReposition, true);
        if (root.parentNode) {
          root.parentNode.removeChild(root);
        }
      },
      getValue: getValue,
      setValue: setValue,
      open: openPanel,
      close: closePanel,
      root: root,
    };
  }

  /**
   * @param {ParentNode | Document | null} [root]
   * @returns {void}
   */
  function init(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-tmsd-init]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = /** @type {HTMLElement} */ (nodes[i]);
      if (el.getAttribute("data-tmsd-done") === "1") {
        continue;
      }
      var raw = el.getAttribute("data-tmsd-options");
      if (!raw) {
        continue;
      }
      try {
        var opts = JSON.parse(raw);
        create(el, opts);
        el.setAttribute("data-tmsd-done", "1");
      } catch (e) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[table-multiselect-dropdown] init parse error", e);
        }
      }
    }
  }

  /** Example dataset matching the pharmacology formats screenshot. */
  var EXAMPLE_FORMAT_OPTIONS = {
    columns: [
      { label: "Format", sortable: true },
      { label: "Route(s)" },
      { label: "Onset Speed", sortable: true, sortOrder: ["Fast", "Fast–Medium", "Medium", "Slow"] },
      { label: "Duration", sortable: true, sortOrder: ["Short", "Medium", "Medium–Long", "Long"] },
      { label: "Dosing Precision" },
      { label: "Pulmonary Risk", sortable: true, sortOrder: ["No", "Minor", "Yes"] },
      {
        label: "Abuse Potential",
        sortable: true,
        sortOrder: ["Low", "Low–Medium", "Medium", "High", "Very High"],
      },
    ],
    rows: /** @type {unknown[]} */ ([
      [
        "Oral",
        "Oral (gastrointestinal)",
        "Slow",
        "Long",
        "Medium",
        "No",
        "Medium",
      ],
      [
        "Sublingual",
        "Sublingual / buccal (mucosal)",
        "Medium",
        "Medium",
        "Medium–High",
        "No",
        "Low–Medium",
      ],
      [
        "Topical",
        "Cutaneous (local dermal)",
        "Slow",
        "Medium",
        "Low",
        "No",
        "Low",
      ],
      [
        "Suppository",
        "Rectal / vaginal",
        "Medium",
        "Medium–Long",
        "Medium",
        "No",
        "Low",
      ],
      [
        "Inhalers (metered-dose)",
        "Inhaled (pulmonary, metered)",
        "Fast",
        "Short",
        "High",
        "Minor",
        "Medium",
      ],
      [
        "Powders",
        "Oral ± sublingual (depending)",
        "Medium",
        "Medium–Long",
        "High",
        "No",
        "Low–Medium",
      ],
      [
        "Dermal (transdermal)",
        "Transdermal (systemic)",
        "Slow",
        "Long",
        "High",
        "No",
        "Low",
      ],
      [
        "Nano-emulsion",
        "Oral ± buccal (enhanced absorption)",
        "Fast–Medium",
        "Medium",
        "High",
        "No",
        "Medium",
      ],
      {
        type: "divider",
        text: "Last resort / typically not recommended for medicinal use",
      },
      [
        "Smoke/vape",
        "Inhaled (pulmonary)",
        "Fast",
        "Short",
        "Low",
        "Yes",
        "High",
      ],
      [
        "Concentrate",
        "Inhaled (pulmonary)",
        "Fast",
        "Medium",
        "Low",
        "Yes",
        "Very High",
      ],
    ]),
  };

  /** Illustrative cannabinoid reference rows (replace with canonical copy as needed). */
  var EXAMPLE_CANNABINOID_OPTIONS = {
    columns: [
      { label: "Compound", sortable: true },
      { label: "Primary Effects" },
      { label: "Common Clinical Use Cases" },
      {
        label: "Psychoactivity",
        sortable: true,
        sortOrder: ["None", "Low", "Low–Moderate", "Moderate", "High"],
      },
      { label: "Onset Influence", sortable: true },
      {
        label: "Confidence",
        sortable: true,
        sortOrder: ["High", "Moderate", "Low–Moderate", "Low"],
      },
      { label: "Key Risks / Considerations" },
    ],
    rows: /** @type {unknown[]} */ ([
      { type: "divider", text: "Cannabinoids" },
      {
        type: "data",
        id: "thc",
        cells: [
          "THC",
          "Analgesic, antiemetic, appetite stimulation, sleep",
          "Pain, nausea, cachexia, insomnia",
          "High",
          "Fast–Medium (route dependent)",
          "High",
          "Anxiety, impairment, dependency risk",
        ],
      },
      {
        type: "data",
        id: "cbd",
        cells: [
          "CBD",
          "Anxiolytic, anti-inflammatory, anticonvulsant",
          "Anxiety, epilepsy, inflammation",
          "None",
          "Medium",
          "High",
          "Drug interactions (CYP450), mild sedation",
        ],
      },
      {
        type: "data",
        id: "cbg",
        cells: [
          "CBG",
          "Anti-inflammatory, neuroprotective, GI effects",
          "IBD, neuroprotection (emerging)",
          "None",
          "Medium",
          "Low–Moderate",
          "Limited clinical data",
        ],
      },
      {
        type: "data",
        id: "cbn",
        cells: [
          "CBN",
          "Mild sedative",
          "Sleep support",
          "Low",
          "Medium",
          "Low",
          "Often over-attributed for sedation",
        ],
      },
      {
        type: "data",
        id: "thcv",
        cells: [
          "THCV",
          "Appetite modulation, stimulant-like (dose-dependent)",
          "Metabolic disorders, fatigue",
          "Low–Moderate",
          "Fast–Medium",
          "Low",
          "Dose-sensitive effects",
        ],
      },
      {
        type: "data",
        id: "cbc",
        cells: [
          "CBC",
          "Anti-inflammatory, mood support",
          "Pain, mood disorders (adjunct)",
          "None",
          "Medium",
          "Low",
          "Sparse human data",
        ],
      },
      {
        type: "data",
        id: "cbdv",
        cells: [
          "CBDV",
          "Anticonvulsant (investigational)",
          "Epilepsy",
          "None",
          "Medium",
          "Low–Moderate",
          "Limited availability",
        ],
      },
      {
        type: "data",
        id: "thca",
        cells: [
          "THCA",
          "Anti-inflammatory (non-psychoactive precursor)",
          "Inflammation",
          "None",
          "Slow",
          "Low",
          "Requires non-heated delivery",
        ],
      },
      {
        type: "data",
        id: "cbda",
        cells: [
          "CBDA",
          "Anti-nausea, anti-inflammatory",
          "Nausea, inflammation",
          "None",
          "Slow",
          "Low–Moderate",
          "Stability limitations",
        ],
      },
      { type: "divider", text: "Terpenes" },
      {
        type: "data",
        id: "myrcene",
        cells: [
          "Myrcene",
          "Sedating, muscle relaxant",
          "Insomnia, pain",
          "None",
          "May increase cannabinoid permeability",
          "Low–Moderate",
          "May enhance THC sedation",
        ],
      },
      {
        type: "data",
        id: "limonene",
        cells: [
          "Limonene",
          "Mood elevation, anxiolytic",
          "Anxiety, depression",
          "None",
          "Minimal",
          "Low–Moderate",
          "Can be stimulating in some patients",
        ],
      },
      {
        type: "data",
        id: "pinene",
        cells: [
          "Pinene (α/β)",
          "Alertness, cognitive support",
          "Fatigue, focus",
          "None",
          "Minimal",
          "Low",
          "May counteract THC memory effects",
        ],
      },
      {
        type: "data",
        id: "linalool",
        cells: [
          "Linalool",
          "Calming, anxiolytic",
          "Anxiety, insomnia",
          "None",
          "Minimal",
          "Low–Moderate",
          "Sedation",
        ],
      },
      {
        type: "data",
        id: "caryophyllene",
        cells: [
          "β-Caryophyllene",
          "Anti-inflammatory (CB2 activity)",
          "Pain, inflammation",
          "None",
          "Minimal",
          "Moderate",
          "Generally well tolerated",
        ],
      },
      {
        type: "data",
        id: "humulene",
        cells: [
          "Humulene",
          "Appetite suppression",
          "Metabolic conditions",
          "None",
          "Minimal",
          "Low",
          "Limited human data",
        ],
      },
      {
        type: "data",
        id: "terpinolene",
        cells: [
          "Terpinolene",
          "Uplifting, mildly stimulating",
          "Daytime use",
          "None",
          "Minimal",
          "Low",
          "Variable effects",
        ],
      },
      {
        type: "data",
        id: "ocimene",
        cells: [
          "Ocimene",
          "Uplifting",
          "Mood support",
          "None",
          "Minimal",
          "Low",
          "Limited data",
        ],
      },
      {
        type: "data",
        id: "bisabolol",
        cells: [
          "Bisabolol",
          "Anti-inflammatory, soothing",
          "Dermatologic, pain",
          "None",
          "Minimal",
          "Low–Moderate",
          "Primarily topical relevance",
        ],
      },
    ]),
  };

  var api = {
    create: create,
    init: init,
    EXAMPLE_FORMAT_OPTIONS: EXAMPLE_FORMAT_OPTIONS,
    EXAMPLE_CANNABINOID_OPTIONS: EXAMPLE_CANNABINOID_OPTIONS,
  };

  /** @type {Window & { TableMultiselectDropdown?: typeof api }} */
  var w = window;
  w.TableMultiselectDropdown = api;
})();
