/// <reference path="wiki.ts"/>
interface IWikiTextParserOptions {
    startRule: string;
    tracer: () => void;
}
interface IWikiTextParser {
	parse(string, IWikiTextParserOptions?): Wiki.Tag[];
}
declare var wikiTextParser: IWikiTextParser;