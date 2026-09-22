"""
XOR Linked List — a doubly linked list that stores ONE address field
instead of two (prev + next), by keeping link = prev_addr ^ next_addr.

Real hardware has no XOR operator on Python objects, so we simulate
"addresses" with plain integers (array-style handles) — exactly how
you'd do it in C with actual pointer values cast to integers.
"""


class XORLinkedList:
    NULL = 0  # sentinel address, like a null pointer

    def __init__(self):
        self.nodes = {}          # address -> [value, link]
        self.head = self.NULL
        self.tail = self.NULL
        self._next_addr = 1      # fake "memory allocator"

    def _alloc(self):
        addr = self._next_addr
        self._next_addr += 1
        return addr

    def append(self, value):
        addr = self._alloc()

        if self.head == self.NULL:
            self.nodes[addr] = [value, self.NULL]
            self.head = self.tail = addr
            return addr

        # New node's link = XOR(prev=tail, next=NULL) == tail
        self.nodes[addr] = [value, self.tail]

        # Old tail's link = XOR(prev, NULL) becomes XOR(prev, addr)
        tail_value, tail_link = self.nodes[self.tail]
        self.nodes[self.tail][1] = tail_link ^ addr

        self.tail = addr
        return addr

    def traverse_forward(self):
        values = []
        prev, curr = self.NULL, self.head
        while curr != self.NULL:
            value, link = self.nodes[curr]
            values.append(value)
            prev, curr = curr, link ^ prev  # recover "next" from the single field
        return values

    def traverse_backward(self):
        values = []
        nxt, curr = self.NULL, self.tail
        while curr != self.NULL:
            value, link = self.nodes[curr]
            values.append(value)
            nxt, curr = curr, link ^ nxt  # recover "prev" the same way
        return values


if __name__ == "__main__":
    xll = XORLinkedList()
    for v in ["A", "B", "C", "D"]:
        xll.append(v)

    print("Forward: ", xll.traverse_forward())   # ['A', 'B', 'C', 'D']
    print("Backward:", xll.traverse_backward())  # ['D', 'C', 'B', 'A']

    # Every node stores exactly ONE link field, yet we can walk both ways.
    print("Fields per node:", len(next(iter(xll.nodes.values()))))  # 2 (value, link)
