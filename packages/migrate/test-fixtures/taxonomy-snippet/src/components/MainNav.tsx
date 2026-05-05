import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "./ui/Badge";

// usePathname is a complexity signal — analyzer should bump difficulty
// from easy to medium even though there's no useState.
export function MainNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/editor", label: "Editor" },
  ];
  return (
    <nav>
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link key={it.href} href={it.href} className={active ? "active" : ""}>
            {it.label} {active ? <Badge variant="outline">current</Badge> : null}
          </Link>
        );
      })}
    </nav>
  );
}
