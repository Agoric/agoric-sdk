const target = {
  key0: "hello",
  key1: "everyone"
};

const handler = {
  get: function (target, key, receiver) {
    if (key === "key1") {
      return "world";
    }
    return Reflect.get(target, key, receiver);
  },
};

const proxy = new Proxy(target, handler);
