/**
 * XOR Linked List — a doubly linked list that stores ONE address field
 * instead of two (prev + next), by keeping link = prevAddr ^ nextAddr.
 *
 * JS has no raw pointers, so we simulate "addresses" with integers,
 * exactly how you'd do it in C with pointer values cast to integers.
 */

class XORLinkedList {
  static NULL = 0;

  constructor() {
    this.nodes = new Map(); // address -> [value, link]
    this.head = XORLinkedList.NULL;
    this.tail = XORLinkedList.NULL;
    this.nextAddr = 1; // fake "memory allocator"
  }

  #alloc() {
    return this.nextAddr++;
  }

  append(value) {
    const addr = this.#alloc();

    if (this.head === XORLinkedList.NULL) {
      this.nodes.set(addr, [value, XORLinkedList.NULL]);
      this.head = this.tail = addr;
      return addr;
    }

    // New node's link = XOR(prev=tail, next=NULL) == tail
    this.nodes.set(addr, [value, this.tail]);

    // Old tail's link = XOR(prev, NULL) becomes XOR(prev, addr)
    const [tailValue, tailLink] = this.nodes.get(this.tail);
    this.nodes.get(this.tail)[1] = tailLink ^ addr;

    this.tail = addr;
    return addr;
  }

  traverseForward() {
    const values = [];
    let prev = XORLinkedList.NULL;
    let curr = this.head;
    while (curr !== XORLinkedList.NULL) {
      const [value, link] = this.nodes.get(curr);
      values.push(value);
      [prev, curr] = [curr, link ^ prev]; // recover "next" from the single field
    }
    return values;
  }

  traverseBackward() {
    const values = [];
    let next = XORLinkedList.NULL;
    let curr = this.tail;
    while (curr !== XORLinkedList.NULL) {
      const [value, link] = this.nodes.get(curr);
      values.push(value);
      [next, curr] = [curr, link ^ next]; // recover "prev" the same way
    }
    return values;
  }
}

const xll = new XORLinkedList();
["A", "B", "C", "D"].forEach((v) => xll.append(v));

console.log("Forward: ", xll.traverseForward());  // ['A', 'B', 'C', 'D']
console.log("Backward:", xll.traverseBackward()); // ['D', 'C', 'B', 'A']
