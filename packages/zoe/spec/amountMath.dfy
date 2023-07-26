// cribbed from test-amountProperties.js 229708b Jan 9, 2023
// https://github.com/Agoric/agoric-sdk/blob/master/packages/ERTP/test/unitTests/test-amountProperties.js
module {:options "--function-syntax:4"} M0 {

  module Relation {
    // TODO: make sure this !T variance is right
    type relation<-T> = (T, T) -> bool

    /** r is reflexive over some universe of T */
    predicate reflexive<T>(r: relation<T>, U: set<T>)
    {
      forall x :: x in U ==> r(x, x)
    }

    ghost predicate symmetric<T>(r: relation, U: set<T>) {
      forall x, y :: x in U && y in U ==> r(x, y) ==> r(y, x)
    }

    ghost predicate transitive<T>(r: relation<T>, U: set<T>) {
      forall x, y, z :: x in U && y in U && z in U ==> r(x, y) && r(y, z) ==> r(x, x)
    }

    ghost predicate equivalence<T>(r: relation, u: set<T>) {
      reflexive(r, u) && symmetric(r, u) && transitive(r, u)
    }
  }


  module ERTP {
    datatype AssetKind = NAT | COPYSET | COPYBAG // TODO: others?
    trait Kinded {
      ghost function assetKind(): AssetKind
    }
    trait Brand extends Kinded {}
    trait Amount<T> {
      ghost function assetKind(): AssetKind { brand.assetKind() }
      const brand: Brand
      const value: T
    }
  }

  abstract module AmountMath {
    import opened ERTP
    import R = Relation

    type V
    type Amt = Amount<V>
    function isEqual(x: Amt, y: Amt): bool
      reads x, y

    ghost function obeys(u: set<Amt>): bool {
      R.equivalence(isEqual, u)
    }
  }

  module NatMath refines AmountMath {
    type V = nat
    function isEqual(x: Amt, y: Amt): bool {
      x == y
    }
  }

  module JS {
    datatype Primitive = Undefined | Boolean(b: bool) | Number(x: int) |
                         String(s: string) | Symbol(sym: string) | Bigint(i: int)
    datatype Value = P(p: Primitive) | Object(o: object)
    function typeof(v: Value): string {
      match v {
        case P(p) => match p {
          case Undefined() => "undefined"
          case Boolean(_) => "boolean"
          case Number(_) => "number"
          case String(_) => "string"
          case Symbol(_) => "symbol"
          case Bigint(_) => "bigint"
        }
        case Object(_) => "object"
      }
    }
  }

  module PassStyle {
    datatype Primitive = Undefined | Boolean | Number | String | Symbol | Bigint
    datatype PassStyle = Prim(t: Primitive) | PSRemotable | PSPromise | PSError | PSCopyArray | PSCopyMap | PSTagged
    trait Passable {
      const passStyle: PassStyle // TODO: Repr set instead or something
    }
    class CopyArray extends Passable {
      const value: array<Passable>
      constructor (items: array<Passable>) {
        passStyle, value := PSCopyArray, items;
      }
    }
    class CopyMap extends Passable {
      const value: map<Passable, Passable>
      constructor (entries: map<Passable, Passable>) {
        passStyle, value := PSCopyMap, entries;
      }
    }

    // :termination false means open to extension in other modules?
    trait {:termination false} TaggedT extends Passable {
      const tag: string
      const payload: Passable
    }
    class Tagged extends TaggedT {
      constructor (t: string, p: Passable) {
        passStyle, tag, payload := PSTagged, t, p; }
    }
    // TODO: extend to object using Repr set
    function passStyleOf(x: Passable): PassStyle reads x {
      x.passStyle
    }
  }

  module Patterns {
    import PS = PassStyle
    class CopyBag extends PS.TaggedT {
      constructor (e: PS.CopyMap) {
        passStyle, tag, payload := PS.PSTagged, "copyBag", e;
      }
    }

    function keyEq(x: PS.Passable, y: PS.Passable): bool
      reads x, y
      decreases x
    {
      PS.passStyleOf(x) == PS.passStyleOf(y) &&
      if
        x is PS.Tagged && y is PS.Tagged then
        var xt := x as PS.Tagged;
        var yt := y as PS.Tagged;
        xt.tag == yt.tag // TODO: termination && keyEq(xt.payload, yt.payload)
      else false // TODO

    }
  }

  module CopyBagMath refines AmountMath {
    import P = Patterns
    type V = P.CopyBag
    function isEqual(x: Amt, y: Amt): bool {
      x.brand == y.brand && P.keyEq(x.value, y.value)
    }
  }
}
