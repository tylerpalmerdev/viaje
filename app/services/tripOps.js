trvlApp.service('tripOps', function(util, $q, userSvc, tripSvc, stopSvc) {
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

}); //END
