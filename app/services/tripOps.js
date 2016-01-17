trvlApp.service('tripOps', function(util, $q, userSvc, tripSvc, stopSvc) {
  /*
  doesn't pull any data from firebase directly, uses other services
  */

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

    return stopSvc.addStop(tripId, stopObj); // return promise to ctrl
  };

  this.addEndDateToStop = function(tripId, stopId, endDate) {
    return stopSvc.setStopDepartDate(tripId, stopId, endDate); // return promise to CTRL
  };


});
