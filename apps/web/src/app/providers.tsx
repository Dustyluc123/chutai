"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toaster";
import { useSoundSetup } from "@/lib/sound";

export function Providers({ children }: { children: ReactNode }) {
  useSoundSetup();
  return <ToastProvider>{children}</ToastProvider>;
}
