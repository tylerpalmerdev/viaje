trvlApp.service('writeSvc', function($firebaseArray, $firebaseObj, constants) {

  var rootRef = new Firebase(constants.fbBaseUrl + '/entries/');

  this.getEntriesForStop = function(stopId) {
    var stopEntriesRef = rootRef.child(stopId);
    var stopEntries = $firebaseArray(userTripsRef);
    return stopEntries;
  };

  this.addEntryForStop = function(stopId, entryObj) {
    var stopEntries = this.getEntriesForStop(stopId); // use method above to get entries
    return stopEntries.$add(entryObj); // add entry and return promise
  };

  this.deleteEntry = function(stopId, entryId) {
    // var stopEntriesRef = rootRef.child(stopId);
    // var entriesObj = $firebaseObject(stopEntriesRef);
    // return entriesObj.$remove(entryId); //return promise to do something after entry is removed
  };
});
