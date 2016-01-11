trvlApp.service('opsSvc', function(constants, $q, userSvc, tripSvc, stopSvc) {
  /*
  uses other services to pull data about the current user
  doesn't CHANGE any data, only retrieves, then inserts into each view's controller so userData can be accessed in each $scope
  one big promise chain because of all the async operations
  doesn't pull any data from firebase directly, uses other services
  */

  /* SECTION 1 - GET ALL USER DATA FOR CTRL */
  // pull current user data from userSvc
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

  // to be used by ctrl to update $scope data
  this.updateUserData = function(authObj, scope) {
    this.getCurrUserData(authObj.uid)
    .then(
      function(response) {
        scope.userData = response;
      }
    );
  };

  /* SECTION 2 - GET ALL TRIP DATA FOR CTRL*/

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

  // gets all data about trips for user, including which (if any) is current, which stop is current (if not, currLoc = home)
  this.getTripDataForUser = function(uid) {
    var def = $q.defer();
    var tripData = {};
    tripSvc.getTripsForUser(uid)
    .then(
      function(response) {
        tripData.allTrips = response;
        tripData.latestTrip = response[response.length - 1];
        var latestTripId = tripData.latestTrip.$id;
        return stopSvc.getStopsForTrip(latestTripId);
      }
    )
    .then(
      function(response) {
        tripData.latestTripStops = response;
        tripData.latestStop = tripData.latestTripStops[0];
        // tripData.latestTripStops[tripData.latestTripStops.length - 1];
        def.resolve(tripData);
      }
    );
    return def.promise;
  };


  this.endTripForUser = function(uid, tripid) {
    var def = $q.defer();
    userSvc.changeUserOnTrip(uid, false) // set userObj.onTrip = false;
    .then(
      function(response) {
        def.resolve(response);
      }
    );

    // set departure date on last stop
    // set end date on trip

    return def.promise;
  };

  // function used by ctrl to update $scope data once change made in view.
  this.updateTripData = function(authObj, scope) {
    this.getTripDataForUser(authObj.uid)
    .then(
      function(response) {
        scope.tripData = response;
      }
    );
  };

  this.addCompletedTripForUser = function(uid, tripObj) {

  };

  /* SECTION 3 - OPS FOR TRIP CTRL */
  this.getTripStopsData = function(tripId) {
    var def = $q.defer();
    stopSvc.getStopsForTrip(tripId)
    .then(
      function(response) {
        return response;
      }
    );
    return def.promise;
  };

  this.updateStopData = function(tripId, scope) {
    this.getTripStopsData(tripId)
    .then(
      function(response) {
        scope.stopData = response;
      }
    );
  };

  this.addStopToTrip = function(tripId, stopObj) {
    // if stop doesn't have an arrival date, set as today
    if (!stopObj.arriveTimestamp) {
      stopObj.arrivalTimestamp = new Date().toString();
    }

    stopSvc.addStop(tripId, stopObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };

});
