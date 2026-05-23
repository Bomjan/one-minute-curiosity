from collections import deque


def topological_sort(num_tasks, deps):
    graph = [[] for _ in range(num_tasks)]
    in_degree = [0] * num_tasks

    for src, dst in deps:
        graph[src].append(dst)
        in_degree[dst] += 1

    queue = deque(node for node in range(num_tasks) if in_degree[node] == 0)
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == num_tasks else []


if __name__ == "__main__":
    deps = [(5, 2), (5, 0), (4, 0), (4, 1), (2, 3), (3, 1)]
    print("Valid order:       ", topological_sort(6, deps))

    cycle_deps = [(0, 1), (1, 2), (2, 0)]
    print("Cycle detected:    ", topological_sort(3, cycle_deps))

    build_deps = [(0, 1), (0, 2), (1, 3), (2, 3), (3, 4)]
    print("Build pipeline:    ", topological_sort(5, build_deps))
