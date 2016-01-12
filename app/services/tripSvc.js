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

  // get most recent trip of user
  this.getLatestTripOfUser = function(uid) {
    var userTrips = getTripsForUser(uid);
    return userTrips[userTrips.length - 1]; // return last item in array
  };
});
