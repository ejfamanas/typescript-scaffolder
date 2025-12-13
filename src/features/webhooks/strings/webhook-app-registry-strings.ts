import { joinLines, line } from "../../../utils/strings/format";

export function renderRegistryLines(args: {
    importStatements: string[];
    handlerSpreads: string[];
    serviceName: string;
    hasRouter: boolean;
}): string {
    const { importStatements, handlerSpreads, serviceName, hasRouter } = args;

    const handlerLines = handlerSpreads.map((s, idx) => {
        const suffix = idx < handlerSpreads.length - 1 ? "," : "";
        return line(3, `${s}${suffix}`);
    });

    const registryLines: string[] = [
        "",
        joinLines(importStatements),
        "",
        "export const webhookAppRegistry = {",
        line(1, `'${serviceName}': {`),
        ...(hasRouter ? [line(2, "router: Router,")] : []),
        line(2, "handlers: {"),
        ...handlerLines,
        line(2, "}"),
        line(1, "}"),
        "};",
    ];

    return joinLines(registryLines);
}