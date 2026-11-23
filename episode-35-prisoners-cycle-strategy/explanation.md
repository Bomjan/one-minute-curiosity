# Episode 35: The 100 Prisoners Who Beat Impossible Odds

**Hook:** A puzzle that looks like a one-in-a-nonillion gamble actually gives 100 prisoners about a **31% chance** of *all* surviving—without communicating.

## The puzzle

There are 100 numbered prisoners and 100 boxes. Each box contains exactly one prisoner's number, shuffled uniformly at random. Prisoners enter one at a time. Each may open **at most 50 boxes**, cannot move the slips, and cannot communicate after the game starts. Everyone survives only if **every** prisoner finds their own number.

If each prisoner picks 50 boxes independently at random, each succeeds with probability 1/2, so the group succeeds with probability `(1/2)^100`—about `7.89 × 10^-31`.

## The trick: follow the permutation

Agree on a strategy *before* the game:

1. Prisoner `p` first opens box `p` (using numbers 0–99 in the code).
2. If it contains `p`, they stop. Otherwise, they open the box whose label matches the number they just saw.
3. Repeat until finding `p` or reaching 50 opened boxes.

Every box points to another box, forming a **permutation**: a collection of disjoint cycles. Following the labels keeps a prisoner inside the cycle containing their own number. The prisoner finds their number within 50 openings **if and only if** their cycle has length at most 50.

So the entire group succeeds exactly when the shuffled permutation has **no cycle longer than 50**.

## Why ~31%?

For a uniformly shuffled permutation of 100 items, the probability of having a cycle of length `k` is `1/k` when `k > 50`. Such long cycles cannot coexist: two cycles longer than 50 would require more than 100 boxes. Therefore their probabilities add:

`P(all survive) = 1 - (1/51 + 1/52 + ... + 1/100) ≈ 0.31183`.

The simulation verifies that the outcome agrees with the longest-cycle condition for each shuffled arrangement. The fixed random seed makes the demonstration reproducible.

## Try it

From this episode's folder, run:

```bash
python3 code.py
```

No third-party packages are required. The code prints the simulated success rate, the exact probability, and the random-guessing baseline.

## The takeaway

**A good strategy exploits structure, not extra information.** The prisoners still cannot communicate, but the hidden permutation creates a trail they can follow. This does *not* guarantee success: a cycle of 51 or more defeats the group.
