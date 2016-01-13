trvlApp.controller('tripCtrl', function($scope, $stateParams, currAuth, opsSvc, uibDateParser) {
  // -- GET DATA FOR TRIP DETAIL $SCOPE -- //
  // $scope.userData
  opsSvc.getUserData(currAuth.uid, $scope);

  // $scope.currData (last stop, last trip)
  opsSvc.getCurrData(currAuth.uid, $scope);

  // $scope.allStops (from curr url tripId)
  $scope.currTripId = $stateParams.tripId;
  opsSvc.getTripStopsData($stateParams.tripId)
  .then(
    function(response) {
      $scope.allStops = response;
    }
  );

  // [REFACTOR TO ASYNC]
  $scope.tripData = opsSvc.getTripData(currAuth.uid, $stateParams.tripId);

  // UI functions
  $scope.showForm = false; // hide new stop form by default
  $scope.toggleForm = function() {
    $scope.showForm = !$scope.showForm;
  };

  // placeholder, want to pull from ops svc
  $scope.currTripStats = {
    countries: 2,
    stops: 5,
    distance: "1,545 mi"
  };

  // THE MAP IMG + THIS SHOULD BE A CUSTOM DIRECTIVE
  $scope.getMapUrl = function(lat, lon) {
    return opsSvc.getMapUrl(lat, lon);
  };

  // FUNCTIONS

  $scope.addStopToTrip = function(tripId, stopObj) {
    opsSvc.addStopToTrip(tripId, stopObj);
    // clear dates after clicking due to angular ng-model/ date input error
    $scope.newStopObj = {}; // clear for dates
  };

  // will only be used if current trip is active
  $scope.endTrip = function(tripId) {
    opsSvc.endTripForUser(currAuth.uid) //, $scope.tripData.latestTrip.$id)
    .then(
      function(response) {
        console.log('trip id: ', tripId, 'ended.');
        opsSvc.getUserData(currAuth.uid, $scope);  // update $scope.userData
      }
    );
  };

  console.log($scope);

});
