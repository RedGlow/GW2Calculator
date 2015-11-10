///<reference path="../../typings/jquery/jquery.d.ts"/>
///<reference path="../../typings/angularjs/angular.d.ts"/>
///<reference path="gw2api.d.ts"/>
///<reference path="types.ts"/>

interface IGw2CalculatorScope extends ng.IScope {
	expression: string;
	parsedExpression: string;
	result: any;
	error: Error;
	parsingError: Error;
	columnSpaces: string;
}

interface INodeRendererScope extends ng.IScope {
	value: any
}

angular.module("gw2-calculator", [
	'redglow.gw2api'
])
.directive('nodeUnknown', [function(): ng.IDirective {
	return {
		template: "<p>unknown type</p>"
	};
}])
.directive('nodeItemRenderer', [function() {
	return {
		template: "item {{value.item.name}} (id={{value.item.id}})"
	}
}])
.directive('nodeCostRenderer', [function() {
	return {
		template: "cost: {{value}}"
	};
}])
.directive('nodeRenderer', ["$q", "GW2API", "$compile", function($q: ng.IQService, api: IGW2API, $compile: ng.ICompileService): ng.IDirective {
	return {
		scope: {
			value: '='
		},
		compile: function(
            templateElement: ng.IAugmentedJQuery,
            templateAttributes: ng.IAttributes,
            transclude: ng.ITranscludeFunction
        ): ng.IDirectivePrePost {
			return {
				pre: null,
				post: (
					scope: INodeRendererScope,
					instanceElement: ng.IAugmentedJQuery,
					instanceAttributes: ng.IAttributes,
					controller: {},
					transclude: ng.ITranscludeFunction
				) => {
					scope.$watch('value', function() {
						var contents: string;
						if(scope.value instanceof Typing.Cost) {
							contents = "<node-cost-renderer/>";
						} else if(scope.value instanceof Typing.ItemWrapper) {
							contents = "<node-item-renderer/>";
						} else {
							contents = "<node-unknown/>";
						}
						var compiled = $compile(contents);
						templateElement.contents().remove();
						compiled(scope, function(clone) {
							templateElement.append(clone);
						});
					});
				}
			};
		}
	};
}])
.controller('MainController', ["$q", "$scope", "GW2API", ($q: ng.IQService, $scope: IGw2CalculatorScope, GW2API: IGW2API) => {
	$scope.expression = "getItem(934)";
	$scope.result = null;
	$scope.error = null;
	$scope.parsingError = null;
	$scope.$watch('expression', function() {
		try {
			var parsed = gw2CalculatorParser.parse($scope.expression);
			$scope.parsedExpression = parsed.toString();
			parsed.getValue($q, GW2API).then(result => {
				$scope.result = result;
			});
			$scope.error = null;
			$scope.parsingError = null;
		} catch(e) {
			$scope.parsedExpression = null;
			$scope.result = null;
			if(e.constructor.name === "SyntaxError") {
				$scope.parsingError = e;
				$scope.columnSpaces = new Array(e.column).join(' ');
			} else {
				$scope.error = e;
			}
		}
	});
}])
;