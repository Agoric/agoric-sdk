(define (join p1 p2)
  (define [r1 r2] (promise-all [p1 p2])) ;; TODO: promise-all
  (if (not (eq r1 r2)) (error "join failed"))
  r1)


(define (transfer decisionP srcPurseP dstPurseP amount)
  ;; TODO: check srcPurseP and dstPurseP come from the same issuer
  (define issuer (error "TODO"))
  (define escrowPurseP (<- issuer 'makeEmptyPurse))

  ;; setup phase 2
  (on decisionP
      (lambda ()
        (on (<- escrowPurseP 'withdraw amount)
            (lambda (pmt)
              (<- dstPurseP 'deposit pmt))))
      #:catch
      (lambda ()
        (on (<- escrowPurseP 'withdraw amount)
            (lambda (pmt)
              (<- srcPurseP 'deposit pmt)))))
  )
(define (failOnly cancellationP)
  (on cancellationP (lambda (cancellation) (error cancellation))))


(define @ assq-ref)

;; a from Alice , b from Bob
(define (escrowExchange a b)
  (define-values (decisionP decide) (spawn-promise-values))

  (decide
   (Q.race  ;; TODO: race
    [
     (Q.all
      [
       (transfer decisionP
                 (@ a 'moneySrcP) (@ b 'moneyDstP) (@ b 'moneyNeeded))
       (transfer decisionP
                 (@ b 'stockSrcP) (@ a 'stockDstP) (@ a 'stockNeeded))
       ])
     (failOnly (@ a 'cancellationP))
     (failOnly (@ b 'cancellationP))
     ])
   )
  decisionP
  )
