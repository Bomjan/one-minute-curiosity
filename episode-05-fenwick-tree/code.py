class FenwickTree:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)  # 1-indexed

    def update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # jump to next index responsible for a larger range

    def query(self, i):
        """Prefix sum from index 1 to i."""
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # strip lowest set bit to move left
        return total

    def range_query(self, left, right):
        """Sum of elements from index left to right (1-indexed, inclusive)."""
        return self.query(right) - self.query(left - 1)

    @classmethod
    def from_array(cls, arr):
        """Build a Fenwick Tree from a 0-indexed array in O(n log n)."""
        ft = cls(len(arr))
        for i, val in enumerate(arr, 1):
            ft.update(i, val)
        return ft


if __name__ == "__main__":
    arr = [2, 1, 4, 7, 3, 5]
    ft = FenwickTree.from_array(arr)

    print(ft.query(4))            # 14  (2+1+4+7)
    print(ft.range_query(3, 6))   # 19  (4+7+3+5)

    ft.update(3, 2)               # arr[3] goes from 4 to 6

    print(ft.query(4))            # 16  (2+1+6+7)
    print(ft.range_query(3, 6))   # 21  (6+7+3+5)
