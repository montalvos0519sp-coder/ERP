"use client";

import { usePathname } from "next/navigation";

import { ThemeProvider } from "@/lib/ThemeContext";
import { UserPrefsProvider } from "@/lib/UserPrefsContext";
import { UserProvider } from "@/lib/UserContext";
import { ChatProvider } from "@/lib/ChatContext";
import DashboardShell from "@/components/DashboardShell";

const PUBLIC_ROUTES = ["/login", "/encuesta"];

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  return (
    <ThemeProvider>
      <UserProvider>
        <UserPrefsProvider>
          <ChatProvider>
            {isPublic ? children : <DashboardShell>{children}</DashboardShell>}
          </ChatProvider>
        </UserPrefsProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
