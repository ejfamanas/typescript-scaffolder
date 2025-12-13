import { joinLines, line } from "../../../utils/strings/format";

export function renderCreateWebhookAppBody(serviceName: string): string {
    const lines = [
        "const app = express();",
        "app.use(express.json());",
        "",
        `const handlers = webhookAppRegistry['${serviceName}']?.handlers || {};`,
        "",
        "for (const key of Object.keys(handlers)) {",
        line(1, "app.post('/' + key, handlers[key]);"),
        "}",
        "",
        "return app;",
        "",
    ];

    return joinLines(lines);
}