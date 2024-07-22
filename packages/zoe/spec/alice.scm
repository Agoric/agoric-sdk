;; rockit copyrecord syntax https://github.com/cwebber/rockit
;; %r
(use-modules ((goblins) #select (<-))
             ((goblins actor-lib joiners) #select 
             (goblins ghash))

(define (alice)
  (let* ((cancel #f)
         (a (make-ghash
             'moneySrcP (<- myMoneyPurse 'makePurse)
             'stockDstP (<- myStockPurse 'makePurse)
             'stockNeeded 7
             'cancellationP (lambda ()
                              (define-values (p r) (spawn-promise-values))
                              (on p 
                   (Q.promise (lambda (r) (set! cancel r)))
             )))
    (<- (ghash-ref a 'moneySrcP) 'deposit 10 myMoneyPurse)))
