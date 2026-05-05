import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Async server component — Next.js 13+ idiom. Analyzer should flag in
// limitations[] under both "Async server components" and "Prisma".
export default async function DashboardPage() {
  const posts = await prisma.post.findMany({ take: 10 });
  return (
    <main>
      <h1>Dashboard</h1>
      <ul>
        {posts.map((p: { id: string; title: string }) => (
          <li key={p.id}>{p.title}</li>
        ))}
      </ul>
    </main>
  );
}
