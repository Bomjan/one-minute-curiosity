def edit_distance(a: str, b: str) -> int:
    m, n = len(a), len(b)

    # dp[j] = edit distance between a[:i] and b[:j]
    # Space-optimized: keep only previous and current row
    prev = list(range(n + 1))

    for i in range(1, m + 1):
        curr = [i] + [0] * n
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(
                    prev[j],      # delete from a
                    curr[j - 1],  # insert into a
                    prev[j - 1],  # replace in a
                )
        prev = curr

    return prev[n]


def edit_distance_with_ops(a: str, b: str) -> tuple[int, list[str]]:
    """Returns (distance, list_of_operations) by backtracking the full DP table."""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    # Backtrack to reconstruct operations
    ops = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and a[i - 1] == b[j - 1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops.append(f"Replace '{a[i-1]}' → '{b[j-1]}' at position {i-1}")
            i -= 1
            j -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            ops.append(f"Insert '{b[j-1]}' at position {i}")
            j -= 1
        else:
            ops.append(f"Delete '{a[i-1]}' at position {i-1}")
            i -= 1

    return dp[m][n], list(reversed(ops))


if __name__ == "__main__":
    print("=== Edit Distance ===\n")

    pairs = [
        ("kitten", "sitting"),
        ("sunday", "saturday"),
        ("recieve", "receive"),
        ("cat", "cut"),
        ("", "hello"),
        ("hello", "hello"),
    ]

    for a, b in pairs:
        d = edit_distance(a, b)
        print(f'  "{a}" → "{b}": {d}')

    print("\n=== With Operation Trace ===\n")
    dist, ops = edit_distance_with_ops("kitten", "sitting")
    print(f'  "kitten" → "sitting": {dist} operations')
    for op in ops:
        print(f"    {op}")
