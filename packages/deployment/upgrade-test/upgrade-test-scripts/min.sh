alias ls='ls -FCG'
alias ll='ls -loG'
alias lt='ll -tro'
#alias ltt="lt \!* | tail"
function ltt() { ls -ltr $* | tail ; }
#alias lls="ll \!* | sort -n --key=6"
function lls() { ll $* | sort -n --key=4 ; }

function psg() { ps -ex | grep "$@"; }
#alias psg='ps -ex | grep \!*'
alias push=pushd 
alias pusdh=pushd
alias pu=pushd
alias d=dirs
alias pop=popd
alias po=popd
alias h='history 15'
#alias hist='history | grep \!*'
function hist() { if [ $# == 1 ] ; then history | grep $1 ; else  history 30; fi; }
alias grep='grep --color=auto'

alias j='jobs -l'

function replace() {
  mv upgrade-test-scripts{,-cya}
  ln -s /workspace/upgrade-test-scripts
}

alias start='agd start > chain.log 2>&1 &'

#   type is bash's version of whatis

export IGNOREEOF=5

export PS1='DOCKER  \[\033[1;42m\]\W\[\033[0;32m\]  \[\033[0m\] \! > '



# using xargs
# (find . -name test | grep -v node_ - | xargs -I foo find foo -name \*.js | grep -v bundle- | xargs -I foo  grep -n  finally foo /dev/null )


alias rehash='hash -r'


