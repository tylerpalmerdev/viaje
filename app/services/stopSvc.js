trvlApp.service('stopSvc', function(constants, util, $firebaseArray, $firebaseObject) {
  /*
  RESPONSIBILITIES: adding/updating/deleting stop data from /stops/ in firebase
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */
  var rootRef = new Firebase(constants.fbBaseUrl + '/stops/');
  // FUNCTIONS TO USE WITHIN THIS SERVICE
  var getStopsArray = function(tripId) {
    return $firebaseArray(rootRef.child(tripId));
  };

  var getStopObject = function(tripId, stopId) {
    return $firebaseObject(rootRef.child(tripId + "/" + stopId));
  };

  // METHODS FOR USE BY OTHER SERVICES
  this.getStopsForTrip = function(tripId) {
    var tripStopsRef = rootRef.child(tripId); // get fb ref
    return $firebaseArray(tripStopsRef).$loaded(); // return promise of gettting all trips
  };

  // THIS WORKS BECAUSE I AM NOT CALLING THE PROMISE THAT I WANT TO RETURN HERE
  this.addStop = function(tripId, stopObj) {
    // later, in trip svc, add stopId to trip.stops array
    var def = $q.defer();
    this.getStopsForTrip(tripId) // load stops for trip
    .then(
      function(response) { // if successful, response is stops arr
        return response.$add(stopObj); // add stop to trip and return promise
      },
      util.rejectLog
    )
    .then(
      function(response) {
        console.log("Stop added with ID of", response.$key());
        def.resolve(response);
      },
      util.rejectLog
    );
    return def.promise;
  };

  this.setStopDepartDate = function(tripId, stopId, date) { // date in ms
    var stopObj = getStopObject(tripId, stopId);
    stopObj.$loaded() // stopObj is promise that object will load
    .then(
      function(response) {
        stopObj.departTimestamp = date;
        return stopObj.$save(); // PROMISE
      }
    );
  };

  this.deleteStop = function(tripId, stopId) {
    console.log(tripId, stopId);
  };

});
