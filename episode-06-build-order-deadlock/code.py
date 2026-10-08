from collections import deque


def build_order(tasks, deps):
    """Return a valid build order, or None if a dependency cycle exists.

    deps is a list of (a, b) pairs meaning "a must finish before b".
    """
    after = {t: [] for t in tasks}   # task -> tasks unlocked by it
    waiting = {t: 0 for t in tasks}  # task -> unfinished prerequisites
    for a, b in deps:
        after[a].append(b)
        waiting[b] += 1

    ready = deque(t for t in tasks if waiting[t] == 0)
    order = []
    while ready:
        task = ready.popleft()
        order.append(task)
        for nxt in after[task]:
            waiting[nxt] -= 1
            if waiting[nxt] == 0:
                ready.append(nxt)

    # Anyone left over is stuck in (or behind) a cycle
    return order if len(order) == len(tasks) else None


if __name__ == "__main__":
    tasks = ["lint", "compile", "test", "package", "deploy"]
    deps = [("compile", "test"), ("lint", "package"), ("test", "package"),
            ("package", "deploy")]
    print(build_order(tasks, deps))  # ['lint', 'compile', 'test', 'package', 'deploy']

    # Deadlock: test needs package, package needs test
    print(build_order(tasks, deps + [("package", "test")]))  # None
