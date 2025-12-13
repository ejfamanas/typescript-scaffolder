import { buildRetryWrapperName } from "../../../utils/retry-constructors";
import { joinLines, line } from "../../../utils/strings/format";

export type ApiClientBodyParams = {
    baseUrl: string;
    urlPath: string;
    method: string; // already lowercased
    fileName: string;
    functionName: string;
    hasBody: boolean;
    endpointMethod: string; // original (e.g. "GET")
    authEnabled: boolean;
    useRetry: boolean;
    retryConfig?: {
        maxAttempts?: number;
        initialDelayMs?: number;
        multiplier?: number;
    };
    useErrorHandler: boolean;
};

export function buildAuthHeadersExpr(authEnabled: boolean): string {
    return authEnabled ? "getAuthHeaders()" : "{}";
}

export function buildRequestLines(args: {
    baseUrl: string;
    urlPath: string;
    method: string;
    hasBody: boolean;
    authHeadersExpr: string;
}): string[] {
    const {baseUrl, urlPath, method, hasBody, authHeadersExpr} = args;

    return [
        line(1, `const authHeaders = ${authHeadersExpr};`),
        "",
        line(1, `const request = () => axios.${method}(`),
        line(2, `\`${baseUrl}${urlPath}\`,`),
        ...(hasBody ? [line(2, "body,")] : []),
        line(2, "{"),
        line(3, "headers: {"),
        line(4, "...authHeaders,"),
        line(4, "...(headers ?? {}),"),
        line(3, "},"),
        line(2, "} as AxiosRequestConfig"),
        line(1, ");"),
        "",
    ];
}

function buildWrappedRequestExpr(args: {
    useRetry: boolean;
    functionName: string;
    endpointMethod: string;
    retryConfig?: {
        maxAttempts?: number;
        initialDelayMs?: number;
        multiplier?: number;
    };
}): string {
    const {useRetry, functionName, endpointMethod, retryConfig} = args;

    if (!useRetry) return "request";

    return joinLines([
        `() => ${buildRetryWrapperName(functionName)}(request, {`,
        line(2, "enabled: true,"),
        line(2, `maxAttempts: ${retryConfig?.maxAttempts ?? 3},`),
        line(2, `initialDelayMs: ${retryConfig?.initialDelayMs ?? 250},`),
        line(2, `multiplier: ${retryConfig?.multiplier ?? 2.0},`),
        line(2, `method: ${JSON.stringify(endpointMethod.toUpperCase())}`),
        line(1, "})"),
    ]);
}

export function buildWrappedRequestLines(wrappedRequestExpr: string): string[] {
    return [line(1, `const wrappedRequest = ${wrappedRequestExpr};`), ""];
}

export function buildReturnLines(args: {
    useErrorHandler: boolean;
    method: string;
    fileName: string;
}): string[] {
    const {useErrorHandler, method, fileName} = args;

    return useErrorHandler
        ? [
            line(1, `const result = await handleErrors_${method.toUpperCase()}_${fileName}(wrappedRequest);`),
            line(1, "return result?.data;"),
        ]
        : [line(1, "const response = await wrappedRequest();"), line(1, "return response.data;")];
}

export function renderApiClientFunctionBody(params: ApiClientBodyParams): string {
    const {
        baseUrl,
        urlPath,
        method,
        fileName,
        functionName,
        hasBody,
        endpointMethod,
        authEnabled,
        useRetry,
        retryConfig,
        useErrorHandler,
    } = params;

    const authHeadersExpr = buildAuthHeadersExpr(authEnabled);

    const requestLines = buildRequestLines({baseUrl, urlPath, method, hasBody, authHeadersExpr});

    const wrappedRequestExpr = buildWrappedRequestExpr({useRetry, functionName, endpointMethod, retryConfig});

    const wrappedRequestLines = buildWrappedRequestLines(wrappedRequestExpr);

    const returnLines = buildReturnLines({useErrorHandler, method, fileName});

    return joinLines([...requestLines, ...wrappedRequestLines, ...returnLines, ""]);
}