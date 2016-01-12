trvlApp.service('opsSvc', function(constants, $q, userSvc, tripSvc, stopSvc) {
  /*
  uses other services to pull data about the current user
  doesn't CHANGE any data, only retrieves, then inserts into each view's controller so userData can be accessed in each $scope
  one big promise chain because of all the async operations
  doesn't pull any data from firebase directly, uses other services
  */

  /* SECTION 1 - GET ALL USER DATA FOR CTRL */
  // pull current user data from userSvc, as it is in DB
  this.getUserData = function(uid) {
    return userSvc.getUserRefObj(uid);
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

  this.getAllTripsForUser = function(uid) {
    return tripSvc.getTripsForUser(uid);
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
    tripObj.isActive = false;
    tripSvc.addNewTrip(uid, tripObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };


  /* SECTION 3 - OPS FOR TRIP DETAIL PAGE CTRL */
  this.getTripStopsData = function(tripId) {
    return stopSvc.getStopsForTrip(tripId);
  };

  this.getFullTripData = function(tripId) {
    /*
    FOR EACH TRIP DETAIL PAGE:
    var tripData = {
      allStops: {} w/ details + ids, if stop.id = lastStop & currTrip = T, currLoc = stop
      lastStop: stopId <-- stopSvc get last stop for
      tripActive: T/F <-- if true, change view
      tripName: tripSvc.getNameOfTrip(currAuth.uid, tripId);
    }
    */
  };

  this.addStopToTrip = function(tripId, stopObj) {
    // if they exist, parse dates into numerical timestamp to store in fb and parse in angular
    if (stopObj.arriveTimestamp) {
      stopObj.arriveTimestamp = Date.parse(stopObj.arriveTimestamp);
    } else if (!stopObj.arriveTimestamp) { // if no arrive stamp, set to now
      stopObj.arriveTimestamp = Date.parse(new Date().toString());
    }

    if (stopObj.departTimestamp) { // add depart date to object if it exists
      stopObj.departTimestamp = Date.parse(stopObj.departTimestamp);
    }
    stopSvc.addStop(tripId, stopObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };

});
