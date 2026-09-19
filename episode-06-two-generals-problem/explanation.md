# Why Two Armies Can Never Be 100% Sure

Two allied generals must attack a fortress at the exact same moment or they both lose. Their only way to talk is by sending messengers through enemy territory, where any messenger might get captured. No matter how many messages they exchange, there's a mathematical reason they can *never* be perfectly certain the other one will show up — and it's the same reason your TCP connections, database commits, and blockchain transactions all quietly live with doubt.

---

## The Problem

General A and General B are camped on hills overlooking a valley, with an enemy fortress between them. They will only win if they attack **at the same time**. If only one attacks, that army is destroyed.

Their only communication channel is a messenger who walks through the valley — and might be captured at any point. So:

- A sends: *"Attack at dawn."*
- B wants to confirm receipt, so B sends back: *"Confirmed."*
- But what if A's messenger with that "confirmed" doesn't arrive? A doesn't know if B got the plan, so A can't commit either.
- So A sends an acknowledgment of the acknowledgment... and now *B* doesn't know if that arrived.

**Can any finite number of messages make both generals fully certain the attack is coordinated?**

Spoiler: no. This isn't an engineering limitation — it's a proof that no protocol, however clever, can close the loop.

---

## Example

```
Round 0: A -> B   "Attack at dawn"            (arrives)
Round 1: B -> A   "Confirmed, see you there"  (arrives)
Round 2: A -> B   "Got your confirmation"     (lost!)

B now wonders: "Did A get my confirmation? If not, will A even attack?"
B has no way to know — so B can't be 100% sure either.
```

Add a Round 3, Round 4, Round 100 — the *last* message in the chain always has
a sender who can't know whether it landed. There is no message that can
confirm its own delivery.

---

## Why It Matters

This 1975 thought experiment (Akkoyunlu, Ekanadham & Huggins) is the ancestor
of a huge amount of real-world systems design:

| Domain | Where the Two Generals shadow shows up |
| :--- | :--- |
| **Networking** | TCP's three-way handshake doesn't *solve* this — it just makes failure statistically negligible via timeouts and retransmits |
| **Databases** | Two-Phase Commit can block forever if the coordinator dies right after sending "commit" but before everyone confirms |
| **Distributed systems** | Exactly-once delivery is impossible over an unreliable network; systems settle for at-least-once + idempotency |
| **Blockchain** | "Finality" is probabilistic — a transaction is never *certain*, just increasingly expensive to reverse |
| **Payment systems** | This is why webhooks and bank transfers use retries + reconciliation instead of a single perfect confirmation |

The engineering lesson: **stop chasing certainty you provably cannot get, and design for confidence that's "good enough" instead.**

---

## Solution

### The Impossibility, Informally

Suppose some protocol with a *finite* number of messages guaranteed both
generals attack together. Look at the very last message sent in that
protocol.

- The sender of that last message can never know it arrived.
- If losing that message wouldn't change the outcome (both would attack
  anyway), then the message was pointless — you could remove it, and you'd
  have a *shorter* protocol that "guarantees" coordination. Keep removing
  messages this way and eventually you have a zero-message protocol, which
  obviously can't guarantee anything.
- If losing that message *would* change the outcome, then when it's lost,
  one general attacks and the other doesn't — disaster, and the protocol
  didn't guarantee coordination after all.

Either branch breaks the assumption. So no finite protocol can ever
guarantee it — more rounds only shrink the *probability* of disaster, they
never eliminate it.

### Beginner-Friendly Walkthrough

Instead of proving this abstractly, we can simulate it: give every message a
delivery probability `p < 1`, run a handshake with some number of warm-up
rounds, then have the *last* message decide the attack. A commits the moment
it sends that last message (trusting the process); B only commits if that
message actually arrives. Run this thousands of times and measure how often
exactly one general attacks — the "disaster" rate. You'll see that adding
more warm-up rounds barely moves the needle, because the disaster always
hinges on that one final, unconfirmable message.

---

## Code

### Python

```python
import random


def attempt_coordination(p_delivery: float, warmup_rounds: int) -> bool:
    """Simulate one coordination attempt.

    `warmup_rounds` extra back-and-forth messages happen first (for realism),
    but only the FINAL message determines whether both generals attack.
    Returns True if it was a disaster (only one general attacked).
    """
    # Extra handshake chatter -- doesn't change who ends up attacking,
    # it just delays the one message that actually matters.
    for _ in range(warmup_rounds):
        random.random()  # a message is "sent"; we don't act on it

    final_message_delivered = random.random() <= p_delivery

    a_attacks = True                      # A commits after sending, no matter what
    b_attacks = final_message_delivered   # B only commits if the message arrives

    return a_attacks != b_attacks         # True == disaster


def disaster_rate(p_delivery: float, warmup_rounds: int, trials: int = 200_000) -> float:
    disasters = sum(attempt_coordination(p_delivery, warmup_rounds) for _ in range(trials))
    return disasters / trials


if __name__ == "__main__":
    for p in (0.5, 0.9, 0.99):
        for rounds in (0, 5, 20):
            rate = disaster_rate(p, rounds)
            print(f"p={p:<5} warmup_rounds={rounds:<3} -> disaster rate: {rate:.2%}")
```

### JavaScript

```javascript
function attemptCoordination(pDelivery, warmupRounds) {
    // Extra handshake chatter -- doesn't change who ends up attacking,
    // it just delays the one message that actually matters.
    for (let i = 0; i < warmupRounds; i++) {
        Math.random(); // a message is "sent"; we don't act on it
    }

    const finalMessageDelivered = Math.random() <= pDelivery;

    const aAttacks = true;                    // A commits after sending, no matter what
    const bAttacks = finalMessageDelivered;   // B only commits if the message arrives

    return aAttacks !== bAttacks; // true == disaster
}

function disasterRate(pDelivery, warmupRounds, trials = 200_000) {
    let disasters = 0;
    for (let i = 0; i < trials; i++) {
        if (attemptCoordination(pDelivery, warmupRounds)) disasters++;
    }
    return disasters / trials;
}

for (const p of [0.5, 0.9, 0.99]) {
    for (const rounds of [0, 5, 20]) {
        const rate = disasterRate(p, rounds);
        console.log(`p=${p} warmupRounds=${rounds} -> disaster rate: ${(rate * 100).toFixed(2)}%`);
    }
}
```

Run either version and watch: increasing `warmup_rounds` from 0 to 20 barely
moves the disaster rate for a fixed `p`. The risk lives entirely in that
final, unconfirmable message — exactly as the proof predicts.

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(rounds) per trial | Each simulated handshake walks through its warm-up messages once |
| **Space** | O(1) | Just a running count of disasters, no history retained |

The real takeaway isn't a Big-O bound — it's an **information-theoretic
impossibility**. No amount of extra computation or messages can convert
"probably delivered" into "certainly delivered" over a channel that can
silently drop packets.

---

## One Minute Insight

> **You cannot engineer away uncertainty over an unreliable channel — you can only make it small enough to ignore.** Every "guaranteed delivery" system you've ever used — TCP, distributed transactions, blockchain confirmations — is really a confidence trick: enough retries and acknowledgments that the odds of disaster round down to zero in practice, even though they never truly hit it in theory.

*Run `code.py` or `code.js` and watch the disaster rate refuse to reach zero, no matter how many rounds you add.*
