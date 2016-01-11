trvlApp.controller('mytripsCtrl', function($scope, currAuth, opsSvc) {
  $scope.test = 'Mytrips ctrl connected!';

  // gets user data to be available to $scope of mytrips route/view
  opsSvc.getCurrUserData(currAuth.uid)
  .then(
    function(response) {
      $scope.userData = response;
    }
  );

  // opsSvc.getCurrTripData(currAuth.uid)
  // .then(
  //   function(response) {
  //     $scope.tripData = response;
  //   }
  // );

  $scope.allUserTrips = opsSvc.getTripsForUser(currAuth.uid);

  $scope.startTrip = function(newTripObj, firstStopObj) {
    opsSvc.startTripForUser(currAuth.uid, newTripObj, firstStopObj)
    .then(
      function(response) {
        console.log(response);
      }
    );
  };

});
