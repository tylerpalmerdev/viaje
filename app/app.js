// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

// config angular app with routes, using $stateProvider
trvlApp.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('login', {
    url: '/login',
    templateUrl: 'app/routes/login/loginTmpl.html',
    controller: 'loginCtrl'
    // resolve: make sure user isn't logged in w/ auth svc
  })
  .state('dash', {
    url: '/dash',
    templateUrl: 'app/routes/dash/dashTmpl.html',
    controller: 'dashCtrl'
    // resolve: make sure user is logged in w/ auth svc (same as below)
  })
  .state('trip', {
    url: 'trip/:tripId',
    templateUrl: 'app/routes/trip/tripTmpl.html',
    controller: 'tripCtrl'
  })
  .state('stop', {
    parent: 'trip',
    url: '/stop/:stopId',
    templateUrl: 'app/routes/stop/stopTmpl.html',
    controller: 'stopCtrl'
  });

  // if err, route to dash, which will route to login with no auth
  $urlRouterProvider
  .otherwise('/dash');
});
