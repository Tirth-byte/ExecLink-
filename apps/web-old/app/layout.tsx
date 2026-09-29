import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExecLink Control Center",
  description: "Field evidence to verified schedule progress"
};

import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
