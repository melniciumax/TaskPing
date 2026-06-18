# TaskPing — design note

Status: deployed (Arc testnet, chain 5042002)
Author: Max Melniciuc (melniciumax)
Scope: a single contract plus a thin web client; nothing runs server-side, and there is no off-chain agent.

This document specifies what TaskPing is, the state machine it enforces, and the
interface it exposes. It is written as a spec, not a pitch.

## 1. Problem

Approval workflows fail at the record layer, not the decision layer. Someone okays a
change verbally or over chat; later nobody can establish *who* agreed, *to what*, and
*when* — and there is no clean way to couple "you confirmed" to "you got paid for it."

The requirement is narrow:

- A confirmation must be attributable to a specific party (their key signs it).
- It must be timestamped and non-repudiable after the fact.
- If money is attached to the confirmation, the payment and the confirmation must be
  one event — not two steps that can disagree.

TaskPing is the minimal object that satisfies those three constraints.

## 2. Model

A **ping** is a request from a `from` address to a `to` address to confirm one titled
task, optionally carrying an escrowed bounty. The bounty is native Arc value sent as
`msg.value` at creation (the chain's native unit is presented as USDC in the wallet and
UI; there is no ERC-20 — value moves as `call{value: ...}`, 18-decimal native).

Only the assignee can resolve a pending ping by confirming or declining it. Only the
requester can cancel it. Resolution is terminal. The bounty is held by the contract
between creation and resolution and never by a third party.

The settlement rule is the whole point: on `confirm`, the assignee's sign-off and the
bounty transfer to that same assignee occur in one transaction. There is no window in
which the task is "confirmed but unpaid" or "paid but unconfirmed."

## 3. State & transitions

```
Status = { Pending=0, Confirmed=1, Declined=2, Cancelled=3 }

createPing(to, title){value}   →  Pending          escrows msg.value
Pending  --confirm  (by to)    →  Confirmed         pays bounty → to
Pending  --decline  (by to)    →  Declined          refunds bounty → from
Pending  --cancel   (by from)  →  Cancelled         refunds bounty → from
```

Invariants enforced on-chain:

- `to != 0`, `to != from` (no self-pings); title is 1–120 bytes.
- Each transition requires `status == Pending`; terminal states are immutable.
- `confirm`/`decline` are gated to `msg.sender == to`; `cancel` to `msg.sender == from`.
- `totalEscrowed` tracks live custody and is decremented before each outbound transfer;
  every payout/refund is a checked low-level `call` that reverts the whole transition on
  failure (no partial state change, no stranded escrow).
- `confirmedCount[to]` increments on each confirm — a running, on-chain count of
  sign-offs delivered by an address (used as lightweight reputation).

## 4. Interface

Write (state transitions):

| Function | Caller | Effect |
|---|---|---|
| `createPing(address to, string title) payable → uint256` | anyone | mint Pending ping #id, escrow `msg.value`, append to sender's sent[] and target's received[] |
| `confirm(uint256 id)` | assignee | → Confirmed, pay bounty to assignee, bump reputation |
| `decline(uint256 id)` | assignee | → Declined, refund bounty to requester |
| `cancel(uint256 id)` | requester | → Cancelled, refund bounty to requester |

Read (views, served to the client over the public RPC — no wallet required):

- `pingCount() → uint256`
- `totalConfirmed() → uint256`
- `totalEscrowed() → uint256`
- `confirmedCount(address) → uint256`
- `sentOf(address) → uint256[]`
- `receivedOf(address) → uint256[]`
- `getPing(uint256) → Ping`

Events: `PingCreated`, `PingConfirmed`, `PingDeclined`, `PingCancelled`. The client
hydrates inbox/sent lists from `receivedOf`/`sentOf` and `getPing`; it does not depend on
any indexer or server.

## 5. Deployment

```
contract:     TaskPing
address:      0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3
network:      Arc testnet
chain id:     5042002
rpc:          https://rpc.testnet.arc.network
explorer:     https://testnet.arcscan.app/address/0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3
client:       https://taskping.vercel.app
compiler:     solc ^0.8.20, optimizer runs=200, evmVersion=paris
escrow asset: native value (msg.value), surfaced as USDC by the wallet/UI
```

## 6. Why this belongs on Arc specifically

The design in §2 depends on one property the underlying chain must supply: a confirmation
that is *provisional* is worthless for sign-off. If the transition that flips a ping to
Confirmed can be reorganized out, delayed, or contested minutes later, then "they signed
off" is a claim, not a fact — which is exactly the failure mode in §1 that this contract
exists to remove.

Arc's sub-second deterministic finality is what makes the Confirmed state *authoritative
the instant it lands*. The assignee taps confirm; by the time the UI updates, the sign-off
is final and the bounty has already moved to them in the same transaction. There is no
"pending payout," no reconciliation, no dispute window to police. That atomicity — an
approval and its payment becoming irreversible together, fast enough to feel like tapping
a button — is the feature. On a chain where finality is probabilistic or slow, you would
have to bolt on confirmations, holds, or a trusted settler, and at that point the contract
is no longer the source of truth. Here it is.

## 7. Limitations

- No edit/expiry: a pending ping stays pending until the assignee or requester acts.
- Title is plain text on-chain (1–120 bytes); treat it as public.
- Reputation (`confirmedCount`) is a raw count — it has no notion of who sent the ping,
  so it is informational, not Sybil-resistant.
- List views hydrate at most the newest 200 ids per address (client-side cap).
- No admin, pause, or fee path exists in the contract; nothing can sweep escrow.
