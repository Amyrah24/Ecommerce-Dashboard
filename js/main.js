// js/main.js
// Bootstraps the app: load data -> seed state -> hand DOM containers to
// profileManager, which owns everything about mounting/switching profiles
// from this point on.

import { loadDataset, dataQualityReport } from './data/load.js';
import * as state from './state.js';
import * as profileManager from './profiles/profileManager.js';

const statusEl = document.getElementById('status');

async function init() {
  try {
    const rows = await loadDataset('./data/ecommerce_sales.csv');
    state.setRawData(rows);

    const report = dataQualityReport(rows);
    statusEl.textContent =
      `Loaded ${report.totalRows} rows ` +
      `(${report.missingRegion} missing region, ${report.missingAge} missing age, ` +
      `${report.missingShipping} missing shipping status) — ` +
      `date range ${report.dateRange[0].toDateString()} to ${report.dateRange[1].toDateString()}`;

    profileManager.init({
      kpiEl: document.getElementById('kpi-row'),
      sidebarEl: document.getElementById('sidebar-filters'),
      gridEl: document.getElementById('dashboard-grid'),
      timelineEl: document.getElementById('timeline-section'),
    });

    // --- SUBSCRIBE TO STATE CHANGES FOR CROSS-FILTERING & SEARCH ---
    // Listens for state changes (emitted by state.js) and notifies profileManager to refresh components
    state.subscribe(() => {
      profileManager.updateCurrentProfile();
    });

  } catch (err) {
    statusEl.textContent = `Failed to load dataset: ${err.message}`;
    console.error(err);
  }
}

// Switch accessibility/user-centered profile mode
document.getElementById('profile-mode-selector').addEventListener('change', (e) => {
  profileManager.switchProfile(e.target.value);
});

init();