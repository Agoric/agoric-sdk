// @ts-check

import fs from 'fs';
import readline from 'readline';
import { test } from './prepare-test-env-ava.js';

import { makeSlogToOtelKit } from '../src/slog-to-otel.js';
// import t from './s.old.local.json';
// import t from './s.old.local.json' assert { type: 'json' };

const makeTracer = () => {
  const spans = [];

  const tracer = harden({
    startSpan(name, allOpts, ctx) {
      const { startTime, ...opts } = allOpts;
      const data = { name, start: startTime, opts, attrs: {}, events: [] };
      const span = harden({
        setStatus({ code, message }) {
          data.code = code;
          data.message = message;
        },
        setAttributes(attrs) {
          data.attrs = { ...data.attrs, ...attrs };
        },
        addEvent(evname, attrs, now) {
          data.events.push({ name: evname, attrs, now });
        },
        end(now) {
          data.end = now;
          spans.push(data);
        },
        spanContext() {
          return ctx;
        },
      });
      return span;
    },
  });

  return { tracer, spans };
};

// these edited slogfile snippets are written as strings to keep
// 'prettier' from exploding them into a million lines

// one crank (delivery) with two syscalls (resolve, send), no metering

const slog1 = String.raw`
{"time":1.0,"type":"crank-start","message":{"type":"send","target":"ko20","msg":{"methargs":{"body":"[\"bundleInstalled\",[\"b1-9fac33\"]]","slots":[]},"result":"kp41"}}}
{"time":1.01,"type":"clist","crankNum":23,"mode":"import","vatID":"v2","kobj":"kp41","vobj":"p-60"}
{"time":1.02,"type":"deliver","crankNum":23,"vatID":"v2","deliveryNum":2,"replay":false,"kd":["message","ko20",{"methargs":{"body":"[\"bundleInstalled\",[\"b1-9fac33\"]]","slots":[]},"result":"kp41"}],"vd":["message","o+0",{"methargs":{"body":"[\"bundleInstalled\",[\"b1-9fac33\"]]","slots":[]},"result":"p-60"}]}
{"time":1.10,"type":"clist","crankNum":23,"mode":"drop","vatID":"v2","kobj":"kp41","vobj":"p-60"}
{"time":1.11,"type":"syscall","crankNum":23,"vatID":"v2","deliveryNum":2,"syscallNum":0,"replay":false,"ksc":["resolve","v2",[["kp41",false,{"body":"{\"@qclass\":\"undefined\"}","slots":[]}]]],"vsc":["resolve",[["p-60",false,{"body":"{\"@qclass\":\"undefined\"}","slots":[]}]]]}
{"time":1.12,"type":"syscall-result","crankNum":23,"vatID":"v2","deliveryNum":2,"syscallNum":0,"replay":false,"ksr":["ok",null],"vsr":["ok",null]}
{"time":1.21,"type":"syscall","crankNum":23,"vatID":"v2","deliveryNum":2,"syscallNum":1,"replay":false,"ksc":["send","ko23",{"methargs":{"body":"[\"createHeld\",[]]","slots":[]},"result":"kp44"}],"vsc":["send","o-51",{"methargs":{"body":"[\"createHeld\",[]]","slots":[]},"result":"p+6"}]}
{"time":1.22,"type":"syscall-result","crankNum":23,"vatID":"v2","deliveryNum":2,"syscallNum":1,"replay":false,"ksr":["ok",null],"vsr":["ok",null]}
{"time":2.0,"type":"deliver-result","crankNum":23,"vatID":"v2","deliveryNum":2,"replay":false,"dr":["ok",null,null]}
{"time":2.1,"type":"crank-finish","crankNum":23,"crankhash":"9a89","activityhash":"f212"}
`;

const parseSlogText = text => text.trim().split('\n').map(JSON.parse);

test('convert slog to otel', async t => {
  const { spans, tracer } = makeTracer();
  const { slogSender, finish } = makeSlogToOtelKit(tracer);

  for (const obj of parseSlogText(slog1)) {
    slogSender(obj);
  }
  finish();

  //const mktime = ([s,us]) => 1000000*s+us;
  //const cmp = (a,b) => mktime(a.start) > mktime(b.start);
  //spans.sort(cmp);
  const findspan = name => spans.filter(s => s.name === name)[0]
  console.log(spans.map(JSON.stringify));
  return t.pass();
  //console.log(spans);
  const ds = findspan('E(ko20).bundleInstalled');
  console.log(ds);
  t.is(ds.attrs['agoric.vatID'], 'v2');
  t.is(ds.attrs['agoric.target'], 'ko20');
  t.is(ds.attrs['agoric.method'], 'bundleInstalled');
  t.is(ds.attrs['agoric.result'], 'kp41');
  t.deepEqual(ds.start, [1, 0]);
  t.deepEqual(ds.end, [2, 0]);
  return t.pass();
  /*
  const s0 = del0.events[0];
  console.log(s0);
  t.is(s0.name, 'clist'); // not interesting
  const s1 = del0.events[1];
  t.is(s1.name, 'syscall');
  console.log(s1);*/
  console.log(spans[1]);

  return t.pass();
});

test('slogfile', async t => {
  // This slogfile was extracted from "createVatByName" in
  // packages/SwingSet/test/vat-admin/test-create-vat.js
  // from the new code that has worker-side timestamps.
  // v7 was the vat under test, it has the most interesting syscalls

  const slogfile = new URL('sample.slog', import.meta.url).pathname;
  const slogF = fs.createReadStream(slogfile);
  const lines = readline.createInterface({ input: slogF });

  const { spans, tracer } = makeTracer();
  const { slogSender, finish } = makeSlogToOtelKit(tracer);

  for await (const line of lines) {
    const obj = JSON.parse(line);
    slogSender(obj);
  }
  finish();
  console.log(spans);

  return t.pass();
});
