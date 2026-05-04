import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { ticketsMetrics } from "../adapters/tickets-metrics.js";

export const configSchema = z.object({});

export type Config = z.infer<typeof configSchema>;
export type Data = { metrics: AdapterOutput<typeof ticketsMetrics> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
