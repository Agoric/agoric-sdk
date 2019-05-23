// TODO: check signature on this
// in the future, data structure would contain name and predicate

// for now, this just tracks the one channel we use for all messages
export function makeChannels() {
  let channelDev;

  return {
    /**
     * @param  {slotref} device
     */
    setChannelDevice(device) {
      channelDev = device;
    },
    /**
     * @returns {slotref} device
     */
    getChannelDevice() {
      return channelDev;
    },
    dump() {
      return channelDev;
    },
  };
}
