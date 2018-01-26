interface Set<T> {
    union(setB: Set<T>): Set<T>;
}

Set.prototype.union = function(setB) {
    let union = new Set(this);
    setB.forEach(el => {
        union.add(el);
    });

    return union;
}