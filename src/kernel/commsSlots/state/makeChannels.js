// TODO: check signature on this
// in the future, data structure would contain name and predicate

// this maps machines to deviceNames to be used as a channel
export function makeChannels() {
  const machineToChannelDevice = new Map();
  const channelDeviceToMachine = new Map();

  return {
    /**
     * @param  {string} machineName
     * @param  {string} deviceName
     */
    add(machineName, deviceName) {
      machineToChannelDevice.set(machineName, deviceName);
      channelDeviceToMachine.set(deviceName, machineName);
    },
    /**
     * Get the callback that reaches the machine
     * @param  {string} machine
     * @returns {string} deviceName
     */
    getChannelDevice(machine) {
      return machineToChannelDevice.get(machine);
    },
    dump() {
      return machineToChannelDevice;
    },
  };
}
