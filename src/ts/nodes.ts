///<reference path="gw2api.d.ts"/>
///<reference path="wiki.ts"/>

namespace Parser {
    function inject(...dependencies: string[]): PropertyDecorator {
        return (target: Object, propertyKey: string) => {
            target[propertyKey]['$inject'] = dependencies;
        }
    }
    
	enum NodeType {
		Item,
		Number,
		Void,
		Cost,
		Table,
		Boolean
	}
	
	export class NoPromiseValueException extends Error {
	}
	
	export interface INode {
		toString(): string;
		getType(): NodeType;
		getValue(...args: any[]): ng.IPromise<any>;
	}
	
	export class Number implements INode {
		value: number;
		
		constructor(text: string[]) {
			this.value = parseFloat(text.join(""));
		}
		
		public toString(): string {
			return this.value.toString();
		}
		
		public getType(): NodeType {
			return NodeType.Number;
		}

        @inject('$q')
		getValue($q: ng.IQService): ng.IPromise<Typing.NumberWrapper> {
			return $q.when(new Typing.NumberWrapper(this.value));
		}
	}
	
	interface ExpectedFunction {
		(message: string): void;
	}
	
	export abstract class FunctionCall implements INode {
		constructor(public expected: ExpectedFunction, public name: string) {
		}
		abstract toString(): string;
		abstract getType(): NodeType;
		abstract getValue(...args: any[]): ng.IPromise<any>;
		protected throwError(numParameter: string, type: string) {
			this.expected("a " + this.name + " call with " + type + " as " + numParameter + " parameter");
		}
	}
	
	export class GetItemFunctionCall extends FunctionCall {
		constructor(public id: INode, expected: ExpectedFunction) {
			super(expected, "getItem");
			if(id.getType() != NodeType.Number) {
				this.throwError("first", "a number");
			}
		}

		public toString(): string {
			return "getItem(" + this.id.toString() + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Item;
		}

        @inject('GW2API', '$injector')
		getValue(api: IGW2API, $injector: ng.auto.IInjectorService): ng.IPromise<Typing.ItemWrapper> {
			// get the id
			return $injector.invoke(this.id.getValue, this.id).then((value: Typing.NumberWrapper) => {
				// get the item
				return api.getItem(value.value);
			}).then((item: Item) => {
				return new Typing.ItemWrapper(item);
			});
		}
	}
	
	export class GetCostFunctionCall extends FunctionCall {
		buy: boolean;
		
		constructor(public id: INode, buyOrSell: string, expected: ExpectedFunction) {
			super(expected, "getCost");
			if(id.getType() != NodeType.Number) {
				this.throwError("first", "a number");
			}
			this.buy = buyOrSell == "buy";
		}

		public toString(): string {
			return "getCost(" + this.id.toString() + ", " + (this.buy ? "buy" : "sell") + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Number;
		}

        @inject('GW2API', '$injector')
		getValue(api: IGW2API, $injector: ng.auto.IInjectorService): ng.IPromise<Typing.NumberWrapper> {
			// get the item
			return $injector.invoke(this.id.getValue, this.id).then((id: Typing.NumberWrapper) => {
				// get the listing
				return api.getListing(id.value);
			}).then(listing => {
				// get the unit price
				if(this.buy) {
					return new Typing.NumberWrapper(listing.buys[0].unit_price);
				} else {
					return new Typing.NumberWrapper(listing.sells[0].unit_price);
				}
			});
		}
	}
	
	export class IfCall extends FunctionCall {
		constructor(public condition: INode, public trueResult: INode, public falseResult: INode, expected: ExpectedFunction) {
			super(expected, "if");
			if(condition.getType() != NodeType.Boolean) {
				this.throwError("first", "a boolean");
			}
			if(trueResult.getType() != falseResult.getType()) {
				this.throwError("second", "the same type as the third argument");
			}
		}
		public toString(): string {
			return "if(" + this.condition.toString() + "," + this.trueResult.toString() + "," + this.falseResult.toString() + ")";
		}
		public  getType(): NodeType {
			return this.trueResult.getType();
		}
        @inject('$injector')
		public getValue($injector: ng.auto.IInjectorService): ng.IPromise<any> {
			return $injector.invoke(this.condition.getValue, this.condition).then((condition: Typing.Boolean) => {
				var result: INode;
				if(condition.value) {
					result = this.trueResult;
				} else {
					result = this.falseResult;
				}
				return $injector.invoke(result.getValue, result);
			});
		}
	}
    
    interface IRevisionsQueryResponse {
        query: IRevisionsQueryResponseSubQuery;
    }
    
    interface IRevisionsQueryResponseSubQuery {
        pages: { [pageid: number]: IRevisionsQueryResponseSubQueryPage }
    }
    
    interface IRevisionsQueryResponseSubQueryPage {
        ns: number;
        pageid: number;
        revisions: IRevisionsQueryResponseSubQueryPageRevision[];
    }
    
    interface IRevisionsQueryResponseSubQueryPageRevision {
        contentmodel: string;
        contentformat: string;
        '*': string;
    }
    
    export class GetFrequencyCall extends FunctionCall {
        constructor(public page: string, public entry: string, expected: ExpectedFunction) {
            super(expected, "wiki");
        }
        
        @inject('$q', '$http')
        public getValue($q: ng.IQService, $http: ng.IHttpService) {
            // TODO: caching of requests
            var url = "/?action=query&titles=" + this.page + "/research&prop=revisions&rvlimit=1&rvprop=content&format=json";
            return $http.get(url).then(function(response: ng.IHttpPromiseCallbackArg<IRevisionsQueryResponse>) {
                if(response.status != 200) {
                    throw new Error("Wiki call failed: status = " + response.status + ", data = " + response.data);
                }
                var wikiText = GetFrequencyCall.getWikiTextFromResponse(response.data);
                var researchTable = Wiki.returnResearchTable(wikiText);
                return researchTable.getFrequency(this.entry);                
            });
        }
        
        private static getWikiTextFromResponse(response: IRevisionsQueryResponse): string {
            var pages = response.query.pages;
            var pageId = parseInt(Object.getOwnPropertyNames(pages)[0]);
            var text = pages[pageId].revisions[0]['*'];
            return text;
        }
        
		public toString(): string {
            return "EHM";
        }
        
		public getType(): NodeType {
            return NodeType.Number;
        }
        
    }
	
	export enum Operator {
		Sum,
		Difference,
		Product,
		Quotient,
		Less,
		LessOrEqual,
		Equal,
		GreaterOrEqual,
		Greater
	};
	
	export class OperatorCall implements INode {
		constructor(public operator: Operator, public leftHand: INode, public rightHand: INode, expected: ExpectedFunction) {
			if(leftHand.getType() != NodeType.Number) {
				expected("a left-hand member of 'number' type.");
			}
			if(rightHand.getType() != NodeType.Number) {
				expected("a right-hand member of 'number' type.");
			}
		}
		
		public toString(): string {
			var op: string;
			switch(this.operator) {
				case Operator.Sum:
					op = "+"; break;
				case Operator.Difference:
					op = "-"; break;
				case Operator.Product:
					op = "*"; break;
				case Operator.Quotient:
					op = "/"; break;
				case Operator.Less:
					op = "<"; break;
				case Operator.LessOrEqual:
					op = "<="; break;
				case Operator.Equal:
					op = "="; break;
				case Operator.GreaterOrEqual:
					op = ">="; break;
				case Operator.Greater:
					op = ">"; break;
				default:
					op = "???"; break;
			}
			return "(" + this.leftHand.toString() + op + this.rightHand.toString() + ")";
		}
		
		public getType(): NodeType {
			switch(this.operator) {
				case Operator.Sum:
				case Operator.Difference:
				case Operator.Product:
				case Operator.Quotient:
					return NodeType.Number;
				case Operator.Less:
				case Operator.LessOrEqual:
				case Operator.Equal:
				case Operator.GreaterOrEqual:
				case Operator.Greater:
				default:
					return NodeType.Boolean;
			}
		}

        @inject('$q', '$injector')
		public getValue($q: ng.IQService, $injector: ng.auto.IInjectorService): ng.IPromise<Typing.NumberWrapper> {
			return $q.all([$injector.invoke(this.leftHand.getValue, this.leftHand), $injector.invoke(this.rightHand.getValue, this.rightHand)]).then((results: Typing.NumberWrapper[]) => {
				var first = results[0].value,
					second = results[1].value,
					result: number|boolean;
				switch(this.operator) {
					case Operator.Sum:
						result = first + second; break;
					case Operator.Difference:
						result = first - second; break;
					case Operator.Product:
						result = first * second; break;
					case Operator.Quotient:
						result = first / second; break;
					case Operator.Less:
						result = first < second; break;
					case Operator.LessOrEqual:
						result = first <= second; break;
					case Operator.Equal:
						result = first == second; break;
					case Operator.GreaterOrEqual:
						result = first >= second; break;
					case Operator.Greater:
						result = first > second; break;
					default:
						throw new Error("Unknown operator");
				}
				if(typeof result === 'number') {
					return new Typing.NumberWrapper(result);
				} else {
					return new Typing.Boolean(result);
				}
			});
		}
	}
	
	export class CostNode implements INode {
		constructor(public amountNode: INode) {
		}
		
		public toString(): string {
			return "cost(" + this.amountNode.toString() + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Cost;
		}
		
        @inject('$injector')
		public getValue($injector: ng.auto.IInjectorService): ng.IPromise<Typing.Cost> {
			return $injector.invoke(this.amountNode.getValue, this.amountNode).then((amount: Typing.NumberWrapper) => {
				return new Typing.Cost(amount.value);
			});
		}
	}
	
	export class TableNode implements INode {
		constructor(public headers: string[], public rows: INode[], expected: ExpectedFunction) {
			var numHeaders = headers.length;
			var numRows = rows.length;
			if(numRows % numHeaders != 0) {
				expected("a number of rows compatible (multiple) of the number of headers");				
			}
		}

		toString(): string {
			var columns: string[][] = [];
			for(var i = 0; i < this.headers.length; i++) {
				// create the column
				var column: string[] = [this.headers[i]];
				for(var j = i; j < this.rows.length; j += this.headers.length) {
					column.push(this.rows[j].toString());
				}
				// compute max length
				var maxLength = column[0].length;
				column.forEach((entry) => {
					maxLength = Math.max(maxLength, entry.length);
				});
				// pad the columns
				for(var k = 0; k < column.length; k++) {
					column[k] = column[k] + new Array(maxLength - column[k].length + 1).join(" ");
				}
				// insert column
				columns.push(column);
			}
			// create output
			var output = [];
			for(var row = 0; row < columns[0].length; row++) {
				output.push("|");
				for(var col = 0; col < columns.length; col++) {
					output.push(" ")
					output.push(columns[col][row]);
					output.push(" |");
				}
				output.push("\n");
			}
			// return output
			return output.join("");
		}
		
		getType(): NodeType {
			return NodeType.Table;
		}
		
        @inject('$q', '$injector')
		getValue($q: ng.IQService, $injector: ng.auto.IInjectorService): ng.IPromise<Typing.Table> {
			var rowValuesPromises = this.rows.map((node) => { return $injector.invoke(node.getValue, node); });
			return $q.all(rowValuesPromises).then((values: any[]) => {
				var numColumns = this.headers.length;
				var rows = [];
				// split in rows
				for(var i = 0; i < values.length / numColumns; i++) {
					var row = [];
					for(var j = 0; j < numColumns; j++) {
						row.push(values[i * numColumns + j]);
					}
					rows.push(row);
				}
				// return the result
				return new Typing.Table(this.headers, rows);
			});
		}
	}
	
	export class BooleanConstant implements INode {
		constructor(public value: boolean) {}
		
		toString(): string {
			return this.value ? "true" : "false";
		}
		
		getType(): NodeType {
			return NodeType.Boolean;
		}
		
        @inject('$q')
		getValue($q: ng.IQService): ng.IPromise<Typing.Boolean> {
			return $q.when(new Typing.Boolean(this.value));
		}
	}
}