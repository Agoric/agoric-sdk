/* eslint no-lone-blocks: "off" */
/* eslint dot-notation: "off" */
// I turned off dot-notation so eslint won't rewrite the grep-preserving
// test.stuff patterns.

import harden from '@agoric/harden';
import makePromise from '../src/makePromise';

// Exercise a set of increasingly complex object-capability message patterns,
// for testing.

// This file can be used two ways:
// 1: included by a vat: 'objA' and 'objB' implement the root object on the
//    two sides, and 'setA'/'setB' can be used during bootstrap to establish
//    the initial conditions. The caller (a vat setup function) must provide
//    'E' and 'log'.
// 2: included by the test code: 'patterns' and 'expected' tell the test
//    harness which tests to run and what log messages to expect.

// Each test is identified by the name of a property on objA (like 'a10').
// Each test begins by invoking that method, which may invoke one or more
// methods on objB (with a related name like 'b10' or 'b10_2'). The 'a10'
// property on the 'out' object is a list of log() calls we expect to see if
// the test passes.

// Sometimes the expected output depends upon whether pipelining is enabled
// (which will only occur when using the comms layer, not in the
// direct-to-kernel test). 'outPipelined' holds these alternate expectations.

// 'patterns' is used to track which tests should be skipped (or which should
// be the only test run at all). Each defined pattern must call test(name) to
// add it to the list. In addition, if you want to skip something, call
// 'test. skipLocal(name)' (without the space) and/or 'test.
// skipComms(name)'. To mark a test as the only one to run, call `test.
// onlyLocal(name)' or 'test. onlyComms(name)' (again without the space). (We
// insert a space in this description so a simple 'grep' can still accurately
// show the presence of skipped/only tests).

// Initial Conditions: vat A (which hosts objects 'alice' and 'amy'), and vat
// B (hosting objects 'bob' and 'bert' and 'bill'). Initially alice has
// access to amy/bob/bert but not bill. Bob has access to bert and bill.

// The setup step requires more functionality than the initial tests, but
// that's ok, they're still useful to investigate the messages
// created/delivered by specific patterns

// All messages should be sent twice, to check that the recipient gets the
// same object reference in both messages

export function buildPatterns(E, log) {
  let a;
  let b;

  function setA(newA) {
    a = newA;
  }
  function setB(newB) {
    b = newB;
  }

  const patterns = new Map();
  const objA = { toString: () => 'obj-alice' };
  const objB = { toString: () => 'obj-bob' };
  const out = {};
  const outPipelined = {};

  // avoid dot-notation to preserve the utility of 'grep test(.)only'
  const test = name => patterns.set(name, { local: 'test', comms: 'test' });
  test['onlyLocal'] = n => patterns.set(n, { local: 'only', comms: 'test' });
  test['onlyComms'] = n => patterns.set(n, { local: 'test', comms: 'only' });
  test['skipLocal'] = n => patterns.set(n, { local: 'skip', comms: 'test' });
  test['skipComms'] = n => patterns.set(n, { local: 'test', comms: 'skip' });
  test['skipBoth'] = n => patterns.set(n, { local: 'skip', comms: 'skip' });

  // bob!x()
  test('a10');
  {
    objA.a10 = async () => {
      await E(b.bob).b10();
      log('a10 done');
    };
    objB.b10 = async () => {
      log('b10 called');
    };
  }
  out.a10 = ['b10 called', 'a10 done'];

  // bob!x(data)
  {
    objA.a11 = async () => {
      await E(b.bob).b11('data');
      log('a11 done');
    };
    objB.b11 = async data => {
      log(`b11 got ${data}`);
    };
  }
  out.a11 = ['b11 got data', 'a11 done'];
  test('a11');

  // bob!x({key:'value'})
  {
    objA.a12 = async () => {
      await E(b.bob).b12({ key: 'value' });
      log('a12 done');
    };
    objB.b12 = async data => {
      log(`b12 got ${data.key}`);
    };
  }
  out.a12 = ['b12 got value', 'a12 done'];
  test('a12');

  // bob!x(amy) // new reference
  {
    objA.a20 = async () => {
      await E(b.bob).b20_1(a.amy);
      await E(b.bob).b20_2(a.amy);
      log('a20 done');
    };
    let b20amy;
    objB.b20_1 = async data => {
      b20amy = data;
      log(`b20 got ${data}`);
    };
    objB.b20_2 = async data => {
      log(`match: ${b20amy === data}`);
    };
  }
  out.a20 = ['b20 got [Presence o-50]', 'match: true', 'a20 done'];
  test('a20');

  // bob!x({key: amy})
  {
    objA.a21 = async () => {
      await E(b.bob).b21_1({ key1: a.amy });
      await E(b.bob).b21_2({ key2: a.amy });
      log('a21 done');
    };
    let b21amy;
    objB.b21_1 = async data => {
      b21amy = data.key1;
      log(`b21 got ${data.key1}`);
    };
    objB.b21_2 = async data => {
      log(`match: ${b21amy === data.key2}`);
    };
  }
  out.a21 = ['b21 got [Presence o-50]', 'match: true', 'a21 done'];
  test('a21');

  // bob!x(bob)
  {
    objA.a30 = async () => {
      await E(b.bob).b30_1(b.bob);
      await E(b.bob).b30_2(b.bob);
      log('a30 done');
    };
    objB.b30_1 = async data => {
      log(`b30 got ${data}`);
      log(`match: ${data === objB}`);
    };
    objB.b30_2 = async data => {
      log(`match: ${data === objB}`);
    };
  }
  out.a30 = ['b30 got obj-bob', 'match: true', 'match: true', 'a30 done'];
  test('a30');

  // bob!x(bert) // old reference
  {
    objA.a31 = async () => {
      await E(b.bob).b31_1(b.bert);
      await E(b.bob).b31_2(b.bert);
      log('a31 done');
    };
    objB.b31_1 = async data => {
      log(`b31 got ${data}`);
      log(`match: ${data === b.bert}`);
    };
    objB.b31_2 = async data => {
      log(`match: ${data === b.bert}`);
    };
  }
  out.a31 = ['b31 got obj-bert', 'match: true', 'match: true', 'a31 done'];
  test('a31');

  // bob!x() -> bob // bob returns himself
  {
    objA.a40 = async () => {
      const ret = await E(b.bob).b40();
      const ret2 = await E(b.bob).b40();
      log(`a40 done, match ${ret === b.bob} ${ret === ret2}`);
    };
    objB.b40 = async () => {
      return b.bob;
    };
  }
  out.a40 = ['a40 done, match true true'];
  test('a40');

  // bob!x() -> bert // old reference
  {
    objA.a41 = async () => {
      const ret = await E(b.bob).b41();
      const ret2 = await E(b.bob).b41();
      log(`a41 done, match ${ret === b.bert} ${ret === ret2}`);
    };
    objB.b41 = async () => {
      return b.bert;
    };
  }
  out.a41 = ['a41 done, match true true'];
  test('a41');

  // bob!x() -> bill // new reference
  {
    objA.a42 = async () => {
      const ret = await E(b.bob).b42();
      const ret2 = await E(b.bob).b42();
      log(`a42 done, ${ret} match ${ret === ret2}`);
    };
    objB.b42 = async () => {
      return b.bill;
    };
  }
  out.a42 = ['a42 done, [Presence o-52] match true'];
  test('a42');

  // bob!x() -> P(data)
  {
    // bob returns a (wrapped) promise, then resolves it to data. We wrap it
    // so the resolution is delivered as a separate event.
    objA.a50 = async () => {
      const ret = await E(b.bob).b50();
      const data = await ret.p;
      log(`a50 done, got ${data}`);
    };
    const p1 = makePromise();
    objB.b50 = async () => {
      p1.res('data');
      return harden({ p: p1.p });
    };
  }
  out.a50 = ['a50 done, got data'];
  test('a50');

  // bob!x() -> P(bert) // old reference
  {
    // bob returns a (wrapped) promise, then resolves it to a presence
    objA.a51 = async () => {
      const ret = await E(b.bob).b51();
      const bert = await ret.p;
      const bert2 = await E(b.bob).b51_2();
      log(`a51 done, got ${bert}, match ${bert === bert2} ${bert === b.bert}`);
    };
    const p1 = makePromise();
    objB.b51 = async () => {
      p1.res(b.bert);
      return harden({ p: p1.p });
    };
    objB.b51_2 = async () => {
      return b.bert;
    };
  }
  out.a51 = ['a51 done, got [Presence o-51], match true true'];
  test('a51');

  // bob!x() -> P(bill) // new reference
  {
    // bob returns a (wrapped) promise, then resolves it to a new presence
    objA.a52 = async () => {
      const ret = await E(b.bob).b52();
      const bill = await ret.p;
      const bill2 = await E(b.bob).b52_2();
      log(`a52 done, got ${bill}, match ${bill === bill2}`);
    };
    const p1 = makePromise();
    objB.b52 = async () => {
      p1.res(b.bill);
      return harden({ p: p1.p });
    };
    objB.b52_2 = async () => {
      return b.bill;
    };
  }
  out.a52 = ['a52 done, got [Presence o-52], match true'];
  test('a52');

  // bob!x(amy) -> P(amy) // new to bob
  {
    objA.a53 = async () => {
      const ret = await E(b.bob).b53(a.amy);
      const amy2 = await ret.p;
      log(`a53 done, match ${amy2 === a.amy}`);
    };
    const p1 = makePromise();
    objB.b53 = async amy => {
      p1.res(amy);
      return harden({ p: p1.p });
    };
  }
  out.a53 = ['a53 done, match true'];
  test('a53');

  // bob!x(P(amy)) -> amy // resolve after sending
  {
    objA.a60 = async () => {
      const p1 = makePromise();
      const p2 = E(b.bob).b60({ p: p1.p });
      p1.res(a.amy);
      const amy2 = await p2;
      log(`a60 done, match ${amy2 === a.amy}`);
    };
    objB.b60 = async Pamy => {
      const amy = await Pamy.p;
      return amy;
    };
  }
  out.a60 = ['a60 done, match true'];
  test('a60');

  // bob!x(P(amy)) -> amy // resolve before sending
  {
    objA.a61 = async () => {
      const p1 = Promise.resolve(a.amy);
      const p2 = E(b.bob).b61({ p: p1 });
      const amy2 = await p2;
      log(`a61 done, match ${amy2 === a.amy}`);
    };
    objB.b61 = async Pamy => {
      const amy = await Pamy.p;
      return amy;
    };
  }
  out.a61 = ['a61 done, match true'];
  test('a61');

  // bob!x() -> P(bill) // resolve after receipt
  {
    objA.a62 = async () => {
      const p2 = await E(b.bob).b62_1();
      E(b.bob).b62_2();
      const bill = await p2.p;
      log(`a62 done, got ${bill}`);
    };
    const p1 = makePromise();
    objB.b62_1 = async () => {
      return { p: p1.p };
    };
    objB.b62_2 = async () => {
      p1.res(b.bill);
    };
  }
  out.a62 = ['a62 done, got [Presence o-52]'];
  test('a62');

  // bob!x(amy) -> P(amy) // resolve after receipt
  {
    objA.a63 = async () => {
      const p2 = await E(b.bob).b63_1(a.amy);
      E(b.bob).b63_2();
      const amy2 = await p2.p;
      log(`a63 done, match ${amy2 === a.amy}`);
    };
    const p1 = makePromise();
    let amyOnBob;
    objB.b63_1 = async amy2 => {
      amyOnBob = amy2;
      return { p: p1.p };
    };
    objB.b63_2 = async () => {
      p1.res(amyOnBob);
    };
  }
  out.a63 = ['a63 done, match true'];
  test('a63');

  // bob!pipe1()!pipe2()!pipe3() // pipelining
  {
    objA.a70 = async () => {
      const p1 = E(b.bob).b70_pipe1();
      const p2 = E(p1).pipe2();
      const p3 = E(p2).pipe3();
      p1.then(_ => log('p1.then'));
      p2.then(_ => log('p2.then'));
      p3.then(_ => log('p3.then'));
    };
    objB.b70_pipe1 = async () => {
      log(`pipe1`);
      const pipe2 = harden({
        pipe2() {
          log(`pipe2`);
          const pipe3 = harden({
            pipe3() {
              log(`pipe3`);
            },
          });
          return pipe3;
        },
      });
      return pipe2;
    };
  }
  out.a70 = ['pipe1', 'pipe2', 'pipe3', 'p1.then', 'p2.then', 'p3.then'];
  outPipelined.a70 = [
    'pipe1',
    'pipe2',
    'pipe3',
    'p1.then',
    'p2.then',
    'p3.then',
  ];
  test('a70');

  // px!pipe1()!pipe2()!pipe3(); px.resolve()
  {
    objA.a71 = async () => {
      // todo: all the pipelined calls (pipe123) get sent to the kernel a
      // turn after the two call-to-presence calls (getpx/resolvex), which is
      // a bit weird. Feels like p.post gets one extra stall.
      const px = E(b.bob).b71_getpx();
      const p1 = E(px).pipe1();
      const p2 = E(p1).pipe2();
      const p3 = E(p2).pipe3();
      p1.then(_ => log('p1.then'));
      p2.then(_ => log('p2.then'));
      p3.then(_ => log('p3.then'));
      E(b.bob).b71_resolvex();
    };
    const p1 = makePromise();
    objB.b71_getpx = async () => p1.p;
    objB.b71_resolvex = async () => {
      const x = harden({
        pipe1() {
          log(`pipe1`);
          const pipe2 = harden({
            pipe2() {
              log(`pipe2`);
              const pipe3 = harden({
                pipe3() {
                  log(`pipe3`);
                },
              });
              return pipe3;
            },
          });
          return pipe2;
        },
      });
      p1.res(x);
    };
  }
  out.a71 = ['pipe1', 'pipe2', 'pipe3', 'p1.then', 'p2.then', 'p3.then'];
  test('a71');

  // px!pipe1()!pipe2()!pipe3(); px.resolve() but better
  {
    objA.a72 = async () => {
      const px = E(b.bob).b72_getpx();
      const p1 = E(px).pipe1();
      const p2 = E(p1).pipe2();
      const p3 = E(p2).pipe3();
      p1.then(_ => log('p1.then'));
      p2.then(_ => log('p2.then'));
      p3.then(_ => log('p3.then'));
      // make sure px isn't available for delivery until pipe123 are queued
      // in the kernel
      E(b.bob)
        .b72_wait()
        .then(() => E(b.bob).b72_resolvex());
    };
    const p1 = makePromise();
    objB.b72_wait = async () => 0;
    objB.b72_getpx = async () => p1.p;
    objB.b72_resolvex = async () => {
      const x = harden({
        pipe1() {
          log(`pipe1`);
          const pipe2 = harden({
            pipe2() {
              log(`pipe2`);
              const pipe3 = harden({
                pipe3() {
                  log(`pipe3`);
                },
              });
              return pipe3;
            },
          });
          return pipe2;
        },
      });
      p1.res(x);
    };
  }
  out.a72 = ['pipe1', 'p1.then', 'pipe2', 'p2.then', 'pipe3', 'p3.then'];
  outPipelined.a72 = [
    'pipe1',
    'pipe2',
    'pipe3',
    'p1.then',
    'p2.then',
    'p3.then',
  ];
  test('a72');

  return harden({
    setA,
    setB,
    patterns,
    objA,
    objB,
    expected: out,
    expected_pipelined: outPipelined,
  });
}
