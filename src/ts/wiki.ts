///<reference path="wikiparser.d.ts"/>
namespace Wiki {
    class ResearchTable {
        private frequencies: number[];
        
        constructor(private headers: string[], sums: number[]) {
            // frequencies = sums normalized.
            // e.g.:
            // if: sums = [4, 2, 3, 1]
            // then: frequencies = [4/10, 2/10, 3/10, 1/10]
            var total = 0;
            sums.forEach(value => {
                total += value;
            });
            this.frequencies = [];
            sums.forEach((value, idx) => {
                this.frequencies.push(sums[idx] / total);
            });
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
        console.log("parsed text:", parsedText);
        return new ResearchTable([], []);
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
        return wikiTextParser.parse(wikiText, {
            tracer: new tracer()
        });
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