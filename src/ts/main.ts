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
	value: any;
	type: string;
}

interface IFile {
	id: string;
	icon: string;
}

interface IMyRootScope extends ng.IRootScopeService {
	copperIcon: string;
	silverIcon: string;
	goldIcon: string;
}

angular.module("gw2-calculator", [
	'redglow.gw2api'
])
.factory('RecursionHelper', ['$compile', function($compile){
    return {
        /**
         * Manually compiles the element, fixing the recursion loop.
         * @param element
         * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
         * @returns An object containing the linking functions.
         */
        compile: function(element, link){
            // Normalize the link parameter
            if(angular.isFunction(link)){
                link = { post: link };
            }

            // Break the recursion loop by removing the contents
            var contents = element.contents().remove();
            var compiledContents;
            return {
                pre: (link && link.pre) ? link.pre : null,
                /**
                 * Compiles and re-adds the contents
                 */
                post: function(scope, element){
                    // Compile the contents
                    if(!compiledContents){
                        compiledContents = $compile(contents);
                    }
                    // Re-add the compiled contents to the element
                    compiledContents(scope, function(clone){
                        element.append(clone);
                    });

                    // Call the post-linking function, if any
                    if(link && link.post){
                        link.post.apply(null, arguments);
                    }
                }
            };
        }
    };
}])
.directive('nodeUnknown', [function(): ng.IDirective {
	return {
		template: "<p>unknown type</p>"
	};
}])
.directive('nodeNumberRenderer', [function() {
	return {
		scope: {
			value: '='
		},
		template: "{{value}}"
	};
}])
.directive('nodeItemRenderer', [function() {
	return {
		scope: {
			item: '='
		},
		template: "<img class='item-image' ng-src='{{item.icon}}'/> {{item.name}}"
	}
}])
.directive('nodeCostRenderer', [function(): ng.IDirective {
	return {
		scope: {
			cost: '='
		},
		controller: ['$scope', "$rootScope", function($scope, $rootScope: IMyRootScope) {
			var data = this;
			var cost = $scope.cost;
			data.negative = false;
			if(cost < 0) {
				data.negative = true;
				cost = -cost;
			}
			cost = Math.round(cost);
			data.copper = cost % 100;
			cost -= data.copper;
			cost /= 100;
			data.silver = cost % 100;
			cost -= data.silver;
			cost /= 100;
			data.gold = cost % 100;
			$rootScope.$watch('goldIcon', function() {
				data.goldIcon = $rootScope.goldIcon;
				data.silverIcon = $rootScope.silverIcon;
				data.copperIcon = $rootScope.copperIcon;
			});
		}],
		controllerAs: 'data',
		template: "<span ng-if='data.negative'>-</span> <span ng-if='data.gold != 0'>{{data.gold}}<img class='coin-icon' ng-src='{{data.goldIcon}}'/></span> <span ng-if='data.gold != 0 || data.silver != 0'>{{data.silver}}<img class='coin-icon' ng-src='{{data.silverIcon}}'/></span> {{data.copper}}<img class='coin-icon' ng-src='{{data.copperIcon}}'/>"
	};
}])
.directive('nodeTableRenderer', ["RecursionHelper", function(RecursionHelper) {
	return {
		scope: {
			table: '='
		},
		template:
"<table class='table'>" +
	"<thead>" +
		"<tr>" +
			"<th ng-repeat='header in table.headers'>{{header}}</th>" +
		"</tr>" +
	"</thead>" +
	"<tbody>" +
		"<tr ng-repeat='content in table.contents'>" +
			"<td ng-repeat='cell in content'>" +
				"<node-renderer value='cell'></node-renderer>" +
			"</td>" +
		"</tr>" +
	"</tbody>" +
"</table>",
		compile: function(element) {
            // Use the compile function from the RecursionHelper,
            // And return the linking function(s) which it returns
            return RecursionHelper.compile(element);
        }
	};
}])
.directive('nodeRenderer', ["$q", "GW2API", "$compile", function($q: ng.IQService, api: IGW2API, $compile: ng.ICompileService): ng.IDirective {
	return {
		scope: {
			value: '='
		},
		template:
			"<div ng-switch on='type'>" +
				"<node-number-renderer ng-switch-when='number' value='value.value'></node-number-renderer>" +
				"<node-cost-renderer ng-switch-when='cost' cost='value.value'></node-cost-renderer>" +
				"<node-item-renderer ng-switch-when='item' item='value.item'></node-item-renderer>" +
				"<node-table-renderer ng-switch-when='table' table='value'></node-table-renderer>" +
				"<node-unknown ng-switch-default></node-unknown>" +
			"</div>",
		link: function(
            scope: INodeRendererScope,
            instanceElement: ng.IAugmentedJQuery,
            instanceAttributes: ng.IAttributes,
            controller: {},
            transclude: ng.ITranscludeFunction
        ): void {
			scope.$watch('value', function() {
				if(scope.value instanceof Typing.NumberWrapper) {
					scope.type = "number";
				} else if(scope.value instanceof Typing.Cost) {
					scope.type = "cost";
				} else if(scope.value instanceof Typing.ItemWrapper) {
					scope.type = "item";
				} else if(scope.value instanceof Typing.Table) {
					scope.type = "table";
				} else {
					scope.type = "unknown";
				}
				console.log("scope.value =", scope.value, "; type =", scope.type);
			});
		}
	};
}])
.controller('MainController', ["$q", "$scope", "GW2API", "$http", "$rootScope", ($q: ng.IQService, $scope: IGw2CalculatorScope, GW2API: IGW2API, $http: ng.IHttpService, $rootScope: IMyRootScope) => {
	$scope.expression =
"makeTable(Item, Sell order, Sell contents)\n"+
"(\n"+
"getItem(75919),\n"+
"cost(getCost(75919,sell)),\n"+
"cost(-2000+\n"+
"  (\n"+
"  getCost(24341,sell)*165+\n"+
"  getCost(24294,sell)*140+\n"+
"  getCost(24299,sell)*110+\n"+
"  getCost(24282,sell)*170+\n"+
"  getCost(24288,sell)*120+\n"+
"  getCost(24356,sell)*125+\n"+
"  getCost(24350,sell)*195+\n"+
"  getCost(24276,sell)*160+\n"+
"  getCost(49424,sell)*1124+\n"+
"  1000*420+\n"+
"  1500*59+\n"+
"  1500*59+\n"+
"  10000*16+\n"+
"  50000*5+\n"+
"  getCost(74268,sell)*3+\n"+
"  0)/500\n"+
")\n"+
")"
;
	$scope.result = null;
	$scope.error = null;
	$scope.parsingError = null;
	$scope.$watch('expression', function() {
		try {
			console.log("parsing", $scope.expression);
			var parsed = gw2CalculatorParser.parse($scope.expression);
			console.log("parsed:", parsed);
			$scope.parsedExpression = parsed.toString();
			console.log("parsed.toString():\n", $scope.parsedExpression);
			parsed.getValue($q, GW2API).then(result => {
				console.log("got result:", result);
				$scope.result = result;
			}, (reason: any) => {
				console.log("got error:", reason);
			});
			$scope.error = null;
			$scope.parsingError = null;
		} catch(e) {
			console.log("got an error:", e);
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
	$http.get('https://api.guildwars2.com/v2/files?ids=all').then((response: ng.IHttpPromiseCallbackArg<IFile[]>) => {
		response.data.forEach((value) => {
			if(value.id == "ui_coin_copper") {
				$rootScope.copperIcon = value.icon;
			}
			if(value.id == "ui_coin_silver") {
				$rootScope.silverIcon = value.icon;
			}
			if(value.id == "ui_coin_gold") {
				$rootScope.goldIcon = value.icon;
			}
		})
	});
}])
;