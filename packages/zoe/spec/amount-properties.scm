;; https://github.com/Agoric/agoric-sdk/blob/master/packages/ERTP/test/unitTests/amountProperties.test.js
;; https://ngyro.com/software/guile-quickcheck.html
(use-modules (quickcheck)
             (quickcheck arbitrary)
             (quickcheck property)
             (ice-9 match)
             (srfi srfi-26) ;; 26: Notation for Specializing Parameters without Currying
             (ertp)
             )

(define (ensure-equivalence m)
  (property
   ((x $natural) (y $natural) (z $natural))
   (and
    (memq (m 'isEqual x y) '(#t #f))  ;; total
    (m 'isEqual x x) ;; Reflexive
    (if (m 'isEqual x y) (m 'isEqual y x) #t) ;; Symmetric
    (if (and (m 'isEqual x y) (m 'isEqual y z)) (m 'isEqual x z) #t) ;; Transitive
    )
   ))

(define (partial-order m) ;; isGTE is a partial order with empty as minimum
  (define empty (m 'makeEmpty))
  (property
   ((x $natural) (y $natural) (z $natural))
   (and
    (m 'isGTE x empty)
    ;; Total
    (memq (m 'isGTE x y) '(#t #f))
    ;; Reflexive
    (m 'isGTE x x)
    ;; Antisymmetric
    (if (and (m 'isGTE x y) (m 'isGTE y x)) (m 'isEqual x y) #t)
    )))

(define (add-ok m) ;; closed, commutative, associative, monotonic, with empty identity
  (define empty (m 'makeEmpty))
  (property
   ((x $natural) (y $natural) (z $natural))
   (and
    ;; note: + for SET is not total.
    (m 'coerce (m 'add x y))  ;; TODO: coerce / brands
    ;; Identity (right)
    (m 'isEqual (m 'add x empty) x)
    ;; Identity (left)
    (m 'isEqual (m 'add empty x) x)
    ;; Commutative
    (m 'isEqual (m 'add x y) (m 'add y x))
    ;; Associative
    (m 'isEqual (m 'add (m 'add x y) z) (m 'add x (m 'add y z)))
    ;; Monotonic (left)
    (m 'isGTE (m 'add x y) x)
    ;; Monotonic (right)
    (m 'isGTE (m 'add x y) y)
    )
   ))

(define (subtract-ok m) ;; (x + y) - y = x; (y - x) + x = y if y >= x'
  (property
   ((x $natural) (y $natural))
   (and
    (m 'isEqual (m 'subtract (m 'add x y) y) x)
    (if (m 'isGTE y x) (m 'isEqual (m 'add (m 'subtract y x) x) y) #t)
    )))

(quickcheck (ensure-equivalence nat-amount-math))
(quickcheck (partial-order nat-amount-math))
(quickcheck (add-ok nat-amount-math))
(quickcheck (subtract-ok nat-amount-math))


  
