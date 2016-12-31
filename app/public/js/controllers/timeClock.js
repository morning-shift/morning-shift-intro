'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["member", "$http", "$cookies", "$interval", 
	function TimeClockCtrl(member, $http, $cookies, $interval) {

	var vm = this;

	function getIsClockedIn(callback) {
		$http.get('/api/shift').then(function (res) {

			var shift = res.data;

			if (shift) {
				// Signed in ...
				console.log('signed in...');
				console.log(shift);
				if (shift.startDate) {
					// Shift started ...
					console.log('shift started...');
					resumeShift(shift.startDate);
					return callback(true);
				}
				else {
					// Shift stopped.
					console.log('shift stopped');
					return callback(false)
				}
			}

			// Not signed in ...
			var val = $cookies.get("isClockedIn");

			if (val === "false") {
				return callback(false);
			}

			if (val === "true") {
				return callback(true);
			}

			return callback(val);
		});
	}

	var getClockedInDate = function () {
		var dateString = $cookies.get("clockedInDate");
		return new Date(parseInt(dateString));
	};

	var logError = function (err) {
		console.log(err);
	};


	function startShift() {
		resetShiftDuration();

		$http.post('/api/shift/start')
		.then(shiftStarted)
		.catch(logError);
	}

	function resumeShift(date) {
		vm.clockedInDate = date;
		$cookies.put("clockedInDate", vm.clockedInDate);

		vm.isClockedIn = true;
		$cookies.put("isClockedIn", vm.isClockedIn);
	}

	function shiftStarted (res) {
		var shiftData = res.data;

		resumeShift(Date.now())
		$cookies.put("shiftId", shiftData.shiftId);
	}

	function stopShift() {
		var shiftData = {
			shiftId: $cookies.get("shiftId")
		};

		$http.put('/api/shift/stop', shiftData)
		.then(shiftStopped)
		.catch(shiftStopped); // Errors are fine
	}

	function shiftStopped (res) {
		var data = res.data;
		console.log(data);

		vm.isClockedIn = false;
		member.shiftStartedAt = null;
		$cookies.put("isClockedIn", vm.isClockedIn);
	}

	function updateViewModel() {
		getIsClockedIn(function (isClockedIn) {
			vm.isClockedIn = isClockedIn;
			if (vm.isClockedIn) {
				vm.clockedInDate = getClockedInDate();

				var now  = Date.now();
				var diff = now - vm.clockedInDate;

				var totalSeconds = Math.floor(diff / 1000);

				var hours   = Math.floor(totalSeconds / (60 * 60));
				var minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
				var seconds = Math.floor((totalSeconds % (60 * 60)) % 60);

				if (hours < 10) {
					hours = "0" + hours;
				}
				if (minutes < 10) {
					minutes = "0" + minutes;
				}
				if (seconds < 10) {
					seconds = "0" + seconds;
				}

				vm.shiftDuration = hours + ":" + minutes + ":" + seconds;
			}
		});
	}

	function resetShiftDuration() {
		vm.shiftDuration = "00:00:00";
	}

	updateViewModel();
	vm.toggleClockIn = function () {
		if (!vm.isClockedIn) {
			startShift();
		}
		else {
			stopShift();
		}
	};

	if (member.shiftId) {
		$cookies.put("shiftId", member.shiftId);
	}

	$interval(updateViewModel, 1000);
}]);