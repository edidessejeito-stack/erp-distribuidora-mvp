import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMargin,
  generateEAN13,
  validateEAN13,
  formatCurrency,
  formatNCM,
  isLowStock,
} from './calculations.ts';

test('calculateMargin: correctly calculates profit and margin percentage', () => {
  // Custo R$ 6,50, Venda R$ 10,00 -> Lucro R$ 3,50 (Margem 35% -> Ótima)
  const result = calculateMargin(6.5, 10.0);
  assert.equal(result.profit, 3.5);
  assert.equal(result.marginPercent, 35);
  assert.equal(result.status, 'great');
});

test('calculateMargin: classifies moderate margin correctly (15-24%)', () => {
  // Custo R$ 8,20, Venda R$ 10,00 -> Lucro R$ 1,80 (Margem 18% -> Moderada)
  const result = calculateMargin(8.2, 10.0);
  assert.equal(result.profit, 1.8);
  assert.equal(result.marginPercent, 18);
  assert.equal(result.status, 'moderate');
});

test('calculateMargin: classifies low margin (< 15%)', () => {
  // Custo R$ 9,20, Venda R$ 10,00 -> Lucro R$ 0,80 (Margem 8% -> Baixa)
  const result = calculateMargin(9.2, 10.0);
  assert.equal(result.profit, 0.8);
  assert.equal(result.marginPercent, 8);
  assert.equal(result.status, 'low');
});

test('generateEAN13: produces 13-digit valid barcode matching GS1 mod10 check digit', () => {
  const barcode = generateEAN13();
  assert.equal(barcode.length, 13);
  assert.equal(barcode.startsWith('789'), true);
  assert.equal(validateEAN13(barcode), true);
});

test('validateEAN13: validates known standard barcodes and rejects invalid ones', () => {
  // Heineken 600ml Brazilian EAN: 7896045505418
  assert.equal(validateEAN13('7896045505418'), true);
  // Invalid check digit
  assert.equal(validateEAN13('7896045505419'), false);
  // Invalid length
  assert.equal(validateEAN13('12345'), false);
});

test('formatCurrency: formats number in Brazilian currency string', () => {
  const formatted = formatCurrency(1234.5);
  assert.match(formatted, /1\.234,50/);
});

test('formatNCM: formats 8 digits into standard NCM mask', () => {
  assert.equal(formatNCM('22030000'), '2203.00.00');
  assert.equal(formatNCM('2203.00.00'), '2203.00.00');
});

test('isLowStock: flags items below or equal to minStock threshold', () => {
  assert.equal(isLowStock(10, 15), true);
  assert.equal(isLowStock(15, 15), true);
  assert.equal(isLowStock(20, 15), false);
});
