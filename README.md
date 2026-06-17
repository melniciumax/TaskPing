<div align="center">

<img src="public/logo.svg" alt="TaskPing" width="92" height="92" />

# TaskPing

**Task confirmations that actually stick.**
Ping someone to sign off a task — it lands on ARC, timestamped and undeniable, with an optional bounty that pays out the second they confirm.

![ARC Testnet](https://img.shields.io/badge/ARC-Testnet-ef7d2a?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-1c1b19?style=flat-square)
![ethers](https://img.shields.io/badge/ethers-v6-1c1b19?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8-f4bd2f?style=flat-square)

### [→ Open the app](https://taskping.vercel.app)

</div>

---

## Why

I'm an MEP engineer by trade, and freelance projects live and die by tiny approvals. *"Did the contractor sign off the duct layout?" "Did the client okay rev. C?"* Someone confirms it verbally, someone else goes quiet for a week, and there's never a paper trail. TaskPing is the paper trail — on-chain.

## What it does

- **Ping** — send a task to someone's wallet. Attach an ARC bounty if you want.
- **Confirm** — they sign off in one click. It's written to ARC forever: who approved what, and exactly when.
- **Settle** — the bounty releases to them the instant they confirm. Decline or cancel refunds you. No custodian, no middleman.
- **Track** — an inbox of pings waiting on you, a sent list, and a reputation counter for every sign-off you've delivered.

## Why on ARC

Tiny approvals only make sense if confirming is cheap and instant — which is exactly what ARC is good at. Every sign-off is a real transaction: timestamped, public, and verifiable by anyone on [ArcScan](https://testnet.arcscan.app), with the bounty moving natively in ARC in the same step.

| | |
| --- | --- |
| Network | ARC Testnet · chain `5042002` |
| Contract | [`0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3`](https://testnet.arcscan.app/address/0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3) |
| Fee | none — funds go straight between the two parties |

The `TaskPing` contract is written in Solidity and verified on ArcScan, so anyone can read exactly what happens to an escrowed bounty.

## Built with

`Next.js 16` · `React 19` · `ethers v6` · EIP-6963 multi-wallet support (works with Rabby, MetaMask & co.) · a light, sticker-flavoured UI.
