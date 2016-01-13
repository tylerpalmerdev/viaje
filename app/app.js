// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase', 'ui.bootstrap', 'ngAnimate']);

// auth check function to use with restricted views
var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};

// config angular app with routes, using $stateProvider
trvlApp.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('login', {
    url: '/login',
    templateUrl: 'app/routes/login/loginTmpl.html',
    controller: 'loginCtrl',
    resolve: {
      isLoggedOut: function(authSvc) {
        return authSvc.isLoggedOut();
      }
    }
  })
  .state('mytrips', {
    url: '/mytrips',
    templateUrl: 'app/routes/mytrips/mytripsTmpl.html',
    controller: 'mytripsCtrl',
    resolve: {
      currAuth: authCheck
    }
  })
  .state('trip', {
    url: '/trip/:tripId',
    templateUrl: 'app/routes/trip/tripTmpl.html',
    controller: 'tripCtrl',
    resolve: {
      currAuth: authCheck
    }
  });

  // if err, route to dash, which will route to login with no auth
  $urlRouterProvider
  .otherwise('/login');
});
