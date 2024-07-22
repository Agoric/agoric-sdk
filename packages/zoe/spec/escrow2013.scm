(use-modules (goblins) ;; <-
             (goblins actor-lib joiners) ; all
             (goblins ghash)
             )

(define (transfer decisionP issuer srcPurseP dstPurseP amount)
  ;; TODO: check srcPurseP and dstPurseP come from the same issuer
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

  ;; phase 1
  (<- escrowPurseP 'deposit amount srcPurseP)
)

(define (failOnly cancellationP)
  (on cancellationP (lambda (cancellation) (error cancellation))))


(define @ ghash-ref)

;; a from Alice, b from Bob
(define (escrowExchange a b moneyIssuer stockIssuer)
  (define-values (decisionP decide) (spawn-promise-values))

  (decide
   (race
    [
     (all-of
      [
       (transfer decisionP moneyIssuer
                 (@ a 'moneySrcP) (@ b 'moneyDstP) (@ b 'moneyNeeded))
       (transfer decisionP stockIssuer
                 (@ b 'stockSrcP) (@ a 'stockDstP) (@ a 'stockNeeded))
       ])
     (failOnly (@ a 'cancellationP))
     (failOnly (@ b 'cancellationP))
     ])
   )
  decisionP
  )
