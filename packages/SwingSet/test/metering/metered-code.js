
function sub() {
  return 4;
}

export default function stuff(explode) {
  for (let i = 0; i < 10; i++) {
    sub();
  }
  try {
    if (explode) {
      while(true) {};
    }
    throw Error('I will be caught');
  } catch(e) {
    // we catch normal Errors, but not meter exhaustion
  }
  console.log(`stuff done`);
  return 5;
}
