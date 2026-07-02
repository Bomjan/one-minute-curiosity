function twoGeneralsAttempt(successProb = 0.9, maxRetries = 10) {
  // Simulate a message + ack across an unreliable channel.
  for (let round = 1; round <= maxRetries; round++) {
    const messageDelivered = Math.random() < successProb;
    const ackDelivered = messageDelivered && Math.random() < successProb;
    if (ackDelivered) return round;
  }
  return null;
}

function confidenceAfterRounds(rounds, successProb = 0.9) {
  // Approaches 1.0 but mathematically never reaches it.
  const roundTripSuccess = successProb ** 2;
  return 1 - (1 - roundTripSuccess) ** rounds;
}

[1, 3, 5, 10, 20].forEach((r) => {
  console.log(`After ${r} retries: ${confidenceAfterRounds(r).toFixed(6)} confidence`);
});
