
function sub() {
  
  return 4;
}

function delve_forever_into_the_recursive_depths() {
  return delve_forever_into_the_recursive_depths();
}

export default function stuff(log, explode = 'no') {
  for (let i = 0; i < 10; i++) {
    sub();
  }
  log.push('ok'); // computation got started
  try {
    if (explode === 'compute') {
      while(true) {};
    } else if (explode === 'stack') {
      delve_forever_into_the_recursive_depths();
    } else if (explode === 'allocate') {
      let universe = Array(4e9); // more like 1e24, really
    }
    throw Error('I will be caught');
  } catch(e) {
    // we catch normal Errors, but not meter exhaustion
  }
  return 5;
}
