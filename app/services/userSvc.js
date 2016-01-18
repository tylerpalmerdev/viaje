trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, util, constants) {
  /*
  RESPONSIBILITY: adding, getting, and deleting data from /users/ in fb
  NO INTERNAL SERVICE DEPENDENCIES (except for constants & util)
  All methods return promises
  */
  // firebase ref to /users/ data
  var baseRef = new Firebase(constants.fbBaseUrl + '/users/');

  // get user data obj from fb /users/:uid
  this.getUserRefObj = function(uid) {
    // return promise of getting user data obj when loaded
    return $firebaseObject(baseRef.child(uid)).$loaded();
  };

  // add new user data to /users/ after the user has 'signed up' via authSvc
  this.addDataForNewUser = function(uid, newUserObj) {
    return this.getUserRefObj(uid)
    .then(
      function(response) {
        response.email = newUserObj.email;
        response.name = newUserObj.name;
        response.homeCity = newUserObj.homeCity; // home city data added by citySearch directive
        response.onTrip = false; // default: user starts out as not on trip.
        response.userStats = {
          trips: 0,
          countries: 0,
          cities: 0,
          entries: 0,
          distance: 0
        };
        return response.$save(); // return promise of saving new userObj
      },
      util.rejectLog
    );
  };

  // set val of userObj.onTrip (true or false)
  this.changeUserOnTrip = function(uid, bool) {
    // get user obj w/ ref from uid
    return this.getUserRefObj(uid)
    .then(
      function(response) { // response is user ref obj
        response.onTrip = bool; // change userObj.onTrip to bool
        // return promise that resolves when userObj.onTrip is saved
        return response.$save();
      },
      util.rejectLog
    );
  };

}); //END
