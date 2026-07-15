def rabin_karp(text, pattern):
    """Find every index where `pattern` occurs in `text` using a rolling hash."""
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []

    BASE = 256
    MOD = 1_000_000_007
    high_order = pow(BASE, m - 1, MOD)  # weight of the leading character

    pattern_hash = 0
    window_hash = 0
    for i in range(m):
        pattern_hash = (pattern_hash * BASE + ord(pattern[i])) % MOD
        window_hash = (window_hash * BASE + ord(text[i])) % MOD

    matches = []
    for i in range(n - m + 1):
        # Hashes match? Confirm with a direct comparison (guards against collisions).
        if window_hash == pattern_hash and text[i:i + m] == pattern:
            matches.append(i)

        if i < n - m:
            # Slide the window one step: drop the leading char, add the trailing one.
            window_hash = (window_hash - ord(text[i]) * high_order) % MOD
            window_hash = (window_hash * BASE + ord(text[i + m])) % MOD
            window_hash %= MOD

    return matches


if __name__ == "__main__":
    text = "abracadabra"
    pattern = "abra"
    print(rabin_karp(text, pattern))  # [0, 7]

    text2 = "aaaaaa"
    pattern2 = "aa"
    print(rabin_karp(text2, pattern2))  # [0, 1, 2, 3, 4]

    print(rabin_karp("hello world", "xyz"))  # []
