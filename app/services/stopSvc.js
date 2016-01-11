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
    // stopObj.stopName = stopObj.data.placeString;
    stopObj.arrivalTimestamp = new Date().toString(); // or different data if in past
    return stopsForTrip.$add(stopObj); // stop to trip and return promise
    // change current stop to newly added stop
  };

  this.getLatestStopOfTrip = function(tripId) {
    var tripStops = getStopsForTrip(tripId);
    return tripStops[tripStops.length - 1]; // return last elem in array
  };

  this.deleteStop = function(tripId, stopId) {
    // delete stop from DB
  };

});
