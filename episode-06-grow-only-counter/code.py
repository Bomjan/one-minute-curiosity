"""
The Like Button That Never Needs the Internet
A grow-only counter (G-Counter) CRDT: independent replicas increment locally,
then merge with element-wise max so the result is always correct — no matter
the order, timing, or duplication of merges.
"""


class GCounter:
    """A grow-only distributed counter (CRDT)."""

    def __init__(self, node_id, all_nodes):
        self.node_id = node_id
        self.counts = {node: 0 for node in all_nodes}

    def increment(self, amount=1):
        # A replica only ever writes to its own slot.
        self.counts[self.node_id] += amount

    def merge(self, other_counts):
        # Element-wise max: idempotent, commutative, associative.
        for node, value in other_counts.items():
            self.counts[node] = max(self.counts[node], value)

    def value(self):
        return sum(self.counts.values())


if __name__ == "__main__":
    nodes = ["us", "eu", "asia"]
    us = GCounter("us", nodes)
    eu = GCounter("eu", nodes)
    asia = GCounter("asia", nodes)

    for _ in range(5):
        us.increment()
    for _ in range(3):
        eu.increment()
    for _ in range(7):
        asia.increment()

    # Gossip, in any order, even with duplicates.
    us.merge(eu.counts)
    us.merge(asia.counts)
    us.merge(eu.counts)   # duplicate sync — still safe

    print(us.value())  # 15, always
