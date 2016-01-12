trvlApp.service('stopSvc', function(constants, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef); // get all stops for trip
  };

  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    var stopsForTrip = this.getStopsForTrip(tripId);
    return stopsForTrip.$add(stopObj); // stop to trip and return promise
  };

  this.getLatestStopOfTrip = function(tripId) {
    var tripStops = getStopsForTrip(tripId);
    return tripStops.$keyAt(-1); // return last elem in array
  };

  this.getStop = function(tripId, stopId) {
    var stopObj = $firebaseObject(rootRef.child(tripId + "/" + stopId));
    return stopObj.$loaded(); // return promise of getting stop object
  };

  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    getStop(tripId, stopId)
    .then(
      function(response) {
        var stopObj = response;
        stopObj.departTimestamp = date;
        return stopObj.$save(); // return promise of saving object with new depart date
      }
    );
  };

  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

});
