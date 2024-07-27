(define-module (ertp)
  #:use-module (rnrs base) ;; for assert
  #:use-module (goblins)
  #:use-module (goblins ghash)
  #:use-module (goblins actor-lib methods)
  #:use-module (goblins actor-lib selfish-spawn)
  #:use-module (store)
  #:use-module (endo)
  #:export (nat-amount-math make-issuer-kit)
  )

(define nat-amount-math
  (methods
   [(coerce x)
    (assert (nat? x))
    x]
   [(makeEmpty) 0]
   [(isEmpty x) (eq? x 0)]
   [(isGTE x y) (>= x y)]
   [(isEqual x y) (= x y)]
   [(add x y) (+ x y)]
   [(subtract x y) (- x y)]))

(define-actor (^payment _bcom brand)
  (methods
   [(getAllegedBrand) brand]))

(define-actor (^purse bcom self brand value amtMath ledger)
  (amtMath 'coerce value) ;; guard idiom?
  (methods
   [(getAllegedBrand) brand]
   [(getCurrentAmount) value] ;; TODO: value -> amount
   [(deposit pmt)
    (define pmt-value ($ ledger 'get pmt)) ;; throw if pmt not recognized
    ($ ledger 'delete pmt)
    (let ((updated (amtMath 'add value pmt-value)))
      (bcom (^purse bcom self brand updated amtMath ledger) pmt-value))
    ]
   [(withdraw amt)
    (assert (amtMath 'isGTE value amt))
    (define pmt (spawn ^payment brand))
    ($ ledger 'init pmt amt)
    (let ((updated (amtMath 'subtract value amt)))
      (bcom (^purse bcom self brand updated amtMath ledger) pmt))]
   ))

(define* (make-issuer-kit name #:optional (amtMath nat-amount-math))
  (define-actor (^brand _bcom)
    (methods
     [(is-my-issuer s) (eq? s issuer)]))
  (define brand (spawn ^brand))
  (define ledger (spawn ^weak-scalar-map-store))
  (define-actor (^issuer _bcom)
    (methods
     [(getBrand) brand]
     [(makeEmptyPurse)
      (define value (amtMath 'makeEmpty))
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
  (%r 'mint mint 'issuer issuer 'brand brand))
