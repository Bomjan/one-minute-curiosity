import random


def simulate_two_generals(loss_probability, max_retries, trials=100_000):
    """
    Model the Two Generals Problem over a lossy channel.

    Each round, General A sends an "attack" order and waits for an
    acknowledgment from General B. Both the order and the ack can be
    dropped independently. A round only counts as "agreed" if both
    the order AND its ack get through before the retry budget runs out.
    """
    agreed_count = 0

    for _ in range(trials):
        agreed = False
        for _attempt in range(max_retries):
            order_delivered = random.random() > loss_probability
            ack_delivered = order_delivered and random.random() > loss_probability
            if ack_delivered:
                agreed = True
                break
        if agreed:
            agreed_count += 1

    return agreed_count / trials


def theoretical_success_rate(loss_probability, max_retries):
    """Closed-form probability of reaching agreement within max_retries rounds."""
    round_success = (1 - loss_probability) ** 2
    return 1 - (1 - round_success) ** max_retries


if __name__ == "__main__":
    loss_probability = 0.3

    for retries in [1, 2, 5, 10, 20, 50]:
        simulated = simulate_two_generals(loss_probability, retries, trials=20_000)
        theoretical = theoretical_success_rate(loss_probability, retries)
        print(
            f"retries={retries:>2}  "
            f"simulated={simulated:.4%}  "
            f"theoretical={theoretical:.4%}  "
            f"(never reaches 100%)"
        )
