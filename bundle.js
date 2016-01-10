// create angular app
var trvlApp = angular.module('trvlApp', ['ui.router', 'firebase']);

var authCheck = function(authSvc, $firebaseAuth) {
  return authSvc.getCurrentAuth().$requireAuth();
};
authCheck.$inject = ["authSvc", "$firebaseAuth"];

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
trvlApp.config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {
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
    return authObj.$authWithPassword(userObj);
  };

  // get current auth status of user, e.g. to see if they can go to route
  this.getCurrentAuth = function() {
    return $firebaseAuth(baseRef);
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
  country_list: ["United States", "Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Cape Verde","Cayman Islands","Chad","Chile","China","Colombia","Congo","Cook Islands","Costa Rica","Cote D Ivoire","Croatia","Cruise Ship","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Estonia","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Polynesia","French West Indies","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guam","Guatemala","Guernsey","Guinea","Guinea Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyz Republic","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Namibia","Nepal","Netherlands","Netherlands Antilles","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Reunion","Romania","Russia","Rwanda","Saint Pierre and Miquelon","Samoa","San Marino","Satellite","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","St Kitts and Nevis","St Lucia","St Vincent","St. Lucia","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor L'Este","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uruguay","Uzbekistan","Venezuela","Vietnam","Virgin Islands (US)","Yemen","Zambia","Zimbabwe"]
});

trvlApp.service('currUserSvc', ["userSvc", "$q", function(userSvc, $q) {

  this.getCurrUserData = function(uid) {
    var def = $q.defer();
    var userData = {};
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        userData.name = response.name;
        userData.uid = response.$id;
        userData.onTrip = true; // will become response.onTrip
        userData.currTripId = '123ab'; // will become response.currTripId
        userData.currLoc = 'Havana, Cuba'; // will become response.currLoc
        def.resolve(userData);
      }
    );
    /*
    // could also run another async function above, return the promise..
    .then(
      function(response) {
        userSvc.currTripId = response.tripId;
        def.resolve(userData) // instead of above
      }
    )
    */
    return def.promise;
  };

}]);




trvlApp.service('userSvc', ["$firebaseArray", "$firebaseObject", "$q", "constants", function($firebaseArray, $firebaseObject, $q, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserObj) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserObj.email; // add user data
    refObj.name = newUserObj.name;
    refObj.country = newUserObj.country;
    return refObj.$save(); // save updated data, return promise
  };

  this.getUserRefObj = function(uid) {
    var def = $q.defer();
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    $firebaseObject(userRef).$loaded()
    .then(
      function(response) {
        def.resolve(response);
      },
      function(err) {
        def.reject(err);
      }
    );
    return def.promise;
  };
  
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

trvlApp.directive('menuBar', function() {
  return {
    templateUrl: 'app/directives/menuBar/menuBarTmpl.html',
    restrict: 'E',
    scope: {
      userData: '='
    }
  };
});

trvlApp.controller('dashCtrl', ["$scope", "currAuth", "currUserSvc", function($scope, currAuth, currUserSvc) {

  currUserSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

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

trvlApp.controller('mytripsCtrl', ["$scope", "currAuth", "currUserSvc", function($scope, currAuth, currUserSvc) {
  $scope.test = 'Mytrips ctrl connected!';

  currUserSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

}]);

trvlApp.controller('stopCtrl', ["$scope", function($scope) {
  $scope.test = 'stopCtrl connected';
}]);

trvlApp.service('stopSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef); // get all stops for trip
  };

  this.addStopForTrip = function(tripId, stopObj) {
    var stopsForTrip = this.getStopsForTrip(tripId);
    return stopsForTrip.$add(stopObj); // stop to trip and return promise
    // change current stop to newly added stop
  };

  this.deleteStop = function(tripId, stopId) {
    // delete stop from DB
    // delete journal entries for stop
    // if current stop, revert to 2nd most recent stop
  };

}]);

trvlApp.controller('tripCtrl', ["$scope", function($scope) {

}]);

trvlApp.service('tripSvc', ["$firebaseArray", "$firebaseObject", "constants", function($firebaseArray, $firebaseObject, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/'); // base ref

  this.getTripsForUser = function(uid) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    var userTrips = $firebaseArray(userTripsRef); // get all trips
    return userTrips;
  };

  this.addTripForUser = function(uid, tripObj) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    var userTrips = $firebaseArray(userTripsRef); // get all user trips
    // stopSvc.addStop(tripId, tripObj.firstStopObj)
    // change current trip to new trip, change user.onTrip to true;
    return userTrips.$add(tripObj); // add tripObj and return promise
  };


  this.endCurrentTrip = function(uid) {
    // get current trip for user
    // add end date for trip
    // currentUser.onTrip = false;
  };
}]);

/*
viaje/

-/users
--/:uid
---/ {
      email: 'a@b.c',
      home: 'Madrid, Spain',
      name: 'Steve Young',
      onTrip: true, <-- check last trip in trips for user to see if active
      currentLocation: 'okasdoASokf'
     }
-/trips
--/:uid <-- all trips for user
---/:tripId {
      tripName: 'EuroTrip',
      isActive: true,
      startDate: '2015-12-03',
      endDate: null, <-- date if not current trip
      currentStopId: 'asdASDfasd7fas', <-- could just get last stop in array + isActive = true null if doesn't apply
    },...

-/stops
--/:tripId
---/:stopId { <-- all stops for trip
      stopName: 'Havana, Cuba',
      isCurrentLocation: true, <-- could just check to see if it has departure date
      arrivalDate: '2015-12-03',
      departureDate: null,
      stopData: {}, <--from autocomplete dir data
      lastEntryId: 'asjgaASgaskdg12' <--could just get last entry of entries array
     }

-/entries
--/:stopId
---/:entryId { <-- all entries for stop
      text: "asdgasdg",
      timestamp: "2015-02-12 05:15PM PST"
     }

*/

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
