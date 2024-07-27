;; rockit copyrecord syntax https://github.com/cwebber/rockit
;; %r
;; (add-to-load-path (dirname (current-filename)))

(use-modules ((goblins)) ;; <-
             (goblins actor-lib joiners)
             (goblins ghash)
             (srfi srfi-64) ;; test
             (endo)
             (ertp)
             )

;; see also ggspec
;; https://stackoverflow.com/questions/72057/how-to-build-unit-tests-in-guile-which-output-to-the-tap-standard
(test-begin "alice")

(test-assert (procedure? make-issuer-kit))

(test-equal (nat? 0) #t)
(test-equal (nat? -1) #f)

(define rec1 (%r 'x 1 'y 2))
(test-equal 1 (get rec1 'x))

(define a-vat (spawn-vat))

(with-vat
 a-vat

 (display "in vat a") (newline)

 (define money (make-issuer-kit 'money))
 (test-equal (map car money) '(mint issuer brand))

 (define stock (make-issuer-kit 'stock))

 (define the-issuers
      (%r
       'money (get money 'issuer)
       'stock (get stock 'issuer))
      )

 (define purse1 ($ (get money 'issuer) 'makeEmptyPurse))
 (test-equal 0 ($ purse1 'getCurrentAmount))

 (define pmt1 ($ (get money 'mint) 'mint-payment 20))
 ($ purse1 'deposit pmt1)
 (test-equal 20 ($ purse1 'getCurrentAmount))
 
 (let* ((cancel #f)
        (a (%r
            'moneySrcP (<- (get money 'issuer) 'makeEmptyPurse)
            'stockDstP (<- (get stock 'issuer) 'makeEmptyPurse)
            'stockNeeded 7
            'cancellationP (lambda ()
                             (define-values (p _r) (spawn-promise-values))
                             (on p (lambda (r) (set! cancel r)))
                             p)
            )) )
   (on (<- purse1 'withdraw 10)
       (lambda (pmt) (<- (get a 'moneySrcP) 'deposit pmt)))
   )
 )
