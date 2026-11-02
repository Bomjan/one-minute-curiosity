# Zobrist Hashing: Update a Board's Fingerprint Without Rehashing It

A chess engine can change a position's 64-bit fingerprint after a move using only a few XOR operations—without scanning the whole board.

## The curiosity

Imagine a game AI evaluating thousands of possible moves. It wants to recognize positions it has already analyzed. Recomputing a hash of all 64 squares after every move seems wasteful. **Zobrist hashing** makes a small board change a constant-time hash update.

## The trick

1. Give every **(square, piece type)** pair its own pseudorandom 64-bit key. For a real chess engine, piece type includes color.
2. XOR together the keys for all occupied squares to get the position's fingerprint.
3. When a piece leaves a square, XOR its key **again** to remove it.
4. When a piece arrives at another square, XOR that square's key to add it.

Why does this work? XOR cancels itself:

```text
x ^ x = 0
x ^ 0 = x

hash = key(K at 0) ^ key(R at 3) ^ key(P at 10)
move R from 3 to 7:
newHash = hash ^ key(R at 3) ^ key(R at 7)
```

The old rook key disappears and the new rook key appears. Undoing the move repeats the same two XORs and recovers the original fingerprint.

## Try it in Java

The demo uses a **4x4 board** with three toy piece types (`K`, `R`, `P`) to keep the code small. It seeds `Random` so the same board always produces the same hash between runs. `code.java` deliberately uses `public class code` to match its filename.

```bash
javac code.java
java code
```

Expected output:

```text
Updated hash matches full scan: true
Undo restores original hash: true
Replacement and undo checks passed: 64
```

The demo verifies 64 single-square replacements and their reversals against a fresh full-board calculation.

## Why it matters

| Operation | Work |
| --- | --- |
| Compute a fingerprint from scratch | O(number of squares) |
| Update after changing one square | O(1) |
| Update after moving one piece | O(1), two square changes |
| Store precomputed keys | O(squares × piece types) |

Chess engines use Zobrist keys to look up previously evaluated positions in **transposition tables**. A complete chess implementation must also encode relevant state such as side to move, castling rights, and en-passant information when those affect position identity.

**Important:** A 64-bit fingerprint can collide: two different positions may have the same hash. Zobrist hashing is a fast lookup technique, **not** a cryptographic proof that two positions are identical.

## One-minute takeaway

A hash does not always need to be rebuilt. When its components are combined with XOR, you can erase an old contribution and add a new one in constant time.
