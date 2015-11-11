///<reference path="gw2api.d.ts"/>

namespace Parser {
	enum NodeType {
		Item,
		Number,
		Void,
		Cost,
		Table
	}
	
	export class NoPromiseValueException extends Error {
	}
	
	export interface INode {
		toString(): string;
		getType(): NodeType;
		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<any>;
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
		
		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.NumberWrapper> {
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
		protected throwError(numParameter: string, type: string) {
			this.expected("a " + this.name + " call with " + type + " as " + numParameter + " parameter");
		}
		abstract getValue($q: ng.IQService, api: IGW2API): ng.IPromise<any>;
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

		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.ItemWrapper> {
			// get the id
			return this.id.getValue($q, api).then((value: Typing.NumberWrapper) => {
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

		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.NumberWrapper> {
			// get the item
			return this.id.getValue($q, api).then((id: Typing.NumberWrapper) => {
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
	
	export enum Operator {
		Sum,
		Difference,
		Product,
		Quotient
	};
	
	export class OperatorCall implements INode {
		constructor(public operator: Operator, public leftHand: INode, public rightHand: INode) {
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
				default:
					op = "???"; break;
			}
			return "(" + this.leftHand.toString() + op + this.rightHand.toString() + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Number;
		}

		public getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.NumberWrapper> {
			return $q.all([this.leftHand.getValue($q, api), this.rightHand.getValue($q, api)]).then((results: Typing.NumberWrapper[]) => {
				var first = results[0].value,
					second = results[1].value,
					result: number;
				switch(this.operator) {
					case Operator.Sum:
						result = first + second; break;
					case Operator.Difference:
						result = first - second; break;
					case Operator.Product:
						result = first * second; break;
					case Operator.Quotient:
						result = first / second; break;
					default:
						throw new Error("Unknown operator");
				}
				return new Typing.NumberWrapper(result);
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
		
		public getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.Cost> {
			return this.amountNode.getValue($q, api).then((amount: Typing.NumberWrapper) => {
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
		
		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.Table> {
			var rowValuesPromises = this.rows.map((node) => { return node.getValue($q, api); });
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
}