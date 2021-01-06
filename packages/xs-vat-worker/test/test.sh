#!/usr/bin/env bash

type xsnap

# https://en.wikipedia.org/wiki/Test_Anything_Protocol
# https://github.com/goozbach/bash-tap-functions
. tap-functions.sh

# Use of initial comma to denote a temp file is a convention from MH, I think.
# https://en.wikipedia.org/wiki/MH_Message_Handling_System
trap "rm -f ,*" EXIT

plan_tests 8

name=eval
echo '12:eprint("hi"),' >,in
echo  >,expected
is $(xsnap 3<,in 4>&1) "1:.,hi" "$name"

name="eval async"
echo '34:ePromise.resolve("hi").then(print),' >,in
is "$(xsnap 3<,in 4>&1)" "1:.,hi" "$name"

name="async in script"
cat >,async.js <<EOF
Promise.resolve("hi").then(print);
EOF
echo '10:s,async.js,' >,in
is "$(xsnap 3<,in 4>&1)" "1:.,hi" "$name"

name="run and write transcript..."
cat >,before.js <<'EOF'
print("boot");
onMessage = (m) => print(`msg len: ${m.byteLength}`);
EOF
echo '11:s,before.js,11:w,hello.xss,' >,in
is "$(xsnap 3<,in 4>&1)" "1:.,1:.,boot" "$name"
okx [ -f ,hello.xss ]

name="read transcript and run..."
cat >,after.js <<'EOF'
print("onMessage is a", typeof onMessage);
EOF
echo '10:s,after.js,' >,in
is "$(xsnap -r ,hello.xss 3<,in 4>&1)" "1:.,onMessage is a function" "$name"

name="read transcript and deliver"
echo '6:d12345,' >,in
is "$(xsnap -r ,hello.xss 3<,in 4>&1)" "1:.,msg len: 5" "$name"

name="syscall"
cat >,syscall.js <<'EOF'
print(sysCall(ArrayBuffer.fromString("123")).byteLength);
EOF
echo '12:s,syscall.js,7:ABCDEFG,' >,in
is "$(xsnap -r ,hello.xss 3<,in 4>&1)" "4:?123,1:.,7" "$name"

