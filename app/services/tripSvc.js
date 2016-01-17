trvlApp.service('tripSvc', function($firebaseArray, $firebaseObject, $q, util, constants) {
  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  All methods return promises (not internal functions)
  */

  // create ref to /trips data in firebase
  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/');

  // HELPER FUNCTIONS FOR USE WITHIN THIS SERVICE

  var getTripObj = function(uid, tripId) {
    return $firebaseObject(rootRef.child(uid + '/' + tripId));
  };

  var getTripsArray = function(uid) {
    return $firebaseArray(rootRef.child(uid));
  };

  // METHODS TO BE ACCESSED OUTSIDE OF THIS SERVICE

  // get's data for a user's specific trip
  this.getTripData = function(uid, tripId) {
    return getTripObj(uid, tripId).$loaded(); // return promise of getting trip obj
  };

  // get all trips for user, based on uid.
  this.getTripsForUser = function(uid) {
    return getTripsArray(uid).$loaded(); // return promise of getting all trips
  };

  // add a trip obj
  this.addTripForUser = function(uid, tripObj) {
    /*
    needed to create own promise for this function because the $add
    promise was not returning correctly to mytripsOps
    */
    var def = $q.defer();
    var trips = getTripsArray(uid);
    trips.$loaded() // when trips array is loaded
    .then(
      function(response) {
        console.log("trips loaded, now adding new trip.");
        return trips.$add(tripObj); // return promise of adding trip
      },
      util.rejectLog
    )
    .then(
      function(response) {
        console.log('Trip added. Response:', response);
        def.resolve(response);
      },
      util.rejectLog
    );
    return def.promise;
  };

  // changes tripObj.isActive to true/false
  this.isTripActive = function(uid, tripId, bool) {
    var tripObj = getTripObj(uid, tripId); // get trip obj
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.isActive = bool; // set isActive
        return tripObj.$save(); // return promise of saving tripObj changes
      }
    );
  };

  // changes tripObj.endTimestamp
  this.setTripEndDate = function(uid, tripId, endDate) { // end date in ms
    var tripObj = getTripObj(uid, tripId); // get trip obj
    tripObj.$loaded() // when trip object loads
    .then(
      function(response) {
        tripObj.endTimestamp = endDate; // set end date
        return tripObj.$save(); // return promise of saving tripObj changes
      }
    );
  };
});
