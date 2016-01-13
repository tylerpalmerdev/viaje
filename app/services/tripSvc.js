trvlApp.service('tripSvc', function($firebaseArray, $firebaseObject, constants) {

  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */

  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/'); // base ref

  // get all trips for user, based on uid
  this.getTripsForUser = function(uid) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    return $firebaseArray(userTripsRef).$loaded(); // return promise of getting all trips
  };

  this.addNewTrip = function(userId, tripObj) {
    // if new/active trip, add timestamp for start, end is undefined
    if(tripObj.isActive) {
      tripObj.startTimestamp = new Date().toString(); // save in DB in ms time string, for angular and firebase
    }
    // if endTimestamp is present, change to ms
    if(tripObj.endTimestamp) {
      tripObj.endTimestamp = Date.parse(tripObj.endTimestamp.toString());
    }
    // no matter what, format start time stamp to ms
    tripObj.startTimestamp = Date.parse(tripObj.startTimestamp.toString());
    var trips = $firebaseArray(rootRef.child(userId));
    return trips.$add(tripObj); // return promise
  };

  this.getTripObj = function(userId, tripId) {
    return $firebaseObject(rootRef.child(userId + '/' + tripId));
  };

  this.isTripActive = function(userId, tripId, bool) {
    var tripObj = this.getTripObj(userId, tripId);
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.isActive = bool;
        return tripObj.$save(); // returns promise of setting tripObj.isActive as bool
      }
    );
  };

  this.setTripEndDate = function(userId, tripId, endDate) { // end date in ms
    var tripObj = this.getTripObj(userId, tripId);
    tripObj.$loaded()
    .then(
      function(response) {
        tripObj.endTimestamp = endDate;
        return tripObj.$save(); // return promise of setting tripObj.endDate to endDate provided
      }
    );
  };

});
