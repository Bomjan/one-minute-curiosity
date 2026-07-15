function rabinKarp(text, pattern) {
    // Find every index where `pattern` occurs in `text` using a rolling hash.
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return [];

    const BASE = 256n;
    const MOD = 1_000_000_007n;

    let highOrder = 1n; // weight of the leading character (BASE^(m-1) mod MOD)
    for (let i = 0; i < m - 1; i++) highOrder = (highOrder * BASE) % MOD;

    let patternHash = 0n;
    let windowHash = 0n;
    for (let i = 0; i < m; i++) {
        patternHash = (patternHash * BASE + BigInt(pattern.charCodeAt(i))) % MOD;
        windowHash = (windowHash * BASE + BigInt(text.charCodeAt(i))) % MOD;
    }

    const matches = [];
    for (let i = 0; i <= n - m; i++) {
        // Hashes match? Confirm with a direct comparison (guards against collisions).
        if (windowHash === patternHash && text.slice(i, i + m) === pattern) {
            matches.push(i);
        }

        if (i < n - m) {
            // Slide the window one step: drop the leading char, add the trailing one.
            windowHash = (windowHash - BigInt(text.charCodeAt(i)) * highOrder) % MOD;
            windowHash = (windowHash * BASE + BigInt(text.charCodeAt(i + m))) % MOD;
            windowHash = ((windowHash % MOD) + MOD) % MOD;
        }
    }

    return matches;
}


console.log(rabinKarp("abracadabra", "abra")); // [0, 7]
console.log(rabinKarp("aaaaaa", "aa"));         // [0, 1, 2, 3, 4]
console.log(rabinKarp("hello world", "xyz"));   // []
