# Episode 26: Find a Majority Without Counting Every Value

**Hook:** A single candidate and one counter can find a majority element, even in a stream with millions of votes.

## The Logic

A *majority element* appears **more than half** the time. Boyer–Moore majority voting scans the array and keeps only a candidate and a balance:

1. When the balance reaches zero, adopt the next value as candidate.
2. Matching values increase the balance; different values decrease it.
3. After the first pass, the candidate is the **only possible** majority.

Why does it work? Imagine removing pairs of *different* values. If some value originally occupies more than half the array, deleting one of it and one other value cannot eliminate its majority. The counter performs this cancellation without storing the pairs.

**Important:** A surviving candidate is not proof of a majority. A second pass counts occurrences and checks `count > n / 2`. If no majority exists, the method returns `null`.

## Try It

From this folder:

```bash
javac code.java
java code
```

Expected output:

```text
[7, 2, 7, 3, 7, 2, 7]
Majority: 7
No majority: null
```

## The Result

The algorithm uses **O(n) time** (two linear passes) and **O(1) auxiliary space**. Unlike a hash map, it never stores counts for each distinct value. It finds a strict majority, **not** the most frequent value when no majority exists.

Try changing the array to `{1, 2, 3}`: the answer is `null`, not the final candidate.
