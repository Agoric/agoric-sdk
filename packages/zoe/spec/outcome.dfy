module Outcome {
  datatype Outcome<T> =
    | Success(value: T)
    | Failure(error: object) // conventionally a string
  {
    predicate IsFailure() {
      this.Failure?
    }
    function PropagateFailure<U>(): Outcome<U>
      requires IsFailure()
    {
      Failure(this.error) // this is Outcome<U>.Failure(...)
    }
    function Extract(): T
      requires !IsFailure()
    {
      this.value
    }
  }
}
