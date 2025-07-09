import {SchemaConsumer} from "models/api-definitions";

export interface IncomingWebhook extends BaseWebhook {
    direction: 'incoming'
    path: string; // Required for incoming
    handlerName: string; // required for route + handler generation
}

export interface OutgoingWebhook extends BaseWebhook {
    direction: 'outgoing'
    targetUrl: string; // Required for outgoing
}

export interface BaseWebhook extends SchemaConsumer {
    direction: 'incoming' | 'outgoing';
    name: string;
    requestSchema: string;
    responseSchema?: string;
    headers?: Record<string, string>;
    secretVerificationKey?: string; // Optional: used for signature validation
}

export type Webhook = IncomingWebhook | OutgoingWebhook;

export interface WebhookConfigFile {
    webhooks: Webhook[];
}