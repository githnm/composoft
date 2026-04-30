import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { activitiesList } from "../adapters/activities-list.js";
import type { activitiesLog } from "../workflows/activities-log.js";

const ACTIVITY_TYPE = z.enum(["call", "email", "meeting", "note", "task"]);

export const configSchema = z.object({
  defaultType: ACTIVITY_TYPE.default("note"),
  showLimit: z.number().int().positive().max(200).default(50),
});

export type Config = z.infer<typeof configSchema>;
// `activities` is nullable because its `dealId` param reads from page state.
// The runtime auto-skips a slot when a from-page-state param resolves to null,
// which happens on initial render before any deal is selected.
export type Data = { activities: AdapterOutput<typeof activitiesList> | null };
export type Actions = { log: WorkflowAction<typeof activitiesLog> };
export type Props = BlockProps<Config, Data, Actions>;
