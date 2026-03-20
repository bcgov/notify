import rTracer from 'cls-rtracer';
import { getCorrelationId } from '../../../src/common/logging/logger';

test('getCorrelationId is undefined outside cls-rtracer context', () => {
  expect(getCorrelationId()).toBeUndefined();
});

test('getCorrelationId matches id supplied to runWithId', () => {
  const id = rTracer.runWithId(() => getCorrelationId(), 'trace-under-test');
  expect(id).toBe('trace-under-test');
});

test('getCorrelationId stringifies numeric cls id', () => {
  const id = rTracer.runWithId(() => getCorrelationId(), 42);
  expect(id).toBe('42');
});
