/* Run with: node --test tests/energy.test.js */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { energyKwh } = require("../app.js");

test("calculates energy for a single load", () => {
  assert.equal(energyKwh(1000, 2, 1, 1), 2);
});
test("includes quantity and days", () => {
  assert.equal(energyKwh(100, 5, 2, 30), 30);
});
test("zero operating time produces zero energy", () => {
  assert.equal(energyKwh(500, 0, 1, 30), 0);
});
test("fractional values are supported", () => {
  assert.equal(energyKwh(65, 2.5, 2, 30), 9.75);
});
test("rejects negative inputs", () => {
  assert.throws(() => energyKwh(-1, 1, 1, 1), RangeError);
});
test("rejects hours above 24", () => {
  assert.throws(() => energyKwh(100, 25, 1, 1), RangeError);
});
test("rejects non-finite inputs", () => {
  assert.throws(() => energyKwh(NaN, 1, 1, 1), TypeError);
});
