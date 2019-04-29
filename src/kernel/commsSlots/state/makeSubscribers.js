// Subscribers

export function makeSubscribers() {
  const subscribersMap = new Map(); // promiseID -> senderID

  return {
    add(promiseID, senderID) {
      if (!subscribersMap.get(promiseID)) {
        subscribersMap.set(promiseID, []);
      }
      subscribersMap.get(promiseID).push(senderID);
    },
    get(promiseID) {
      return subscribersMap.get(promiseID);
    },
    dump() {
      return subscribersMap;
    },
  };
}
