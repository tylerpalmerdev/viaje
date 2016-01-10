trvlApp.service('userSvc', function($firebaseArray, $firebaseObject, $q, constants) {
  var baseRef = new Firebase(constants.fbBaseUrl);

  this.addNewUserData = function(uid, newUserObj) {
    var refObj = this.getUserRefObj(uid); // get ref obj for user from fb
    refObj.email = newUserObj.email; // add user data
    refObj.name = newUserObj.name;
    refObj.country = newUserObj.country;
    return refObj.$save(); // save updated data, return promise
  };

  this.getUserRefObj = function(uid) {
    var def = $q.defer();
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    $firebaseObject(userRef).$loaded()
    .then(
      function(response) {
        def.resolve(response);
      },
      function(err) {
        def.reject(err);
      }
    );
    return def.promise;
  };
  
});
