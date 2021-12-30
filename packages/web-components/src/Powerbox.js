/* global powerbox */

class Powerbox {
  constructor() {
    this.loaded = false;
    window.addEventListener('load', () => {
      this.loaded = true;
      this.expandPetdata();
    });
  }

  expandPetdata() {
    if (!this.loaded) return;
    if (typeof powerbox === 'undefined') {
      throw new Error('powerbox not found');
    }
    powerbox.expandPetdata();
  }
}

export default new Powerbox();
