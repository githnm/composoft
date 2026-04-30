import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { leadsList } from "../adapters/leads-list.js";
import type { leadsConvert } from "../workflows/leads-convert.js";

const LEAD_STATUS = z.enum([
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
]);

export const configSchema = z.object({
  defaultStatus: LEAD_STATUS.optional(),
  pageSize: z.number().int().positive().max(100).default(25),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { leads: AdapterOutput<typeof leadsList> };
export type Actions = { convert: WorkflowAction<typeof leadsConvert> };
export type Props = BlockProps<Config, Data, Actions>;
