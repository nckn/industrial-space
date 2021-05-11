import { TweenMax, Circ } from 'gsap'

export default class {
  constructor() {
    // Create variable for setTimeout
    this.delay = null;
    
    // Set number of milliseconds for longpress
    this.longpress = 1300;
    
    this.scaler = document.querySelector('.dot');
    this.eventTaker = document.querySelector('.webgl');
    // this.listItems = document.getElementsByClassName('list-item');
    // this.listItem;
    console.log('setting up timer')

    this.setupTimer()
  }

  setupTimer() {
    var _this = this;
    // _this.eventTaker.addEventListener('mousedown', function (e) {  
    document.addEventListener('pointerdown', function (e) {
      console.log('clicking document')
      _this.delay = setTimeout(check, _this.longpress);
      
      function check() {
        // _this.classList.add('is-selected');
        console.log('is pass the threshold')
        // _this.scaler.style.transformOrigin = '50% 50%'
        // _this.scaler.style.transform = `scale(${2})`
        TweenMax.to(_this.scaler, 10, {css: {scale: 5}, ease: Circ.easeIn});
        // TweenMax.to(_this.scaler, 20, {css: {scale: 5}});
      }    
    }, true);
    
    document.addEventListener('pointerup', function (e) {
      // On mouse up, we know it is no longer a longpress
      clearTimeout(_this.delay);
      // Reset time
      TweenMax.set(_this.scaler, {css: {scale: 1}});
    });
    
  }

}