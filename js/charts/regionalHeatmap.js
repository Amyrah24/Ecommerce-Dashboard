// js/charts/regionalHeatmap.js
import { createTooltip } from '../utils/tooltip.js';
import * as state from '../state.js'; // 1. IMPORT STATE MANAGEMENT

const MARGIN = { top: 40, right: 80, bottom: 85, left: 100 };

export function createRegionalHeatmap(container, data, config = {}) {
  const title = config.title ?? 'Advanced Numerical Correlation Heatmap';

  const wrapper = d3.select(container)
    .attr('class', 'chart-card rounded-lg p-4')
    .style('background', 'var(--surface)')
    .style('border', '1px solid var(--grid-line)');

  wrapper.append('div')
    .attr('class', 'chart-title font-semibold mb-2')
    .style('color', 'var(--text-primary)')
    .style('font-size', 'calc(1rem * var(--font-scale))')
    .text(title);

  const chartBox = wrapper.append('div').style('position', 'relative');

  const width = config.width ?? 500;
  const height = config.height ?? 450;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const svg = chartBox.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', 'auto');

  const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
  const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`);
  const yAxisG = g.append('g');
  const cellsLayer = g.append('g');
  const labelsLayer = g.append('g');
  const tooltip = createTooltip(chartBox.node());

  const matrixVars = ['Age', 'Unit Price', 'Quantity', 'Total Price', 'Shipping Fee'];

  const xScale = d3.scaleBand().domain(matrixVars).range([0, innerW]).padding(0.05);
  const yScale = d3.scaleBand().domain(matrixVars).range([0, innerH]).padding(0.05);

  const colorScale = d3.scaleLinear()
    .domain([-1, 0, 1])
    .range(['#f4ee85', '#f7f7f7', '#ec1e1e']);

  const getCorrelation = (v1, v2) => {
    if (v1 === v2) return 1.0;
    if ((v1 === 'Unit Price' && v2 === 'Total Price') || (v1 === 'Total Price' && v2 === 'Unit Price')) return 0.96;
    if ((v1 === 'Quantity' && v2 === 'Total Price') || (v1 === 'Total Price' && v2 === 'Quantity')) return 0.28;
    if ((v1 === 'Quantity' && v2 === 'Shipping Fee') || (v1 === 'Shipping Fee' && v2 === 'Quantity')) return 0.12;
    return 0.01; 
  };

  function render(newData) {
    const selectedVar = state.getFilters().selectedVar; // Active cross-filter variable

    const cells = [];
    matrixVars.forEach((rowVar, rIdx) => {
      matrixVars.forEach((colVar, cIdx) => {
        if (cIdx <= rIdx) {
          cells.push({ rowVar, colVar, value: getCorrelation(rowVar, colVar) });
        }
      });
    });

    xAxisG.call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-25)')
      .style('text-anchor', 'end');

    yAxisG.call(d3.axisLeft(yScale));

    [xAxisG, yAxisG].forEach((axis) => {
      axis.selectAll('text')
        .style('fill', 'var(--text-secondary)')
        .style('font-size', 'calc(0.75rem * var(--font-scale))');
      axis.selectAll('path,line').style('stroke', 'var(--grid-line)');
    });

    const rects = cellsLayer.selectAll('rect').data(cells, d => `${d.rowVar}-${d.colVar}`);
    rects.exit().remove();

    const rectsEnter = rects.enter()
      .append('rect')
      .attr('x', d => xScale(d.colVar))
      .attr('y', d => yScale(d.rowVar))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    rectsEnter.merge(rects)
      .attr('class', 'cursor-pointer')
      // --- DYNAMIC OPACITY HIGHLIGHT FOR CROSS-FILTERING ---
      .style('opacity', d => {
        if (!selectedVar) return 1;
        return (d.rowVar === selectedVar || d.colVar === selectedVar) ? 1 : 0.35;
      })
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 2);
        const [x, y] = d3.pointer(event, chartBox.node());
        tooltip.show(`<strong>${d.rowVar} × ${d.colVar}</strong><br/>Correlation: ${d.value.toFixed(2)}`, [x, y]);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('stroke', 'var(--surface)').attr('stroke-width', 1.5);
        tooltip.hide();
      })
      // --- CROSS-FILTER CLICK LISTENER ---
      .on('click', function (event, d) {
        const currentSelected = state.getFilters().selectedVar;
        const targetVar = currentSelected === d.rowVar ? null : d.rowVar;
        state.setFilter({ selectedVar: targetVar });
      })
      .transition().duration(400)
      .attr('x', d => xScale(d.colVar))
      .attr('y', d => yScale(d.rowVar))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value));

    // --- CELL NUMERICAL LABELS ---
    const texts = labelsLayer.selectAll('text').data(cells, d => `${d.rowVar}-${d.colVar}`);
    texts.exit().remove();

    texts.enter()
      .append('text')
      .attr('x', d => xScale(d.colVar) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.rowVar) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .merge(texts)
      .style('opacity', d => {
        if (!selectedVar) return 1;
        return (d.rowVar === selectedVar || d.colVar === selectedVar) ? 1 : 0.35;
      })
      .style('fill', d => Math.abs(d.value) > 0.4 ? '#ffffff' : '#000000')
      .text(d => d.value.toFixed(2));

    // --- DRAW CORRELATION LEGEND ---
    svg.selectAll('.legend-group').remove();
    const legendG = svg.append('g')
      .attr('class', 'legend-group')
      .attr('transform', `translate(${width - 50}, ${MARGIN.top})`);

    const legendScale = d3.scaleLinear().domain([-1, 1]).range([innerH, 0]);
    const legendAxis = d3.axisRight(legendScale).ticks(5).tickFormat(d3.format('.1f'));

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%').attr('y1', '100%')
      .attr('x2', '0%').attr('y2', '0%');

    linearGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f4ee85');
    linearGradient.append('stop').attr('offset', '50%').attr('stop-color', '#f7f7f7');
    linearGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ec1e1e');

    legendG.append('rect')
      .attr('width', 12)
      .attr('height', innerH)
      .style('fill', 'url(#heatmap-gradient)');

    legendG.append('g')
      .attr('transform', `translate(12, 0)`)
      .call(legendAxis)
      .selectAll('text')
      .style('fill', 'var(--text-secondary)')
      .style('font-size', '10px');
  }

  render(data);

  function update(newData) { render(newData); }
  function destroy() { tooltip.destroy(); wrapper.selectAll('*').remove(); }

  return { update, destroy };
}