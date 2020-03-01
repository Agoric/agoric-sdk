try {
  doit();
} catch (e) {
  foo(e);
}

try {
  doit();
} finally {
  bar();
}

try {
  doit();
} catch {
  bar();
}

try {
  doit();
} catch (e) {
  foo(e);
} finally {
  bar();
}

try {
  doit();
} catch {
  foo();
} finally {
  bar();
}