// config/paypal.config.js
const paypal = require('@paypal/checkout-server-sdk');

// Configuración del entorno Sandbox
const clientId = "ATLd_psria5ys1uYACtpuk5DSVy5xTJi75mteXEygFjAYfVWyjwURVj2ExKeerVn6i0XYzgyYDgDsvDq";
const clientSecret = "ENsVWSUwPi8_s72CG34OeeuqSbnfN0WFsA6Jyz063ii83Z-OA-Z8muD_SSYJxTgVMKcIZMjDMzRMzZyA";

// Entorno Sandbox
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
// Cliente PayPal
const client = new paypal.core.PayPalHttpClient(environment);

module.exports = { client, paypal };