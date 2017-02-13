'use strict';

angular.module('MorningShiftIntro')
.controller("TimeClockCtrl", ["member", "$http", "$cookies", "$interval", 
	function TimeClockCtrl(member, $http, $cookies, $interval) {

	var vm = this;
	vm.serverTimeOffset = 0;
	vm.isDurationValid = false;

	vm.toggleClockIn = function () {
		if (!vm.isClockedIn) {
			startShift();
		}
		else {
			stopShift();
		}
	};

	function setupServerTimeOffset() {
		$http.get('/api/now').then(function (res) {
			var serverTime = new Date(parseInt(res.data));
			vm.serverTimeOffset = Date.now() - serverTime;
		});
	}

	function getIsClockedIn(callback) {
		$http.get('/api/shift').then(function (res) {

			var shift = res.data;

			if (shift) {
				// Signed in ...
				if (shift.startDate) {
					// Shift started ...
					resumeShift(shift.startDate);
					return callback(true);
				}
				else {
					// Shift stopped.
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

	function timeNow() {
		return Date.now() - vm.serverTimeOffset;
	}

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

		resumeShift(timeNow())
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

		vm.isClockedIn = false;
		member.shiftStartedAt = null;
		$cookies.put("isClockedIn", vm.isClockedIn);
	}

	function updateViewModel() {
		getIsClockedIn(function (isClockedIn) {
			if (isClockedIn) {
				var clockedInDate = getClockedInDate();

				var now  = timeNow();
				var diff = now - vm.clockedInDate;

				var totalSeconds = Math.floor(diff / 1000);

				var hours   = Math.floor(totalSeconds / (60 * 60));
				var minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
				var seconds = Math.floor((totalSeconds % (60 * 60)) % 60);

				// Auto-sign out if people have been "clocked in" 
				// for over 24 hours.
				if (hours > 24) {
					stopShift();
					return;
				}

				if (hours < 10) {
					hours = "0" + hours;
				}
				if (minutes < 10) {
					minutes = "0" + minutes;
				}
				if (seconds < 10) {
					seconds = "0" + seconds;
				}

				vm.clockedInDate = clockedInDate;
				// Don't show the shift duration until we 
				// have a server time offset
				vm.shiftDuration = hours + ":" + minutes + ":" + seconds;
				if (vm.serverTimeOffset !== 0) {
					vm.isDurationValid = true;
				}
			}

			vm.isClockedIn = isClockedIn;

		});
	}

	function resetShiftDuration() {
		vm.shiftDuration = "00:00:00";
	}

	setupServerTimeOffset();
	updateViewModel();

	if (member.shiftId) {
		$cookies.put("shiftId", member.shiftId);
	}

	$interval(updateViewModel, 1000);
}]);