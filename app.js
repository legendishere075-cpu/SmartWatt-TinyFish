/* SmartWatt: transparent appliance-level energy and cost estimator.
 * All values are local to this browser session; no network/API is used.
 */
"use strict";

const DEFAULT_APPLIANCES = [
  { id: 1, name: "LED lighting", power: 12, hours: 6, quantity: 8, symbol: "☼" },
  { id: 2, name: "Ceiling fan", power: 70, hours: 10, quantity: 3, symbol: "◉" },
  { id: 3, name: "Refrigerator", power: 180, hours: 8, quantity: 1, symbol: "▯" },
  { id: 4, name: "Laptop", power: 65, hours: 6, quantity: 2, symbol: "▱" },
  { id: 5, name: "Air conditioner", power: 1200, hours: 5, quantity: 1, symbol: "❄" }
];
let appliances = structuredClone(DEFAULT_APPLIANCES);
let nextId = 6;

const $ = (selector) => document.querySelector(selector);
const number = (value) => Number(value);
const validNonNegative = (value) => Number.isFinite(value) && value >= 0;
const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(value);
const fmt = (value, digits = 2) => new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: digits, minimumFractionDigits: 0
}).format(value);

function energyKwh(powerW, hoursPerDay, quantity, days) {
  if (![powerW, hoursPerDay, quantity, days].every(Number.isFinite)) throw new TypeError("Inputs must be finite numbers.");
  if (powerW < 0 || hoursPerDay < 0 || quantity < 0 || days < 0) throw new RangeError("Inputs cannot be negative.");
  if (hoursPerDay > 24) throw new RangeError("Hours per day cannot exceed 24.");
  return powerW * hoursPerDay * quantity * days / 1000;
}

function getDays() {
  const days = number($("#days").value);
  if (!Number.isFinite(days) || days < 1 || days > 366) return null;
  return days;
}
function getTariff() {
  const tariff = number($("#tariff").value);
  if (!Number.isFinite(tariff) || tariff < 0 || tariff > 10000) return null;
  return tariff;
}
function applianceEnergy(item, days) {
  return energyKwh(item.power, item.hours, item.quantity, days);
}
function safeText(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function renderRows(days) {
  const tbody = $("#applianceRows");
  tbody.innerHTML = appliances.map((item) => {
    const energy = applianceEnergy(item, days);
    return `<tr data-id="${item.id}">
      <td><div class="appliance-name"><span class="appliance-symbol">${safeText(item.symbol || "ϟ")}</span>${safeText(item.name)}</div></td>
      <td><input class="table-input" aria-label="${safeText(item.name)} rated power in watts" data-field="power" type="number" min="0" max="100000" step="0.1" value="${item.power}"></td>
      <td><input class="table-input" aria-label="${safeText(item.name)} hours per day" data-field="hours" type="number" min="0" max="24" step="0.1" value="${item.hours}"></td>
      <td><input class="table-input" aria-label="${safeText(item.name)} quantity" data-field="quantity" type="number" min="1" max="1000" step="1" value="${item.quantity}"></td>
      <td class="energy-cell">${fmt(energy)} kWh</td>
      <td><button class="remove-button" data-remove="${item.id}" aria-label="Remove ${safeText(item.name)}" title="Remove appliance">×</button></td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", handleRowChange);
  });
  tbody.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      appliances = appliances.filter((item) => item.id !== Number(button.dataset.remove));
      updateDashboard();
      $("#formMessage").textContent = "Appliance removed.";
    });
  });
}

function handleRowChange(event) {
  const row = event.target.closest("tr");
  const id = Number(row.dataset.id);
  const item = appliances.find((entry) => entry.id === id);
  const field = event.target.dataset.field;
  const value = number(event.target.value);
  const max = field === "hours" ? 24 : field === "quantity" ? 1000 : 100000;
  const min = field === "quantity" ? 1 : 0;
  if (!Number.isFinite(value) || value < min || value > max || (field === "quantity" && !Number.isInteger(value))) {
    $("#formMessage").textContent = `Enter a valid ${field} value (${min}–${max}).`;
    event.target.value = item[field];
    return;
  }
  item[field] = value;
  $("#formMessage").textContent = "";
  updateDashboard();
}

function renderChart(items, days) {
  const chart = $("#chart");
  const sorted = [...items].sort((a, b) => applianceEnergy(b, days) - applianceEnergy(a, days)).slice(0, 7);
  const values = sorted.map((item) => applianceEnergy(item, days));
  const max = Math.max(...values, 1);
  if (!sorted.length) {
    chart.innerHTML = '<p class="subheading">Add an appliance to see the consumption profile.</p>';
    return;
  }
  chart.innerHTML = sorted.map((item, index) => {
    const value = values[index];
    const height = Math.max(value > 0 ? 3 : 0, value / max * 100);
    return `<div class="bar-group" title="${safeText(item.name)}: ${fmt(value)} kWh">
      <span class="bar-value">${fmt(value, 1)}</span>
      <div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div>
      <span class="bar-label">${safeText(item.name)}</span>
    </div>`;
  }).join("");
}

function updateDashboard() {
  const days = getDays();
  const tariff = getTariff();
  const validAppliances = appliances.filter((item) =>
    [item.power, item.hours, item.quantity].every(Number.isFinite) &&
    item.power >= 0 && item.hours >= 0 && item.hours <= 24 && item.quantity >= 1
  );
  if (!days || tariff === null) {
    $("#formMessage").textContent = "Check tariff (₹0–₹10,000/kWh) and period (1–366 days).";
    return;
  }
  $("#formMessage").textContent = "";
  const total = validAppliances.reduce((sum, item) => sum + applianceEnergy(item, days), 0);
  const totalCost = total * tariff;
  $("#totalEnergy").textContent = fmt(total);
  $("#totalCost").textContent = money(totalCost);
  $("#dailyEnergy").textContent = fmt(total / days);
  $("#applianceCount").textContent = String(validAppliances.length);
  $("#periodCost").textContent = money(totalCost);
  $("#dailyCost").textContent = money(totalCost / days);
  $("#chartTotal").textContent = `${fmt(total)} kWh`;
  $("#periodLabel").textContent = `${days}-day estimate`;
  renderRows(days);
  renderChart(validAppliances, days);
  updateInsight(validAppliances, days);
}

function updateInsight(items, days) {
  const sorted = [...items].sort((a, b) => applianceEnergy(b, days) - applianceEnergy(a, days));
  if (!sorted.length || applianceEnergy(sorted[0], days) === 0) {
    $("#insightTitle").textContent = "No energy load calculated yet";
    $("#insightText").textContent = "Add an appliance and enter its rated power and operating hours to generate an estimate.";
    return;
  }
  const top = sorted[0];
  const topEnergy = applianceEnergy(top, days);
  const total = items.reduce((sum, item) => sum + applianceEnergy(item, days), 0);
  const share = total > 0 ? topEnergy / total * 100 : 0;
  $("#insightTitle").textContent = `${top.name} is your largest estimated load`;
  $("#insightText").textContent = `It contributes ${fmt(topEnergy)} kWh over ${days} days (${fmt(share, 1)}% of the calculated total). Review operating hours and actual duty cycle before drawing conclusions.`;
}

// Expose the pure calculation for tests without requiring a browser DOM.
if (typeof module !== "undefined" && module.exports) module.exports = { energyKwh };

if (typeof document !== "undefined") {
  $("#tariff").addEventListener("change", updateDashboard);
  $("#days").addEventListener("change", updateDashboard);
  $("#resetButton").addEventListener("click", () => {
    appliances = structuredClone(DEFAULT_APPLIANCES);
    nextId = 6;
    $("#tariff").value = "8.50";
    $("#days").value = "30";
    $("#formMessage").textContent = "Example values restored.";
    updateDashboard();
  });
  $("#addForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#newName").value.trim();
    const power = number($("#newPower").value);
    const hours = number($("#newHours").value);
    const quantity = number($("#newQuantity").value);
    if (!name || !Number.isFinite(power) || power <= 0 || power > 100000 ||
        !Number.isFinite(hours) || hours < 0 || hours > 24 ||
        !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      $("#formMessage").textContent = "Enter a name, power above 0 W, 0–24 hours/day, and whole-number quantity (1–1000).";
      return;
    }
    appliances.push({ id: nextId++, name, power, hours, quantity, symbol: "ϟ" });
    $("#addForm").reset();
    $("#newQuantity").value = "1";
    $("#formMessage").textContent = `${name} added to the estimate.`;
    updateDashboard();
  });
  $("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  document.querySelectorAll(".nav-item").forEach((link) => link.addEventListener("click", () => $("#sidebar").classList.remove("open")));
  updateDashboard();
}
