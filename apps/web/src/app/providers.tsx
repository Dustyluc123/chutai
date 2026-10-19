"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
