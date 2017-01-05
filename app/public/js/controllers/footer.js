'use strict';

angular.module('MorningShiftIntro')
.controller("FooterCtrl", ["$window", 
	function FooterCtrl($window) {

	var vm = this;

	/**
	* Determine if this browser supports emoji.
	*
	* Modified from https://gist.github.com/mwunsch/4710561
	* and probobly originally github's javascript source
	* 
	* Src: https://gist.github.com/mathisonian/7885295
	*/
	vm.doesSupportEmoji = function () {
		var context, smiley;
		if (!document.createElement('canvas').getContext) return;
		context = document.createElement('canvas').getContext('2d');
		if (typeof context.fillText != 'function') return;
		smiley = String.fromCharCode(55357) + String.fromCharCode(56835);

		context.textBaseline = "top";
		context.font = "32px Arial";
		context.fillText(smiley, 0, 0);
		return context.getImageData(16, 16, 1, 1).data[0] !== 0;
	};

}]);