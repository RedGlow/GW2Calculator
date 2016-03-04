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
        return wikiTextParser.parse(wikiText);
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