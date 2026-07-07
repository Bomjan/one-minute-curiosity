function editDistance(a, b) {
  const m = a.length;
  const n = b.length;

  // Space-optimized: keep only previous and current row
  let prev = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(
          prev[j],      // delete from a
          curr[j - 1],  // insert into a
          prev[j - 1],  // replace in a
        );
      }
    }
    prev = curr;
  }

  return prev[n];
}

function editDistanceWithOps(a, b) {
  const m = a.length;
  const n = b.length;

  // Build full DP table for backtracking
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  // Backtrack to reconstruct operations
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push(`Replace '${a[i - 1]}' → '${b[j - 1]}' at position ${i - 1}`);
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push(`Insert '${b[j - 1]}' at position ${i}`);
      j--;
    } else {
      ops.push(`Delete '${a[i - 1]}' at position ${i - 1}`);
      i--;
    }
  }

  return { distance: dp[m][n], ops: ops.reverse() };
}

console.log("=== Edit Distance ===\n");

const pairs = [
  ["kitten",  "sitting"],
  ["sunday",  "saturday"],
  ["recieve", "receive"],
  ["cat",     "cut"],
  ["",        "hello"],
  ["hello",   "hello"],
];

for (const [a, b] of pairs) {
  console.log(`  "${a}" → "${b}": ${editDistance(a, b)}`);
}

console.log("\n=== With Operation Trace ===\n");
const { distance, ops } = editDistanceWithOps("kitten", "sitting");
console.log(`  "kitten" → "sitting": ${distance} operations`);
ops.forEach(op => console.log(`    ${op}`));
