namespace Parser {
	enum NodeType {
		Item,
		Integer,
		Void
	}
	
	export interface INode {
		toString(): string;
		getType(): NodeType;
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
	}
	
	export class GetCostFunctionCall extends FunctionCall {
		buy: boolean;
		
		constructor(public item: INode, buyOrSell: string, expected: ExpectedFunction) {
			super(expected, "getCost");
			if(item.getType() != NodeType.Item) {
				this.throwError("first", "an item");
			}
			this.buy = buyOrSell == "buy";
		}

		public toString(): string {
			return "getCost(" + this.item.toString() + ", " + (this.buy ? "buy" : "sell") + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Integer;
		}
	}
	
	export enum Operator {
		Sum
	};
	
	export class OperatorCall implements INode {
		constructor(public operator: Operator, public leftHand: INode, public rightHand: INode) {
		}
		
		public toString(): string {
			var op: string;
			switch(this.operator) {
				case Operator.Sum:
					op = "+"; break;
				default:
					op = "???"; break;
			}
			return "(" + this.leftHand.toString() + op + this.rightHand.toString() + ")";
		}
		
		public getType(): NodeType {
			return NodeType.Integer;
		}
	}
}