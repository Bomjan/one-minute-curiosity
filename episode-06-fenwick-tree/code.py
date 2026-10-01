class FenwickTree:
    """Prefix sums with point updates, both in O(log n)."""

    def __init__(self, size):
        self.tree = [0] * (size + 1)  # 1-indexed; slot i covers the last lowbit(i) items

    def add(self, i, delta):
        i += 1
        while i < len(self.tree):
            self.tree[i] += delta
            i += i & -i  # jump to the next range that contains i

    def prefix_sum(self, i):
        """Sum of items [0..i]."""
        i += 1
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & -i  # strip the lowest set bit
        return total

    def range_sum(self, left, right):
        """Sum of items [left..right]."""
        return self.prefix_sum(right) - (self.prefix_sum(left - 1) if left else 0)


if __name__ == "__main__":
    scores = [5, 3, 7, 9, 6, 4, 1, 2]
    ft = FenwickTree(len(scores))
    for i, s in enumerate(scores):
        ft.add(i, s)

    print(ft.range_sum(2, 5))  # 7 + 9 + 6 + 4 = 26
    ft.add(3, 10)              # the 9 becomes 19
    print(ft.range_sum(2, 5))  # 36
    print(ft.prefix_sum(7))    # 47
