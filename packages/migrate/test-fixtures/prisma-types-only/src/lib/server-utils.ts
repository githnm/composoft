// Real server-side Prisma usage. PrismaClient is imported as a
// runtime symbol AND used to construct a client AND used in a model
// call shape. Should be excluded from candidate analysis and flagged
// in limitations[] under "Prisma server-side queries".
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listPosts() {
  return prisma.post.findMany({ take: 10 });
}

export async function findPost(id: string) {
  return prisma.post.findUnique({ where: { id } });
}
