import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { default as serveStatic } from 'serve-static';
import { toMarkup } from '../utils/html.js';
import { resolveVocsConfig } from '../utils/resolveVocsConfig.js';
const cleanUrl = (url) => url.replace(/#.*$/s, '').replace(/\?.*$/s, '');
export function dev() {
    let config = {};
    const styleSet = new Map();
    const styleOverrideSet = new Map();
    return {
        name: 'dev',
        async buildStart() {
            config = (await resolveVocsConfig()).config;
        },
        transform(styles, id) {
            const { rootDir } = config;
            if (id.endsWith('.css')) {
                if (id.endsWith('.vocs/theme.css'))
                    styleOverrideSet.set(id, styles);
                else if (id === resolve(rootDir, 'styles.css'))
                    styleOverrideSet.set(id, styles);
                else
                    styleSet.set(id, styles);
            }
        },
        async configureServer(server) {
            const { config } = await resolveVocsConfig();
            const { rootDir } = config;
            server.middlewares.use(serveStatic(resolve(rootDir, 'public')));
            server.middlewares.use(serveStatic(resolve(import.meta.dirname, '../../app/public')));
            return () => {
                server.middlewares.use(async (req, res, next) => {
                    const url = req.url && cleanUrl(req.url);
                    if (!url?.endsWith('.html')) {
                        next();
                        return;
                    }
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    try {
                        if (typeof url === 'undefined')
                            next();
                        const indexHtml = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf-8');
                        const template = await server.transformIndexHtml(url, indexHtml.replace(/\.\.\/app/g, `/@fs${resolve(import.meta.dirname, '../../app')}`));
                        const module = await server.ssrLoadModule(resolve(import.meta.dirname, '../../app/index.server.js'));
                        const body = await module.render(req);
                        const html = await toMarkup({
                            body,
                            config,
                            head: (_jsxs(_Fragment, { children: [_jsx("script", { type: "module", 
                                        // @ts-expect-error
                                        fetchPriority: "high", blocking: "render", src: resolve(import.meta.dirname, '../../app/utils/initializeTheme.js') }), [...styleSet.values(), ...styleOverrideSet.values()].map((style, i) => (_jsx("style", { "data-vocs-temp-style": "true", 
                                        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                                        dangerouslySetInnerHTML: { __html: style } }, i)))] })),
                            location: '/',
                            template,
                        });
                        res.end(html);
                    }
                    finally {
                        next();
                    }
                });
            };
        },
    };
}
//# sourceMappingURL=dev.js.map