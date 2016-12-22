'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["$http", "$cookies", function TimeClockCtrl($http, $cookies) {

	var vm = this;

	var isClockedIn = function () {
		var val = $cookies.get("isClockedIn");

		if (val === "false") {
			return false;
		}

		if (val === "true") {
			return true;
		}

		return val;
	}(); // closure

	var clockedInDate = $cookies.get("clockedInDate");

	vm.isClockedIn = isClockedIn;
	vm.clockedInDate = clockedInDate;

	vm.toggleClockIn = function () {
		vm.isClockedIn = !vm.isClockedIn;
		$cookies.put("isClockedIn", vm.isClockedIn);

		if (vm.isClockedIn) {
			vm.clockedInDate = Date.now();
			$cookies.put("clockedInDate", vm.clockedInDate);
		}

		// TODO: Send vm.isClockedIn to server ...
	};
}]);