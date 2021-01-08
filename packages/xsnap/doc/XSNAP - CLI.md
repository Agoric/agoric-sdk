# xsnap
Revised: November 10, 2020

Warning: These notes are preliminary. Omissions and errors are likely. If you encounter problems, please ask for assistance.

## About

`xsnap` is a custom XS runtime that read and write XS snapshots. See [XS snapshots](./documentation/XS Snapshots.md) for details and the C programming interface.

`xsnap` can create a machine from scratch or from a snapshot. In both cases, the machine can be frozen prior to scripts or modules execution.

When a machine is frozen, all intrinsics become immutable. Similarly to the [XS linker](https://github.com/Moddable-OpenSource/moddable/blob/public/documentation/xs/XS%20linker%20warnings.md), `xsnap` reports warning about mutable closures or objects.
`xsnap` cannot write a snapshot if the machine has been frozen.

`xsnap` also uses the metering version of XS. There are options to constraint how much computation a machine can do. See [XS metering](./documentation/XS Metering.md)

## Build

### Linux 

	cd ./makefiles/lin
	make

The debug version is built in `$MODDABLE/build/bin/lin/debug`
The release version is built in `$MODDABLE/build/bin/lin/release `

### macOS 

	cd ./xs/makefiles/mac
	make
	
The debug version is built in `$MODDABLE/build/bin/mac/debug`
The release version is built in `$MODDABLE/build/bin/mac/release `
	
### Windows 

	cd .\xs\makefiles\win
	build
	
The debug version is built in `$MODDABLE/build/bin/win/debug`
The release version is built in `$MODDABLE/build/bin/win/release `

## Usage

	xsnap [-f] [-h] [-v]
			[-r <snapshot>] [-w <snapshot>] 
			[-i <interval>] [-l <limit>] [-p]
			[-e] [-m] [-s] strings...

- `-f`: freeze the XS machine
- `-h`: print this help message
- `-v`: print XS version
- `-r <snapshot>`: read snapshot to create the XS machine 
- `-w <snapshot>`: write snapshot of the XS machine at exit
- `-i <interval>`: metering interval (defaults to 1) 
- `-l <limit>`: metering limit (defaults to none) 
- `-p`: prefix `print` output with metering index
- `-e`: eval `strings`
- `-m`: `strings` are paths to modules
- `-s`: `strings` are paths to scripts

Without `-e`, `-m`, `-s`, if the extension is `.mjs`, strings are paths to modules, else strings are paths to scripts. The `-f` and `-w` options are incompatible.

## Examples

Add the debug or release directory here above to your path. 

### helloworld

	cd ./examples/helloworld
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js
	
The simplest example to see if the build was successful...

### values

	cd ./examples/values
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js

Just to test how various JavaScript values survive the snapshot.
	
### generators

	cd ./examples/generators
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js

Generators can be iterated before writing and after reading the snapshot.

### promises

	cd ./examples/promises
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js

Promises can be part of a snapshot. And `then` can be used before writing and after reading the snapshot

### proxy

	cd ./examples/proxy
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js

Just to test how a `Proxy` instance, its target and its handler survive the snapshot.

### weaks

	cd ./examples/weaks
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm after.js

`WeakMap`, `WeakSet`, `WeakRef` and `FinalizationRegistry` instances can be defined before writing the snapshot and used after reading the snapshot.

### modules

Use the `-m` option for modules 

	cd ./examples/modules
	xsnap -m before.js -w snapshot.xsm
	xsnap -r snapshot.xsm -m after.js

Modules imported before writing the snapshot are available after reading the snapshot.

### compartments

Use the `-f` option to freeze the machine in order to use compartments. 

	cd ./examples/compartments
	xsnap before.js -w snapshot.xsm
	xsnap -r snapshot.xsm -f after.js

`xsnap` warns about mutable closures and objects.

	### warning() l: no const
	0 0 0 0
	undefined undefined undefined 1

### metering

Use the `-l` option to limit the number of byte codes that can be executed. 

	cd ./examples/metering
	xsnap test.js -l 10000
	
The test prints numbers and exits when too many byte codes have been executed.

	...
	524
	525
	too much computation

Use the `-i` option to change how often XS asks the runtime if the limit has been reached.

	xsnap test.js -l 10000 -i 1000

There is a performance gain but a precision lost.

	...
	527
	528
	too much computation

### metering-built-ins

Use the `-p` option to prefix `print` output with the metering index. 

	cd ./examples/metering-built-ins
	xsnap test.js -p

The tests builds, sorts and reverses an array of 100 random numbers. Observe the metering index around `sort` and `reverse`.

	...
	[3516] 99 0.4153946155753893
	[3536] sort
	[3651] reverse
	[3782] 0 0.000007826369259425611
	...

By default built-ins functions do not change the metering index. But xsnap patches `Array.prototype.sort` and `Array.prototype.reverse` to increase the metering index by the length of the array.

