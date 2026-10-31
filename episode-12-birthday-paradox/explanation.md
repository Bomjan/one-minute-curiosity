# Episode 12 — The Birthday Paradox: 23 People, a Coin-Flip Collision

**Just 23 people in a room give you a better-than-even chance that two share a birthday.**

## The curiosity

There are 365 possible birthdays. Why does a group of only 23 people already have a **50.73%** chance of a match?

The mistake is to compare one person's birthday with the other 22. The actual question compares **every pair**. With 23 people there are `23 × 22 / 2 = 253` possible pairs.

## The logic

It's easier to calculate the opposite event: *every birthday is different*.

- Person 1 can have any birthday: `365/365`.
- Person 2 must avoid the first: `364/365`.
- Person 3 must avoid both: `363/365`.
- Continue multiplying through person `n`.

For `n <= 365`:

```text
P(all different) = (365/365) × (364/365) × ... × ((365-n+1)/365)
P(at least one match) = 1 - P(all different)
```

For 23 people, this yields approximately `0.5072972343`, or **50.73%**. For 50 people, the probability is about **97.04%**. With 366 people, a match is certain by the pigeonhole principle.

## Try it in Java

The program calculates the exact probability, then simulates 100,000 rooms with a fixed random seed so its results are reproducible. It also checks known values and verifies that the simulations are close to the exact results.

```bash
javac code.java
java code
```

`public class code` intentionally matches the required filename `code.java`.

## Why it matters in computing

A birthday match is a **collision**: two inputs land in the same bucket. The same mathematics helps explain why hash values can collide much sooner than intuition suggests. For a uniformly random hash with `m` possible values, collision risk becomes substantial after roughly **√m** independent samples, not after `m` samples.

## Assumptions and limits

We model 365 equally likely birthdays, independent between people, and ignore leap day. Real birthdays are not perfectly uniform, so actual population probabilities may differ. The simulation uses pseudorandom numbers, and its percentages fluctuate around the mathematical answer; a fixed seed only makes a particular run repeatable.

**Complexity:** Exact calculation takes `O(min(n, 365))` time and `O(1)` extra space. Simulation uses `O(trials × min(n, 366))` time and `O(365)` space for the birthday flags.

## One-minute insight

**Collisions are about the number of pairs, not the number of buckets.** That is why 23 people are enough to make a shared birthday more likely than not.
