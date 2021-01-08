
const p0 = new Promise((resolve, reject) => {
    resolve("wow");
});
const p1 = new Promise((resolve, reject) => {
    reject("oops");
});

async function f2() {
	return "wow";
}
const p2 = f2();

async function f3() {
	throw "oops";
}
const p3 = f3();

const kit = {}
kit.promise = new Promise((resolve, reject) => {
	kit.resolve = resolve;
	kit.reject = reject;
});
kit.promise.then(
	result => { print("resolved", result); },
	reason => { print("rejected", reason); });
