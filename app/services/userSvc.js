trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserObj) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserObj.email; // add user data
    refObj.name = newUserObj.name;
    refObj.country = newUserObj.country;
    return refObj.$save(); // save updated data, return promise
  };

  this.getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };
});
