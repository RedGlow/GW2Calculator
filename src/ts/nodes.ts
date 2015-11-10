///<reference path="gw2api.d.ts"/>

namespace Parser {
	enum NodeType {
		Item,
		Integer,
		Void,
		Cost
	}
	
	export class NoPromiseValueException extends Error {
	}
	
	export interface INode {
		toString(): string;
		getType(): NodeType;
		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<any>;
	}
	
	export class Integer implements INode {
		value: number;
		
		constructor(text: string[]) {
			this.value = parseInt(text.join(""), 10);
		}
		
		public toString(): string {
			return this.value.toString();
		}
		
		public getType(): NodeType {
			return NodeType.Integer;
		}
		
		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<number> {
			return $q.when(this.value);
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
			if(id.getType() != NodeType.Integer) {
				this.throwError("first", "an integer");
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
			return this.id.getValue($q, api).then((value: number) => {
				// get the item
				return api.getItem(value);
			}).then((item: Item) => {
				return new Typing.ItemWrapper(item);
			});
		}
	}
	
	export class GetCostFunctionCall extends FunctionCall {
		buy: boolean;
		
		constructor(public id: INode, buyOrSell: string, expected: ExpectedFunction) {
			super(expected, "getCost");
			if(id.getType() != NodeType.Integer) {
				this.throwError("first", "a number");
			}
			this.buy = buyOrSell == "buy";
		}

		public toString(): string {
			return "getCost(" + this.id.toString() + ", " + (this.buy ? "buy" : "sell") + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Integer;
		}

		getValue($q: ng.IQService, api: IGW2API): ng.IPromise<number> {
			// get the item
			return this.id.getValue($q, api).then((id: number) => {
				// get the listing
				return api.getListing(id);
			}).then(listing => {
				// get the unit price
				if(this.buy) {
					return listing.buys[0].unit_price;
				} else {
					return listing.sells[0].unit_price;
				}
			});
		}
	}
	
	export enum Operator {
		Sum,
		Product
	};
	
	export class OperatorCall implements INode {
		constructor(public operator: Operator, public leftHand: INode, public rightHand: INode) {
		}
		
		public toString(): string {
			var op: string;
			switch(this.operator) {
				case Operator.Sum:
					op = "+"; break;
				case Operator.Product:
					op = "*"; break;
				default:
					op = "???"; break;
			}
			return "(" + this.leftHand.toString() + op + this.rightHand.toString() + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Integer;
		}

		public getValue($q: ng.IQService, api: IGW2API): ng.IPromise<number> {
			return $q.all([this.leftHand.getValue($q, api), this.rightHand.getValue($q, api)]).then((members: number[]) => {
				switch(this.operator) {
					case Operator.Sum:
						return members[0] + members[1];
					case Operator.Product:
						return members[0] * members[1];
					default:
						throw new Error("Unknown operator");
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
		
		public getValue($q: ng.IQService, api: IGW2API): ng.IPromise<Typing.Cost> {
			return this.amountNode.getValue($q, api).then((amount: number) => {
				return new Typing.Cost(amount);
			});
		}
	}
}