// VIEW LAYER — Platform operator area shell.
//
// Only SUPER_ADMIN may enter (AppShell enforces it via canEnterArea). The nav
// is deliberately short: this area exists to observe across labs, not to
// re-implement per-lab administration, which already lives at /admin and is
// reachable from any lab row here.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

const NAV: NavItem[] = [
  { href: "/super", label: "Platform Console", icon: "layers" },
  { href: "/admin", label: "Laboratory Admin", icon: "shield" },
];

export default function SuperAdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <AppShell role="SUPER_ADMIN" nav={NAV}>
      {children}
    </AppShell>
  );
}
