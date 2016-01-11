trvlApp.service('authSvc', function($firebaseObject, $firebaseArray, $firebaseAuth, $state, $q, constants, userSvc) {

  var baseRef = new Firebase(constants.fbBaseUrl);
  var usersRef = new Firebase(constants.fbBaseUrl + '/users/');
  var authObj = $firebaseAuth(baseRef);
  var users = $firebaseArray(usersRef);

  // help's determine what form is shown in login view
  this.newUser = false;

  // event listener to keep track of auth state:
  // authObj.$onAuth(function(authData) {
  //   console.log('Auth status changed (see authObj.$onAuth in authSvc)', authData);
  // });

  // register new user [REFACTOR TO REGISTER & SIGN IN AT SAME TIME AND ROUTE TO DASH]
  this.register = function(newUserObj) {
    var def = $q.defer(); // create defer obj
    authObj.$createUser(newUserObj) // create new user in fb auth
    .then( // once promise is finished:
      function(response) {
        console.log('New user registered with response: ', response, '. Now adding data to internal fb database.');
        return userSvc.addDataForNewUser(response.uid, newUserObj); // add user data to own data, return promise to next chain
      },
      function(err) {
        console.log("Error with registering new user: ", err);
      }
    )
    .then( // once addUserData promise is finished:
      function(response) {
        console.log('New user data added to fb.');
        def.resolve(response);
      },
      function(err) {
        console.log('Error adding new user data to fb: ', err);
        def.reject(err);
      }
    );
    return def.promise;
  };

  // login exisiting user
  this.login = function(userObj) {
    return authObj.$authWithPassword(userObj);
  };

  // get current auth status of user, e.g. to see if they can go to route
  this.getCurrentAuth = function() {
    return $firebaseAuth(baseRef);
  };

  // new get current auth status of user, returns promise that rejects if user logged out [REFACTOR INTO ONE FUNCTION FOR ALL ROUTES]
  this.isLoggedOut = function() {
    var auth = $firebaseAuth(baseRef); // get auth obj
    var def = $q.defer(); // create deferrer
    auth.$requireAuth() // check auth (returns promise)
    .then(
      function(response) { // if promise resolves, user is logged in, reject promise
        console.log('user loggged in, not allowed to login page.');
        def.reject();
      },
      function(err) { // if promise rejects, user is not logged in, resolve promise because they are allowed to login
        console.log('user not logged in, OK to go to login page.');
        def.resolve();
      }
    );
    return def.promise; // return deferrer promise
  };

  // sign out user
  this.signOut = function() {
    $firebaseAuth(baseRef).$unauth();
    $state.go('login');
    console.log('user logged out!');
  };
});
