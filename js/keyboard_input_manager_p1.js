function KeyboardInputManagerP1() {
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
KeyboardInputManagerP1.prototype.on = function (event, callback) {
  if (!this.events[event]) { this.events[event] = []; }
  this.events[event].push(callback);
};
KeyboardInputManagerP1.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) { callbacks.forEach(function (callback) { callback(data); }); }
};
KeyboardInputManagerP1.prototype.listen = function () {
  var self = this;
  var map = { 87: 0, 68: 1, 83: 2, 65: 3 }; // W, D, S, A
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    var mapped = map[event.which];
    if (!modifiers && mapped !== undefined) {
      event.preventDefault();
      self.emit("move", mapped);
    }
  });
  this.bindButtonPress("#retry-p1", this.restart);
  this.bindButtonPress("#restart-p1", this.restart);
  this.bindButtonPress("#keep-playing-p1", this.keepPlaying);
};
KeyboardInputManagerP1.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};
KeyboardInputManagerP1.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
KeyboardInputManagerP1.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  if (button) {
    button.addEventListener("click", fn.bind(this));
    button.addEventListener(this.eventTouchend, fn.bind(this));
  }
};
