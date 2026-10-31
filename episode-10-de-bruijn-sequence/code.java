public class code {
    // Build a cyclic de Bruijn sequence using the FKM algorithm.
    static String deBruijn(int alphabet, int width) {
        if (alphabet < 2 || alphabet > 10 || width < 1 || width > 4) {
            throw new IllegalArgumentException("Use 2..10 symbols and a width of 1..4");
        }
        int[] a = new int[alphabet * width + 1];
        StringBuilder sequence = new StringBuilder();
        build(1, 1, alphabet, width, a, sequence);
        return sequence.toString();
    }

    private static void build(int t, int p, int alphabet, int width,
                              int[] a, StringBuilder sequence) {
        if (t > width) {
            if (width % p == 0) {
                for (int i = 1; i <= p; i++) sequence.append(a[i]);
            }
            return;
        }

        a[t] = a[t - p];
        build(t + 1, p, alphabet, width, a, sequence);
        for (int digit = a[t - p] + 1; digit < alphabet; digit++) {
            a[t] = digit;
            build(t + 1, t, alphabet, width, a, sequence);
        }
    }

    // Independently check that every possible window occurs exactly once.
    static void verify(String cyclic, int alphabet, int width) {
        int combinations = 1;
        for (int i = 0; i < width; i++) combinations *= alphabet;
        if (cyclic.length() != combinations) {
            throw new AssertionError("Wrong cycle length");
        }

        String linear = cyclic + cyclic.substring(0, width - 1);
        boolean[] seen = new boolean[combinations];
        for (int start = 0; start < combinations; start++) {
            int value = 0;
            for (int j = 0; j < width; j++) {
                value = value * alphabet + (linear.charAt(start + j) - '0');
            }
            if (seen[value]) throw new AssertionError("Repeated window: " + value);
            seen[value] = true;
        }
        for (boolean present : seen) {
            if (!present) throw new AssertionError("Missing window");
        }
    }

    public static void main(String[] args) {
        for (int width = 2; width <= 4; width++) {
            String cycle = deBruijn(10, width);
            verify(cycle, 10, width);
            System.out.printf("%d-digit PINs: %d combinations, %d keypresses%n",
                    width, cycle.length(), cycle.length() + width - 1);
            if (width == 4) {
                System.out.println("First 60 digits: " + cycle.substring(0, 60));
            }
        }
        System.out.println("PASS: every PIN occurs exactly once as a sliding window.");
    }
}
