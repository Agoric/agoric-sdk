p0.then(value => print(value)); // wow
p1.catch(value => print(value)); // oops
p2.then(value => print(value)); // wow
p3.catch(value => print(value)); // oops

kit.resolve("wow"); // resolved wow