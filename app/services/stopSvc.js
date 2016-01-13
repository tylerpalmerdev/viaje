trvlApp.service('stopSvc', function(constants, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef).$loaded(); // return promise of gettting all trips
  };

  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    this.getStopsForTrip(tripId) // load stops for trip
    .then(
      function(response) { // if successful, response is stops arr
        return response.$add(stopObj); // add stop to trip and return promise
      },
      constants.rejectLog
    );
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
    var stopObj = $firebaseObject(rootRef.child(tripId + "/" + stopId));
    // this.getStop(tripId, stopId)
    stopObj.$loaded() // stopObj is promise that object will load
    .then(
      function(response) {
        // var stopObj = response;
        stopObj.departTimestamp = date;
        return stopObj.$save(); // PROMISE
      }
    );
  };

  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

});
