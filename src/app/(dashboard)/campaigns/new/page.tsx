"use client";

import { CampaignCreator } from "@/components/campaigns/CampaignCreator";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-100">Nueva Campaña</h1>
        <p className="mt-1 text-zinc-400">
          Configura y lanza una campaña de outreach
        </p>
      </div>
      <CampaignCreator />
    </div>
  );
}
