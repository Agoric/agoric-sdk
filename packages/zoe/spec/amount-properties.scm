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

(quickcheck (ensure-equivalence nat-amount-math))
(quickcheck (partial-order nat-amount-math))


  
