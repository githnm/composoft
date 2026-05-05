// Imports `Post` from @prisma/client purely for prop typing.
// The named import is NOT marked `import type`, but every reference
// to `Post` in this file is in a type position (interface property
// type) — alpha.4's runtime-vs-type distinction should keep this
// file in candidate analysis.
import { Post } from "@prisma/client";

interface Props {
  post: Pick<Post, "id" | "title" | "published">;
}

export function PostItem({ post }: Props) {
  return (
    <article>
      <h3>{post.title}</h3>
      {post.published ? <span>live</span> : <span>draft</span>}
    </article>
  );
}
