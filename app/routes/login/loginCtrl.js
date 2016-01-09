trvlApp.controller('loginCtrl', function($scope, $state, authSvc) {
  $scope.test = 'Ctrl connected!';
  $scope.signup = false; // default view: login, not new user reg

  $scope.showSignup = function() {
    $scope.signup = true;
  };

  $scope.showLogin = function() {
    $scope.signup = false;
  };

  $scope.login = function(userObj) {
    authSvc.login(userObj);
  };

  $scope.signup = function(newUserObj) {
    authSvc.register(newUserObj);
  };
});
