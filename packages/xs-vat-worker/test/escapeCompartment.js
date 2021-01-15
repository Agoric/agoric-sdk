/* global issueCommand, Compartment */

const te = new TextEncoder();
function send(s) {
  issueCommand(te.encode(s).buffer);
}

send('hello from child');

const c = new Compartment({ send });

const child = `
(function child(o) {
  try {
    const op = o.__proto__;
    const fo = op.constructor;
    send("fo is " + fo);
    const f = fo.constructor;
    send("f is " + f);
    const f2 = new f('return typeof setImmediate');
    send("f2 is " + f2);
    return f2();
  } catch (err) {
    send("err was " + err);
    return null;
  }
})`;

const t = c.evaluate(child)({});

issueCommand(te.encode(`did evaluate`).buffer);
issueCommand(te.encode(`child compartment saw '${t}'`).buffer);
