function KeyboardInputManagerP2() {
  this.events = {};
  if (window.navigator.msPointerEnabled) {
    this.eventTouchstart = "MSPointerDown";
    this.eventTouchmove  = "MSPointerMove";
    this.eventTouchend   = "MSPointerUp";
  } else {
    this.eventTouchstart = "touchstart";
    this.eventTouchmove  = "touchmove";
    this.eventTouchend   = "touchend";
  }
  this.listen();
}
KeyboardInputManagerP2.prototype.on = function (event, callback) {
  if (!this.events[event]) { this.events[event] = []; }
  this.events[event].push(callback);
};
KeyboardInputManagerP2.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) { callbacks.forEach(function (callback) { callback(data); }); }
};
KeyboardInputManagerP2.prototype.listen = function () {
  var self = this;
  var map = { 38: 0, 39: 1, 40: 2, 37: 3 }; // up, right, down, left
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    var mapped = map[event.which];
    if (!modifiers && mapped !== undefined) {
      event.preventDefault();
      self.emit("move", mapped);
    }
  });
  this.bindButtonPress("#retry-p2", this.restart);
  this.bindButtonPress("#restart-p2", this.restart);
  this.bindButtonPress("#keep-playing-p2", this.keepPlaying);
};
KeyboardInputManagerP2.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};
KeyboardInputManagerP2.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
KeyboardInputManagerP2.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  if (button) {
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  }
};
