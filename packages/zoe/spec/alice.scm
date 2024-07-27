;; rockit copyrecord syntax https://github.com/cwebber/rockit
;; %r
;; (add-to-load-path (dirname (current-filename)))

(use-modules ((goblins)) ;; <-
             (goblins actor-lib joiners)
             (goblins ghash)
             (ertp)
             )

(define (get r k) (ghash-ref r k))

(define the-issuers
  ((lambda ()
    (define money (make-issuer-kit 'money))
    (define stock (make-issuer-kit 'stock))
    (make-ghash
     'money (get money 'issuer)
     'stock (get stock 'issuer))
    )))

(define* (alice issuers money-purse)
  (let* ((cancel #f)
         (a (make-ghash
             'moneySrcP (<- (get issuers 'money) 'makeEmptyPurse)
             'stockDstP (<- (get issuers 'stock) 'makeEmptyPurse)
             'stockNeeded 7
             'cancellationP (lambda ()
                              (define-values (p _r) (spawn-promise-values))
                              (on p (lambda (r) (set! cancel r)))
                              p)
             )) )
    (<- (get a 'moneySrcP) 'deposit (<- money-purse 'withdraw 10))
    ))
