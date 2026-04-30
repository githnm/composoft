import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { dealsById } from "../adapters/deals-by-id.js";
import type { contactsList } from "../adapters/contacts-list.js";
import type { activitiesList } from "../adapters/activities-list.js";
import type { dealsMoveStage } from "../workflows/deals-move-stage.js";
import type { dealsAssignRep } from "../workflows/deals-assign-rep.js";
import type { dealsClose } from "../workflows/deals-close.js";

export const configSchema = z.object({
  showActivityCount: z.number().int().positive().max(50).default(8),
});

export type Config = z.infer<typeof configSchema>;
// All three slots read selection.dealId from page state. The runtime auto-skips
// a slot when a from-page-state param resolves to null, so each slot can be
// null on initial render before a deal has been selected. (`deal` was already
// nullable from its adapter's output schema; contacts/activities are array
// types and become null only via auto-skip.)
export type Data = {
  deal: AdapterOutput<typeof dealsById>;
  contacts: AdapterOutput<typeof contactsList> | null;
  activities: AdapterOutput<typeof activitiesList> | null;
};
export type Actions = {
  moveStage: WorkflowAction<typeof dealsMoveStage>;
  assignRep: WorkflowAction<typeof dealsAssignRep>;
  close: WorkflowAction<typeof dealsClose>;
};
export type Props = BlockProps<Config, Data, Actions>;
