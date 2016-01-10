trvlApp.controller('dashCtrl', function($scope, currAuth, currUserSvc) {

  currUserSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

});
