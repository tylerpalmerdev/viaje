// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

// auth check function to use with restricted views
var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};
authCheck.$inject = ["authSvc", "$firebaseAuth"];

// event listener to console.log route changes
trvlApp.run(["$rootScope", function($rootScope) {
  $rootScope.$on('$stateChangeStart',
    function(e, toState, toParams, fromState, fromParams) {
      console.log('State Changed from ', fromState.name, ' to ', toState.name);
    }
  );
}]);

// config angular app with routes, using $stateProvider
trvlApp.config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('login', {
    url: '/login',
    templateUrl: 'app/routes/login/loginTmpl.html',
    controller: 'loginCtrl',
    resolve: {
      isLoggedOut: ["authSvc", function(authSvc) {
        return authSvc.isLoggedOut();
      }]
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
}]);

trvlApp.service('authSvc', ["$firebaseObject", "$firebaseArray", "$firebaseAuth", "$state", "$q", "constants", "userSvc", function($firebaseObject, $firebaseArray, $firebaseAuth, $state, $q, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // help's determine what form is shown in login view
  this.newUser = false;

  // event listener to keep track of auth state:
  // authObj.$onAuth(function(authData) {
  //   console.log('Auth status changed (see authObj.$onAuth in authSvc)', authData);
  // });

  // register new user [REFACTOR TO REGISTER & SIGN IN AT SAME TIME AND ROUTE TO DASH]
  this.register = function(newUserObj) {
    var def = $q.defer(); // create defer obj
    authObj.$createUser(newUserObj) // create new user in fb auth
    .then( // once promise is finished:
      function(response) {
        console.log('New user registered with response: ', response, '. Now adding data to internal fb database.');
        return userSvc.addDataForNewUser(response.uid, newUserObj); // add user data to own data, return promise to next chain
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
    return authObj.$authWithPassword(userObj);
  };

  // get current auth status of user, e.g. to see if they can go to route
  this.getCurrentAuth = function() {
    return $firebaseAuth(baseRef);
  };

  // new get current auth status of user, returns promise that rejects if user logged out [REFACTOR INTO ONE FUNCTION FOR ALL ROUTES]
  this.isLoggedOut = function() {
    var auth = $firebaseAuth(baseRef); // get auth obj
    var def = $q.defer(); // create deferrer
    auth.$requireAuth() // check auth (returns promise)
    .then(
      function(response) { // if promise resolves, user is logged in, reject promise
        console.log('user loggged in, not allowed to login page.');
        def.reject();
      },
      function(err) { // if promise rejects, user is not logged in, resolve promise because they are allowed to login
        console.log('user not logged in, OK to go to login page.');
        def.resolve();
      }
    );
    return def.promise; // return deferrer promise
  };

  // sign out user
  this.signOut = function() {
    $firebaseAuth(baseRef).$unauth();
    $state.go('login');
    console.log('user logged out!');
  };
}]);

trvlApp.constant('constants', {
  fbBaseUrl: 'https://viaje.firebaseio.com/',
  gMapsApiKey: 'AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE',
  rejectLog: function(err) {
    console.log('Promise rejected, error message: ', err);
  }
});

trvlApp.service('opsSvc', ["constants", "$q", "userSvc", "tripSvc", "stopSvc", function(constants, $q, userSvc, tripSvc, stopSvc) {
  /*
  uses other services to pull data about the current user
  doesn't CHANGE any data, only retrieves, then inserts into each view's controller so userData can be accessed in each $scope
  one big promise chain because of all the async operations
  doesn't pull any data from firebase directly, uses other services
  */

  this.getCurrUserData = function(uid) {
    var def = $q.defer();
    var userData = {}; // passed to promise resolve with all data needed for scope
    userSvc.getUserRefObj(uid) // get fb ref obj for user from userSvc
    .then(
      function(response) {
        userData.name = response.name;
        userData.uid = response.$id;
        userData.onTrip = response.onTrip; // only one that will change, WATCH!
        userData.homeCity = response.homeCity;
        userData.userStats = response.userStats;
        userData.email = response.email;
        def.resolve(userData);
      },
      constants.rejectLog
    );
    return def.promise; // return promise of getting all data for uid
  };

  // add trip for user, based on new start trip.
  // long promise chain, with each step dependent on something that the previous generates, mainly IDs from new records
  this.startTripForUser = function(uid, tripObj, firstStopObj) {

    var def = $q.defer(); // create deferrer
    tripObj.isActive = true; // set trip as active
    tripSvc.addTrip(uid, tripObj) // add trip, returns promise
    .then(
      function(response) {
        var tripId = response.key(); // grab id key of newly added trip
        console.log("Trip obj added to /trips/ with id of ", tripId);
        return stopSvc.addStop(tripId, firstStopObj); // add stop to stops/:tripId arr, returns promise
      },
      constants.rejectLog
    )
    .then(
      function(response) { // when resolved
        var stopId = response.key();
        console.log("Stop obj added to /stops/ with id of ", stopId);
        return userSvc.isUserOnTrip(uid, true); // set userObj.onTrip = true;
      },
      constants.rejectLog
    )
    .then(
      function(response) {
        console.log("user's onTrip property set to true, response: ", response);
        def.resolve(response); // resolve promise,
      },
      constants.rejectLog
    );

    return def.promise; // return deferrer promise
  };

  this.getTripsForUser = function(uid) {
    return tripSvc.getTripsForUser(uid);
  };

  // gets all data about trips for user, including which (if any) is current, which stop is current (if not, currLoc = home)
  this.getCurrentTripData = function(uid) {
    var def = $q.def();

    return def.promise;
  };

  this.endTripForUser = function(uid) {
    var def = $q.defer();

    // userSvc.isUserOnTrip(uid, false);
    // set departure date on last stop
    // set end date on trip

    return def.promise;
  }

}]);

trvlApp.service('stopSvc', ["constants", "$firebaseArray", "$firebaseObject", function(constants, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef); // get all stops for trip
  };

  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    var stopsForTrip = this.getStopsForTrip(tripId);
    // stopObj.stopName = stopObj.data.placeString;
    stopObj.arrivalTimestamp = new Date().toString(); // or different data if in past
    return stopsForTrip.$add(stopObj); // stop to trip and return promise
    // change current stop to newly added stop
  };

  this.getLatestStopOfTrip = function(tripId) {
    var tripStops = getStopsForTrip(tripId);
    return tripStops[tripStops.length - 1]; // return last elem in array
  };

  this.deleteStop = function(tripId, stopId) {
    // delete stop from DB
  };

}]);

trvlApp.service('tripSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {

  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */

  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/'); // base ref

  // get all trips for user, based on uid
  this.getTripsForUser = function(uid) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    return $firebaseArray(userTripsRef); // get all trips arr
  };

  this.addTrip = function(userId, tripObj) {
    tripObj.startTimestamp = new Date().toString();
    var tripsForUser = this.getTripsForUser(userId);
    return tripsForUser.$add(tripObj); // adds trip obj, returns promise
  };

  // get most recent trip of user
  this.getLatestTripOfUser = function(uid) {
    var userTrips = getTripsForUser(uid);
    return userTrips[userTrips.length - 1]; // return last item in array
  };
}]);

trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {
  /*
  RESPONSIBILITY: adding, getting, and deleting data from /users/ in fb
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */

  // base reference for users data in firebase
  var baseRef = new Firebase(constants.fbBaseUrl + '/users/');

  // add new user data to /users/ after the user has 'signed up' via authSvc
  this.addDataForNewUser = function(uid, newUserObj) {
    var refObj = $firebaseObject(baseRef.child(uid)); // get ref obj for user from fb
    refObj.email = newUserObj.email;
    refObj.name = newUserObj.name;
    refObj.homeCity = newUserObj.homeCity; // obj of data about city
    refObj.onTrip = false; // default: user starts out as not on trip.
    refObj.userStats = {
      trips: 0,
      countries: 0,
      cities: 0,
      entries: 0,
      distance: 0
    };
    return refObj.$save(); // return promise of saving data to fb obj
  };

  // get user data from fb /users/:uid
  this.getUserRefObj = function(uid) {
    var userObj = $firebaseObject(baseRef.child(uid));
    return userObj.$loaded(); // return promise of getting user data obj when loaded
  };

  // set val of userObj.onTrip (true or false)
  this.isUserOnTrip = function(uid, bool) {
    this.getUserRefObj(uid) // request user ref object
    .then(
      function(response) { // when loaded
        response.onTrip = bool; //onTrip property to true
        return response.$save(); // save obj
      }
    );
  };
}]);

trvlApp.controller('citySearchCtrl', ["$scope", "constants", function($scope, constants) {
  $scope.test = 'Two way directive pass';


  // set bounds of search to the whole world
  var bounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(-90, -180),
    new google.maps.LatLng(90, 180)
  );

  // get place search input element (only one on page at a time, because ID)
  var input = document.getElementById('place-search-input');

  // create options object
  var options = {
    bounds: bounds,
    types: ['(cities)']
  };

  // new autocomplete object that will actually initialize autocomplete
  var autocomplete = new google.maps.places.Autocomplete(input, options);

  // function to log place data
  var getPlaceDetails = function() {
    // raw place data from autocomplete, returned after city selected
    var rawPlaceData = autocomplete.getPlace();

    $scope.cityData = {}; // create city data object

    // add to cityData object from raw place data
    $scope.cityData.geo = getAddressComponents(rawPlaceData.address_components);
    $scope.cityData.placeString = rawPlaceData.formatted_address;
    $scope.cityData.placeId = rawPlaceData.place_id;
    $scope.cityData.geo.lat = rawPlaceData.geometry.location.lat();
    $scope.cityData.geo.lng = rawPlaceData.geometry.location.lng();
    $scope.cityData.iconUrl = rawPlaceData.icon;
    $scope.cityData.mapUrl = rawPlaceData.url;
    $scope.$apply(); // update scope
    console.log('Place data pulled from google API');
  };

  // function to get correct address components from address array
  var getAddressComponents = function(addCompArr) {
    var finalComps = {};
    var len = addCompArr.length;
    // for all address components in array
    finalComps.city = addCompArr[0].long_name; // always first
    finalComps.region = addCompArr[len - 2].long_name; // always second to last
    finalComps.country = addCompArr[len - 1].long_name; // always last

    return finalComps;
  };

  // when new place is selected, log results obj of place
  autocomplete.addListener('place_changed', getPlaceDetails);

}]);

trvlApp.directive('citySearch', function() {
  return {
    templateUrl: 'app/directives/citySearch/citySearchTmpl.html',
    restrict: 'E',
    scope: {
      cityChosen: '=',
      cityData: '='
    },
    controller: 'citySearchCtrl'
  };
});

trvlApp.controller('dashCtrl', ["$scope", "$state", "currAuth", "userSvc", function($scope, $state, currAuth, userSvc) {

  // get data for current user on dash
  userSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
      console.log("Final user obj sent to CTRL: ", response);
    }
  );

  // when auth changes, go to login page
  // currAuth.$onAuth(function(authData) {
  //   $state.go('login');
  // });

}]);

trvlApp.controller('loginCtrl', ["$scope", "$state", "authSvc", "constants", function($scope, $state, authSvc, constants) {
  $scope.test = 'Ctrl connected!';
  $scope.newuser = false; // default view: login, not new user reg

  $scope.toggleForm = function() {
    $scope.newuser = !$scope.newuser;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj)
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

trvlApp.controller('menuBarCtrl', ["$scope", "authSvc", function($scope, authSvc) {

  $scope.logout = function() {
    authSvc.signOut();
  };


}]);

trvlApp.directive('menuBar', function() {
  return {
    templateUrl: 'app/directives/menuBar/menuBarTmpl.html',
    restrict: 'E',
    scope: {
      userData: '='
    },
    controller: 'menuBarCtrl'
  };
});

trvlApp.controller('mytripsCtrl', ["$scope", "currAuth", "opsSvc", function($scope, currAuth, opsSvc) {
  $scope.test = 'Mytrips ctrl connected!';

  // gets user data to be available to $scope of mytrips route/view
  opsSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

  // opsSvc.getCurrTripData(currAuth.uid)
  // .then(
  //   function(response) {
  //     $scope.tripData = response;
  //   }
  // );

  $scope.allUserTrips = opsSvc.getTripsForUser(currAuth.uid);

  $scope.startTrip = function(newTripObj, firstStopObj) {
    opsSvc.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };

}]);

trvlApp.controller('stopCtrl', ["$scope", function($scope) {
  $scope.test = 'stopCtrl connected';
}]);

trvlApp.controller('tripCtrl', ["$scope", function($scope) {

}]);

trvlApp.controller('writeCtrl', ["$scope", function($scope) {
  $scope.test = 'Writectrl connected';
}]);

trvlApp.service('writeSvc', ["$firebaseArray", "$firebaseObj", "constants", function($firebaseArray, $firebaseObj, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/entries/');

  this.getEntriesForStop = function(stopId) {
    var stopEntriesRef = rootRef.child(stopId);
    var stopEntries = $firebaseArray(userTripsRef);
    return stopEntries;
  };

  this.addEntryForStop = function(stopId, entryObj) {
    var stopEntries = this.getEntriesForStop(stopId); // use method above to get entries
    return stopEntries.$add(entryObj); // add entry and return promise
  };

  this.deleteEntry = function(stopId, entryId) {
    // var stopEntriesRef = rootRef.child(stopId);
    // var entriesObj = $firebaseObject(stopEntriesRef);
    // return entriesObj.$remove(entryId); //return promise to do something after entry is removed
  };
}]);
