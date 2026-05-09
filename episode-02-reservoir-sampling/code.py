# Episode 02: Reservoir Sampling
# Pick K fair random items from a stream of unknown or infinite length.
# Memory stays at O(K) no matter how long the stream grows.

import random

def reservoir_sample(stream, k):
    reservoir = []

    for i, item in enumerate(stream):
        if i < k:
            # Fill the reservoir with the first K items
            reservoir.append(item)
        else:
            # Replace a random slot with decreasing probability
            j = random.randint(0, i)  # inclusive — gives each item equal odds
            if j < k:
                reservoir[j] = item

    return reservoir


if __name__ == "__main__":
    stream = range(1, 10_001)
    sample = reservoir_sample(stream, k=5)
    print("Random sample of 5 from 10,000 items:", sample)
