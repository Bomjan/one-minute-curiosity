/**
 * The Two Generals Problem — simulating an unreliable coordination channel.
 *
 * Two generals must attack at the same time or lose. They can only talk via
 * messengers who might get captured. This simulates the final, unconfirmable
 * message in any handshake and shows that adding more warm-up rounds barely
 * reduces the chance of miscoordination -- because the risk always lives in
 * the one message whose delivery can never be confirmed.
 */

function attemptCoordination(pDelivery, warmupRounds) {
    for (let i = 0; i < warmupRounds; i++) {
        Math.random(); // a message is "sent"; it doesn't change the outcome
    }

    const finalMessageDelivered = Math.random() <= pDelivery;

    const aAttacks = true;                  // A commits after sending, no matter what
    const bAttacks = finalMessageDelivered; // B only commits if the message arrives

    return aAttacks !== bAttacks; // true == disaster
}

function disasterRate(pDelivery, warmupRounds, trials = 200_000) {
    let disasters = 0;
    for (let i = 0; i < trials; i++) {
        if (attemptCoordination(pDelivery, warmupRounds)) disasters++;
    }
    return disasters / trials;
}

for (const p of [0.5, 0.9, 0.99]) {
    for (const rounds of [0, 5, 20]) {
        const rate = disasterRate(p, rounds);
        console.log(`p=${p} warmupRounds=${rounds} -> disaster rate: ${(rate * 100).toFixed(2)}%`);
    }
}
