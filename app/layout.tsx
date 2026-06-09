import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RoleProvider } from "@/components/providers/role-provider";
import { ProfileProvider } from "@/components/providers/profile-provider";
import { UpdatesProvider } from "@/components/providers/updates-provider";
import { MessagesProvider } from "@/components/providers/messages-provider";
import { AIProvider } from "@/components/ai-assistant/ai-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AidPulse SG — All in one place. Faster Response.",
  description:
    "AidPulse SG: real-time health & emergency response for Singapore. Track cases, hospital beds, and coordinate volunteers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("dark", geist.variable)}>
      <body className="font-sans antialiased">
        <RoleProvider>
          <ProfileProvider>
            <UpdatesProvider>
              <MessagesProvider>
                <AIProvider>{children}</AIProvider>
              </MessagesProvider>
            </UpdatesProvider>
          </ProfileProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
