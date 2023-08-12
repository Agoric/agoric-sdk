include "outcome.dfy"
include "passable.dfy"

module ELib {
  import opened Outcome
  import opened Passable

  type Value = Passable<Callable, Ref, object>

  trait Cap {
    ghost function Valid(): bool reads this
    ghost var reach: set<object>
  }

  trait Callable extends Cap {
    method callAll(verb: string, args: seq<Value>) returns (ret: Outcome<Value>)
      requires Valid()
      ensures Valid()
  }

  class Error {
    const message: string
    constructor (m: string) ensures message == m { message := m; }
  }

  trait Resolver {
    method resolve(target: Value) returns (ok: bool) modifies this
  }

  class LocalResolver extends Resolver {
    var ref: Opt<Ref>
    var buf: Opt<FlexList<Message>>
    constructor (ref: Ref, buf: FlexList<Message>) { this.ref, this.buf := Some(ref), Some(buf); }
    method resolve(target: Value) returns (ok: bool)
      modifies this
    {
      match ref {
        case None => return false;
        case Some(r) => {
          // r.setTarget(Ref.toRef(target))
          // r.commit();
          // deliverall in buf
          ref, buf := None, None;
          return true;
        }
      }
    }
  }

  type Message = (Resolver?, string, seq<Value>)

  class FlexList<T> {
    var items: seq<T>
    constructor() { items := []; }
    method push(item: T) modifies this {
      items := items + [item];
    }
  }

  trait Ref extends Callable {
    static method promise() returns (ref: Ref, resolver: Resolver)
    {
      var buf := new FlexList();
      ref := new BufferingRef(buf);
      resolver := new LocalResolver(ref, buf);
    }

    method sendAll(verb: string, args: seq<Value>) returns (ret: Ref) requires Valid() modifies reach
  }

  class BufferingRef extends Ref {
    var msgs: Opt<FlexList<Message>> // when is this set to None?
    ghost function Valid(): bool reads this { msgs == None || msgs.value in reach }
    constructor(buffer: FlexList<Message>)
      ensures Valid()
    {
      this.msgs := Some(buffer);
      reach := { this, buffer };
    }

    method callAll(verb: string, args: seq<Value>) returns (out: Outcome<Value>) {
      var err := new Error("not synchronously callable:" + verb);
      return Failure(err);
    }

    method sendAll(verb: string, args: seq<Value>) returns (result: Ref)
      requires Valid()
      modifies reach
      ensures Valid()
    {
      match msgs {
        case Some(m) => {
          var result, resolver := Ref.promise();
          m.push((resolver, verb, args));
          return result;
        }
        case None => {
          return this;
        }
      }
    }
  }

  datatype Opt<T> = None | Some(value: T)
  function optAsSet<T>(x: Opt<T>): set<T> { match x {
      case None => {}
      case Some(v) => {v}
    }}

  datatype Delivery = Pending(vat: Vat, rec: object, res: Resolver, verb: string, args: seq<Value>)

  trait Runner {
    method enqueue(d: Delivery) returns (ret: Outcome<()>)
  }

  trait Vat extends Runner {
    method qSendAll(rec: object, verb: string, args: seq<Value>, resolver: Resolver) returns (ret: Outcome<()>) {
      var pe := Pending(this, rec, resolver, verb, args);
      ret := Success(());
    }
    method sendAll3(rec: object, verb: string, args: seq<Value>) returns (ret: Ref) {
      var promise, resolver := Ref.promise();
      var err := qSendAll(rec, verb, args, resolver); // TODO: check error?
      ret := promise;
    }
  }

  trait E extends Vat {
    /**
    ref https://github.com/kpreid/e-on-java/blob/master/src/jsrc/org/erights/e/elib/prim/E.java
     */
    method callAll(rec: object, verb: string, args: seq<Value>) returns (ret: Outcome<Value>)
      requires !(rec is Callable) || (rec as Callable).Valid()
    {
      if (!(rec is Callable)) {
        var err := new Error("not a function");
        return Failure(err);
      }
      ret := (rec as Callable).callAll(verb, args);
    }

    method sendAll(rec: object, verb: string, args: seq<Value>) returns (ret: Ref)
      requires !(rec is Ref) || (rec as Ref).Valid()
      modifies if (rec is Ref) then (rec as Ref).reach else {}
    {
      if (rec is Ref) {
        ret := (rec as Ref).sendAll(verb, args);
      } else {
        ret := sendAll3(rec, verb, args);
      }
    }
  }
}