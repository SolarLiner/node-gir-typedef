interface Set<T> {
    union(setB: Set<T>): Set<T>;
}

interface Array<T> {
    contains(element: T): boolean;
}

Set.prototype.union = function(setB) {
    let union = new Set(this);
    setB.forEach(el => {
        union.add(el);
    });

    return union;
}

Array.prototype.contains = function(element) {
    return this.indexOf(element) != -1;
}