# Nontransitive Dice

## The Hook
Three fair dice can form a rock-paper-scissors loop: A usually beats B, B usually beats C, and C usually beats A.

## The Logic
Each die has six equally likely faces:

- A: 2, 2, 4, 4, 9, 9
- B: 1, 1, 6, 6, 8, 8
- C: 3, 3, 5, 5, 7, 7

Roll two dice independently; the larger number wins. There are 36 equally likely face pairs, even when face labels repeat.

A beats B in 20 pairs: its two 2s win against two faces each, its two 4s against two each, and its two 9s against six each. The other two matchups also have 20 winning pairs and no ties.

Run `python3 code.py` to enumerate all three matchups exactly.

## The Result
Each favored die wins 20/36 = 5/9 (about 55.56%) of the time. All three dice even have the same mean, 5. Pairwise winning probability need not be transitive, so ranking alternatives by head-to-head wins can produce a cycle. This is a probability advantage, not a guarantee of winning any individual roll.
