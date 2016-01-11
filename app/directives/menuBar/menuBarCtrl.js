trvlApp.controller('menuBarCtrl', function($scope, authSvc) {

  $scope.logout = function() {
    authSvc.signOut();
  };


});
