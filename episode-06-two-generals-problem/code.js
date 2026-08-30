function simulateTwoGenerals(lossProbability, maxRetries, trials = 20000) {
    let agreedCount = 0;

    for (let t = 0; t < trials; t++) {
        let agreed = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const orderDelivered = Math.random() > lossProbability;
            const ackDelivered = orderDelivered && Math.random() > lossProbability;
            if (ackDelivered) {
                agreed = true;
                break;
            }
        }

        if (agreed) agreedCount++;
    }

    return agreedCount / trials;
}

function theoreticalSuccessRate(lossProbability, maxRetries) {
    const roundSuccess = (1 - lossProbability) ** 2;
    return 1 - (1 - roundSuccess) ** maxRetries;
}

const lossProbability = 0.3;

for (const retries of [1, 2, 5, 10, 20, 50]) {
    const simulated = simulateTwoGenerals(lossProbability, retries);
    const theoretical = theoreticalSuccessRate(lossProbability, retries);
    console.log(
        `retries=${String(retries).padStart(2)}  ` +
        `simulated=${(simulated * 100).toFixed(2)}%  ` +
        `theoretical=${(theoretical * 100).toFixed(2)}%  ` +
        `(never reaches 100%)`
    );
}
