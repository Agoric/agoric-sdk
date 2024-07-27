(define-module (ertp)
  #:use-module (rnrs base) ;; for assert
  #:use-module (goblins)
  #:use-module (goblins ghash)
  #:use-module (goblins actor-lib methods)
  #:use-module (goblins actor-lib selfish-spawn)
  #:use-module (store)
  #:export (nat? nat-amount-math make-issuer-kit)
  )

(define (nat? x)
  (and (exact-integer? x) (>= x 0)))

(define nat-amount-math
  (methods
   [(coerce x)
    (assert (nat? x))
    x]
   [(make-empty) 0]
   [(is-empty x) (eq? x 0)]
   [(is-gte x y) (>= x y)]
   [(s-equal x y) (= x y)]
   [(add x y) (+ x y)]
   [(subtract x y) (- x y)]))

(define-actor (^payment _bcom brand)
  (methods
   [(get-alleged-brand) brand]))

(define-actor (^purse bcom self brand value amtMath ledger)
  (amtMath 'coerce value) ;; guard idiom?
  (methods
   [(get-alleged-brand) brand]
   [(get-current-amount) value] ;; TODO: value -> amount
   [(deposit pmt)
    (define pmt-value ($ ledger 'get pmt)) ;; throw if pmt not recognized
    ($ ledger 'delete pmt)
    (bcom ledger brand (amtMath 'add value pmt-value))
    pmt-value]
   [(withdraw amt)
    (assert (amtMath 'is-gte value amt))
    (define pmt (spawn ^payment brand))
    ($ ledger 'init pmt amt)
    (bcom ledger brand (amtMath 'subtract value amt))
    pmt]
   ))

(define* (make-issuer-kit name #:optional (amtMath nat-amount-math))
  (define-actor (^brand _bcom)
    (methods
     [(is-my-issuer s) (eq? s issuer)]))
  (define brand (spawn ^brand))
  (define ledger (spawn ^weak-scalar-map-store))
  (define-actor (^issuer _bcom)
    (methods
     [(get-brand) brand]
     [(make-empty-purse)
      (define value (amtMath 'make-empty))
      (selfish-spawn ^purse brand value amtMath ledger)]))
  (define issuer (spawn ^issuer))
  (define-actor (^mint _bcom)
    (methods
     ((mint-payment amt)
      (amtMath 'coerce amt)
      (define pmt (spawn ^payment brand))
      ($ ledger 'init pmt amt)
      pmt)
     ((get-issuer) issuer)))
  (define mint (spawn ^mint))
  (make-ghash 'mint mint 'issuer issuer 'brand brand))
