import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NetworkBadge } from "./network-badge";

const meta = {
  title: "UI/NetworkBadge",
  component: NetworkBadge,
  args: { network: "testnet" },
} satisfies Meta<typeof NetworkBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Testnet: Story = {};

export const Mainnet: Story = {
  args: { network: "mainnet" },
};
