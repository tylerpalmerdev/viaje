trvlApp.service('stopSvc', function(constants, util, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /stops/ data
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');

  // get all stops of a trip. return promise that resolves when loaded.
  this.getStopsForTrip = function(tripId) {
    // return promise of getting all stops, resolves when array is loaded
    return $firebaseArray(rootRef.child(tripId)).$loaded();
  };

  // get data about specific stop. return promise that resolves when loaded.
  this.getStopObj = function(tripId, stopId) {
    // return promise of getting a stop obj, resolves when obj is loaded
    return $firebaseObject(rootRef.child(tripId + "/" + stopId)).$loaded();
  };

  // add stop to trip. returns promise that resolves when stop is added.
  this.addStop = function(tripId, stopObj) {
    return this.getStopsForTrip(tripId)
    .then(
      function(response) {
        return response.$add(stopObj);
      },
      util.rejectLog
    );
  };

  // changes a stop's departTimestamp. returns a promise that resolves when the change is saved.
  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    return this.getStopObj(tripId, stopId)
    .then(
      function(response) { // when loaded (response is object):
        response.departTimestamp = date; // set departTimestamp to date
        return response.$save(); // PROMISE
      },
      util.rejectLog
    );
  };

  //*TO-DO*//
  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

}); //END
