trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserEmail, newUserName) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserEmail; // add user data
    refObj.name = newUserName;
    refObj.$save() // save updated data
    .then(
      function(response) {
        console.log('user ', newUserName, ' added to fb data!');
      }
    );
  };

  this.getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };
});
