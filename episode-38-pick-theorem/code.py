def interior(vertices):
    from math import gcd
    edges = list(zip(vertices, vertices[1:] + vertices[:1]))
    area2 = abs(sum(x*v-y*u for (x,y),(u,v) in edges))
    boundary = sum(gcd(abs(x-u), abs(y-v)) for (x,y),(u,v) in edges)
    return (area2-boundary+2)//2

triangle = [(0,0), (6,0), (0,4)]
print(interior(triangle))  # 7
