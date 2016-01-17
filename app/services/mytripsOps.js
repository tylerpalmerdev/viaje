trvlApp.service('mytripsOps', function(util, $q, userSvc, tripSvc, stopSvc) {
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
});
