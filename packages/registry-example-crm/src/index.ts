import type {
  AuthenticateFn,
  AuthorizeFn,
  Identity,
  Registry,
} from "@composoft/spec";

import { leadsList } from "./adapters/leads-list.js";
import { leadsById } from "./adapters/leads-by-id.js";
import { dealsList } from "./adapters/deals-list.js";
import { dealsById } from "./adapters/deals-by-id.js";
import { contactsList } from "./adapters/contacts-list.js";
import { activitiesList } from "./adapters/activities-list.js";
import { repsList } from "./adapters/reps-list.js";

import { leadsConvert } from "./workflows/leads-convert.js";
import { dealsMoveStage } from "./workflows/deals-move-stage.js";
import { dealsAssignRep } from "./workflows/deals-assign-rep.js";
import { activitiesLog } from "./workflows/activities-log.js";
import { dealsClose } from "./workflows/deals-close.js";

import { dealPipelineBlock } from "./blocks/deal-pipeline.js";
import { leadListBlock } from "./blocks/lead-list.js";
import { dealDetailBlock } from "./blocks/deal-detail.js";
import { activityFeedBlock } from "./blocks/activity-feed.js";
import { contactCardBlock } from "./blocks/contact-card.js";
import { repLeaderboardBlock } from "./blocks/rep-leaderboard.js";

import { db } from "./db.js";

export const adapters = {
  "leads.list": leadsList,
  "leads.by-id": leadsById,
  "deals.list": dealsList,
  "deals.by-id": dealsById,
  "contacts.list": contactsList,
  "activities.list": activitiesList,
  "reps.list": repsList,
} as const;

export const workflows = {
  "leads.convert": leadsConvert,
  "deals.move-stage": dealsMoveStage,
  "deals.assign-rep": dealsAssignRep,
  "activities.log": activitiesLog,
  "deals.close": dealsClose,
} as const;

export const blocks = {
  "crm.deal-pipeline": dealPipelineBlock,
  "crm.lead-list": leadListBlock,
  "crm.deal-detail": dealDetailBlock,
  "crm.activity-feed": activityFeedBlock,
  "crm.contact-card": contactCardBlock,
  "crm.rep-leaderboard": repLeaderboardBlock,
} as const;

/**
 * Real ids surfaced to the composer so block configs reference live entities
 * instead of hallucinated labels. Every scope here corresponds to a config
 * field, workflow input, or page-state value somewhere in this registry.
 */
async function referenceData() {
  return {
    dealStages: [
      { id: "discovery",    label: "Discovery"   },
      { id: "qualified",    label: "Qualified"   },
      { id: "proposal",     label: "Proposal"    },
      { id: "negotiation",  label: "Negotiation" },
      { id: "closed-won",   label: "Closed Won"  },
      { id: "closed-lost",  label: "Closed Lost" },
    ],
    leadStatuses: [
      { id: "new",         label: "New"         },
      { id: "contacted",   label: "Contacted"   },
      { id: "qualified",   label: "Qualified"   },
      { id: "unqualified", label: "Unqualified" },
      { id: "converted",   label: "Converted"   },
    ],
    reps: db.reps.list().map((r) => ({ id: r.id, label: r.name })),
    activityTypes: [
      { id: "call",    label: "Call"    },
      { id: "email",   label: "Email"   },
      { id: "meeting", label: "Meeting" },
      { id: "note",    label: "Note"    },
      { id: "task",    label: "Task"    },
    ],
    leadSources: [
      { id: "inbound-form", label: "Inbound form" },
      { id: "outbound",     label: "Outbound"     },
      { id: "referral",     label: "Referral"     },
      { id: "event-booth",  label: "Event booth"  },
      { id: "linkedin",     label: "LinkedIn"     },
    ],
  };
}

/**
 * Placeholder authenticate: trusts the `X-Composoft-User` header and returns
 * a minimal Identity. Replace with a real session/JWT check before deploying.
 */
const authenticate: AuthenticateFn = async (request: Request) => {
  const userId = request.headers.get("X-Composoft-User");
  if (!userId) return null;
  const identity: Identity = {
    userId,
    claims: { source: "header" },
  };
  return identity;
};

/**
 * Placeholder authorize: allows every authenticated caller through, but logs
 * the request for traceability. Replace with real role/scope checks before
 * deploying.
 */
const authorize: AuthorizeFn = async (identity, request) => {
  console.log(
    `[crm-registry authorize] user=${identity.userId} kind=${request.kind} ` +
      `target=${request.kind === "action" ? request.workflowId : request.adapterId}`,
  );
  return true;
};

export const registry: Registry = {
  name: "example-crm",
  version: "0.0.1",
  adapters,
  workflows,
  blocks,
  referenceData,
  authenticate,
  authorize,
  product: {
    name: "CRM",
    accentColor: "#6366f1",
    navigation: [
      { label: "Pipeline", path: "/", icon: "Layers" },
      { label: "Leads", path: "/leads", icon: "UserPlus" },
    ],
  },
};

export type CrmRegistry = typeof registry;

export { db } from "./db.js";
