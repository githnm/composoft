"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Server action. Analyzer should flag both "use server" + Prisma usage.
export async function createPost(input: { title: string }) {
  return prisma.post.create({ data: input });
}

export async function deletePost(id: string) {
  return prisma.post.delete({ where: { id } });
}
