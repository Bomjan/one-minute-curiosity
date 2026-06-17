class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed

    def update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # move to next responsible ancestor

    def prefix_sum(self, i):
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # strip lowest set bit, walk toward root
        return total

    def range_sum(self, l, r):
        return self.prefix_sum(r) - self.prefix_sum(l - 1)


if __name__ == "__main__":
    scores = [3, 2, -1, 6, 5, 4]
    ft = FenwickTree(len(scores))

    for i, val in enumerate(scores, start=1):
        ft.update(i, val)

    test_cases = [
        ("prefix_sum(4)",   ft.prefix_sum(4),   10),
        ("range_sum(3,6)",  ft.range_sum(3, 6), 14),
    ]

    for label, result, expected in test_cases:
        status = "✓" if result == expected else "✗"
        print(f"{status}  {label} = {result}")

    ft.update(3, 10)  # scores[3] += 10

    result = ft.prefix_sum(4)
    status = "✓" if result == 20 else "✗"
    print(f"{status}  prefix_sum(4) after update(3, +10) = {result}")
