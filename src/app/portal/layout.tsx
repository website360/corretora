import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal do Cliente",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/20">{children}</div>;
}
