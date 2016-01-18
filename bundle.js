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

  // currData: get active (trip.isActive = true) OR last trip ID for user and last stop Id for trip. "Last" based on most recent end date.
  this.getCurrData = function(uid, scopeObj) {
    var currData = {}; // last tripId/name, last stopId/name, tripIsActive (t/f)
    tripSvc.getTripsForUser(uid) // get all trips for user
    .then( // when loaded:
      function(response) { // response is firebase array
        var latestEnd = 0; // to see which trip is latest, set as 0 to compare
        for (var i = 0; i < response.length; i++) {
          var trip = response[i];
          var endTimestamp = trip.endTimestamp; // in ms timestamp format
          if (trip.isActive === true) { // if active trip is found
            currData.tripIsActive = true; // set data
            currData.lastTripId = trip.$id; // ""
            currData.lastTripName = trip.name; // ""
            break; // break out of for loop since active trip was found
          } else if (!endTimestamp) { // if trip is inactive but has no end date
            console.log("trip id", trip.$id, "has undefined end date and is not set to 'isActive. Please address.'");
            continue; // continue because trip has corrupt end date data
          } else if (endTimestamp > latestEnd) {
            latestEnd = endTimestamp;
            currData.tripIsActive = false;
            currData.lastTripName = trip.name;
            currData.lastTripId = trip.$id; // set latest trip equal to trip id
          }
        }
        // after last trip is established, get data about last stop on last trip
        return stopSvc.getStopsForTrip(currData.lastTripId);
      },
      util.rejectLog // log for promise reject
    )
    .then( // once loaded:
      function(response) { // response is arr of all stops for trip
        var latestDepart = 0; // for comparison
        for (var k = 0; k < response.length; k++) { // for all stops in trip:
          var stop = response[k];
          var departStamp = stop.departTimestamp;
          var arriveStamp = stop.arriveTimestamp;
          if (!(util.isDef(departStamp) || util.isDef(arriveStamp))) {
            console.log("Stop", stop.$id, "has no start or end date. Plese address.");
            continue; // skip this stop, it has no start or end data
          } else if (!departStamp && arriveStamp > latestDepart) { // if no depart but arrived later
            latestDepart = arriveStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopData = stop.stopData;
            currData.lastStopId = stop.$id;
          } else if (departStamp && departStamp > latestDepart) { // if depart stamp is present && later
            latestDepart = departStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopId = stop.$id;
          }
        }
        // once all done, final step, set scopeObj.currData to result.
        // this allows the function to be applied to a ctrl's $scope in one line.
        scopeObj.currData = currData;
      },
      util.rejectLog // log for promise reject
    );
  };

}]); //END

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

  // Start new trip for user. Only possible if user not already on trip.
  this.startTripForUser = function(uid, tripObj, firstStopObj) {
    // check to make sure user entered values for trip name & first stop
    var def = $q.defer(); // create deferrer
    if (!util.isDef([tripObj.name, firstStopObj.stopData])) {
      alert("Please enter a name and first stop for your trip.");
      def.reject();
    } else {
      var newTripId; // declare now to use for final nav to trip page
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
    }
    return def.promise; // return deferrer promise
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
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /stops/ data
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  // get all stops of a trip. return promise that resolves when loaded.
  this.getStopsForTrip = function(tripId) {
    // return promise of getting all stops, resolves when array is loaded
    return $firebaseArray(rootRef.child(tripId)).$loaded();
  };

  // get data about specific stop. return promise that resolves when loaded.
  this.getStopObj = function(tripId, stopId) {
    // return promise of getting a stop obj, resolves when obj is loaded
    return $firebaseObject(rootRef.child(tripId + "/" + stopId)).$loaded();
  };

  // add stop to trip. returns promise that resolves when stop is added.
  this.addStop = function(tripId, stopObj) {
    return this.getStopsForTrip(tripId)
    .then(
      function(response) {
        return response.$add(stopObj);
      },
      util.rejectLog
    );
  };

  // changes a stop's departTimestamp. returns a promise that resolves when the change is saved.
  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    return this.getStopObj(tripId, stopId)
    .then(
      function(response) { // when loaded (response is object):
        response.departTimestamp = date; // set departTimestamp to date
        return response.$save(); // PROMISE
      },
      util.rejectLog
    );
  };

  //*TO-DO*//
  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

}]); //END

trvlApp.service('tripOps', ["util", "$q", "userSvc", "tripSvc", "stopSvc", function(util, $q, userSvc, tripSvc, stopSvc) {
  /*
  doesn't pull any data from firebase directly, uses other services
  */
  // get basic data about trip
  this.getTripData = function(uid, tripId, scopeObj) {
    tripSvc.getTripData(uid, tripId)
    .then(
      function(response) {
        scopeObj.tripData = response;
      },
      util.rejectLog
    );
  };

  // get data about all stops for a trip
  this.getTripStopsData = function(tripId, scopeObj) {
    stopSvc.getStopsForTrip(tripId)
    .then(
      function(response) {
        scopeObj.allStops = response;
      },
      util.rejectLog
    );
  };

  // DONE requires both start & end date to be present, and in past
  this.addPastStopToTrip = function(tripId, stopObj, scopeObj) {
    // make sure all fields have been entered
    if (!util.isDef([stopObj.stopData, stopObj.arriveTimestamp, stopObj.departTimestamp])) {
      alert("Please select a city and both start and end dates for your past stop.");
      return false;
    }
    // parse timestamps
    stopObj.arriveTimestamp = util.parseStamp(stopObj.arriveTimestamp);
    stopObj.departTimestamp = util.parseStamp(stopObj.departTimestamp);
    var now = util.nowStamp();
    // if depart/arrive timestamp are not in the past, return false
    if (stopObj.arriveTimestamp > now || stopObj.departTimestamp > now) {
      alert("Start and end dates for a past stop must both be in the past.");
      return false;
    }
    stopSvc.addStop(tripId, stopObj)
    .then(
      function(response) {
        console.log("New stop added with ID of", response.key());
      },
      util.rejectLog
    );
  };

  // only used by active trip. prevent if new stop city not entered
  this.addCurrentStopToTrip = function(currTripId, newStopObj, lastStopId) {
    if (!util.isDef([newStopObj.stopData])) {
      alert("Please select a city for your new stop.");
      return false;
    }
    var now = util.nowStamp(); // for use as departTimestamp of last stop
    // new stop starts a little bit later than "now" to help with sorting
    newStopObj.arriveTimestamp = now + 5;
    // set up $q.all() to run multiple promises at once, resolve when all resolve
    var all = $q.all([
      stopSvc.setStopDepartDate(currTripId, lastStopId, now),
      stopSvc.addStop(currTripId, newStopObj)
    ]);
    return all; // return promise of resolving all promises in all
  };

  // will do everything to end a trip, should only be used if trip.isActive = true
  this.endTripForUser = function(uid, tripId, lastStopId) {
    var now = util.nowStamp(); // for setting end timestamps
    // create a single promise that resolves when all promises inside of it resolve
    var all = $q.all([
      userSvc.changeUserOnTrip(uid, false),
      tripSvc.endTrip(uid, tripId, now),
      stopSvc.setStopDepartDate(tripId, lastStopId, now)
    ]);
    return all;
  };

  this.addEndDateToStop = function(tripId, stopId, endDate) {
    return stopSvc.setStopDepartDate(tripId, stopId, endDate); // return promise to CTRL
  };

}]); //END

trvlApp.service('tripSvc', ["$firebaseArray", "$firebaseObject", "util", "constants", function($firebaseArray, $firebaseObject, util, constants) {
  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /trips data
  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/');

  // get's data for a user's specific trip
  this.getTripData = function(uid, tripId) {
    // return promise of getting trip obj, resolves when obj is loaded
    return $firebaseObject(rootRef.child(uid + '/' + tripId)).$loaded();
  };

  // get all trips for user, based on uid.
  this.getTripsForUser = function(uid) {
    // return promise of getting all trips, resolves when all trips are loaded
    return $firebaseArray(rootRef.child(uid)).$loaded();
  };

  // adds a trip to a user's trips array.
  this.addTripForUser = function(uid, tripObj) {
    return this.getTripsForUser(uid)
    .then(
      function(response) {
        // returns promise that resolves when new tripObj is added for user
        return response.$add(tripObj);
      },
      util.rejectLog
    );
  };

  // changes tripObj.isActive to true/false
  this.isTripActive = function(uid, tripId, bool) {
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.isActive = bool; // set new isActive val
        // returns promise that resolves when new trip.isActive val is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

  // changes tripObj.endTimestamp
  this.setTripEndDate = function(uid, tripId, endDate) { // end date in ms
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.endTimestamp = endDate; // set new endDate val
        // returns promise that resolves when new trip.isActive val is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

  // combination of above two, as running them simultaneously causes one not to work.
  this.endTrip = function(uid, tripId, endDate) {
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.endTimestamp = endDate; // set endDate val
        response.isActive = false; // set isActive val
        // returns promise that resolves when new values are saved
        return response.$save();
      },
      util.rejectLog
    );
  };

}]); // END

trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "util", "constants", function($firebaseArray, $firebaseObject, util, constants) {
  /*
  RESPONSIBILITY: adding, getting, and deleting data from /users/ in fb
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /users/ data
  var baseRef = new Firebase(constants.fbBaseUrl + '/users/');

  // get user data obj from fb /users/:uid
  this.getUserRefObj = function(uid) {
    // return promise of getting user data obj when loaded
    return $firebaseObject(baseRef.child(uid)).$loaded();
  };

  // add new user data to /users/ after the user has 'signed up' via authSvc
  this.addDataForNewUser = function(uid, newUserObj) {
    return this.getUserRefObj(uid)
    .then(
      function(response) {
        response.email = newUserObj.email;
        response.name = newUserObj.name;
        response.homeCity = newUserObj.homeCity; // home city data added by citySearch directive
        response.onTrip = false; // default: user starts out as not on trip.
        response.userStats = {
          trips: 0,
          countries: 0,
          cities: 0,
          entries: 0,
          distance: 0
        };
        return response.$save(); // return promise of saving new userObj
      },
      util.rejectLog
    );
  };

  // set val of userObj.onTrip (true or false)
  this.changeUserOnTrip = function(uid, bool) {
    // get user obj w/ ref from uid
    return this.getUserRefObj(uid)
    .then(
      function(response) { // response is user ref obj
        response.onTrip = bool; // change userObj.onTrip to bool
        // return promise that resolves when userObj.onTrip is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

}]); //END

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
    rejectDef: function(err) {
      console.log("Promise rejected:", err);
      def.reject();
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
          if (objToCheck[i] === undefined || objToCheck[i] === null) {
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
  // -- $SCOPE VARIABLES -- //
  dataOps.getUserData(currAuth.uid, $scope); // $scope.userData
  dataOps.getCurrData(currAuth.uid, $scope); // $scope.currData
  mytripsOps.getAllTripsForUser(currAuth.uid, $scope); // $scope.userTrips
  // set these as empty objects to help validate forms in mytripsOps
  $scope.newTrip = {};
  $scope.firstStopObj = {};
  $scope.oldTripObj = {};

  // -- $SCOPE FUNCTIONS -- //
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

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

  // add a trip from the past, start/end dates in past
  $scope.addPastTrip = function(oldTripObj) {
    mytripsOps.addCompletedTripForUser(currAuth.uid, oldTripObj);
    $scope.oldTripObj = {}; // reset for ang date input error
  };

  // log to check $scope
  console.log($scope);

}]);

trvlApp.controller('tripCtrl', ["$scope", "$stateParams", "currAuth", "dataOps", "tripOps", "util", function($scope, $stateParams, currAuth, dataOps, tripOps, util) {
  // $SCOPE VARIABLES
  $scope.currTripId = $stateParams.tripId; // trip id of current page, from url
  $scope.showForm = false; // default: don't show form to add new stop
  dataOps.getUserData(currAuth.uid, $scope); // $scope.userData
  dataOps.getCurrData(currAuth.uid, $scope); // $scope.currData
  tripOps.getTripStopsData($stateParams.tripId, $scope); // $scope.allStops
  tripOps.getTripData(currAuth.uid, $stateParams.tripId, $scope); // $scope.tripData
  $scope.currTripStats = {   // placeholder. want to build stats svc later
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };
  /*
  assigning blank objects to these $scope variables now assists in validation of form completeness when a new stop is added to a trip. See tripOps service for more details.
  */
  $scope.newStopObj = {};
  $scope.pastStopObj = {};

  // $SCOPE FUNCTIONS
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };

  // For stop maps. Later: move this to stop map custom directive
  $scope.getMapUrl = function(lat, lon) {
    return util.getMapUrl(lat, lon);
  };

  // add past, completed stop. Will be used for active & completed trips.
  $scope.addPastStopToTrip = function(stopObj) {
    tripOps.addPastStopToTrip($scope.currTripId, stopObj, $scope);
    $scope.newStopObj = {}; // clear the stop obj due to ang date error
    $scope.pastStopObj = {}; // ""
  };

  // add new, current trip. for active trips only.
  $scope.addCurrentStopToTrip = function(stopObj) {
    // determine last stop id & pass into tripOps function call
    tripOps.addCurrentStopToTrip($scope.currTripId, stopObj, $scope.currData.lastStopId)
    .then(
      function(response) {
        dataOps.getCurrData(currAuth.uid, $scope); // update currData on page
      }
    );
    $scope.newStopObj = {}; // clear the stop obj due to ang date error
  };

  // will only be available if current trip is active
  $scope.endCurrentTrip = function() {
    tripOps.endTripForUser(currAuth.uid, $scope.currTripId, $scope.currData.lastStopId)
    .then(
      function(response) {
        console.log('trip ended. Response:', response);
        dataOps.getCurrData(currAuth.uid, $scope); // update currData on page
      },
      util.rejectLog
    );
  };

  console.log($scope); // for monitoring/ debugging

}]); // END
