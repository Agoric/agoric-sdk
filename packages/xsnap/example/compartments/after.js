const compartment = new Compartment();
const globals = compartment.globalThis;

compartment.evaluate(`
	const c = 1;
	let l = 1;
	var v = 1;
	globalThis.g = 1;
`);

trace(c + " " + l + " " + v + " " + g + "\n"); // 0 0 0 0
trace(globals.c + " " + globals.l + " " + globals.v + " " + globals.g + "\n"); // undefined undefined undefined 1
