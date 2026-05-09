// Episode 02: Reservoir Sampling
// Pick K fair random items from a stream of unknown or infinite length.
// Memory stays at O(K) no matter how long the stream grows.

function reservoirSample(stream, k) {
    const reservoir = [];

    let i = 0;
    for (const item of stream) {
        if (i < k) {
            // Fill the reservoir with the first K items
            reservoir.push(item);
        } else {
            // Replace a random slot with decreasing probability
            const j = Math.floor(Math.random() * (i + 1)); // [0, i] inclusive
            if (j < k) {
                reservoir[j] = item;
            }
        }
        i++;
    }

    return reservoir;
}

// Simulate a large stream
const stream = Array.from({ length: 10_000 }, (_, i) => i + 1);
const sample = reservoirSample(stream, 5);
console.log("Random sample of 5 from 10,000 items:", sample);
