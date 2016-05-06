'use strict';

angular.module('CopperHeart')
.controller('SubscribeController', 
    ['$scope', SubscribeController]);

function SubscribeController($scope) {

    $scope.amount = undefined;

    var handler = StripeCheckout.configure({
        key: 'pk_test_yDbrXtFE5wIe0nRvcUT39JEN',
        image: 'https://s3.amazonaws.com/stripe-uploads/acct_18818EAOogUkjkilmerchant-icon-1462511432881-black-circle.png',
        locale: 'auto',
        token: function(token) {
          // You can access the token ID with `token.id`.
          // Get the token ID to your server-side code for use.
          console.log(token);
          console.log($scope.amount);
        }
    });
    
    $scope.subscribe = function (amount) {
        $scope.amount = amount;
        // Open Checkout with further options:
        handler.open({
          name: 'Support Phil Manijak',
          description: 'Contribute $' + amount + ' per month',
          amount: amount * 100
        });
    };
};