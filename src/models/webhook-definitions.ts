import {SchemaConsumer} from "models/api-definitions";

/**
 * Configuration for an incoming webhook route, specifying the URL path and handler.
 */
export interface IncomingWebhook extends BaseWebhook {
    /** Whether the webhook is incoming (received) or outgoing (sent). */
    direction: 'incoming'
    /** The URL path where this webhook listens, e.g., "/webhooks/event". */
    path: string; // Required for incoming
    /** Name of the generated function to handle incoming webhook requests. */
    handlerName: string; // required for route + handler generation
}

/**
 * Configuration for an outgoing webhook, specifying the target URL for delivery.
 */
export interface OutgoingWebhook extends BaseWebhook {
    /** Whether the webhook is incoming (received) or outgoing (sent). */
    direction: 'outgoing'
    /** The destination URL to POST webhook payloads to. */
    targetUrl: string; // Required for outgoing
}

/**
 * Shared settings for webhook configurations, including schema, headers, and signature options.
 */
export interface BaseWebhook extends SchemaConsumer {
    /** Whether the webhook is incoming (received) or outgoing (sent). */
    direction: 'incoming' | 'outgoing';
    /** Unique name identifying the webhook. */
    name: string;
    /** Schema name for validating incoming request payloads. */
    requestSchema: string;
    /** Optional schema name for validating response payloads. */
    responseSchema?: string;
    /** Optional static headers to include with webhook requests or responses. */
    headers?: Record<string, string>;
    /** Optional secret key for verifying webhook signatures. */
    secretVerificationKey?: string; // Optional: used for signature validation
}

/**
 * Union type representing either an incoming or outgoing webhook configuration.
 */
export type Webhook = IncomingWebhook | OutgoingWebhook;

/**
 * Configuration file structure listing all webhook definitions.
 */
export interface WebhookConfigFile {
    webhooks: Webhook[];
}