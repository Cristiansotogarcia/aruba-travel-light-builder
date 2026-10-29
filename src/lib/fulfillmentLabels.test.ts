// src/lib/fulfillmentLabels.test.ts
import { describe, it, expect } from 'vitest';
import {
  DELIVERY_LABEL,
  COLLECTION_LABEL,
  STORE_PICKUP_LABEL,
  STORE_RETURN_LABEL,
  getFulfillmentMethodLabel,
  getLegLabel,
  getServiceTaskTypeDisplayLabel,
} from './fulfillmentLabels';

describe('getFulfillmentMethodLabel', () => {
  it('maps delivery to Delivery', () => {
    expect(getFulfillmentMethodLabel('delivery')).toBe(DELIVERY_LABEL);
  });
  it('maps pickup to Store Pickup', () => {
    expect(getFulfillmentMethodLabel('pickup')).toBe(STORE_PICKUP_LABEL);
  });
  it('defaults to Delivery for null/undefined/unknown', () => {
    expect(getFulfillmentMethodLabel(null)).toBe(DELIVERY_LABEL);
    expect(getFulfillmentMethodLabel(undefined)).toBe(DELIVERY_LABEL);
    expect(getFulfillmentMethodLabel('something-else')).toBe(DELIVERY_LABEL);
  });
});

describe('getLegLabel', () => {
  it('delivery method: outbound is Delivery, return is Collection', () => {
    expect(getLegLabel('delivery', 'outbound')).toBe(DELIVERY_LABEL);
    expect(getLegLabel('delivery', 'return')).toBe(COLLECTION_LABEL);
  });
  it('pickup method: outbound is Store Pickup, return is Store Return', () => {
    expect(getLegLabel('pickup', 'outbound')).toBe(STORE_PICKUP_LABEL);
    expect(getLegLabel('pickup', 'return')).toBe(STORE_RETURN_LABEL);
  });
  it('defaults to the delivery method mapping for null/undefined', () => {
    expect(getLegLabel(null, 'outbound')).toBe(DELIVERY_LABEL);
    expect(getLegLabel(undefined, 'return')).toBe(COLLECTION_LABEL);
  });
});

describe('getServiceTaskTypeDisplayLabel', () => {
  it('maps the driver "pickup" task (collecting from the customer) to Collection', () => {
    expect(getServiceTaskTypeDisplayLabel('pickup')).toBe(COLLECTION_LABEL);
  });
  it('maps delivery to Delivery', () => {
    expect(getServiceTaskTypeDisplayLabel('delivery')).toBe(DELIVERY_LABEL);
  });
  it('maps a literal "collection" value to Collection', () => {
    expect(getServiceTaskTypeDisplayLabel('collection')).toBe(COLLECTION_LABEL);
  });
  it('returns an empty string for null/undefined', () => {
    expect(getServiceTaskTypeDisplayLabel(null)).toBe('');
    expect(getServiceTaskTypeDisplayLabel(undefined)).toBe('');
  });
  it('passes through an unrecognized task type unchanged', () => {
    expect(getServiceTaskTypeDisplayLabel('something-else')).toBe('something-else');
  });
});
