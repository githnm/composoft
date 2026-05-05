"use client";

// Type-only Prisma usage + a real PATCH workflow. This is the exact
// shape the alpha.2 + alpha.3 regression hid: feature component →
// imports Prisma type for prop interface → was excluded from candidate
// analysis because the file was treated as "Prisma server-side".
//
// Also exercises the React.useX namespace shape — taxonomy's real
// editor uses `import * as React from "react"` and calls
// `React.useRef`/`React.useState`/`React.useEffect`. The state-hook
// counter and complexity-signal detector both need to recognize
// namespaced calls.
import * as React from "react";
import { Post } from "@prisma/client";

export function Editor({ post }: { post: Post }) {
  const [title, setTitle] = React.useState(post.title);
  const [body, setBody] = React.useState(post.body);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
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
  }, [title, body, post.id]);

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} />
    </div>
  );
}
