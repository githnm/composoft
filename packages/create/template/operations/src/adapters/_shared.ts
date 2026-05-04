import { z } from "zod";

export const dateRangeSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .optional();

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  unitOfMeasure: z.string(),
  unitCost: z.number().nonnegative(),
  primaryVendorId: z.string(),
  reorderPoint: z.number().int().nonnegative(),
  reorderQuantity: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  terms: z.string(),
  leadTimeDays: z.number().int().nonnegative(),
  performanceScore: z.number().min(0).max(100),
  createdAt: z.string(),
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["warehouse", "store", "supplier"]),
  address: z.string(),
  isActive: z.boolean(),
});

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountNumber: z.string(),
  email: z.string(),
  phone: z.string(),
  billingAddress: z.string(),
  shippingAddress: z.string(),
  totalLifetimeOrders: z.number().int().nonnegative(),
});

export const stockMovementSchema = z.object({
  id: z.string(),
  productId: z.string(),
  locationId: z.string(),
  quantity: z.number(),
  direction: z.enum(["in", "out", "transfer"]),
  reason: z.string(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string(),
});

export const poStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "received",
  "closed",
  "cancelled",
]);

export const purchaseOrderSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  vendorId: z.string(),
  status: poStatusSchema,
  orderDate: z.string(),
  expectedDelivery: z.string(),
  actualDelivery: z.string().nullable(),
  totalAmount: z.number().nonnegative(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  notes: z.string(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export const purchaseOrderLineSchema = z.object({
  id: z.string(),
  poId: z.string(),
  productId: z.string(),
  quantity: z.number().int().nonnegative(),
  unitCost: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  receivedQuantity: z.number().int().nonnegative(),
});

export const enrichedPoLineSchema = purchaseOrderLineSchema.extend({
  productSku: z.string(),
  productName: z.string(),
  productUom: z.string(),
});

export const approvalRequestSchema = z.object({
  id: z.string(),
  poId: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  approver: z.string().nullable(),
  decidedAt: z.string().nullable(),
  comments: z.string(),
});

export const enrichedApprovalSchema = approvalRequestSchema.extend({
  poNumber: z.string(),
  vendorId: z.string(),
  vendorName: z.string(),
  totalAmount: z.number().nonnegative(),
});

export const auditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
});
