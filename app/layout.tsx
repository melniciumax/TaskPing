import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskPing — on-chain task confirmations on ARC",
  description:
    "Ping someone to confirm a task and get an immutable, timestamped sign-off on ARC. Attach a USDC bounty that releases the moment they confirm.",
  keywords:
    "ARC testnet, task confirmation, on-chain sign-off, web3, escrow, approvals, TaskPing",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
