import { describe, expect, it } from 'vitest';

import {
  nextRegionMarkerLevel,
  regionFocusLevel,
} from './appUtils';

describe('app map zoom helpers', () => {
  it('focuses district selections at neighborhood marker level', () => {
    expect(regionFocusLevel(1)).toBe(5);
  });

  it('focuses neighborhood selections at complex marker level', () => {
    expect(regionFocusLevel(2)).toBe(4);
  });

  it('steps map region markers from district to neighborhood to complex levels', () => {
    expect(nextRegionMarkerLevel(8)).toBe(5);
    expect(nextRegionMarkerLevel(5)).toBe(4);
  });
});
