import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskPing — on-chain task confirmations on ARC",
  description:
    "Ping someone to confirm a task and get an immutable, timestamped sign-off on ARC. Attach a USDC bounty that releases the moment they confirm.",
  keywords:
    "ARC testnet, task confirmation, on-chain sign-off, web3, escrow, approvals, TaskPing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
