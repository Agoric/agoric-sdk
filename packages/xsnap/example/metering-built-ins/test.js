const array = new Array(100);
for (let i = 0; i < 100; i++) {
	array[i] = Math.random();
	print(i, array[i]);
}
print("sort");
array.sort();
print("reverse");
array.sort();
for (let i = 0; i < 100; i++) {
	print(i, array[i]);
}
