// js/filters/sidebarFilters.js
// Used by Adult and Elderly profiles. The ONLY difference between the two is
// the `config.largeTargets` flag, which adds a CSS modifier class for bigger
// tap areas — no separate filter logic is duplicated for Elderly mode.

import * as state from '../state.js';

export function createSidebarFilters(container, rawData, config = {}) {
  const sizeClass = config.largeTargets ? 'text-lg py-3 px-4' : 'text-sm py-2 px-3';
  const labelSizeClass = config.largeTargets ? 'text-base mb-2' : 'text-xs mb-1';

  const regions = ['All', ...new Set(rawData.map((d) => d.region))].sort();
  const categories = ['All', ...new Set(rawData.map((d) => d.category))].sort();

  // Extract unique products and categories to feed the autocomplete suggestions list
  const suggestionOptions = [
    ...new Set([
      ...rawData.map((d) => d.product).filter(Boolean),
      ...rawData.map((d) => d.category).filter(Boolean)
    ])
  ].sort();

  const root = d3.select(container)
    .attr('class', 'flex flex-col gap-4 p-4 rounded-lg')
    .style('background', 'var(--surface)')
    .style('border', '1px solid var(--grid-line)');

  // --- Dynamic Search with Autocomplete ---
  const searchGroup = root.append('div');
  searchGroup.append('label')
    .attr('class', `block font-semibold ${labelSizeClass}`)
    .style('color', 'var(--text-secondary)')
    .text('Search Products / Orders');

  // 1. Create HTML datalist for suggestions
  const datalistId = `search-suggestions-${Math.random().toString(36).substring(2, 9)}`;
  const datalist = searchGroup.append('datalist')
    .attr('id', datalistId);

  datalist.selectAll('option')
    .data(suggestionOptions)
    .join('option')
    .attr('value', (d) => d);

  // 2. Attach datalist to search input
  const searchInput = searchGroup.append('input')
    .attr('type', 'text')
    .attr('list', datalistId) // Links input to datalist
    .attr('placeholder', 'Type product name...')
    .attr('class', `w-full rounded border ${sizeClass}`)
    .style('background', 'var(--bg)')
    .style('color', 'var(--text-primary)')
    .style('border-color', 'var(--grid-line)')
    .style('min-height', 'var(--tap-target-min)');

  // Real-time listener for Dynamic Search (triggers on typing or selecting a suggestion)
  searchInput.on('input', function () {
    state.setFilter({ searchQuery: this.value.toLowerCase().trim() });
  });

  // --- Region dropdown ---
  const regionGroup = root.append('div');
  regionGroup.append('label')
    .attr('class', `block font-semibold ${labelSizeClass}`)
    .style('color', 'var(--text-secondary)')
    .text('Region');
  const regionSelect = regionGroup.append('select')
    .attr('class', `w-full rounded border ${sizeClass}`)
    .style('background', 'var(--bg)')
    .style('color', 'var(--text-primary)')
    .style('border-color', 'var(--grid-line)')
    .style('min-height', 'var(--tap-target-min)');
  regionSelect.selectAll('option')
    .data(regions)
    .join('option')
    .attr('value', (d) => d)
    .text((d) => d);
  regionSelect.on('change', function () {
    state.setFilter({ region: this.value });
  });

  // --- Category dropdown (drives which products show up = drill-down) ---
  const categoryGroup = root.append('div');
  categoryGroup.append('label')
    .attr('class', `block font-semibold ${labelSizeClass}`)
    .style('color', 'var(--text-secondary)')
    .text('Category');
  const categorySelect = categoryGroup.append('select')
    .attr('class', `w-full rounded border ${sizeClass}`)
    .style('background', 'var(--bg)')
    .style('color', 'var(--text-primary)')
    .style('border-color', 'var(--grid-line)')
    .style('min-height', 'var(--tap-target-min)');
  categorySelect.selectAll('option')
    .data(categories)
    .join('option')
    .attr('value', (d) => d)
    .text((d) => d);
  categorySelect.on('change', function () {
    state.setFilter({ category: this.value, product: 'All' }); // reset drill-down
    refreshProductOptions(this.value);
  });

  // --- Product dropdown ---
  const productGroup = root.append('div');
  productGroup.append('label')
    .attr('class', `block font-semibold ${labelSizeClass}`)
    .style('color', 'var(--text-secondary)')
    .text('Select Specific Product');
  const productSelect = productGroup.append('select')
    .attr('class', `w-full rounded border ${sizeClass}`)
    .style('background', 'var(--bg)')
    .style('color', 'var(--text-primary)')
    .style('border-color', 'var(--grid-line)')
    .style('min-height', 'var(--tap-target-min)');
  productSelect.on('change', function () {
    state.setFilter({ product: this.value });
  });

  function refreshProductOptions(category) {
    const pool = category === 'All' ? rawData : rawData.filter((d) => d.category === category);
    const products = ['All', ...new Set(pool.map((d) => d.product))].sort();
    productSelect.selectAll('option')
      .data(products)
      .join('option')
      .attr('value', (d) => d)
      .text((d) => d);
  }
  refreshProductOptions('All');

  // --- Shipping status checkboxes ---
  const statusGroup = root.append('div');
  statusGroup.append('label')
    .attr('class', `block font-semibold ${labelSizeClass}`)
    .style('color', 'var(--text-secondary)')
    .text('Shipping Status');
  const statuses = [...new Set(rawData.map((d) => d.shippingStatus))].sort();

  const statusRow = statusGroup.selectAll('.status-option')
    .data(statuses)
    .join('label')
    .attr('class', 'status-option flex items-center gap-2')
    .style('min-height', 'var(--tap-target-min)')
    .style('font-size', config.largeTargets ? '1.1rem' : '0.875rem');

  statusRow.append('input')
    .attr('type', 'checkbox')
    .attr('value', (d) => d)
    .style('width', config.largeTargets ? '24px' : '16px')
    .style('height', config.largeTargets ? '24px' : '16px')
    .on('change', function () {
      const allChecked = [];
      statusGroup.selectAll('input[type=checkbox]').each(function () {
        if (this.checked) allChecked.push(this.value);
      });
      state.setFilter({ shippingStatus: allChecked });
    });

  statusRow.append('span').text((d) => d);

  function destroy() {
    root.selectAll('*').remove();
  }

  return { destroy };
}