/// <reference types="mdast-util-to-hast" />
/// <reference types="mdast-util-directive" />
import { visit } from 'unist-util-visit';
import { processIncludes } from '../shiki/transformerNotationInclude.js';
const filenameRegex = /filename="(.*)"/;
const importRegex = /from ('|")(.*)('|")/g;
export const filenameCache = new Map();
export function remarkFilename() {
    return (tree) => {
        visit(tree, (node) => {
            if (node.type === 'code' && node.meta?.includes('filename')) {
                // If the code block has a `filename` meta, then we need to process
                // the tree and find imports or includes to inject the code into.
                const filenameMatch = node.meta?.match(filenameRegex);
                if (filenameMatch) {
                    const [, fileName] = filenameMatch;
                    const sourceCode = node.value;
                    visit(tree, 'code', (node) => {
                        // process `import` statements if we are in twoslash mode
                        if (node.meta?.includes('twoslash')) {
                            node.value = processImports({
                                code: node.value,
                                fileName,
                                sourceCode,
                            });
                        }
                        // process `// [!include ...]` markers
                        node.value = processIncludes({
                            code: node.value,
                            getSource: (sourceFileName) => (sourceFileName === fileName ? sourceCode : undefined),
                        });
                    });
                }
            }
        });
    };
}
function processImports({ code: code_, fileName, sourceCode, }) {
    let code = code_;
    const importMatches = code.matchAll(importRegex);
    for (const importMatch of importMatches) {
        const strippedFileName = stripFileName(fileName);
        const strippedSourceFileName = stripFileName(importMatch?.[2]);
        if (strippedSourceFileName !== strippedFileName)
            continue;
        const previous = code;
        code = `// @filename: ${fileName}\n${sourceCode}\n`;
        if (!previous.includes('@filename: example.js'))
            code += '// @filename: example.js\n// ---cut---\n';
        code += previous;
    }
    return code;
}
function stripFileName(fileName) {
    return fileName.replace(/^\.\//, '').replace(/\.(ts|js|tsx|jsx)$/, '');
}
//# sourceMappingURL=filename.js.map