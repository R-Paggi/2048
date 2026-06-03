window.requestAnimationFrame(function () {
  new GameManager1(4, KeyboardInputManagerP1, HTMLActuatorP1, LocalStorageManagerP1);
  new GameManager2(4, KeyboardInputManagerP2, HTMLActuatorP2, LocalStorageManagerP2);
});
