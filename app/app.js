// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

// auth check function to use with restricted views
var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};

// event listener to console.log route changes
trvlApp.run(function($rootScope) {
  $rootScope.$on('$stateChangeStart',
    function(e, toState, toParams, fromState, fromParams) {
      console.log('State Changed from ', fromState.name, ' to ', toState.name);
    }
  );
});

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
  });

  // if err, route to dash, which will route to login with no auth
  $urlRouterProvider
  .otherwise('/login');
});
