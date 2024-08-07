(define-module (endo) ;; TODO: endo nat
  #:use-module (rnrs base) ;; assert
  #:use-module (srfi srfi-1) ;; lists
  #:use-module (srfi srfi-9) ;; records
  #:use-module (srfi srfi-9 gnu) ;; immutable records
  #:use-module (srfi srfi-43) ;; vectors for copyArray
  #:use-module (goblins)
  #:export (nat?
	    passStyleOf isPassable
	    get %r
	    makeTagged getTag getPayload))

;;;;
;; @endo/nat

(define (nat? x)
  (and (exact-integer? x) (>= x 0)))

;; Record stuff
(define (asKey x)
  (cond
   ((string? x) x)
   ((symbol? x) (symbol->string x))
   (else (error 'not-copyRecord-key x))))

(define (get r k) (assoc-ref r (asKey k)))

(define (%r . rest)
  (if (eq? '() rest) '()
      (let ((k1 (car rest))
            (v1 (cadr rest))
            (more (cddr rest)))
        (let ((head (cons (asKey k1) v1))
              (tail (apply %r more)))
          (cons head tail)))))


(define (copy-record-entry? entry)
  (unless (pair? entry)
    (error 'bad-copy-record-entry entry))
  (let* ((key (car entry))
	 (value (cdr entry))
	 (ks (passStyleOf key))
	 (vs (passStyleOf value)))
    (eqv? ks "string")))

(define (copy-record? x)
  (and (list? x)
       (every copy-record-entry? x)))

;;;;
;; @endo/pass-style

(define-immutable-record-type <tagged>
  (_make-tagged tag payload)
  isTagged
  (tag getTag)
  (payload getPayload)
  )

(define (makeTagged tag payload)
  (unless (eqv? (passStyleOf tag) "string")
    (error 'tag-not-string tag))
  (passStyleOf payload) ;; or throw
  (_make-tagged tag payload))

(define* (passStyleOf x #:key [elseThrow #t])
  (cond
   ((unspecified? x) "undefined")
   ((null? x) "null")
   ((eq? x #t) "boolean")
   ((eq? x #f) "boolean")
   ((string? x) "string") ;; ASSUME not mutated.
   ((symbol? x) "symbol") ;; hmm.... treat symbols as strings?
   ((endo-symbol? x) "symbol")
   ((exact-integer? x) "bigint")
   ((and (number? x) (inexact? x)) "number")
   ((promise-refr? x) "promise")
   ((live-refr? x) "remotable") ;; check _after_ promise-refr?
   ((exception? x) "error")
   ((isTagged x) "tagged")
   ((copy-array? x) "copyArray")
   ((copy-record? x) "copyRecord")
   (else
    (and elseThrow (throw 'not-passable "not passable" #:specimen x)))))

(define (assertTypeOf x expected)
  (define actual (passStyleOf x))
  (or (eqv? actual expected)
      (assertion-violation #f (format #f "expected ~a not ~a" expected actual) x)))

(define (isPassable x) (string? (passStyleOf x #:elseThrow #f)))

(define (copy-array? x)
  (and (vector? x) (vector-every isPassable x)))
