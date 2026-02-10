"use client";

import { Badge } from "@/components/ui/badge";
import type { Platform } from "@/lib/marketplace/types";

const platformConfig: Record<Platform, { label: string; className: string }> = {
  mercadolibre: {
    label: "ML",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  backmarket: {
    label: "BM",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  const config = platformConfig[platform];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
