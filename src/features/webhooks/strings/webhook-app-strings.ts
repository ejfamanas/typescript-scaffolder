import { joinLines, line } from "../../../utils/strings/format";

export function renderCreateWebhookAppBody(serviceName: string): string {
    const lines = [
        "const app = express();",
        "app.use(express.json());",
        "",
        `const router = webhookAppRegistry['${serviceName}']?.router;`,
        "if (router) {",
        line(1, "app.use(router);"),
        "}",
        "",
        "return app;",
        "",
    ];

    return joinLines(lines);
}
