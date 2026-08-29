import random


def route_requests(num_servers, num_requests, choices=2):
    """Distribute requests across servers using the 'power of d choices' rule."""
    loads = [0] * num_servers

    for _ in range(num_requests):
        # Sample `choices` random servers and pick the least loaded
        candidates = random.sample(range(num_servers), choices)
        best = min(candidates, key=lambda s: loads[s])
        loads[best] += 1

    return loads


if __name__ == "__main__":
    random.seed(42)

    # Baseline: pure random assignment (choices=1 means "no comparison")
    random_loads = route_requests(num_servers=20, num_requests=20, choices=1)
    print(f"Random (1 choice)   max load: {max(random_loads)}  loads: {random_loads}")

    # Power of two choices: pick the better of 2 random servers
    p2c_loads = route_requests(num_servers=20, num_requests=20, choices=2)
    print(f"Power of two choices max load: {max(p2c_loads)}  loads: {p2c_loads}")
