import java.util.Random;

public class code {
    private static final int DAYS = 365;

    // Probability that at least two people share a birthday.
    static double exactProbability(int people) {
        if (people < 0) throw new IllegalArgumentException("people must be nonnegative");
        if (people > DAYS) return 1.0;

        double allDifferent = 1.0;
        for (int i = 0; i < people; i++) {
            allDifferent *= (DAYS - i) / (double) DAYS;
        }
        return 1.0 - allDifferent;
    }

    // Repeat the experiment using a fixed seed for reproducible results.
    static double simulate(int people, int trials, long seed) {
        if (people < 0 || trials <= 0) throw new IllegalArgumentException("invalid inputs");
        Random random = new Random(seed);
        int collisions = 0;

        for (int trial = 0; trial < trials; trial++) {
            boolean[] seen = new boolean[DAYS];
            for (int i = 0; i < people; i++) {
                int birthday = random.nextInt(DAYS);
                if (seen[birthday]) {
                    collisions++;
                    break;
                }
                seen[birthday] = true;
            }
        }
        return collisions / (double) trials;
    }

    public static void main(String[] args) {
        if (exactProbability(1) != 0.0 ||
            Math.abs(exactProbability(2) - 1.0 / DAYS) > 1e-12 ||
            Math.abs(exactProbability(23) - 0.5072972343239854) > 1e-12 ||
            exactProbability(366) != 1.0) {
            throw new AssertionError("Exact probability check failed");
        }

        int trials = 100_000;
        for (int people : new int[] {10, 23, 50}) {
            double exact = exactProbability(people);
            double observed = simulate(people, trials, 20261031L);
            if (Math.abs(exact - observed) > 0.02) {
                throw new AssertionError("Simulation differs unexpectedly");
            }
            System.out.printf("%2d people: exact %6.2f%% | simulation %6.2f%%%n",
                    people, 100 * exact, 100 * observed);
        }
        System.out.println("All checks passed.");
    }
}
