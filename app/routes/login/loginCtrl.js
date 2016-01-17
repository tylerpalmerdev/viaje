trvlApp.controller('loginCtrl', function(constants, $scope, $state, authSvc) {

  $scope.newuser = false; // default view: login, not new user reg

  $scope.toggleForm = function() {
    $scope.newuser = !$scope.newuser;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj)
    .then(
      function(response) {
        console.log('User logged in. redirecting to dash.');
        $state.go('mytrips');
      },
      function(err) {
        console.log('Login failed: ', err);
      }
    );
  };

  $scope.signup = function(newUserObj) {
    authSvc.register(newUserObj) // run register method
    .then(
      function(response) {
        $scope.newuser = false; // once completed, change to login form
      }
    );
  };

});
