trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, $q, constants) {
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
  this.changeUserOnTrip = function(uid, bool) {
    // get user obj w/ ref from uid
    var def = $q.defer();
    var userObj = $firebaseObject(baseRef.child(uid));
    userObj.$loaded() // wait until object has loaded
    .then(
      function(response) { // when loaded
        // console.log(response);
        // var loadedUserObj = response;
        userObj.onTrip = bool; //onTrip property to T/F XX
        userObj.$save();
        def.resolve('user obj.onTrip updated to ' + bool); // save obj, return promise
      },
      constants.rejectLog
    );
    return def.promise;
  };

//BOTTOM
});
