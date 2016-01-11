trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, constants) {
  /*
  RESPONSIBILITY: adding, getting, and deleting data from /users/ in fb
  NO INTERNAL SERVICE DEPENDENCIES (except for constants)
  */

  // base reference for users data in firebase
  var baseRef = new Firebase(constants.fbBaseUrl + '/users/');

  // add new user data to /users/ after the user has 'signed up' via authSvc
  this.addDataForNewUser = function(uid, newUserObj) {
    var refObj = $firebaseObject(baseRef.child(uid)); // get ref obj for user from fb
    refObj.email = newUserObj.email;
    refObj.name = newUserObj.name;
    refObj.homeCity = newUserObj.homeCity; // obj of data about city
    refObj.onTrip = false; // default: user starts out as not on trip.
    refObj.userStats = {
      trips: 0,
      countries: 0,
      cities: 0,
      entries: 0,
      distance: 0
    };
    return refObj.$save(); // return promise of saving data to fb obj
  };

  // get user data from fb /users/:uid
  this.getUserRefObj = function(uid) {
    var userObj = $firebaseObject(baseRef.child(uid));
    return userObj.$loaded(); // return promise of getting user data obj when loaded
  };

  // set val of userObj.onTrip (true or false)
  this.isUserOnTrip = function(uid, bool) {
    this.getUserRefObj(uid) // request user ref object
    .then(
      function(response) { // when loaded
        response.onTrip = bool; //onTrip property to true
        return response.$save(); // save obj
      }
    );
  };
});
