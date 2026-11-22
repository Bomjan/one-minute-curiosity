# Episode 34: One Hundred Doors, Only Ten Stay Open

**Hook:** Toggle 100 closed doors in 100 rounds, and exactly 10 doors remain open—without any randomness.

## The experiment

Imagine 100 numbered doors, all initially closed:

- Round 1: toggle every door.
- Round 2: toggle doors 2, 4, 6, ...
- Round 3: toggle doors 3, 6, 9, ...
- Continue until round 100, when only door 100 is toggled.

Which doors end up open?

## The logic

Door 12 changes state in rounds 1, 2, 3, 4, 6, and 12: six toggles, so it ends closed.

Door 16 changes state in rounds 1, 2, 4, 8, and 16: five toggles, so it ends open.

A door numbered `n` is toggled once for **each positive divisor** of `n`. Most divisors come in pairs: for 12, the pairs are (1,12), (2,6), and (3,4). That makes an even number of toggles.

For a **perfect square**, one divisor pairs with itself: for 16, the pair (4,4) counts as only one distinct divisor. Its divisor count is odd, so it stays open.

Therefore, the open doors are exactly the perfect squares up to 100.

## The result

```text
1 4 9 16 25 36 49 64 81 100
```

There are `floor(sqrt(N))` open doors among `N` doors. For 100 doors, that is **10**.

The Java demo prints these doors and independently simulates the 100 rounds for each door, checking that the perfect-square rule agrees.

## Run it

From this folder:

```bash
javac code.java
java code
```

Requires a JDK. The filename `code.java` matches `public class code`.

## Complexity and limits

- Finding the **count** of open doors needs one integer square root: constant-time for a fixed-width integer.
- Listing all open doors takes `O(sqrt(N))` output operations.
- The included 100-door verification uses `O(N²)` divisibility checks; it is intentionally a small, independent simulation, not the optimized counting method.
- The Java example assumes positive door numbers; it demonstrates exactly 100 doors.

**Takeaway:** A repeated toggling puzzle becomes a simple number-theory rule when you count divisors instead of simulating every switch.
