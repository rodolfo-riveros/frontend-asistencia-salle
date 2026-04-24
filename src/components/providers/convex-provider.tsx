
"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// URL de producción proporcionada por el usuario
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://elated-lapwing-220.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
