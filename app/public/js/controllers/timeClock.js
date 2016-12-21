'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["$http", "$cookies", function TimeClockCtrl($http, $cookies) {

	var vm = this;

	var isClockedIn = $cookies.get("isClockedIn");
	var clockedInDate = $cookies.get("clockedInDate");

	vm.isClockedIn = isClockedIn ? true : false;
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