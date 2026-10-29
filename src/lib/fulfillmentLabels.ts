// Canonical customer-facing labels for the four rental fulfillment legs.
//
// DB columns and wire values are UNCHANGED by this module — it only maps
// those values to the words shown to customers, staff, drivers and in
// emails. See PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md (Workstream B):
//
//   - Delivery      TLA delivers the equipment to the customer.
//   - Collection     TLA collects the equipment back from the customer.
//   - Store Pickup   Customer collects the equipment at our store.
//   - Store Return   Customer brings the equipment back to our store.
//
// `fulfillment_method` stays 'delivery' | 'pickup' on the wire.
// `booking_service_tasks.task_type` stays 'delivery' | 'pickup' on the wire
// (a 'pickup' task is the driver going to collect from the customer, i.e.
// the Collection leg).
//
// Import these constants/helpers instead of hardcoding "Pickup"/"Delivery"
// strings so every screen (booking UI, staff/booker/depot, driver app,
// emails) stays in sync if the wording changes again.

export type FulfillmentMethod = 'delivery' | 'pickup';
export type RentalLeg = 'outbound' | 'return';
export type ServiceTaskType = 'delivery' | 'pickup' | 'collection';

/** Standalone leg labels, for composing sentences without a method/leg pair. */
export const DELIVERY_LABEL = 'Delivery';
export const COLLECTION_LABEL = 'Collection';
export const STORE_PICKUP_LABEL = 'Store Pickup';
export const STORE_RETURN_LABEL = 'Store Return';

/** The fulfillment method chosen at booking time. */
export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  delivery: DELIVERY_LABEL,
  pickup: STORE_PICKUP_LABEL,
};

/**
 * Label for one leg of the rental (outbound = start, return = end) given the
 * chosen fulfillment method.
 */
export const LEG_LABELS: Record<FulfillmentMethod, Record<RentalLeg, string>> = {
  delivery: { outbound: DELIVERY_LABEL, return: COLLECTION_LABEL },
  pickup: { outbound: STORE_PICKUP_LABEL, return: STORE_RETURN_LABEL },
};

export function getFulfillmentMethodLabel(method: FulfillmentMethod | string | null | undefined): string {
  return FULFILLMENT_METHOD_LABELS[(method as FulfillmentMethod) ?? 'delivery'] ?? DELIVERY_LABEL;
}

export function getLegLabel(method: FulfillmentMethod | string | null | undefined, leg: RentalLeg): string {
  return LEG_LABELS[(method as FulfillmentMethod) ?? 'delivery'][leg];
}

/**
 * Driver / depot service task type -> customer-facing label.
 * `booking_service_tasks.task_type` is 'delivery' | 'pickup' on the wire;
 * 'pickup' means the driver is collecting from the customer, so it displays
 * as "Collection". A literal 'collection' value (used by a couple of legacy
 * call sites) maps the same way.
 */
export const SERVICE_TASK_TYPE_LABELS: Record<ServiceTaskType, string> = {
  delivery: DELIVERY_LABEL,
  pickup: COLLECTION_LABEL,
  collection: COLLECTION_LABEL,
};

export function getServiceTaskTypeDisplayLabel(taskType: string | null | undefined): string {
  if (!taskType) return '';
  return SERVICE_TASK_TYPE_LABELS[taskType as ServiceTaskType] ?? taskType;
}
