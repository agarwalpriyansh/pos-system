const test = require('node:test');
const assert = require('node:assert');
const { AppError, BadRequestError } = require('../src/utils/appError');
const { getMultiplier } = require('../src/utils/multiplier');

test('Custom Errors - AppError properties', () => {
  const err = new AppError('operational failure', 400);
  assert.strictEqual(err.message, 'operational failure');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.status, 'fail');
  assert.strictEqual(err.isOperational, true);
});

test('Custom Errors - BadRequestError properties', () => {
  const err = new BadRequestError('bad user inputs');
  assert.strictEqual(err.statusCode, 400);
  assert.strictEqual(err.status, 'fail');
  assert.strictEqual(err.message, 'bad user inputs');
});

test('Multiplier - returns 1 for empty or missing inputs', () => {
  assert.strictEqual(getMultiplier(''), 1);
  assert.strictEqual(getMultiplier(null), 1);
});

test('Multiplier - parses kg correctly', () => {
  assert.strictEqual(getMultiplier('2.5kg'), 2.5);
  assert.strictEqual(getMultiplier('1kg'), 1);
});

test('Multiplier - parses grams correctly', () => {
  assert.strictEqual(getMultiplier('500g'), 0.5);
  assert.strictEqual(getMultiplier('250gm'), 0.25);
  assert.strictEqual(getMultiplier('100gms'), 0.1);
});
