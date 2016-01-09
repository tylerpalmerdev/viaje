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

trvlApp.service('authSvc', ["$firebaseObject", "$firebaseArray", "$firebaseAuth", "$state", "$q", "constants", "userSvc", function($firebaseObject, $firebaseArray, $firebaseAuth, $state, $q, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // help's determine what form is shown in login view
  this.newUser = false;
  // register new user
  this.register = function(newUserObj) {
    var def = $q.defer(); // create defer obj
    authObj.$createUser(newUserObj) // create new user in fb auth
    .then( // once promise is finished:
      function(response) {
        console.log('New user registered with response: ', response, '. Now adding data to internal fb database.');
        return userSvc.addNewUserData(response.uid, newUserObj); // add user data to own data, return promise to next chain
      },
      function(err) {
        console.log("Error with registering new user: ", err);
      }
    )
    .then( // once addUserData promise is finished:
      function(response) {
        console.log('New user data added to fb.');
        def.resolve(response);
      },
      function(err) {
        console.log('Error adding new user data to fb: ', err);
        def.reject(err);
      }
    );
    return def.promise;
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
  fbBaseUrl: 'https://viaje.firebaseio.com/',
  gMapsApiKey: 'AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE',
  country_list: ["United States", "Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Cape Verde","Cayman Islands","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica","Cote D Ivoire","Croatia","Cruise Ship","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyz Republic","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Namibia","Nepal","Netherlands","Netherlands Antilles","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre and Miquelon","Samoa","San Marino","Satellite","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","St Kitts and Nevis","St Lucia","St Vincent","St. Lucia","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Venezuela","Vietnam","Virgin Islands (US)","Yemen","Zambia","Zimbabwe"]
});




trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserObj) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserObj.email; // add user data
    refObj.name = newUserObj.name;
    refObj.country = newUserObj.country;
    return refObj.$save(); // save updated data, return promise
  };

  this.getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };
}]);

trvlApp.directive('menuBar', function() {
  return {
    templateUrl: 'app/directives/menuBar/menuBarTmpl.html',
    restrict: 'E',
    scope: {
      logoText: '='
    }
  };
});

trvlApp.controller('dashCtrl', ["$scope", function($scope) {
  $scope.logo = 'LOGO YEY';
}]);

trvlApp.controller('loginCtrl', ["$scope", "$state", "authSvc", "constants", function($scope, $state, authSvc, constants) {
  $scope.test = 'Ctrl connected!';
  $scope.newuser = false; // default view: login, not new user reg

  $scope.toggleForm = function() {
    $scope.newuser = !$scope.newuser;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj);
  };

  $scope.signup = function(newUserObj) {
    authSvc.register(newUserObj) // run register method
    .then(
      function(response) {
        $scope.newuser = false; // once completed, change to login form
      }
    );
  };

  $scope.countries = constants.country_list;
}]);


trvlApp.controller('tripCtrl', ["$scope", function($scope) {

}]);
