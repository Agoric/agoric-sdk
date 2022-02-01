# Invariants Among Orders

Invariant                          | notes
-----------------------------------|------
keyLT -> rankLT                    | optimize key pattern into rankCover
rankLT -> fullLT, fullEQ -> rankEQ | fullOrder more precise than rankOrder
(fullEQ && isKey) <-> keyEQ        | fullOrder is full wrt keyEQ, merge-ops


RankOrder | FullOrder | KeyOrder     | examples
----------|-----------|--------------|---------
`rankLT`  | `fullLT`  | `keyLT`      | `2` vs `3`, `set{2}` vs `set{2,3}`
`rankLT`  | `fullLT`  | incomparable | `2` vs `NaN`, `set{2}` vs `set{3}`
`rankEQ`  | `fullLT`  | incomparable | `far1` vs `far2`, `[far1]` vs `[far2]`
`rankEQ`  | `fullEQ`  | `keyEQ`      | `2` vs `2`, `NaN` vs `NaN`, `-0` vs `0`


PassStyles   | RankOrder         | KeyOrder    | notes
-------------|-------------------|-------------|------
***Primitives*** | &nbsp;        | &nbsp;      | &nbsp;
undefined    | js                | js          | JS always sorts to end
null         | js                | js          | `typeof` is `'object'`
boolean      | js                | js
number       | num `rankLT NaN`  | `NaN` incomparable | Always reflexive
bigint       | js                | js
string       | js                | js          | UTF-16 equiv CESU-8
symbol       | string-rep        | string-rep  | only registered and well-known
***Composites*** | &nbsp;        | &nbsp;      | &nbsp;
copyArray    | lex               | lex
copyRecord   | lex names, values | pareto      | not same names -> incomparable
tagged       | lex tag, payload  | _see below_ | rank order independent of kind
***Other***  | &nbsp;            | &nbsp;      | &nbsp;
remotable    | `rankEQ` | `keyEQ` or incomparable | fullOrder is history-dependent
error        | `rankEQ`          | _not a key or pattern_ |
promise      | `rankEQ`          | _not a key or pattern_ |


Tag recognition | payload encoding | KeyOrder | notes
----------------|------------------|----------|-------
copySet         | -lex elements    | subset   | -lex trick -> above invariants
copyBag         | -lex entries     | subbag   | -lex trick -> above invariants
copyMap         | -lex keys, values | pareto  | not same keys -> incomparable
matcher:*       | per matcher kind | _not a key_ | pattern but not a key
*other*         |                 | _not a key or pattern_ | unrecognized tagged
