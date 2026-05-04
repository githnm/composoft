import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const hostSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  timezone: z.string(),
  avatarUrl: z.string(),
});

export const hostsList = defineAdapter({
  id: "hosts.list",
  version: "0.1.0",
  description: "List all hosts.",
  params: z.object({}),
  output: z.array(hostSchema),
  run: async () => db.hosts.list(),
});
