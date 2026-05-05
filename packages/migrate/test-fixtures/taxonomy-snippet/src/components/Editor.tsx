import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "./ui/Skeleton";

type Post = { id: string; title: string; body: string };

// Editor — taxonomy-shaped: useRef for debounce timer, useEffect for
// autosave, useSession for auth, a write workflow (PATCH /api/posts/${id}).
// Analyzer should bump easy → medium → hard via complexity signals.
export function Editor({ post }: { post: Post }) {
  const { data: session } = useSession();
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, body, post.id, session]);

  if (!session) return <Skeleton />;

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
    </div>
  );
}
