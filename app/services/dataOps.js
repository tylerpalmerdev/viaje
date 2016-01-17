trvlApp.service('dataOps', function(util, userSvc, tripSvc, stopSvc) {
  /*
  Used to retrieve userData and currData for $scope in each route
  */
  // userData: pull current user data from userSvc, as it is in DB (mytrips & trip)
  this.getUserData = function(uid, scopeObj) {
    userSvc.getUserRefObj(uid)
    .then(
      function(response) {
        scopeObj.userData = response;
      }
    );
  };

  // currData: get active (trip.isActive = true) OR last trip ID for user and last stop Id for trip. Last based on end date.
  this.getCurrData = function(uid, scopeObj) {

    var currData = {}; // last tripId, last stopId, tripIsActive =  t/f
    tripSvc.getTripsForUser(uid) //"-K7qmc3o65fsEgmAkzHw"
    .then(
      function(response) {
        var userTrips = response; // fb array
        var latestEnd = 0; // set as 0 to compare
        for (var i = 0; i < userTrips.length; i++) {
          var trip = userTrips[i];
          var endTimestamp = trip.endTimestamp; // convert to number to compare
          if (trip.isActive === true) { // if active trip is found, set data and return:
            currData.tripIsActive = true;
            currData.lastTripId = trip.$id;
            currData.lastTripName = trip.name;
            break; // break out of for loop if active trip found
          }
          else { // if active trip not found:
            currData.tripIsActive = false;
            // console.log(endTimestamp);
            if (!endTimestamp) {
              // console.log("trip has undefined end date and is not set to 'isActive'");
            } else if (endTimestamp > latestEnd) {
              latestEnd = endTimestamp;
              currData.lastTripName = trip.name;
              currData.lastTripId = trip.$id; // set latest trip equal to trip id
            }
          }
        }
        return stopSvc.getStopsForTrip(currData.lastTripId);
      },
      util.rejectLog // log for promise reject
    )
    .then(
      function(response) {
        var tripStops = response; // arr
        var latest = 0; // for comparison
        for (var k = 0; k < tripStops.length; k++) {
          var stop = tripStops[k];
          var departStamp = stop.departTimestamp;
          var arriveStamp = stop.arriveTimestamp;
          if (!departStamp && !arriveStamp) {
            console.log("a stop on the user's latest trip has no start or end date.");
          } else if (!departStamp && arriveStamp > latest) { // if no depart but arrived later
            // console.log(arriveStamp);
            latest = arriveStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopData = stop.stopData;
            currData.lastStopId = stop.$id;
          } else if (departStamp && departStamp > latest) { // if depart stamp is present && later
            // console.log(departStamp);
            latest = departStamp;
            currData.lastStop = stop.stopData.placeString;
            currData.lastStopId = stop.$id;
          }
        }
        scopeObj.currData = currData; // once all done, final step, set scopeObj.currData to result
      },
      util.rejectLog // log for promise reject
    );
  };

});
