public class code {
    // A door flips once for each divisor of its number.
    static boolean isOpen(int door) {
        int root = (int) Math.sqrt(door);
        return root * root == door;
    }

    public static void main(String[] args) {
        int doors = 100;
        for (int door = 1; door <= doors; door++) {
            // Independently simulate every round for this door.
            boolean simulated = false;
            for (int round = 1; round <= doors; round++) {
                if (door % round == 0) simulated = !simulated;
            }
            if (simulated != isOpen(door)) {
                throw new AssertionError("Mismatch at door " + door);
            }
            if (isOpen(door)) System.out.print(door + " ");
        }
        System.out.println();
    }
}
