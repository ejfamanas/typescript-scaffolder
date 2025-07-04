import { getApiFunction, getWebhookFunction } from "./src";
import { apiRegistry } from "./src/codegen/apis/registry";
import { webhookRegistry } from "./src/codegen/webhooks/registry";

async function testApiFunction() {
	try {
		// use the getApiFunction in combination with the registry, service name, and function name to activate
		const fn = getApiFunction(apiRegistry, 'source-delta', 'GET_user');
		const result = await fn(); // You might need to pass args depending on the signature
		console.log('Function executed successfully:', result);
	} catch (error) {
		console.error('Function invocation failed:', error);
	}
}

async function testWebhookFunction() {
	try {
		const fn = getWebhookFunction(webhookRegistry, 'source-echo', 'handleStripePaymentWebhook');
		const mockPayload = {
			id: "evt_123",
			object: "event",
			type: "payment_intent.succeeded",
			data: {
				object: {
					amount: 1000,
					currency: "usd",
					status: "succeeded"
				}
			}
		};
		const result = await fn(mockPayload);
		console.log('Webhook function executed successfully:', result);
	} catch (error) {
		console.error('Webhook function invocation failed:', error);
	}
}

async function test() {
    testApiFunction();
    testWebhookFunction();
}

test()