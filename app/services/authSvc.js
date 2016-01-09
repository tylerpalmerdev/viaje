trvlApp.service('authSvc', function($firebaseObject, $firebaseArray, $firebaseAuth, $state, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // private function within service to add new user data to fb data
  var addNewUserData = function(uid, newUserEmail, newUserName) {
    var refObj = getUserRefObj(uid); //
    refObj.email = newUserEmail;
    refObj.name = newUserName;
    refObj.$save()
    .then(
      function(response) {
        console.log('user ', newUserName, ' added to fb data!');
      }
    );
  };

  // private function to get fb ref for specific user, given their uid
  var getUserRefObj = function(uid) {
    var userRef = new Firebase(constants.fbBaseUrl + '/users/' + uid);
    return $firebaseObject(userRef);
  };

  // register new user
  this.register = function(newUserObj) {
    authObj.$createUser(newUserObj) // create new user in fb auth
    .then(
      function(response) {
        console.log('New user registered with response: ', response);
        userSvc.addNewUserData(response.uid, newUserObj.email, newUserObj.name); // add user data to own data
        // login using function above, which redirects to dash for new user
      },
      function(err) {
        console.log("Error with adding new user: ", err);
      }
    );
  };

  // login exisiting user
  this.login = function(userObj) {
    authObj.$authWithPassword(userObj)
    .then(
      function(response) {
        console.log('User logged in. redirecting to dash.');
        $state.go('dash');
      },
      function(err) {
        console.log('Login failed: ', err);
      }
    );
  };

  // get current auth status of user, e.g. to see if they can go to route
  this.getCurrentAuth = function() {
    return $firebaseAuth(ref);
  };

  // sign out user
  this.signOut = function() {
    $firebaseAuth(baseRef).$unauth();
  };
});
