// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

// config angular app with routes, using $stateProvider
trvlApp.config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {
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
}]);

trvlApp.service('authSvc', ["$firebaseObject", "$firebaseArray", "$firebaseAuth", "$state", "constants", "userSvc", function($firebaseObject, $firebaseArray, $firebaseAuth, $state, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // private function within service to add new user data to fb data
  var addNewUserData = function(uid, newUserEmail, newUserName) {
    var refObj = getUserRefObj(uid); //
    refObj.email = newUserEmail;
    refObj.name = newUserName;
    refObj.$save()
    .then(
      function(response) {
        console.log('user ', newUserName, ' added to fb data!');
      }
    );
  };

  // private function to get fb ref for specific user, given their uid
  var getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };

  // register new user
  this.register = function(newUserObj) {
    authObj.$createUser(newUserObj) // create new user in fb auth
    .then(
      function(response) {
        console.log('New user registered with response: ', response);
        userSvc.addNewUserData(response.uid, newUserObj.email, newUserObj.name); // add user data to own data
        // login using function above, which redirects to dash for new user
      },
      function(err) {
        console.log("Error with adding new user: ", err);
      }
    );
  };

  // login exisiting user
  this.login = function(userObj) {
    authObj.$authWithPassword(userObj)
    .then(
      function(response) {
        console.log('User logged in. redirecting to dash.');
        $state.go('dash');
      },
      function(err) {
        console.log('Login failed: ', err);
      }
    );
  };

  // get current auth status of user, e.g. to see if they can go to route
  this.getCurrentAuth = function() {
    return $firebaseAuth(ref);
  };

  // sign out user
  this.signOut = function() {
    $firebaseAuth(baseRef).$unauth();
  };
}]);

trvlApp.constant('constants', {
  fbBaseUrl: 'https://viaje.firebaseio.com/'
});




trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserEmail, newUserName) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserEmail; // add user data
    refObj.name = newUserName;
    refObj.$save() // save updated data
    .then(
      function(response) {
        console.log('user ', newUserName, ' added to fb data!');
      }
    );
  };

  this.getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };
}]);

trvlApp.controller('dashCtrl', ["$scope", function($scope) {

}]);

trvlApp.controller('loginCtrl', ["$scope", "$state", "authSvc", function($scope, $state, authSvc) {
  $scope.test = 'Ctrl connected!';
  $scope.signup = false; // default view: login, not new user reg

  $scope.showSignup = function() {
    $scope.signup = true;
  };

  $scope.showLogin = function() {
    $scope.signup = false;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj);
  };

  $scope.signup = function(newUserObj) {
    authSvc.register(newUserObj);
  };
}]);


trvlApp.controller('tripCtrl', ["$scope", function($scope) {

}]);
