trvlApp.service('mytripsOps', function(util, $q, userSvc, tripSvc, stopSvc) {
  /*
  Functions for mytrips view
  */
  // userTrips: pull all trips for a user
  this.getAllTripsForUser = function(uid) {
    return tripSvc.getTripsForUser(uid);
  };

  // add trip for user, based on new start trip.
  // long promise chain, with each step dependent on something that the previous generates, mainly IDs from new records
  this.startTripForUser = function(uid, tripObj, firstStopObj) {

    var def = $q.defer(); // create deferrer
    tripObj.isActive = true; // set trip as active
    firstStopObj.arriveTimestamp = Date.parse(new Date().toString());
    tripSvc.addNewTrip(uid, tripObj) // add trip, returns promise
    .then(
      function(response) {
        var tripId = response.key(); // grab id key of newly added trip
        console.log("Trip obj added to /trips/ with id of ", tripId);
        return stopSvc.addStop(tripId, firstStopObj); // add stop to stops/:tripId arr, returns promise
      },
      util.rejectLog
    )
    .then(
      function(response) { // when resolved
        // var stopId = response.key();
        console.log("First stop added with response: ", response);
        return userSvc.changeUserOnTrip(uid, true); // set userObj.onTrip = true;
      },
      util.rejectLog
    )
    .then(
      function(response) {
        console.log(response);
        def.resolve(response); // resolve promise,
      },
      util.rejectLog
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
});
