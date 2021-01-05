function* twice() {
    yield 0;
    yield 1;
}
const g0 = twice();
function* infinite() {
    let index = 0;
    while (true) {
        yield index++;
    }
}
const g1 = infinite();
g1.next();

