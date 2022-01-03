/* global powerbox */

class Powerbox {
  constructor() {
    this.loaded = false;
    window.addEventListener('load', () => {
      if (typeof powerbox === 'undefined') {
        console.warn('Powerbox extension not found.');
      }
      this.loaded = true;
      this.expandPetdata();
    });
  }

  expandPetdata() {
    if (!this.loaded || typeof powerbox === 'undefined') return;
    powerbox.expandPetdata();
  }
}

export default new Powerbox();
