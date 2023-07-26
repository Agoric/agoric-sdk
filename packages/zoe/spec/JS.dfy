
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
