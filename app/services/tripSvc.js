trvlApp.service('tripSvc', function($firebaseArray, $firebaseObject, constants) {

  /*
  RESPONSIBILITY: adding/updating/removing trip data from firebase in /trips/
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */

  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/'); // base ref

  // get all trips for user, based on uid
  this.getTripsForUser = function(uid) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    return $firebaseArray(userTripsRef); // get all trips arr
  };

  this.addTrip = function(userId, tripObj) {
    tripObj.startTimestamp = new Date().toString();
    var tripsForUser = this.getTripsForUser(userId);
    return tripsForUser.$add(tripObj); // adds trip obj, returns promise
  };

  // get most recent trip of user
  this.getLatestTripOfUser = function(uid) {
    var userTrips = getTripsForUser(uid);
    return userTrips[userTrips.length - 1]; // return last item in array
  };
});
