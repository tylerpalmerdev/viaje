trvlApp.controller('dashCtrl', function($scope, $state, currAuth, opsSvc) {

  // get data for current user on dash
  opsSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
      // console.log("Final user obj sent to dash CTRL: ", response);
    }
  );

  // when auth changes, go to login page
  // currAuth.$onAuth(function(authData) {
  //   $state.go('login');
  // });

});
