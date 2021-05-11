export default class {
  constructor() {
    // Create variable for setTimeout
    this.delay = null;
    
    // Set number of milliseconds for longpress
    this.longpress = 1300;
    
    this.eventTaker = document.querySelector('.webgl');
    // this.listItems = document.getElementsByClassName('list-item');
    // this.listItem;
    console.log('setting up timer')

    this.setupTimer()
  }

  setupTimer() {
    var _this = this;
    // _this.eventTaker.addEventListener('mousedown', function (e) {  
    document.addEventListener('mousedown', function (e) {
      console.log('clicking document')
      _this.delay = setTimeout(check, _this.longpress);
      
      function check() {
        // _this.classList.add('is-selected');
        console.log('is pass the threshold')
      }    
    }, true);
    
    document.addEventListener('mouseup', function (e) {
      // On mouse up, we know it is no longer a longpress
      clearTimeout(_this.delay);
    });
    
  }

}