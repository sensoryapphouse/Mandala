var wind = null;

chrome.app.runtime.onLaunched.addListener(function () {
  chrome.app.window.create("index.html", {
//    singleton: true,
    resizable: true,
    frame: {
      type: 'chrome',
      color: '#F0F0F0'
    },
    id: "index",
    width: 1280,
    height: 1000
  }, function(newWindow) {
//    newWindow.fullscreen();
    wind = newWindow;
  });
});



