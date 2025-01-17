import json

def unmarshal(s):
    return json.loads(s.removeprefix("#"))

def unmarshal_method(methargsCD):
    methodobj = unmarshal(methargsCD["body"])[0]
    if isinstance(methodobj, str):
        return methodobj
    if isinstance(methodobj, dict):
        # assume a capdata symbol and upgrade to the equivalent smallcaps
        # https://github.com/endojs/endo/blob/master/packages/marshal/src/encodeToSmallcaps.js
        assert methodobj["@qclass"] == "symbol"
        return "%" + methodobj["name"] # probably now %@@asyncIterator
    raise ValueError("cannot determine method of %s" % json.dumps(methodobj))
