(define-module (escrow2013)
  #:use-module (goblins) ;; <-
  #:use-module (goblins actor-lib joiners) ; all
  #:use-module (race)
  #:use-module (endo)
  #:use-module (ertp)
  #:export (escrowExchange)
  )

(define (transfer decisionP issuer srcPurseP dstPurseP amount)
  (peek "@@transfer:" decisionP issuer amount)
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
  (on (<- srcPurseP 'withdraw amount)
      (lambda (pmt)
        (<- escrowPurseP 'deposit pmt)))
)

(define (failOnly cancellationP)
  (on cancellationP (lambda (cancellation) (error cancellation))))

;; a from Alice, b from Bob
(define (escrowExchange a b moneyIssuer stockIssuer)
  (define-values (decisionP decide) (spawn-promise-values))

  (decide
   (race
    [
     (all-of
      [
       (peek "txfr" (transfer decisionP moneyIssuer
                 (get a 'moneySrcP) (get b 'moneyDstP) (get b 'moneyNeeded)))
       (transfer decisionP stockIssuer
                 (get b 'stockSrcP) (get a 'stockDstP) (get a 'stockNeeded))
       ])
     (failOnly (get a 'cancellationP))
     (failOnly (get b 'cancellationP))
     ])
   )
  decisionP
  )
