try {
	for (let i = 0; i < 10000; i++) {
		print(i);
	}
}
catch(e) {
	// never happens 
	// too much computation is no exception
	print(e);
}
