/// <reference path="wiki.ts"/>
interface IWikiTextParser {
	parse(string): Wiki.Tag[];
}
declare var wikiTextParser: IWikiTextParser;