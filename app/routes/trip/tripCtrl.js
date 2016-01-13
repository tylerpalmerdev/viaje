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
    // // add today's date as end date to current stop
    if ($scope.pastStop) { // if stop is in past
      // add new stop
      opsSvc.addStopToTrip(tripId, stopObj);
      // getCurrData req'd?
    } else { // if new stop & moving:
      var lastStopId = $scope.currData.lastStopId;
      var now = Date.parse(new Date().toString());
      opsSvc.addStopToTrip(tripId, stopObj);

      // opsSvc.addEndDateToStop(tripId, lastStopId, now)
      // .then(
      //   function(response) {
      //     console.log('End date added to last stop. Now adding new stop.');
      //     return opsSvc.addStopToTrip(tripId, stopObj);
      //   }
      // )
      // .then(
      //   function(response) {
      //     console.log('New stop added w/ start date of today. Response: ', response, 'Now updating currData.');
      //     opsSvc.getCurrData(currAuth.uid, $scope); // update currData on page
      //   }
      // );
    }
    opsSvc.getCurrData(currAuth.uid, $scope); // update data
    // clear obj (ang date input err)

    $scope.newStopObj = {};
  };

  // will only be used if current trip is active
  $scope.endCurrentTrip = function(tripId) {
    opsSvc.endTripForUser(currAuth.uid, $scope.currTripId)
    .then(
      function(response) {
        console.log('trip id: ', tripId, 'ended.');
      }
    );
  };

  console.log($scope);

});
