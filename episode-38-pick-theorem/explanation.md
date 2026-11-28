# Count Hidden Grid Points Without Looking Inside

## The Hook
A polygon drawn on integer grid points reveals exactly how many grid points lie strictly inside it, using only its boundary and area.

## The Logic
Pick's theorem says A = I + B/2 - 1 for a simple lattice polygon without holes. Here A is area, I is the number of interior lattice points, and B is the number of boundary lattice points.

The shoelace formula computes twice the area from consecutive vertices. Each edge contributes gcd(|dx|, |dy|) boundary points when its ending vertex is excluded, so vertices are not counted twice.

For the triangle (0,0), (6,0), (0,4), twice the area is 24 and the boundary count is 6+2+4=12. Therefore I = (24-12+2)/2 = 7.

## The Result
We count interior points without scanning the interior. The algorithm uses one pass over the edges, with a GCD calculation per edge. It assumes a non-self-intersecting polygon with integer vertices and no holes.

Run: `python3 code.py`.
