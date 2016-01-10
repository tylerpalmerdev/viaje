trvlApp.service('tripSvc', function($firebaseArray, $firebaseObject, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/trips/'); // base ref

  this.getTripsForUser = function(uid) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    var userTrips = $firebaseArray(userTripsRef); // get all trips
    return userTrips;
  };

  this.addTripForUser = function(uid, tripObj) {
    var userTripsRef = rootRef.child(uid); // get fb ref
    var userTrips = $firebaseArray(userTripsRef); // get all user trips
    // stopSvc.addStop(tripId, tripObj.firstStopObj)
    // change current trip to new trip, change user.onTrip to true;
    return userTrips.$add(tripObj); // add tripObj and return promise
  };


  this.endCurrentTrip = function(uid) {
    // get current trip for user
    // add end date for trip
    // currentUser.onTrip = false;
  };
});

/*
viaje/

-/users
--/:uid
---/ {
      email: 'a@b.c',
      home: 'Madrid, Spain',
      name: 'Steve Young',
      onTrip: true, <-- check last trip in trips for user to see if active
      currentLocation: 'okasdoASokf'
     }
-/trips
--/:uid <-- all trips for user
---/:tripId {
      tripName: 'EuroTrip',
      isActive: true,
      startDate: '2015-12-03',
      endDate: null, <-- date if not current trip
      currentStopId: 'asdASDfasd7fas', <-- could just get last stop in array + isActive = true null if doesn't apply
    },...

-/stops
--/:tripId
---/:stopId { <-- all stops for trip
      stopName: 'Havana, Cuba',
      isCurrentLocation: true, <-- could just check to see if it has departure date
      arrivalDate: '2015-12-03',
      departureDate: null,
      stopData: {}, <--from autocomplete dir data
      lastEntryId: 'asjgaASgaskdg12' <--could just get last entry of entries array
     }

-/entries
--/:stopId
---/:entryId { <-- all entries for stop
      text: "asdgasdg",
      timestamp: "2015-02-12 05:15PM PST"
     }

*/
