import { jsx as _jsx } from "react/jsx-runtime";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import pc from 'picocolors';
import { toMarkup } from './utils/html.js';
import { resolveOutDir } from './utils/resolveOutDir.js';
import { resolveVocsConfig } from './utils/resolveVocsConfig.js';
export async function prerender({ logger, outDir }) {
    const { config } = await resolveVocsConfig();
    const { basePath, rootDir } = config;
    const outDir_resolved = resolveOutDir(rootDir, outDir);
    const template = readFileSync(resolve(outDir_resolved, 'index.html'), 'utf-8');
    const mod = await import(resolve(import.meta.dirname, './.vocs/dist/index.server.js'));
    // Get routes to prerender.
    const routes = getRoutes(resolve(rootDir, 'pages'));
    // Prerender each route.
    for (const route of routes) {
        const body = await mod.prerender(route);
        const location = route.replace(/(.+)\/$/, '$1');
        const html = await toMarkup({
            body,
            config,
            head: _jsx("script", { src: `${basePath}/initializeTheme.iife.js` }),
            location,
            template,
        });
        const isIndex = route.endsWith('/');
        const filePath = `${isIndex ? `${route}index` : route}.html`.replace(/^\//, '');
        const path = resolve(outDir_resolved, filePath);
        const pathDir = dirname(path);
        if (!isDir(pathDir))
            mkdirSync(pathDir, { recursive: true });
        if (isIndex)
            writeFileSync(path, html);
        else {
            const path = resolve(outDir_resolved, route.slice(1));
            if (!isDir(path))
                mkdirSync(path, { recursive: true });
            writeFileSync(resolve(path, 'index.html'), html);
        }
        const fileName = path.split('/').pop();
        logger?.info(`${pc.dim(relative(rootDir, path).replace(fileName, ''))}${pc.cyan(fileName)}`);
    }
    logger?.info(`\n${pc.green('✓')} ${routes.length} pages prerendered.`);
}
////////////////////////////////////////////////////////////////////////
// Utils
function getRoutes(routesDir) {
    const routes = [];
    function recurseRoutes(dir) {
        for (const fileOrDir of readdirSync(dir)) {
            const path = resolve(dir, fileOrDir);
            if (isDir(path)) {
                recurseRoutes(path);
                continue;
            }
            const file = path.replace(routesDir, '').replace(/\.[^.]*$/, '');
            routes.push(file.endsWith('/index') ? file.replace(/index$/, '') : file);
        }
    }
    recurseRoutes(routesDir);
    return routes;
}
function isDir(dir) {
    try {
        readdirSync(dir);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=prerender.js.map