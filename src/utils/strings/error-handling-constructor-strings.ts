import { joinLines, line } from "./format";

export function renderErrorHandlerImplSource(): string {
    const lines = [
        "async function handleErrorsImpl<T>(",
        line(1, "fn: () => Promise<T>,"),
        line(1, "options: WrapRequestOptions = {}"),
        "): Promise<T | undefined> {",
        line(1, "const {"),
        line(2, "context,"),
        line(2, "logFn = console.error,"),
        line(2, "sanitizeFn,"),
        line(2, "rethrow = true,"),
        line(1, "} = options;"),
        "",
        line(1, "try {"),
        line(2, "return await fn();"),
        line(1, "} catch (err) {"),
        line(2, "const safeError = sanitizeFn ? sanitizeFn(err) : err;"),
        line(2, "logFn(safeError, context);"),
        line(2, "if (rethrow) throw err;"),
        line(2, "return undefined;"),
        line(1, "}"),
        "}",
    ];

    return joinLines(lines);
}

export function renderEndpointErrorHandlerExport(args: {
    functionName: string;
    responseType: string;
    endpointPath: string;
    endpointMethod: string;
}): string {
    const { functionName, responseType, endpointPath, endpointMethod } = args;

    const lines = [
        `export function handleErrors_${functionName}(`,
        line(1, `fn: () => Promise<AxiosResponse<${responseType}>>`),
        `): Promise<AxiosResponse<${responseType}> | undefined> {`,
        line(1, "return handleErrorsImpl(fn, {"),
        line(2, "context: {"),
        line(3, `endpointPath: ${JSON.stringify(endpointPath)},`),
        line(3, `method: ${JSON.stringify(endpointMethod.toUpperCase())}`),
        line(2, "}"),
        line(1, "});"),
        "}",
    ];

    return joinLines(lines);
}