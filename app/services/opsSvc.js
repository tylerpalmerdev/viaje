trvlApp.service('opsSvc', function(constants, $q, userSvc, tripSvc, stopSvc) {
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

});
