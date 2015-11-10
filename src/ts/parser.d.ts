/// <reference path="nodes.ts"/>
interface IGw2CalculatorParser {
	parse(string): Parser.INode;
}
declare var gw2CalculatorParser: IGw2CalculatorParser;