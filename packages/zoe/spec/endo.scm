(define-module (endo) ;; TODO: endo nat
  #:export (nat? %r get))

(define (nat? x)
  (and (exact-integer? x) (>= x 0)))

;; Record stuff
(define (%r . rest)
  (if (eq? '() rest) '()
      (let ((k1 (car rest))
            (v1 (cadr rest))
            (more (cddr rest)))
        (let ((head (cons k1 v1))
              (tail (apply %r more)))
          (cons head tail)))))

(define (get r k) (assq-ref r k))
