import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const customerById = defineAdapter({
  id: "customers.by-id",
  version: "0.1.0",
  description: "Return a customer record by id, including VIP flag, tags, and recent ticket ids.",
  params: z.object({
    customerId: z.string(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    vip: z.boolean(),
    tags: z.array(z.string()),
    createdAt: z.string(),
    recentTicketIds: z.array(z.string()),
  }),
  run: async ({ customerId }) => {
    const c = db.customers.byId(customerId);
    if (!c) {
      throw new Error(`customer ${customerId} not found`);
    }
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      vip: c.vip,
      tags: [...c.tags],
      createdAt: c.createdAt,
      recentTicketIds: db.customers.recentTicketIds(c.id, 5),
    };
  },
});
