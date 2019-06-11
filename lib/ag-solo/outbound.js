const knownTargets = new Map(); // target => { deliverator, highestSent, highestAck }

export function deliver(mbs) {
  const data = mbs.exportToData();
  console.log(`deliver`, data);
  for (const target of Object.getOwnPropertyNames(data)) {
    if (!knownTargets.has(target)) {
      console.log(`eek, no delivery method for target ${target}`);
      continue;
    }
    const t = knownTargets.get(target);
    const newMessages = [];
    data[target].outbox.forEach(m => {
      const [msgnum, body] = m;
      if (msgnum > t.highestSent) {
        console.log(`new outbound message ${msgnum} for ${target}: ${body}`);
        newMessages.push(m);
      }
    });
    newMessages.sort((a, b) => a[0] - b[0]);
    console.log(` ${newMessages.length} new messages`);
    const acknum = data[target].inboundAck;
    if (newMessages.length || acknum !== t.highestAck) {
      console.log(` invoking deliverator`);
      t.deliverator(newMessages, acknum);
      if (newMessages.length) {
        t.highestSent = newMessages[newMessages.length - 1][0];
      }
      t.highestAck = acknum;
    }
  }
}

export function addDeliveryTarget(target, deliverator) {
  if (knownTargets.has(target)) {
    throw new Error(`target ${target} already added`);
  }
  knownTargets.set(target, { deliverator, highestSent: 0, highestAck: 0 });
}
