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

trvlApp.service('authSvc', ["$firebaseObject", "$firebaseArray", "$firebaseAuth", "$state", "$q", "constants", "util", "userSvc", function($firebaseObject, $firebaseArray, $firebaseAuth, $state, $q, constants, util, userSvc) {

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
  gMapsApiKey: 'AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE'
});

trvlApp.service('dataOps', ["util", "userSvc", "tripSvc", "stopSvc", function(util, userSvc, tripSvc, stopSvc) {
  /*
  Used to retrieve userData and currData for $scope in each route
  */
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
            currData.lastTripName = trip.name;
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
      util.rejectLog // log for promise reject
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
      util.rejectLog // log for promise reject
    );
  };

}]);

trvlApp.service('mytripsOps', ["util", "$q", "userSvc", "tripSvc", "stopSvc", function(util, $q, userSvc, tripSvc, stopSvc) {
  /*
  Functions for mytrips view
  */
  // userTrips: pull all trips for a user
  this.getAllTripsForUser = function(uid, scopeObj) {
    tripSvc.getTripsForUser(uid)
    .then(
      function(response) {
        scopeObj.userTrips = response;
      },
      util.rejectLog
    );
  };

  // add trip for user, based on new start trip.
  // long promise chain, with each step dependent on something that the previous generates, mainly IDs from new records
  this.startTripForUser = function(uid, tripObj, firstStopObj) {
    if (!util.isDef([tripObj.name, firstStopObj.stopData])) {
      alert("Please enter a name and first stop for your trip.");
    } else {
      var def = $q.defer(); // create deferrer
      var newTripId; // set now to use for final nav to trip pag
      tripObj.isActive = true; // set trip as active
      var now = util.nowStamp();
      tripObj.startTimestamp = now;
      firstStopObj.arriveTimestamp = now;
      tripSvc.addTripForUser(uid, tripObj) // add trip, returns promise
      .then(
        function(response) { // after trip added
          newTripId = response.key(); // grab id key of newly added trip
          console.log("Trip obj added to /trips/ with id of ", newTripId);
          return stopSvc.addStop(newTripId, firstStopObj); // add stop to stops/:tripId arr, returns promise
        },
        util.rejectLog
      )
      .then(
        function(response) { // after stop added
          // var stopId = response.key();
          console.log("First stop added with response: ", response);
          return userSvc.changeUserOnTrip(uid, true); // set userObj.onTrip = true;
        },
        util.rejectLog
      )
      .then( // after userObj.onTrip set to true:
        function(response) {
          console.log("User's onTrip property set to true with response of:", response);
          // $state.go('trip/' + newTripId);
          def.resolve(response); // resolve promise,
        },
        util.rejectLog
      );
      return def.promise; // return deferrer promise
    }
  };

  this.addCompletedTripForUser = function(uid, tripObj) {
    // if trip is submitted without name or both dates, alert error
    if (!util.isDef([tripObj.name, tripObj.startTimestamp, tripObj.endTimestamp])) {
      alert('Please enter a name and both start and end dates for your completed trip.');
    } else {
      tripObj.isActive = false;
      // parse start/end dates into ms timestamp strings
      tripObj.startTimestamp = util.parseStamp(tripObj.startTimestamp);
      tripObj.endTimestamp = util.parseStamp(tripObj.endTimestamp);
      tripSvc.addTripForUser(uid, tripObj)
      .then(
        function(response) {
          console.log("Completed trip added.", response);
        },
        util.rejectLog
      );
    }
  };
}]);

trvlApp.service('stopSvc', ["constants", "util", "$firebaseArray", "$firebaseObject", function(constants, util, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');
  // FUNCTIONS TO USE WITHIN THIS SERVICE
  var getStopsArray = function(tripId) {
    return $firebaseArray(rootRef.child(tripId));
  };

  var getStopObject = function(tripId, stopId) {
    return $firebaseObject(rootRef.child(tripId + "/" + stopId));
  };

  // METHODS FOR USE BY OTHER SERVICES
  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef).$loaded(); // return promise of gettting all trips
  };

  // THIS WORKS BECAUSE I AM NOT CALLING THE PROMISE THAT I WANT TO RETURN HERE
  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    var def = $q.defer();
    this.getStopsForTrip(tripId) // load stops for trip
    .then(
      function(response) { // if successful, response is stops arr
        return response.$add(stopObj); // add stop to trip and return promise
      },
      util.rejectLog
    )
    .then(
      function(response) {
        console.log("Stop added with ID of", response.$key());
        def.resolve(response);
      },
      util.rejectLog
    );
    return def.promise;
  };

  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    var stopObj = getStopObject(tripId, stopId);
    stopObj.$loaded() // stopObj is promise that object will load
    .then(
      function(response) {
        stopObj.departTimestamp = date;
        return stopObj.$save(); // PROMISE
      }
    );
  };

  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

}]);

trvlApp.service('tripOps', ["util", "$q", "userSvc", "tripSvc", "stopSvc", function(util, $q, userSvc, tripSvc, stopSvc) {
  /*
  doesn't pull any data from firebase directly, uses other services
  */

  // allStops: pull all stops for a trip (trip)
  this.getTripStopsData = function(tripId, scopeObj) {
    stopSvc.getStopsForTrip(tripId)
    .then(
      function(response) {
        scopeObj.allStops = response;
      },
      util.rejectLog
    );
  };

  //
  this.getTripData = function(uid, tripId, scopeObj) {
    tripSvc.getTripData(uid, tripId)
    .then(
      function(response) {
        scopeObj.tripData = response;
      },
      util.rejectLog
    );
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

    return stopSvc.addStop(tripId, stopObj); // return promise to ctrl
  };

  this.addEndDateToStop = function(tripId, stopId, endDate) {
    return stopSvc.setStopDepartDate(tripId, stopId, endDate); // return promise to CTRL
  };


}]);

trvlApp.service('tripSvc', ["$firebaseArray", "$firebaseObject", "$q", "util", "constants", function($firebaseArray, $firebaseObject, $q, util, constants) {
  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  All methods return promises (not internal functions)
  */

  // create ref to /trips data in firebase
  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/');

  // HELPER FUNCTIONS FOR USE WITHIN THIS SERVICE

  var getTripObj = function(uid, tripId) {
    return $firebaseObject(rootRef.child(uid + '/' + tripId));
  };

  var getTripsArray = function(uid) {
    return $firebaseArray(rootRef.child(uid));
  };

  // METHODS TO BE ACCESSED OUTSIDE OF THIS SERVICE

  // get's data for a user's specific trip
  this.getTripData = function(uid, tripId) {
    return getTripObj(uid, tripId).$loaded(); // return promise of getting trip obj
  };

  // get all trips for user, based on uid.
  this.getTripsForUser = function(uid) {
    return getTripsArray(uid).$loaded(); // return promise of getting all trips
  };

  // add a trip obj
  this.addTripForUser = function(uid, tripObj) {
    /*
    needed to create own promise for this function because the $add
    promise was not returning correctly to mytripsOps
    */
    var def = $q.defer();
    var trips = getTripsArray(uid);
    trips.$loaded() // when trips array is loaded
    .then(
      function(response) {
        console.log("trips loaded, now adding new trip.");
        return trips.$add(tripObj); // return promise of adding trip
      },
      util.rejectLog
    )
    .then(
      function(response) {
        console.log('Trip added. Response:', response);
        def.resolve(response);
      },
      util.rejectLog
    );
    return def.promise;
  };

  // changes tripObj.isActive to true/false
  this.isTripActive = function(uid, tripId, bool) {
    var tripObj = getTripObj(uid, tripId); // get trip obj
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.isActive = bool; // set isActive
        return tripObj.$save(); // return promise of saving tripObj changes
      }
    );
  };

  // changes tripObj.endTimestamp
  this.setTripEndDate = function(uid, tripId, endDate) { // end date in ms
    var tripObj = getTripObj(uid, tripId); // get trip obj
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.endTimestamp = endDate; // set end date
        return tripObj.$save(); // return promise of saving tripObj changes
      }
    );
  };
}]);

trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "$q", "util", "constants", function($firebaseArray, $firebaseObject, $q, util, constants) {
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
        userObj.onTrip = bool; //onTrip property to T/F XX
        userObj.$save();
        def.resolve('user obj.onTrip updated to ' + bool); // save obj, return promise
      },
      util.rejectLog
    );
    return def.promise;
  };

//BOTTOM
}]);

/*
Factory of utility functions with 0 dependencies
*/
trvlApp.factory('util', function() {
  return {
    getMapUrl: function(lat, lon) {
      var mapUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + lon + "&zoom=11&size=145x145&maptype=roadmap&key=AIzaSyBGfrzCswijyHNboZzf6WIKYIrg33FFHiE";
      return mapUrl;
    },
    rejectLog: function(err) {
      console.log("Promise rejected:", err);
    },
    nowStamp: function() {
      return Date.parse(new Date().toString());
    },
    parseStamp: function(dateObj) {
      return Date.parse(dateObj.toString());
    },
    isDef: function(objToCheck) {
      if (Array.isArray(objToCheck)) {
        for (var i = 0; i < objToCheck.length; i++) {
          if (objToCheck[i] === undefined) {
            return false;
          }
        }
        return true;
      } else {
        if (objToCheck === undefined) {
          return false;
        } else {
          return true;
        }
      }
    }
  };
});

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
      currData: '='
    },
    controller: 'menuBarCtrl'
  };
});

trvlApp.controller('loginCtrl', ["constants", "util", "$scope", "$state", "authSvc", function(constants, util, $scope, $state, authSvc) {

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
        alert("Registration successful. Please log in.");
        $scope.newuser = false; // once completed, change to login form
      }    
    );
  };

}]);

trvlApp.controller('mytripsCtrl', ["$scope", "currAuth", "dataOps", "mytripsOps", "constants", "util", function($scope, currAuth, dataOps, mytripsOps, constants, util) {
  // -- GET DATA FOR MY TRIPS $SCOPE -- //
  // $scope.userData
  dataOps.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  dataOps.getCurrData(currAuth.uid, $scope);

  // $scope.userTrips
  mytripsOps.getAllTripsForUser(currAuth.uid, $scope);

  // -- UI VARIABLES & FUNCTIONS -- //
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

  // -- MY TRIPS $SCOPE FUNCTIONS -- //

  // start a new trip (start date of today, first stop chosen in view)
  $scope.startTrip = function(newTripObj, firstStopObj) {
    mytripsOps.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then( // after trip is started:
      function(response) {
        dataOps.getUserData(currAuth.uid, $scope);  // update $scope.userData
        dataOps.getCurrData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  $scope.addPastTrip = function(oldTripObj) {
    mytripsOps.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope //
  console.log($scope);

}]);

trvlApp.controller('tripCtrl', ["$scope", "$stateParams", "currAuth", "dataOps", "tripOps", "util", function($scope, $stateParams, currAuth, dataOps, tripOps, util) {
  // -- GET DATA FOR TRIP DETAIL $SCOPE -- //
  // $scope.userData
  dataOps.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  dataOps.getCurrData(currAuth.uid, $scope);

  // $scope.allStops (from curr url tripId)
  $scope.currTripId = $stateParams.tripId;
  tripOps.getTripStopsData($stateParams.tripId, $scope);

  // [REFACTOR TO ASYNC]
  tripOps.getTripData(currAuth.uid, $stateParams.tripId, $scope);

  // tripOps.getTripData(currAuth.uid, $stateParams.tripId, $scope);

  // UI functions
  $scope.showForm = false; // hide new stop form by default
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };

  // placeholder. want to build stats svc later
  $scope.currTripStats = {
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };

  // THE MAP IMG + THIS SHOULD BE A CUSTOM DIRECTIVE
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

  // FUNCTIONS

  $scope.addStopToTrip = function(tripId, stopObj) {
    // // add today's date as end date to current stop
    if ($scope.pastStop) { // if stop is in past, i.e. box checked
      // add new stop
      tripOps.addStopToTrip(tripId, stopObj);
      // getCurrData req'd?
    } else { // if new stop & moving:
      var lastStopId = $scope.currData.lastStopId;
      var now = Date.parse(new Date().toString());
      tripOps.addStopToTrip(tripId, stopObj);

      // tripOps.addEndDateToStop(tripId, lastStopId, now)
      // .then(
      //   function(response) {
      //     console.log('End date added to last stop. Now adding new stop.');
      //     return tripOps.addStopToTrip(tripId, stopObj);
      //   }
      // )
      // .then(
      //   function(response) {
      //     console.log('New stop added w/ start date of today. Response: ', response, 'Now updating currData.');
      //     tripOps.getCurrData(currAuth.uid, $scope); // update currData on page
      //   }
      // );
    }
    dataOps.getCurrData(currAuth.uid, $scope); // update data
    $scope.newStopObj = {}; // clear obj (ang date input err)
  };

  // will only be used if current trip is active
  $scope.endCurrentTrip = function(tripId) {
    tripOps.endTripForUser(currAuth.uid, $scope.currTripId)
    .then(
      function(response) {
        console.log('trip id: ', tripId, 'ended.');
      },
      util.rejectLog
    );
  };

  console.log($scope); // for monitoring/ debugging

}]);
