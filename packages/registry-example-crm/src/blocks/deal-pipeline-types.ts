import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter, WorkflowAction } from "@composoft/spec";
import type { dealsList } from "../adapters/deals-list.js";
import type { dealsMoveStage } from "../workflows/deals-move-stage.js";

const DEAL_STAGE = z.enum([
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
]);

export const configSchema = z.object({
  stages: z
    .array(DEAL_STAGE)
    .default(["discovery", "qualified", "proposal", "negotiation"]),
  title: z.string().default("Pipeline"),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { deals: AdapterOutput<typeof dealsList> };
export type Actions = { moveStage: WorkflowAction<typeof dealsMoveStage> };
export type Writes = { selectedDealId: PageStateWriter<string> };
export type Props = BlockProps<Config, Data, Actions, Writes>;
