// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase', 'ui.bootstrap', 'ngAnimate']);

// auth check function to use with restricted views
var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};
authCheck.$inject = ["authSvc", "$firebaseAuth"];

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
}]);

trvlApp.service('authSvc', ["$firebaseObject", "$firebaseArray", "$firebaseAuth", "$state", "$q", "constants", "userSvc", function($firebaseObject, $firebaseArray, $firebaseAuth, $state, $q, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // register new user [REFACTOR TO REGISTER & SIGN IN AT SAME TIME AND ROUTE TO MYTRIPS]
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

  // new get current auth status of user, returns promise that rejects if user logged out [REFACTOR WITH CURR AUTH FCN INTO ONE CHECK AUTH FUNCTION FOR ALL ROUTES THAT RESOLVES IF LOGGED IN REJECTS IF LOGGED OUT]
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

  /* SECTION 1 - $SCOPE DATA OPS */

  // userData: pull current user data from userSvc, as it is in DB (mytrips & trip)
  this.getUserData = function(uid, scopeObj) {
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        scopeObj.userData = response;
      }
    );
  };
  // currData: get active (trip.isActive = true) OR last trip ID for user and last stop Id for trip. Last based on end date.

  this.getCurrData = function(uid, scopeObj) {

    var currData = {}; // last tripId, last stopId, tripIsActive =  t/f
    tripSvc.getTripsForUser(uid) //"-K7qmc3o65fsEgmAkzHw"
    .then(
      function(response) {
        var userTrips = response; // fb array
        var latestEnd = 0; // set as 0 to compare
        for (var i = 0; i < userTrips.length; i++) {
          var trip = userTrips[i];
          var endTimestamp = trip.endTimestamp; // convert to number to compare
          if (trip.isActive === true) { // if active trip is found, set data and return:
            currData.tripIsActive = true;
            currData.lastTripId = trip.$id;
            break; // break out of for loop if active trip found
          }
          else { // if active trip not found:
            currData.tripIsActive = false;
            // console.log(endTimestamp);
            if (!endTimestamp) {
              // console.log("trip has undefined end date and is not set to 'isActive'");
            } else if (endTimestamp > latestEnd) {
              latestEnd = endTimestamp;
              currData.lastTripName = trip.name;
              currData.lastTripId = trip.$id; // set latest trip equal to trip id
            }
          }
        }
        return stopSvc.getStopsForTrip(currData.lastTripId);
      },
      constants.rejectLog // log for promise reject
    )
    .then(
      function(response) {
        var tripStops = response; // arr
        var latest = 0; // for comparison
        for (var k = 0; k < tripStops.length; k++) {
          var stop = tripStops[k];
          var departStamp = stop.departTimestamp;
          var arriveStamp = stop.arriveTimestamp;
          if (!departStamp && !arriveStamp) {
            console.log("a stop on the user's latest trip has no start or end date.");
          } else if (!departStamp && arriveStamp > latest) { // if no depart but arrived later
            // console.log(arriveStamp);
            latest = arriveStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopData = stop.stopData;
            currData.lastStopId = stop.$id;
          } else if (departStamp && departStamp > latest) { // if depart stamp is present && later
            // console.log(departStamp);
            latest = departStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopId = stop.$id;
          }
        }
        scopeObj.currData = currData; // once all done, final step, set scopeObj.currData to result
      },
      constants.rejectLog // log for promise reject
    );
  };

  // REFACTOR TO BE PART OF FUNCTION FACTORY W/ AUTH & PROMISE FUNCTIONS
  this.getMapUrl = function(lat, lon) {
    var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon + "&zoom=11&size=145x145&maptype=roadmap&key=AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE";
    return mapUrl;
  };

  /* SECTION 2 - MYTRIPS VIEW OPS */

  // userTrips: pull all trips for a user (mytrips)
  this.getAllTripsForUser = function(uid) {
    return tripSvc.getTripsForUser(uid);
  };

  // add trip for user, based on new start trip.
  // long promise chain, with each step dependent on something that the previous generates, mainly IDs from new records
  this.startTripForUser = function(uid, tripObj, firstStopObj) {

    var def = $q.defer(); // create deferrer
    tripObj.isActive = true; // set trip as active
    tripSvc.addNewTrip(uid, tripObj) // add trip, returns promise
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
        return userSvc.changeUserOnTrip(uid, true); // set userObj.onTrip = true;
      },
      constants.rejectLog
    )
    .then(
      function(response) {
        console.log(response);
        def.resolve(response); // resolve promise,
      },
      constants.rejectLog
    );

    return def.promise; // return deferrer promise
  };

  this.addCompletedTripForUser = function(uid, tripObj) {
    tripObj.isActive = false;
    tripSvc.addNewTrip(uid, tripObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };



  /* SECTION 3 - TRIP DETAIL VIEW OPS */

  // allStops: pull all stops for a trip (trip)
  this.getTripStopsData = function(tripId) {
    return stopSvc.getStopsForTrip(tripId);
  };

  //
  this.getTripData = function(uid, tripId) {
    return tripSvc.getTripObj(uid, tripId);
  };

  // will do everything to end a trip, should only be used if trip.isActive = true
  this.endTripForUser = function(uid, tripId) {
    var def = $q.defer();
    var currTimestamp = Date.parse(new Date().toString()); // for setting end timestamps
    userSvc.changeUserOnTrip(uid, false) // set userObj.onTrip = false;
    .then(
      function(response) {
        console.log("changed user.onTrip to false");
        return tripSvc.isTripActive(uid, tripId, false); // set trip.isActive to false
      }
    )
    .then(
      function(response) {
        console.log("set trip to inactive.");
        return tripSvc.setTripEndDate(uid, tripId, currTimestamp); // set trip end date to right now
      }
    )
    .then(
      function(response) {
        console.log("set trip end date to ", currTimestamp);
        def.resolve(response); // resolve promise with response from setting trip end date
      }
    );
    return def.promise;
  };

  this.addStopToTrip = function(tripId, stopObj) {
    // if they exist, parse dates into numerical timestamp to store in fb and parse in angular
    if (stopObj.arriveTimestamp) {
      stopObj.arriveTimestamp = Date.parse(stopObj.arriveTimestamp);
    } else if (!stopObj.arriveTimestamp) { // if no arrive stamp, set to now
      stopObj.arriveTimestamp = Date.parse(new Date().toString());
    }

    if (stopObj.departTimestamp) { // parse depart date of object if it exists
      stopObj.departTimestamp = Date.parse(stopObj.departTimestamp);
    }

    console.log(tripId, stopObj);
    // return stopSvc.addStop(stopObj); // return promise to ctrl
  };


}]);

trvlApp.service('stopSvc', ["constants", "$firebaseArray", "$firebaseObject", function(constants, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef).$loaded(); // return promise of gettting all trips
  };

  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    this.getStopsForTrip(tripId) // load stops for trip
    .then(
      function(response) { // if successful, response is stops arr
        return response.$add(stopObj); // add stop to trip and return promise
      },
      constants.rejectLog
    );
  };

  this.getLatestStopOfTrip = function(tripId) {
    var tripStops = getStopsForTrip(tripId);
    return tripStops.$keyAt(-1); // return last elem in array
  };

  this.getStop = function(tripId, stopId) {
    var stopObj = $firebaseObject(rootRef.child(tripId + "/" + stopId));
    return stopObj.$loaded(); // return promise of getting stop object
  };

  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    getStop(tripId, stopId)
    .then(
      function(response) {
        var stopObj = response;
        stopObj.departTimestamp = date;
        return stopObj.$save(); // return promise of saving object with new depart date
      }
    );
  };

  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
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
    return $firebaseArray(userTripsRef).$loaded(); // return promise of getting all trips
  };

  this.addNewTrip = function(userId, tripObj) {
    // if new/active trip, add timestamp for start, end is undefined
    if(tripObj.isActive) {
      tripObj.startTimestamp = new Date().toString(); // save in DB in ms time string, for angular and firebase
    }
    // if endTimestamp is present, change to ms
    if(tripObj.endTimestamp) {
      tripObj.endTimestamp = Date.parse(tripObj.endTimestamp.toString());
    }
    // no matter what, format start time stamp to ms
    tripObj.startTimestamp = Date.parse(tripObj.startTimestamp.toString());
    var trips = $firebaseArray(rootRef.child(userId));
    return trips.$add(tripObj); // return promise
  };

  this.getTripObj = function(userId, tripId) {
    return $firebaseObject(rootRef.child(userId + '/' + tripId));
  };

  this.isTripActive = function(userId, tripId, bool) {
    var tripObj = this.getTripObj(userId, tripId);
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.isActive = bool;
        return tripObj.$save(); // returns promise of setting tripObj.isActive as bool
      }
    );
  };

  this.setTripEndDate = function(userId, tripId, endDate) { // end date in ms
    var tripObj = this.getTripObj(userId, tripId);
    tripObj.$loaded()
    .then(
      function(response) {
        tripObj.endDate = endDate;
        return tripObj.$save(); // return promise of setting tripObj.endDate to endDate provided
      }
    );
  };

}]);

trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "$q", "constants", function($firebaseArray, $firebaseObject, $q, constants) {
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
  this.changeUserOnTrip = function(uid, bool) {
    // get user obj w/ ref from uid
    var def = $q.defer();
    var userObj = $firebaseObject(baseRef.child(uid));
    userObj.$loaded() // wait until object has loaded
    .then(
      function(response) { // when loaded
        // console.log(response);
        // var loadedUserObj = response;
        userObj.onTrip = bool; //onTrip property to T/F XX
        userObj.$save();
        def.resolve('user obj.onTrip updated to ' + bool); // save obj, return promise
      },
      constants.rejectLog
    );
    return def.promise;
  };

//BOTTOM
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
      userData: '=',
      tripData: '='
    },
    controller: 'menuBarCtrl'
  };
});

trvlApp.controller('loginCtrl', ["$scope", "$state", "authSvc", "constants", function($scope, $state, authSvc, constants) {

  $scope.newuser = false; // default view: login, not new user reg

  $scope.toggleForm = function() { 
    $scope.newuser = !$scope.newuser;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj)
    .then(
      function(response) {
        console.log('User logged in. redirecting to dash.');
        $state.go('mytrips');
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

}]);

trvlApp.controller('mytripsCtrl', ["$scope", "currAuth", "opsSvc", "constants", function($scope, currAuth, opsSvc, constants) {
  // -- GET DATA FOR MY TRIPS $SCOPE -- //
  // $scope.userData
  opsSvc.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  opsSvc.getCurrData(currAuth.uid, $scope);

  // $scope.userTrips
  opsSvc.getAllTripsForUser(currAuth.uid)
  .then(
    function(response) {
      $scope.userTrips = response;
    }
  );

  // -- UI VARIABLES & FUNCTIONS -- //
  $scope.getMapUrl = function(lat, lon) {
    return opsSvc.getMapUrl(lat, lon);
  };

  // -- MY TRIPS $SCOPE FUNCTIONS -- //

  // start a new trip (start date of today, first stop chosen in view)
  $scope.startTrip = function(newTripObj, firstStopObj) {
    opsSvc.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then( // after trip is started:
      function(response) {
        opsSvc.getUserData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  $scope.addPastTrip = function(oldTripObj) {
    opsSvc.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope //
  console.log($scope);

}]);

trvlApp.controller('tripCtrl', ["$scope", "$stateParams", "currAuth", "opsSvc", function($scope, $stateParams, currAuth, opsSvc) {
  // -- GET DATA FOR TRIP DETAIL $SCOPE -- //
  // $scope.userData
  opsSvc.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  opsSvc.getCurrData(currAuth.uid, $scope);

  // $scope.allStops (from curr url tripId)
  $scope.currTripId = $stateParams.tripId;
  opsSvc.getTripStopsData($stateParams.tripId)
  .then(
    function(response) {
      $scope.allStops = response;
    }
  );

  // [REFACTOR TO ASYNC]
  $scope.tripData = opsSvc.getTripData(currAuth.uid, $stateParams.tripId);

  // UI functions
  $scope.showForm = false; // hide new stop form by default
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };

  // placeholder, want to pull from ops svc
  $scope.currTripStats = {
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };

  // THE MAP IMG + THIS SHOULD BE A CUSTOM DIRECTIVE
  $scope.getMapUrl = function(lat, lon) {
    return opsSvc.getMapUrl(lat, lon);
  };

  // FUNCTIONS

  $scope.addStopToTrip = function(tripId, stopObj) {
    opsSvc.addStopToTrip(tripId, stopObj);
    // clear dates after clicking due to angular ng-model/ date input error
    stopObj.departTimestamp = undefined;
    stopObj.arriveTimestamp = undefined;
  };

  // will only be used if current trip is active
  $scope.endTrip = function(tripId) {
    opsSvc.endTripForUser(currAuth.uid) //, $scope.tripData.latestTrip.$id)
    .then(
      function(response) {
        console.log('trip id: ', tripId, 'ended.');
        opsSvc.getUserData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  console.log($scope);

}]);
