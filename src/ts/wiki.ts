///<reference path="wikiparser.d.ts"/>
namespace Wiki {
    export class ResearchTable {
        constructor(private headers: string[], private frequencies: number[]) {
        }
        
        getFrequency(name: string) {
            var nameIndex = this.headers.indexOf(name);
            if(nameIndex < 0) {
                throw new Error("Frequency of " + name + " not found; available names: " + this.headers.join(", "));
            }
            return this.frequencies[nameIndex];
        }
    }
    
    /**
     * Parses a research table.
     */
    export function returnResearchTable(wikiText: string): ResearchTable {
        var parsedText = parseWikiText(wikiText);
        // extract headers
        var headers = parsedText
            .filter(tag => tag.name === "SDRH")[0] // extract the header tag
            .tagParameters.filter(tagParameter => tagParameter.label && /^s[0-9]+$/.test(tagParameter.label.trim())) // takes only the s<number> tag parameters
            .map(tagParameter => tagParameter.content[0].text.trim()); // extract their values
        // extract values
        var resultMap = {};
        parsedText
            .filter(tag => tag.name == "SDRL")
            .forEach(sdrlTag => {
                var results = {};
                sdrlTag.tagParameters.forEach(tagParameter => {
                    if(!!tagParameter.label) {
                        results[tagParameter.label.trim()] = parseInt(tagParameter.content[0].text.trim());
                        //resultMap[tagParameter.label.trim()] = (resultMap[tagParameter.label.trim()] || 0) + parseInt(tagParameter.content[0].text.trim());
                    }
                });
                headers.forEach(header => {
                    resultMap[header] = (resultMap[header] || 0) + results[header];
                });
                resultMap['Total'] = (resultMap['Total'] || 0) + results['Total'];
            });
        var frequencies = headers.map(header => resultMap[header] / resultMap['Total']);
        // create the research table
        return new ResearchTable(headers, frequencies);
    }
    
    export function parseWikiText(wikiText: string): Tag[] {
        function tracer() {
            this.lines = wikiText.split("\n");
        }
        tracer.prototype.trace = function(evt) {
            var that = this;

            function log(evt) {
                function repeat(string, n) {
                    var result = "", i;

                    for (i = 0; i < n; i++) {
                        result += string;
                    }

                    return result;
                }

                function pad(string, length) {
                    return string + repeat("_", length - string.length);
                }

                if (typeof console === "object") {
                    console.log(
                        evt.location.start.line + ":" + evt.location.start.column + "-"
                            + evt.location.end.line + ":" + evt.location.end.column + " "
                            + pad(evt.type, 10) + " "
                            + repeat("____", that.indentLevel) + evt.rule
                    );
                    if(evt.location.start.line === evt.location.end.line) {
                        console.log("data:", that.lines[evt.location.start.line-1].slice(evt.location.start.column-1, evt.location.end.column));
                    } else {
                        var data = that.lines[evt.location.start.line-1].slice(evt.location.start.column-1);
                        for(var i = evt.location.start.line; i < evt.location.end.line-1; i++) {
                            data += "\n";
                            data += that.lines[i];
                        }
                        data += that.lines[evt.location.end.line-1].slice(0, evt.location.end.column-1);
                        console.log("data:", data);
                    }
                }
            }

            switch (evt.type) {
                case "rule.enter":
                    //log(evt);
                    this.indentLevel++;
                    break;

                case "rule.match":
                    this.indentLevel--;
                    log(evt);
                    break;

                case "rule.fail":
                    this.indentLevel--;
                    log(evt);
                    break;

                default:
                    throw new Error("Invalid evt type: " + evt.type + ".");
            }
        }
        return wikiTextParser.parse(wikiText/*, {
            tracer: new tracer()
        }*/);
    }
    
    export function _wikitext(tags: Tag[]): Tag[] {
        return tags;
    }
    
    export class Tag {
        public constructor(public name: string, public tagParameters: TagParameter[]) {}
    }
    
    export function _tag(name: string, tagParameters: TagParameter[]) {
        return new Tag(name, tagParameters);
    }
    
    export function _tagParameters(tagParameters: TagParameter[]): TagParameter[] {
        return tagParameters;
    }
    
    class TagParameter {
        constructor(public label: string, public content: Text[]) {}
    }
    
    export function _tagParameter(label: string, content: Text[]) {
        return new TagParameter(label, content);
    }
    
    export function _text(texts: Text[]): Text[] {
        return texts;
    }
    
    class WikiSymbol {
        constructor(public name: string) {}
    }
    
    export function _wikiSymbol(charArray): WikiSymbol {
        return new WikiSymbol(charArray.join(""));
    }
    
    class Text {
        constructor(public text: string) {}
    }
    
    class LinkText extends Text {
        constructor(text: string) {
            super(text);
        }
    }
    
    export function _linkText(charArray): LinkText {
        return new LinkText(charArray.join(""));
    }
    
    class BaseText extends Text {
        constructor(text: string) {
            super(text);
        }
    }
    
    export function _baseText(charArray): BaseText {
        return new BaseText(charArray.join(""));
    }
}