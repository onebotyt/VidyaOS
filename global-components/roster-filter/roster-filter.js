/**
 * ══════════════════════════════════════════════════════════════
 * GLOBAL ROSTER & FILTER SYSTEM
 * frontend/global-components/roster-filter/roster-filter.js
 * ══════════════════════════════════════════════════════════════
 * Reusable filter bar, search box, chip scroller, desktop table,
 * and mobile mini-cards stack for Faculty & Student rosters.
 */

(function () {
  'use strict';

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Global document click handler to close open kebab menus
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.global-kebab-wrap') && !e.target.closest('.fac-kebab-wrap')) {
      document.querySelectorAll('.global-kebab-menu.open, .fac-kebab-menu.open').forEach(menu => {
        menu.classList.remove('open');
      });
      document.querySelectorAll('.global-kebab-wrap.menu-open, .fac-kebab-wrap.menu-open').forEach(wrap => {
        wrap.classList.remove('menu-open');
      });
      document.querySelectorAll('tr.row-kebab-open').forEach(r => r.classList.remove('row-kebab-open'));
      document.querySelectorAll('.global-mini-card.menu-open, .fac-mini-card.menu-open').forEach(c => c.classList.remove('menu-open'));
    }
  });

  window.toggleGlobalKebabMenu = function (id, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const btn = event ? (event.currentTarget || event.target.closest('.global-kebab-btn, .fac-kebab-btn')) : null;
    const wrap = btn ? btn.closest('.global-kebab-wrap, .fac-kebab-wrap') : null;
    const targetMenu = (wrap ? wrap.querySelector('.global-kebab-menu, .fac-kebab-menu') : null) ||
                       document.getElementById(`global-kebab-menu-${id}`) ||
                       document.getElementById(`fac-kebab-menu-${id}`) ||
                       document.getElementById(`fac-kebab-menu-table-${id}`);
    const isOpen = targetMenu && targetMenu.classList.contains('open');

    // Close all other menus first
    window.closeAllGlobalKebabMenus();

    if (targetMenu && !isOpen) {
      const parentWrap = wrap || targetMenu.closest('.global-kebab-wrap, .fac-kebab-wrap');
      const refElem = parentWrap || targetMenu;
      const rect = refElem.getBoundingClientRect();
      const estimatedMenuHeight = 220;

      if (window.innerHeight - rect.bottom < estimatedMenuHeight && rect.top > estimatedMenuHeight) {
        targetMenu.classList.add('dropup');
      } else {
        targetMenu.classList.remove('dropup');
      }

      targetMenu.classList.add('open');
      if (parentWrap) parentWrap.classList.add('menu-open');
      const row = targetMenu.closest('tr');
      if (row) row.classList.add('row-kebab-open');
      const card = targetMenu.closest('.global-mini-card, .fac-mini-card');
      if (card) card.classList.add('menu-open');
    }
  };

  window.closeAllGlobalKebabMenus = function () {
    document.querySelectorAll('.global-kebab-menu.open, .fac-kebab-menu.open').forEach(m => {
      m.classList.remove('open');
      m.classList.remove('dropup');
    });
    document.querySelectorAll('.global-kebab-wrap.menu-open, .fac-kebab-wrap.menu-open').forEach(w => w.classList.remove('menu-open'));
    document.querySelectorAll('tr.row-kebab-open').forEach(r => r.classList.remove('row-kebab-open'));
    document.querySelectorAll('.global-mini-card.menu-open, .fac-mini-card.menu-open').forEach(c => c.classList.remove('menu-open'));
  };

  // Escape key listener for global kebab menus
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      window.closeAllGlobalKebabMenus();
    }
  });

  // Global aliases for full compatibility
  window.toggleFacultyKebabMenu = window.toggleGlobalKebabMenu;
  window.closeAllKebabMenus = window.closeAllGlobalKebabMenus;
  window.closeAllMenus = window.closeAllGlobalKebabMenus;

  class RosterFilterInstance {
    constructor(config) {
      this.container = typeof config.container === 'string'
        ? document.getElementById(config.container)
        : config.container;

      this.idPrefix = config.idPrefix || 'global';
      this.searchPlaceholder = config.searchPlaceholder || 'Search...';
      this.hideDepartmentFilter = Boolean(config.hideDepartmentFilter);
      this.departments = config.departments || [];
      this.chips = config.chips || [];
      this.activeChip = config.activeChip || (this.chips[0] ? this.chips[0].id : 'ALL');
      this.activeDept = 'ALL';
      this.searchQuery = '';
      this.onFilterChange = config.onFilterChange || (() => {});
      this.renderTable = config.renderTable || null;
      this.renderCards = config.renderCards || null;

      this.initDOM();
    }

    initDOM() {
      if (!this.container) return;

      const prefix = this.idPrefix;
      const searchId = (prefix === 'faculty') ? 'faculty-search-input' : `${prefix}-search-input`;
      const deptId = (prefix === 'faculty') ? 'faculty-dept-filter' : `${prefix}-dept-filter`;
      const tableWrapId = (prefix === 'faculty') ? 'faculty-table-wrap' : `${prefix}-table-wrap`;
      const cardsWrapId = (prefix === 'faculty') ? 'faculty-mobile-cards-wrap' : `${prefix}-mobile-cards-wrap`;

      this.container.innerHTML = `
        <div class="global-roster-card">
          <!-- Filter & Search Toolbar -->
          <div class="global-filter-bar">
            <div class="global-filter-top-row">
              <div class="global-search-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="${searchId}" class="global-roster-search-input" placeholder="${esc(this.searchPlaceholder)}">
              </div>
              ${this.hideDepartmentFilter ? '' : `
              <select id="${deptId}" class="global-filter-select global-roster-dept-select">
                <option value="ALL">All Departments</option>
              </select>
              `}
            </div>
            <div class="global-chips-row">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Desktop Table Wrap (>= 769px) -->
          <div id="${tableWrapId}" class="global-table-wrap fac-table-wrap">
            <div class="global-roster-empty">Loading records...</div>
          </div>

          <!-- Mobile Minimal Cards Stack (< 769px) -->
          <div id="${cardsWrapId}" class="global-mini-cards-stack fac-mini-cards-stack">
            <div class="global-roster-empty">Loading records...</div>
          </div>
        </div>
      `;

      this.searchInput = document.getElementById(searchId);
      this.deptSelect = document.getElementById(deptId);
      this.chipsRow = this.container.querySelector('.global-chips-row');
      this.tableWrap = document.getElementById(tableWrapId);
      this.cardsWrap = document.getElementById(cardsWrapId);

      this.bindEvents();
      this.updateDepartments(this.departments);
      this.renderChips();
    }

    bindEvents() {
      let debounceTimer = null;
      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.searchQuery = this.searchInput.value.trim().toLowerCase();
            this.triggerFilter();
          }, 180);
        });
      }

      if (this.deptSelect) {
        this.deptSelect.addEventListener('change', () => {
          this.activeDept = this.deptSelect.value;
          this.triggerFilter();
        });
      }
    }

    triggerFilter() {
      if (typeof this.onFilterChange === 'function') {
        this.onFilterChange({
          search: this.searchQuery,
          dept: this.activeDept,
          chip: this.activeChip
        });
      }
    }

    updateDepartments(depts) {
      this.departments = depts || [];
      if (!this.deptSelect) return;

      const currentVal = this.deptSelect.value || 'ALL';
      this.deptSelect.innerHTML = '<option value="ALL">All Departments</option>' +
        this.departments.map(d => {
          const id = d.id || d.department_id;
          const code = d.code || d.department_code || '';
          const name = d.name || d.department_name || code;
          return `<option value="${esc(id)}">${esc(name)} (${esc(code)})</option>`;
        }).join('');

      this.deptSelect.value = currentVal;
    }

    updateChips(newChips) {
      if (newChips) this.chips = newChips;
      this.renderChips();
    }

    renderChips() {
      if (!this.chipsRow) return;

      const prefix = this.idPrefix;
      this.chipsRow.innerHTML = this.chips.map(chip => {
        const isActive = (chip.id === this.activeChip);
        const count = (chip.count !== undefined && chip.count !== null) ? chip.count : 0;
        const chipCountId = (prefix === 'faculty') ? `chip-count-${chip.id.toLowerCase()}` : `${prefix}-chip-count-${chip.id.toLowerCase()}`;
        return `
          <button type="button" class="global-filter-chip fac-filter-chip ${isActive ? 'active' : ''}" data-chip="${esc(chip.id)}">
            <span>${esc(chip.label)}</span>
            <span class="global-chip-badge" id="${chipCountId}">(${count})</span>
          </button>
        `;
      }).join('');

      this.chipsRow.querySelectorAll('.global-filter-chip').forEach(btn => {
        btn.onclick = () => {
          const chipId = btn.getAttribute('data-chip');
          this.setChip(chipId);
        };
      });
    }

    setChip(chipId) {
      this.activeChip = chipId;
      this.renderChips();
      this.triggerFilter();
    }

    renderData(items) {
      if (!this.tableWrap || !this.cardsWrap) return;

      if (!items || items.length === 0) {
        const emptyHtml = `<div class="global-roster-empty">No matching records found.</div>`;
        this.tableWrap.innerHTML = emptyHtml;
        this.cardsWrap.innerHTML = emptyHtml;
        return;
      }

      if (typeof this.renderTable === 'function') {
        this.tableWrap.innerHTML = this.renderTable(items);
      }
      if (typeof this.renderCards === 'function') {
        this.cardsWrap.innerHTML = this.renderCards(items);
      }
    }
  }

  window.GlobalRosterFilter = {
    create(config) {
      return new RosterFilterInstance(config);
    }
  };
})();
