class VectorClock:
    """Tracks causal order across distributed nodes without a shared clock."""

    def __init__(self, node_id, nodes):
        self.node_id = node_id
        self.clock = {n: 0 for n in nodes}

    def tick(self):
        """Local event: bump this node's own counter."""
        self.clock[self.node_id] += 1
        return dict(self.clock)

    def merge(self, other_clock):
        """Receive a message: absorb the max of every slot, then tick."""
        for node, count in other_clock.items():
            self.clock[node] = max(self.clock.get(node, 0), count)
        return self.tick()

    @staticmethod
    def compare(a, b):
        """Return 'before', 'after', 'concurrent', or 'equal'."""
        keys = set(a) | set(b)
        a_le_b = all(a.get(k, 0) <= b.get(k, 0) for k in keys)
        b_le_a = all(b.get(k, 0) <= a.get(k, 0) for k in keys)
        if a_le_b and b_le_a:
            return "equal"
        if a_le_b:
            return "before"
        if b_le_a:
            return "after"
        return "concurrent"


if __name__ == "__main__":
    nodes = ["A", "B", "C"]
    a, b, c = (VectorClock(n, nodes) for n in nodes)

    a_snapshot = a.tick()              # A writes locally
    b_snapshot = b.merge(a_snapshot)   # B receives A's message, then writes
    c_snapshot = c.tick()              # C writes independently

    print("A:", a_snapshot)
    print("B:", b_snapshot)
    print("C:", c_snapshot)

    print("A vs B:", VectorClock.compare(a_snapshot, b_snapshot))  # before
    print("B vs C:", VectorClock.compare(b_snapshot, c_snapshot))  # concurrent
