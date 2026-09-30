import { describe, expect, it } from 'vitest';
import {
  AVATAR_EXPORT_SIZE,
  BODY_ASPECT_PRESETS,
  BODY_MAX_LONG_SIDE,
  COVER_EXPORT_SIZE,
  computeExportSize,
} from './imageCrop';

describe('computeExportSize', () => {
  it('always uses the exact target size for a fixed-size constraint (cover)', () => {
    expect(computeExportSize({ x: 0, y: 0, width: 4000, height: 2100 }, COVER_EXPORT_SIZE)).toEqual({
      width: 1200,
      height: 630,
    });
    // Even a crop smaller than the target still resamples up to the exact size —
    // react-easy-crop already forced the crop rectangle to the right aspect.
    expect(computeExportSize({ x: 0, y: 0, width: 600, height: 315 }, COVER_EXPORT_SIZE)).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it('always uses the exact target size for the avatar', () => {
    expect(computeExportSize({ x: 10, y: 10, width: 900, height: 900 }, AVATAR_EXPORT_SIZE)).toEqual({
      width: 512,
      height: 512,
    });
  });

  it('downscales a body image proportionally so the longest side is capped', () => {
    // 3200x1800 -> longest side 3200 -> scale 1600/3200 = 0.5
    expect(computeExportSize({ x: 0, y: 0, width: 3200, height: 1800 }, { maxLongSide: BODY_MAX_LONG_SIDE })).toEqual(
      { width: 1600, height: 900 },
    );
  });

  it('never upscales a body image smaller than the cap', () => {
    expect(computeExportSize({ x: 0, y: 0, width: 800, height: 450 }, { maxLongSide: BODY_MAX_LONG_SIDE })).toEqual({
      width: 800,
      height: 450,
    });
  });

  it('caps on whichever side is longest, including a tall crop', () => {
    // 900x3200 -> longest side is height -> scale 1600/3200 = 0.5
    expect(computeExportSize({ x: 0, y: 0, width: 900, height: 3200 }, { maxLongSide: BODY_MAX_LONG_SIDE })).toEqual({
      width: 450,
      height: 1600,
    });
  });

  it('never produces a zero-sized export from a degenerate crop', () => {
    expect(computeExportSize({ x: 0, y: 0, width: 0, height: 0 }, { maxLongSide: BODY_MAX_LONG_SIDE })).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe('BODY_ASPECT_PRESETS', () => {
  it('offers Free, 16:9, 4:3 and 1:1, in that order', () => {
    expect(BODY_ASPECT_PRESETS.map((preset) => preset.label)).toEqual(['Free', '16:9', '4:3', '1:1']);
  });

  it('leaves Free unconstrained and gives the rest their numeric ratio', () => {
    const byId = Object.fromEntries(BODY_ASPECT_PRESETS.map((preset) => [preset.id, preset.value]));
    expect(byId.free).toBeUndefined();
    expect(byId.wide).toBeCloseTo(16 / 9);
    expect(byId.standard).toBeCloseTo(4 / 3);
    expect(byId.square).toBe(1);
  });
});
