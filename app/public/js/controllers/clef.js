'use strict';

angular.module('MorningShiftIntro')
.controller("ClefCtrl", ["$window", 
	function ClefCtrl($window) {

	var vm = this;

	vm.isSupported = function () {
		if ($window.navigator && $window.navigator.standalone) {
			return false;
		}
		return true;
	}(); // closure
}]);