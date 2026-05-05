import useSWR from "swr";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";

type Post = { id: string; title: string; published: boolean };

// Real read pattern: useSWR("/api/posts"). Plus two UI primitive imports
// to push their importer count up to the threshold for primitive
// detection.
export function PostsList() {
  const { data, isLoading } = useSWR<Post[]>("/api/posts");
  if (isLoading) return <Skeleton />;
  return (
    <ul>
      {data?.map((p) => (
        <li key={p.id}>
          {p.title} {p.published ? <Badge>published</Badge> : <Badge variant="outline">draft</Badge>}
        </li>
      ))}
    </ul>
  );
}
