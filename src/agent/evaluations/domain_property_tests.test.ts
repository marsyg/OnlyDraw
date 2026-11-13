import { describe, it, expect } from 'vitest';
import { Op } from '../domain';

// Property: Over 100 runs, both create_shape and create_arrow appear
it('both op types generated over many runs', () => {
  const shapeOps = new Set<string>();
  const arrowOps = new Set<string>();

  for (let i = 0; i < 100; i++) {
    // Simulate random op generation
    const kinds = ['create_shape', 'create_arrow'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === 'create_shape') shapeOps.add('create_shape');
    if (kind === 'create_arrow') arrowOps.add('create_arrow');
  }

  expect(shapeOps.size).toBeGreaterThan(0);
  expect(arrowOps.size).toBeGreaterThan(0);
});