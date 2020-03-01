const $m=getMeter();$m&&$m.e();try{try {
  doit();
} catch (e) {$m && $m.c();
  foo(e);
}

try {
  doit();
} finally {$m && $m.c();
  bar();
}

try {
  doit();
} catch {$m && $m.c();
  bar();
}

try {
  doit();
} catch (e) {$m && $m.c();
  foo(e);
} finally {$m && $m.c();
  bar();
}

try {
  doit();
} catch {$m && $m.c();
  foo();
} finally {$m && $m.c();
  bar();
}
}finally{$m && $m.l();}
