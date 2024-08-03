export default function makePubsub(E) {
  let lastPublished;
  const subscribers = [];

  return harden({
    subscribe(s) {
      subscribers.push(s);
      if (lastPublished !== undefined) {
        E(s).notify(lastPublished);
      }
    },
    publish(m) {
      lastPublished = m;
      for (const s of subscribers) {
        E(s).notify(m);
      }
    },
  });
}
