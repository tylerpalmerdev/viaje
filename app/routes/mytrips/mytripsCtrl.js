trvlApp.controller('mytripsCtrl', function($scope, currAuth, currUserSvc) {
  $scope.test = 'Mytrips ctrl connected!';

  currUserSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

});
