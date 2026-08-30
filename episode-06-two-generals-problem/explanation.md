# Two Generals, Zero Guarantees

There is a message two computers can never send each other with total certainty: "I know that you know." Every network protocol you rely on quietly works around this — it never actually solves it.

---

## The Problem

Two allied armies camp on hills overlooking a city. Together they can win. Alone, either army is destroyed. They must **attack at the exact same time**, but they can only coordinate by sending a messenger through enemy territory — and any messenger might be captured.

General A sends: *"Attack at dawn."*
General A can't act until B confirms receipt, because B might never have gotten the order.
So B sends an acknowledgment back — but now **B** can't be sure the ack arrived, so B doesn't know if A will actually attack.
So A would need to ack the ack. And B would need to ack *that*. Forever.

**No finite number of messages can make both generals simultaneously certain.** Not a limitation of cleverness — it's a proof.

---

## Example

```
Round 1: A → B  "Attack at dawn"        (delivered)
Round 1: B → A  "Confirmed"             (lost)
→ A does not attack (no ack received). B attacks alone. B is destroyed.

Round 2: A → B  "Attack at dawn"        (delivered)
Round 2: B → A  "Confirmed"             (delivered)
Round 2: A → B  "Got your confirm"      (lost)
→ B still isn't sure A saw the confirm, so B hesitates too.
```

Every attempt to close the loop just adds one more message that itself might get lost.

---

## Why It Matters

This isn't a war-story riddle — it's the reason huge parts of network engineering exist:

| Domain | Where It Shows Up |
| :--- | :--- |
| **TCP** | The 3-way handshake (`SYN` → `SYN-ACK` → `ACK`) never achieves *proof* of a synchronized state — it just makes both sides confident enough to proceed |
| **Distributed transactions** | Two-Phase Commit can still leave a coordinator crashed mid-vote, with participants unsure whether to commit or abort |
| **Payments / messaging APIs** | "At-least-once" delivery + idempotency keys exist because "exactly-once, guaranteed" is provably unreachable over a lossy network |
| **Blockchain** | "Finality" is probabilistic — more confirmations lower the chance of a rewrite, but never make it exactly zero |
| **Distributed consensus (Raft/Paxos)** | Sidesteps the problem entirely by requiring a majority quorum instead of unanimous certainty between two parties |

If you've ever wondered why distributed systems are full of retries, timeouts, and "eventually consistent" instead of hard guarantees — this is the theorem underneath all of it.

---

## Solution

### The Insight: Certainty Requires an Infinite Handshake

Formally: suppose a finite protocol *did* guarantee both generals attack together. Look at the **last message** sent in that protocol. Its sender commits to attacking without knowing whether it arrived — because if that last message were lost, the protocol would still have to work (it's the "last" one, nothing depends on it further). But if the sender can safely proceed without confirmation on that last message, they could have skipped sending it at all and used one fewer message and *still* worked — which means that wasn't really the last necessary message either. Repeat this argument and every message in the protocol unravels. No finite protocol survives the argument. Agreement over an unreliable channel with unbounded delay is impossible with 100% certainty — full stop.

### The Practical Fix: Trade Certainty for Confidence

Engineering doesn't defeat this proof — it works around it:

1. **Bound the retries.** Keep resending the order + waiting for an ack until a timeout or a retry cap.
2. **Compute the odds, not a guarantee.** Each round of "order delivered AND ack delivered" succeeds with some probability. More rounds → failure probability shrinks *exponentially*, but never truly hits zero.
3. **Accept the residual risk.** TCP does this. Payment systems do this. They just push the failure probability so low that it's cheaper to live with than to chase.

---

## Code

Both implementations simulate the channel: each round independently drops the order and/or the ack with some probability. We compare the empirical success rate against the closed-form probability — and watch it approach, but never touch, 100%.

### Python

```python
import random


def simulate_two_generals(loss_probability, max_retries, trials=100_000):
    """
    Model the Two Generals Problem over a lossy channel.

    Each round, General A sends an "attack" order and waits for an
    acknowledgment from General B. Both the order and the ack can be
    dropped independently. A round only counts as "agreed" if both
    the order AND its ack get through before the retry budget runs out.
    """
    agreed_count = 0

    for _ in range(trials):
        agreed = False
        for _attempt in range(max_retries):
            order_delivered = random.random() > loss_probability
            ack_delivered = order_delivered and random.random() > loss_probability
            if ack_delivered:
                agreed = True
                break
        if agreed:
            agreed_count += 1

    return agreed_count / trials


def theoretical_success_rate(loss_probability, max_retries):
    """Closed-form probability of reaching agreement within max_retries rounds."""
    round_success = (1 - loss_probability) ** 2
    return 1 - (1 - round_success) ** max_retries


if __name__ == "__main__":
    loss_probability = 0.3

    for retries in [1, 2, 5, 10, 20, 50]:
        simulated = simulate_two_generals(loss_probability, retries, trials=20_000)
        theoretical = theoretical_success_rate(loss_probability, retries)
        print(
            f"retries={retries:>2}  "
            f"simulated={simulated:.4%}  "
            f"theoretical={theoretical:.4%}  "
            f"(never reaches 100%)"
        )
```

### JavaScript

```javascript
function simulateTwoGenerals(lossProbability, maxRetries, trials = 20000) {
    let agreedCount = 0;

    for (let t = 0; t < trials; t++) {
        let agreed = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const orderDelivered = Math.random() > lossProbability;
            const ackDelivered = orderDelivered && Math.random() > lossProbability;
            if (ackDelivered) {
                agreed = true;
                break;
            }
        }

        if (agreed) agreedCount++;
    }

    return agreedCount / trials;
}

function theoreticalSuccessRate(lossProbability, maxRetries) {
    const roundSuccess = (1 - lossProbability) ** 2;
    return 1 - (1 - roundSuccess) ** maxRetries;
}

const lossProbability = 0.3;

for (const retries of [1, 2, 5, 10, 20, 50]) {
    const simulated = simulateTwoGenerals(lossProbability, retries);
    const theoretical = theoreticalSuccessRate(lossProbability, retries);
    console.log(
        `retries=${String(retries).padStart(2)}  ` +
        `simulated=${(simulated * 100).toFixed(2)}%  ` +
        `theoretical=${(theoretical * 100).toFixed(2)}%  ` +
        `(never reaches 100%)`
    );
}
```

---

## Complexity

| Dimension | Value | Why |
| :--- | :--- | :--- |
| **Time** | O(r) per trial | `r` = max retries; each round is O(1) work |
| **Space** | O(1) | Just counters and probabilities — no state grows with input |

There's no algorithm to optimize here — the "complexity" that matters is the **probability of failure**, which shrinks exponentially as `(1 - round_success)^r`, but is asymptotically bounded away from zero for any finite `r`.

---

## One Minute Insight

> **Perfect agreement over an unreliable channel is mathematically impossible — engineering doesn't solve that, it just makes the failure probability small enough to ignore.**

Every "reliable" system you've ever used — TCP, HTTP retries, payment webhooks, blockchain confirmations — is quietly built on this same trade: trade infinite certainty for finite, overwhelming confidence. The Two Generals Problem is the reason "exactly-once delivery" is a myth engineers still argue about, and why idempotency keys exist at all.

*Run `code.py` or `code.js` to watch the probability climb toward — but never touch — 100%.*
