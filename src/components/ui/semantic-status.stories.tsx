import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  AssetBadge,
  LinkTypeBadge,
  ReadinessBadge,
  RoleBadge,
} from "./identity-badges";
import { NetworkBadge } from "./network-badge";
import { CardAccent, StatusBadge } from "./semantic-status";

function SemanticStatusGallery() {
  return (
    <div className="max-w-3xl space-y-8 bg-background p-8 text-foreground">
      <section>
        <h2 className="font-heading text-xl font-semibold">Semantic states</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatusBadge family="neutral" label="Unpaid" />
          <StatusBadge family="in_progress" label="Validating" animated />
          <StatusBadge family="complete" label="Paid" />
          <StatusBadge family="action_required" label="Needs review" />
          <StatusBadge family="destructive" label="Failed" />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Identity badges</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <NetworkBadge network="testnet" />
          <NetworkBadge network="mainnet" />
          <AssetBadge symbol="XRP" />
          <AssetBadge symbol="RLUSD" official />
          <RoleBadge role="recipient" />
          <RoleBadge role="operator" />
          <RoleBadge role="payer" />
          <LinkTypeBadge type="payment" />
          <LinkTypeBadge type="progress" />
          <LinkTypeBadge type="preparation" />
          <LinkTypeBadge type="proof" />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Readiness</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ReadinessBadge status="ready" />
          <ReadinessBadge status="checking" />
          <ReadinessBadge status="blocked" />
          <ReadinessBadge status="unavailable" />
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-semibold">Card accents</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              "neutral",
              "in_progress",
              "complete",
              "action_required",
              "destructive",
            ] as const
          ).map((family) => (
            <CardAccent
              key={family}
              family={family}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="font-semibold">{family.replaceAll("_", " ")}</p>
              <p className="mt-1 text-sm text-muted">
                Thin accent only; content remains readable without color.
              </p>
            </CardAccent>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "UI/Semantic Status System",
  component: SemanticStatusGallery,
} satisfies Meta<typeof SemanticStatusGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
