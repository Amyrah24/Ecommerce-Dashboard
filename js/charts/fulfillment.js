// js/charts/fulfillment.js
import { deliveryStatusBreakdown } from '../data/aggregate.js';
import { createTooltip } from '../utils/tooltip.js';
import * as state from '../state.js'; // 1. IMPORT STATE MANAGEMENT

const STATUS_COLORS = {
  Delivered: '#34d399',
  'In Transit': '#fbbf24',
  Returned: '#f87171',
  Unknown: '#94a3b8',
};

export function createFulfillmentChart(container, data, config = {}) {
  const title = config.title ?? 'Fulfillment Logistics';

  const wrapper = d3.select(container)
    .attr('class', 'chart-card rounded-lg p-4')
    .style('background', 'var(--surface)')
    .style('border', '1px solid var(--grid-line)');

  wrapper.append('div')
    .attr('class', 'chart-title font-semibold mb-2')
    .style('color', 'var(--text-primary)')
    .style('font-size', 'calc(1rem * var(--font-scale))')
    .text(title);

  const chartBox = wrapper.append('div')
    .style('position', 'relative')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '16px');

  const width = config.width ?? 220;
  const height = config.height ?? 200;
  const radius = Math.min(width, height) / 2 - 10;

  const svg = chartBox.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', 'auto')
    .style('max-width', '200px');

  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
  const legend = chartBox.append('div').attr('class', 'flex flex-col gap-2');
  const tooltip = createTooltip(chartBox.node());

  // Standard Arc Configuration
  const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
  
  // Hover Arc Configuration
  const arcHover = d3.arc().innerRadius(radius * 0.55).outerRadius(radius + 6);

  const pie = d3.pie().value((d) => d[1]).sort(null);

  function render(newData) {
    const breakdown = deliveryStatusBreakdown(newData);
    const total = d3.sum(breakdown, (d) => d[1]) || 1;
    const arcs = pie(breakdown);
    const selectedStatus = state.getFilters().selectedStatus; // Active status cross-filter

    const paths = g.selectAll('path').data(arcs, (d) => d.data[0]);
    paths.exit().remove();

    paths.enter()
      .append('path')
      .attr('fill', (d) => STATUS_COLORS[d.data[0]] ?? '#ccc')
      .merge(paths)
      .attr('class', 'cursor-pointer')
      // --- DYNAMIC OPACITY HIGHLIGHT ---
      .style('opacity', (d) => {
        if (!selectedStatus) return 1;
        return d.data[0] === selectedStatus ? 1 : 0.35;
      })
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition().duration(200)
          .attr('d', arcHover);

        const [x, y] = d3.pointer(event, chartBox.node());
        const pct = ((d.data[1] / total) * 100).toFixed(1);
        tooltip.show(`<strong>${d.data[0]}</strong><br/>${d.data[1]} orders (${pct}%)`, [x, y]);
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .transition().duration(200)
          .attr('d', arc);

        tooltip.hide();
      })
      // --- CROSS-FILTER CLICK LISTENER (SLICES) ---
      .on('click', function (event, d) {
        const activeStatus = state.getFilters().selectedStatus;
        const statusName = d.data[0];
        const nextStatus = activeStatus === statusName ? null : statusName;
        state.setFilter({ selectedStatus: nextStatus });
      })
      .transition().duration(400)
      .attrTween('d', function (d) {
        const interp = d3.interpolate(this._current || d, d);
        this._current = interp(1);
        return (t) => arc(interp(t));
      });

    // --- LEGEND SETUP & INTERACTIVITY ---
    const legendItems = legend.selectAll('.legend-row').data(breakdown, (d) => d[0]);
    legendItems.exit().remove();

    const entered = legendItems.enter()
      .append('div')
      .attr('class', 'legend-row flex items-center gap-2 cursor-pointer p-1 rounded transition-colors hover:bg-slate-800/40')
      // --- CROSS-FILTER CLICK LISTENER (LEGEND) ---
      .on('click', function (event, d) {
        const activeStatus = state.getFilters().selectedStatus;
        const nextStatus = activeStatus === d[0] ? null : d[0];
        state.setFilter({ selectedStatus: nextStatus });
      });

    entered.append('span').attr('class', 'swatch').style('width', '10px').style('height', '10px').style('border-radius', '50%');
    entered.append('span').attr('class', 'label-text');

    const merged = entered.merge(legendItems);
    
    // Dim unselected legend items
    merged.style('opacity', (d) => {
      if (!selectedStatus) return 1;
      return d[0] === selectedStatus ? 1 : 0.35;
    });

    merged.select('.swatch').style('background', (d) => STATUS_COLORS[d[0]] ?? '#ccc');
    merged.select('.label-text')
      .style('font-size', 'calc(0.8rem * var(--font-scale))')
      .style('color', 'var(--text-secondary)')
      .text((d) => `${d[0]}: ${d[1]} (${((d[1] / total) * 100).toFixed(0)}%)`);
  }

  render(data);

  function update(newData) {
    render(newData);
  }

  function destroy() {
    tooltip.destroy();
    wrapper.selectAll('*').remove();
  }

  return { update, destroy };
}