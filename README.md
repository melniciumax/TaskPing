# TaskPing

Little work approvals — but ones you can actually prove later.

I do freelance MEP work, and honestly half my week is *"did you sign off on that?"* —
someone okays a change on the phone, someone else forgets, and there's never any
record of who agreed to what. So I made TaskPing.

You send someone a task, they tap **Confirm**, and the sign-off gets written to the
chain with their wallet address and a timestamp. No "I never said that" a week later.

You can also pin a **USDC bounty** to a task. It sits in escrow and goes to them the
moment they confirm — decline or cancel and it comes right back to you.

Live on ARC Testnet → **https://taskping.vercel.app**

## How a ping works

1. You send a task to someone's wallet (optionally with a USDC bounty).
2. They **Confirm** or **Decline** in one tap.
3. Confirm pays out the bounty on the spot. Decline or cancel refunds you.
4. Every step is a real transaction — anyone can read it on [ArcScan](https://testnet.arcscan.app).

There's an inbox of pings waiting on you, a list of the ones you've sent, and a little
counter of how many sign-offs you've delivered.

## The contract

Deployed and verified on ARC Testnet (chain `5042002`):

```
0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3
```

Plain Solidity. The escrow lives in the contract, there are no fees, and nobody
custodies your money — it moves straight between the two wallets.

## Stack

Next.js + ethers on the front, plain Solidity for the contract. Wallet connect goes
through EIP-6963 so it behaves with Rabby / MetaMask / whatever you've got installed.
Kept it lightweight on purpose — the whole point only works if confirming is cheap and
instant, which is why it's on ARC.
