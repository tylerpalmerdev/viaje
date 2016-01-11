trvlApp.controller('dashCtrl', function($scope, $state, currAuth, userSvc) {

  // get data for current user on dash
  userSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
      console.log("Final user obj sent to CTRL: ", response);
    }
  );

  // when auth changes, go to login page
  // currAuth.$onAuth(function(authData) {
  //   $state.go('login');
  // });

});
