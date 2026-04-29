import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const categorySchema = z.enum(["green-coffee", "roasted", "packaging", "equipment"]);

export const inventoryItemsList = defineAdapter({
  id: "inventory-items.list",
  version: "0.1.0",
  description: "List inventory items joined with warehouse and vendor names. Optional low-stock filter.",
  params: z.object({
    warehouseId: z.string().optional(),
    vendorId: z.string().optional(),
    category: categorySchema.optional(),
    lowStock: z.boolean().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
      category: categorySchema,
      warehouseId: z.string(),
      warehouseName: z.string(),
      quantityOnHand: z.number().int(),
      reorderPoint: z.number().int(),
      unitCost: z.number(),
      vendorId: z.string(),
      vendorName: z.string(),
    }),
  ),
  run: async (params) => {
    return db.inventoryItems.list(params);

    // Equivalent in Supabase:
    //   const { data } = await supabase.from('inventory_items')
    //     .select('*, warehouses(name), vendors(name)')
    //     .match({ warehouse_id: params.warehouseId, ... });
    // Equivalent in DuckDB (parameter syntax differs):
    //   const result = await conn.runAndReadAll(
    //     `SELECT i.*, w.name AS warehouse_name FROM inventory_items i
    //      JOIN warehouses w ON w.id = i.warehouse_id WHERE i.warehouse_id = ?`,
    //     [params.warehouseId]
    //   );
  },
});
