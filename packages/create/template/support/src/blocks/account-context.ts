import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./account-context-types.js";
import { AccountContextView } from "./account-context.component.js";

export const accountContextBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "support.account-context",
  version: "0.1.0",
  description:
    "Account context card. Reads selection.accountId from page state to show the account's name, plan, ARR, and health score next to a ticket. Falls back to defaultAccountId from config when no selection is set.",
  config: configSchema,
  data: {
    account: {
      adapter: "accounts.by-id",
      params: {
        accountId: { kind: "from-page-state", path: "selection.accountId" },
      },
    },
  },
  actions: {},
  component: AccountContextView,
});
