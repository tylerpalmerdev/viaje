trvlApp.service('tripSvc', function($firebaseArray, $firebaseObject, util, constants) {
  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /trips data
  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/');

  // get's data for a user's specific trip
  this.getTripData = function(uid, tripId) {
    // return promise of getting trip obj, resolves when obj is loaded
    return $firebaseObject(rootRef.child(uid + '/' + tripId)).$loaded();
  };

  // get all trips for user, based on uid.
  this.getTripsForUser = function(uid) {
    // return promise of getting all trips, resolves when all trips are loaded
    return $firebaseArray(rootRef.child(uid)).$loaded();
  };

  // adds a trip to a user's trips array.
  this.addTripForUser = function(uid, tripObj) {
    return this.getTripsForUser(uid)
    .then(
      function(response) {
        // returns promise that resolves when new tripObj is added for user
        return response.$add(tripObj);
      },
      util.rejectLog
    );
  };

  // changes tripObj.isActive to true/false
  this.isTripActive = function(uid, tripId, bool) {
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.isActive = bool; // set new isActive val
        // returns promise that resolves when new trip.isActive val is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

  // changes tripObj.endTimestamp
  this.setTripEndDate = function(uid, tripId, endDate) { // end date in ms
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.endTimestamp = endDate; // set new endDate val
        // returns promise that resolves when new trip.isActive val is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

  // combination of above two, as running them simultaneously causes one not to work.
  this.endTrip = function(uid, tripId, endDate) {
    return this.getTripData(uid, tripId) // get tripObj
    .then(
      function(response) { // response is tripObj
        response.endTimestamp = endDate; // set endDate val
        response.isActive = false; // set isActive val
        // returns promise that resolves when new values are saved
        return response.$save();
      },
      util.rejectLog
    );
  };

}); // END
