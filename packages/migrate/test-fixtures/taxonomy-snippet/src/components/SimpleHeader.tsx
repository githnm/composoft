import { Badge } from "./ui/Badge";

export function SimpleHeader({ status }: { status: string }) {
  return (
    <header>
      <Badge>{status}</Badge>
    </header>
  );
}
