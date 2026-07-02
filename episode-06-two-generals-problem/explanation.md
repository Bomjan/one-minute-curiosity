# The Handshake That Can Never Be Perfect

## The Problem

Two armies camp on hills overlooking the same enemy valley. Neither general can win alone — they must attack at the exact same time or be crushed separately. Their only communication is a messenger who walks through enemy territory and might get captured.

General A sends: *"Attack at dawn."* To be safe, they want an acknowledgment. But the messenger carrying that "OK, confirmed!" reply could also be captured. So General B waits for an ack-of-the-ack. Which itself needs confirming. Forever.

This is the **Two Generals' Problem**: over an unreliable channel, no finite number of messages can give both parties *absolute, provable* certainty that they share the same understanding. Every extra confirmation just shifts the uncertainty one message further down the chain — it never eliminates it.

It sounds like a puzzle for historians, but it's quietly running underneath every TCP connection, every distributed database commit, and every "message delivered" checkmark on your phone.

## Example

```
A -> B: "Attack at dawn"          (might get lost)
B -> A: "Confirmed"               (might get lost)
A -> B: "Got your confirmation"   (might get lost)
...
```

No matter how many rounds you add, there's always one last message whose successful delivery is unconfirmed. Mathematically, if every message has a 90% chance of arriving, a full round-trip (message + ack) succeeds only 81% of the time — and stacking more round trips shrinks the *remaining* doubt without ever zeroing it out.

## Why It Matters

This isn't academic. It's the reason:

- **TCP's three-way handshake** still can't guarantee a connection is "truly" established from both sides' perspective at the same instant — it just makes the odds of disagreement astronomically small.
- **Distributed databases** use consensus protocols (Paxos, Raft) and quorums instead of chasing impossible certainty — they settle for "enough replicas agree."
- **Payment systems and blockchains** define "confirmed" as a probability threshold (e.g., 6 Bitcoin confirmations), not an absolute guarantee.
- **Idempotent APIs and retry-with-backoff** exist specifically because engineers accepted this theorem and designed around it instead of fighting it.

Understanding this problem stops you from chasing a "perfectly reliable" protocol that provably cannot exist — and points you toward the real engineering answer: redundancy, idempotency, and accepting calculated risk.

## Solution

You can't solve the Two Generals' Problem — but you can make the probability of failure so small it's negligible in practice. That's exactly what real systems do:

1. **Retry with acknowledgment**: keep resending until you get an ack, instead of sending once and hoping.
2. **Idempotent operations**: design the "attack" command so receiving it twice causes no harm — this makes retries safe.
3. **Accept probabilistic confidence**: instead of "100% certain," compute "99.9999% certain after N round trips" and decide that's good enough for your use case.

The walkthrough below simulates this: each message has a fixed chance of getting through, and we calculate how confidence in mutual agreement climbs with more retries — approaching, but never touching, 100%.

## Code

### Python

```python
import random


def two_generals_attempt(success_prob=0.9, max_retries=10):
    """Simulate a message + ack across an unreliable channel.
    Returns the round the handshake succeeded on, or None if it never did."""
    for round_num in range(1, max_retries + 1):
        message_delivered = random.random() < success_prob
        ack_delivered = message_delivered and random.random() < success_prob
        if ack_delivered:
            return round_num
    return None


def confidence_after_rounds(rounds, success_prob=0.9):
    """Analytic probability that at least one round trip succeeds within `rounds` tries.
    Approaches 1.0 but mathematically never reaches it."""
    round_trip_success = success_prob ** 2
    return 1 - (1 - round_trip_success) ** rounds


if __name__ == "__main__":
    for r in (1, 3, 5, 10, 20):
        print(f"After {r:>2} retries: {confidence_after_rounds(r):.6f} confidence")
```

### JavaScript

```javascript
function twoGeneralsAttempt(successProb = 0.9, maxRetries = 10) {
  // Simulate a message + ack across an unreliable channel.
  for (let round = 1; round <= maxRetries; round++) {
    const messageDelivered = Math.random() < successProb;
    const ackDelivered = messageDelivered && Math.random() < successProb;
    if (ackDelivered) return round;
  }
  return null;
}

function confidenceAfterRounds(rounds, successProb = 0.9) {
  // Approaches 1.0 but mathematically never reaches it.
  const roundTripSuccess = successProb ** 2;
  return 1 - (1 - roundTripSuccess) ** rounds;
}

[1, 3, 5, 10, 20].forEach((r) => {
  console.log(`After ${r} retries: ${confidenceAfterRounds(r).toFixed(6)} confidence`);
});
```

## Complexity

- **Time**: `O(rounds)` — confidence is computed (or simulated) with one constant-time step per retry.
- **Space**: `O(1)` — only a running probability or round counter is kept, regardless of how many retries you simulate.

## One Minute Insight

Perfect certainty over an unreliable channel is mathematically impossible — so every reliable system you've ever used isn't "guaranteed," it's just retried until the odds of failure are smaller than you care about.
