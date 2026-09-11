import world from "./assets/vendor/world-110m.mjs";

const d3 = globalThis.d3;
const topojson = globalThis.topojson;
const formatter = new Intl.NumberFormat("en-US");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const state = { data: null };

const statusEl = document.getElementById("analytics-status");
const periodSelect = document.getElementById("period-select");
const mapWrap = document.getElementById("map-wrap");
const mapSvg = d3.select("#visit-map");
const trendSvg = d3.select("#visit-trend");

function countryName(code) {
  if (!code || code === "XX") return "Unknown country";
  try { return regionNames.of(code) || code; } catch { return code; }
}

function setText(id, value) {
  document.getElementById(id).textContent = formatter.format(Number(value || 0));
}

function fillTable(id, rows, cells) {
  const body = document.getElementById(id);
  body.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = cells.length;
    cell.textContent = "No visits recorded";
    row.append(cell);
    body.append(row);
    return;
  }
  for (const item of rows) {
    const row = document.createElement("tr");
    for (const render of cells) {
      const cell = document.createElement("td");
      cell.textContent = render(item);
      row.append(cell);
    }
    body.append(row);
  }
}

function drawMap() {
  const locations = state.data?.locations || [];
  const width = Math.max(320, mapWrap.clientWidth);
  const height = Math.round(Math.max(290, width * 0.51));
  mapSvg.attr("viewBox", `0 0 ${width} ${height}`);
  mapSvg.selectAll("*").remove();

  const projection = d3.geoNaturalEarth1().fitExtent(
    [[12, 12], [width - 12, height - 12]],
    { type: "Sphere" }
  );
  const path = d3.geoPath(projection);
  const countries = topojson.feature(world, world.objects.features).features
    .filter((feature) => feature.properties.id !== "ATA");

  mapSvg.append("path").datum({ type: "Sphere" }).attr("class", "sphere").attr("d", path);
  mapSvg.append("g").selectAll("path").data(countries).join("path")
    .attr("class", "country").attr("d", path);

  document.getElementById("map-empty").hidden = locations.length > 0;
  if (!locations.length) return;

  const maxViews = d3.max(locations, (d) => Number(d.views)) || 1;
  const radius = d3.scaleSqrt().domain([1, maxViews]).range([4, 20]);
  const points = locations.map((d) => ({ ...d, point: projection([Number(d.longitude), Number(d.latitude)]) }))
    .filter((d) => d.point);

  mapSvg.append("g").selectAll("circle.visit-point").data(points).join("circle")
    .attr("class", "visit-point")
    .attr("cx", (d) => d.point[0]).attr("cy", (d) => d.point[1])
    .attr("r", (d) => radius(Number(d.views)));

  const hitTargets = mapSvg.append("g").selectAll("circle.visit-hit").data(points).join("circle")
    .attr("class", "visit-hit")
    .attr("cx", (d) => d.point[0]).attr("cy", (d) => d.point[1])
    .attr("r", (d) => Math.max(16, radius(Number(d.views)) + 5))
    .attr("aria-label", (d) => `${countryName(d.countryCode)}, ${d.regionCode}: ${d.views} views`);
  hitTargets.append("title").text((d) =>
    `${countryName(d.countryCode)} · ${d.regionCode || "Unknown region"} — ${formatter.format(d.views)} views`
  );
}

function drawTrend() {
  const values = state.data?.daily || [];
  const wrap = document.querySelector(".trend-wrap");
  const width = Math.max(320, wrap.clientWidth);
  const height = Math.round(Math.max(230, Math.min(330, width * 0.34)));
  trendSvg.attr("viewBox", `0 0 ${width} ${height}`);
  trendSvg.selectAll("*").remove();
  document.getElementById("trend-empty").hidden = values.length > 0;
  if (!values.length) return;

  const margin = { top: 18, right: 18, bottom: 36, left: 46 };
  const parsed = values.map((d) => ({ date: new Date(`${d.day}T00:00:00Z`), views: Number(d.views) }));
  const x = d3.scaleUtc().domain(d3.extent(parsed, (d) => d.date)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(parsed, (d) => d.views) || 1]).nice().range([height - margin.bottom, margin.top]);
  const xTicks = width < 520 ? 4 : Math.min(8, parsed.length);

  trendSvg.append("g").attr("class", "chart-grid").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .call((g) => g.select(".domain").remove());
  trendSvg.append("g").attr("class", "chart-axis").attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(xTicks).tickFormat(d3.utcFormat("%b %-d")));
  trendSvg.append("g").attr("class", "chart-axis").attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("d")));

  const area = d3.area().x((d) => x(d.date)).y0(height - margin.bottom).y1((d) => y(d.views)).curve(d3.curveMonotoneX);
  const line = d3.line().x((d) => x(d.date)).y((d) => y(d.views)).curve(d3.curveMonotoneX);
  trendSvg.append("path").datum(parsed).attr("class", "trend-area").attr("d", area);
  trendSvg.append("path").datum(parsed).attr("class", "trend-line").attr("d", line);
  trendSvg.append("g").selectAll("circle").data(parsed).join("circle").attr("class", "trend-dot")
    .attr("cx", (d) => x(d.date)).attr("cy", (d) => y(d.views)).attr("r", 3);
}

function render(data) {
  state.data = data;
  setText("metric-views", data.summary.pageViews);
  setText("metric-visitors", data.summary.visitorDays);
  setText("metric-countries", data.summary.countries);
  setText("metric-today", data.summary.today);
  fillTable("locations-body", data.countries, [
    (d) => countryName(d.countryCode),
    (d) => d.regionCode || "—",
    (d) => formatter.format(d.views)
  ]);
  fillTable("pages-body", data.pages, [
    (d) => d.page,
    (d) => formatter.format(d.views)
  ]);
  drawMap();
  drawTrend();
}

async function loadAnalytics() {
  statusEl.textContent = "Loading visit statistics…";
  try {
    const response = await fetch(`/api/analytics?days=${periodSelect.value}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Unable to load analytics");
    const data = await response.json();
    render(data);
    const updated = new Date(data.generatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    statusEl.textContent = `Updated ${updated}`;
  } catch {
    statusEl.textContent = "Visit statistics could not be loaded. Please refresh the page.";
  }
}

periodSelect.addEventListener("change", loadAnalytics);
let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (state.data) { drawMap(); drawTrend(); } }, 120);
}).observe(document.getElementById("analytics-main"));

loadAnalytics();
