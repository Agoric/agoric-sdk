import harden from '@agoric/harden';

export default harden(({zoe, registrar, overrideInstanceId = undefined}, _inviteMaker) => {
  // If we have an overrideInstanceId, use it to assert the correct value in the RPC.
  function coerceInstanceId(instanceId = undefined) {
    if (instanceId === undefined) {
      return overrideInstanceId;
    }
    if (overrideInstanceId === undefined || instanceId === overrideInstanceId) {
      return instanceId;
    }
    throw TypeError(`instanceId ${JSON.stringify(instanceId)} must match ${JSON.stringify(overrideInstanceId)}`);
  }

  const registrarPCache = new Map();
  function getRegistrarP(id) {
    let regP = registrarPCache.get(id);
    if (!regP) {
      // Cache miss, so try the registrar.
      regP = E(registrar).get(id);
      registrarPCache.set(id, regP);
    }
    return regP;
  }

  const instancePCache = new Map();
  function getInstanceP(id) {
    let instanceP = instancePCache.get(id);
    if (!instanceP) {
      const instanceHandleP = getRegistrarP(id);
      instanceP = instanceHandleP.then(instanceHandle =>
        E(zoe).getInstance(instanceHandle));
      instancePCache.set(id, instanceP);
    }
    return instanceP;
  }

  async function getOrderStatus(instanceRegKey, inviteHandles) {
    const { publicAPI } = await getInstanceP(instanceRegKey);
    return E(publicAPI).getOrderStatus(inviteHandles);
  }
  
  return harden({
    getCommandHandler() {
      return harden({
        async processInbound(obj, _home) {
          switch (obj.type) {
            case 'simpleExchange/getOrderStatus': {
              const { instanceRegKey } = obj;
              const instanceId = coerceInstanceId(instanceRegKey);

              // FIXME: Use a protocol to negotiate a sharingService.
              const inviteHandles = [];

              const data = await getOrderStatus(instanceId, inviteHandles);
              return harden({
                type: 'simpleExchange/orderStatus',
                data,
              });
            }
            default:
              return undefined;
          }
        },
      });
    },
  });
});
