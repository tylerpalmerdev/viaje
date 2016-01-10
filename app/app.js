// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};

// reverse promise! reject when user is logged in so they cant go to login page
var isLoggedOut = function(authSvc, $firebaseAuth, $q) {
  var def = $q.defer();
  authSvc.getCurrentAuth().$requireAuth()
  .then(
    function(response) { // if user is logged in

      def.reject('User is logged in, routing back to dash.');
    },
    function(err) {
      def.resolve(err);
    }
  );
  return def.promise;
};

// config angular app with routes, using $stateProvider
trvlApp.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('login', {
    url: '/login',
    templateUrl: 'app/routes/login/loginTmpl.html',
    controller: 'loginCtrl'
  })
  .state('dash', {
    url: '/dash',
    templateUrl: 'app/routes/dash/dashTmpl.html',
    controller: 'dashCtrl',
    resolve: {
      currAuth: authCheck
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
  })
  .state('stop', {
    url: '/stop/:stopId',
    templateUrl: 'app/routes/stop/stopTmpl.html',
    controller: 'stopCtrl',
    resolve: {
      currAuth: authCheck
    }
  })
  .state('write', {
    url: '/write',
    templateUrl: 'app/routes/write/writeTmpl.html',
    controller: 'writeCtrl',
    resolve: {
      currAuth: authCheck
    }
  });

  // if err, route to dash, which will route to login with no auth
  $urlRouterProvider
  .otherwise('/login');
});
