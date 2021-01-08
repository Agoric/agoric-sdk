weak = null;
try {
	strong = null;
}
catch {
}

gc();

print(wm.has(strong)); // true
print(ws.has(strong)); // true

print(wr0.deref()); // undefined
print(wr1.deref()); // [object Object]

// FinalizationRegistry: weak