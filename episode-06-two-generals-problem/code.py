"""
The Two Generals Problem — simulating an unreliable coordination channel.

Two generals must attack at the same time or lose. They can only talk via
messengers who might get captured. This simulates the final, unconfirmable
message in any handshake and shows that adding more warm-up rounds barely
reduces the chance of miscoordination -- because the risk always lives in
the one message whose delivery can never be confirmed.
"""

import random


def attempt_coordination(p_delivery: float, warmup_rounds: int) -> bool:
    """Simulate one coordination attempt.

    `warmup_rounds` extra back-and-forth messages happen first (for realism),
    but only the FINAL message determines whether both generals attack.
    Returns True if it was a disaster (only one general attacked).
    """
    for _ in range(warmup_rounds):
        random.random()  # a message is "sent"; it doesn't change the outcome

    final_message_delivered = random.random() <= p_delivery

    a_attacks = True                      # A commits after sending, no matter what
    b_attacks = final_message_delivered   # B only commits if the message arrives

    return a_attacks != b_attacks         # True == disaster


def disaster_rate(p_delivery: float, warmup_rounds: int, trials: int = 200_000) -> float:
    disasters = sum(attempt_coordination(p_delivery, warmup_rounds) for _ in range(trials))
    return disasters / trials


if __name__ == "__main__":
    for p in (0.5, 0.9, 0.99):
        for rounds in (0, 5, 20):
            rate = disaster_rate(p, rounds)
            print(f"p={p:<5} warmup_rounds={rounds:<3} -> disaster rate: {rate:.2%}")
