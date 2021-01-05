Map.prototype.toString = function() {
	return Array.from(this).toString();
}
Set.prototype.toString = function() {
	return Array.from(this).toString();
}

const values = [
	false, 
	true, 
	Symbol(),
	Symbol("description"),
	new Error("message"),
	new EvalError("message"),
	new RangeError("message"),
	new ReferenceError("message"),
	new SyntaxError("message"),
	new TypeError("message"),
	new URIError("message"),
	new AggregateError([new Error("message")], "message"),
	1, 
	1n,
	new Date(),
	"string",
	/regexp/g,
	[0, 1, , 3],
	new Int8Array([0, 1, 2, 3]),
	new Uint8Array([0, 1, 2, 3]),
	new Uint8ClampedArray([0, 1, 2, 3]),
	new Int16Array([0, 1, 2, 3]),
	new Uint16Array([0, 1, 2, 3]),
	new Int32Array([0, 1, 2, 3]),
	new Uint32Array([0, 1, 2, 3]),
	new BigInt64Array([0n, 1n, 2n, 3n]),
	new BigUint64Array([0n, 1n, 2n, 3n]),
	new Float32Array([0, 1, 2, 3]),
	new Float64Array([0, 1, 2, 3]),
	new Map([["a", 0],["b", 1],["c", 2],["d", 2]]),
	new Set([0, 1, 2, 3]),
];

const strings = values.map(value => value.toString());
