trvlApp.service('stopSvc', function($firebaseArray, $firebaseObject, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef); // get all stops for trip
  };

  this.addStopForTrip = function(tripId, stopObj) {
    var stopsForTrip = this.getStopsForTrip(tripId);
    return stopsForTrip.$add(stopObj); // stop to trip and return promise
    // change current stop to newly added stop
  };

  this.deleteStop = function(tripId, stopId) {
    // delete stop from DB
    // delete journal entries for stop
    // if current stop, revert to 2nd most recent stop
  };

});
