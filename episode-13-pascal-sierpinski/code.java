public class code {
    // Lucas's theorem modulo 2: C(row, col) is odd iff every set bit
    // of col is also set in row.
    static boolean isOdd(int row, int col) {
        return (row & col) == col;
    }

    public static void main(String[] args) {
        // Independently compute Pascal's triangle modulo 2 to verify the bit trick.
        int[] parity = new int[64];
        parity[0] = 1;
        int stars = 0;

        for (int row = 0; row < parity.length; row++) {
            if (row > 0) {
                for (int col = row; col > 0; col--) {
                    parity[col] ^= parity[col - 1];
                }
            }

            for (int col = 0; col <= row; col++) {
                if (isOdd(row, col) != (parity[col] == 1)) {
                    throw new AssertionError("Mismatch at row " + row + ", col " + col);
                }
                if (row < 32 && isOdd(row, col)) stars++;
            }
        }
        if (stars != 243) throw new AssertionError("Expected 3^5 = 243 odd entries");

        System.out.println("Pascal's triangle modulo 2 (32 rows):");
        for (int row = 0; row < 32; row++) {
            System.out.print(" ".repeat(31 - row));
            for (int col = 0; col <= row; col++) {
                System.out.print(isOdd(row, col) ? "* " : "  ");
            }
            System.out.println();
        }
        System.out.println("Verified 2,080 entries across 64 rows; first 32 rows contain 243 stars.");
    }
}
