import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PaymentPreview } from "./payment-preview";

const meta = {
  title: "Payment/PaymentPreview",
  component: PaymentPreview,
  args: {
    billTitle: "XRPL Meetup Dinner",
    amount: "4",
    recipient: "rABC…9XYZ",
    network: "testnet",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PaymentPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Testnet: Story = {};

export const Mainnet: Story = {
  args: { network: "mainnet" },
};
