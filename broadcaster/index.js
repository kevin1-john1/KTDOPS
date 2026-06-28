const { connect, StringCodec } = require("nats");

const NATS_URL = process.env.NATS_URL || "nats://my-nats.nats.svc.cluster.local:4222";
const TODO_EVENTS_SUBJECT = process.env.TODO_EVENTS_SUBJECT || "todo.events";
const BROADCASTER_QUEUE_GROUP =
  process.env.BROADCASTER_QUEUE_GROUP || "todo-broadcasters";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_MODE = process.env.WEBHOOK_MODE || "generic";

if (WEBHOOK_MODE !== "log" && !WEBHOOK_URL) {
  throw new Error("Missing required configuration: WEBHOOK_URL");
}

const stringCodec = StringCodec();

const log = (event, data = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "broadcaster",
      event,
      ...data
    })
  );
};

const buildPayload = (message) => {
  if (WEBHOOK_MODE === "discord") {
    return {
      content: message
    };
  }

  if (WEBHOOK_MODE === "slack") {
    return {
      text: message
    };
  }

  return {
    user: "bot",
    message
  };
};

const sendWebhook = async (message) => {
  if (WEBHOOK_MODE === "log") {
    log("external_message_logged_only", { message });
    return;
  }

  const payload = buildPayload(message);

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook failed: ${response.status} ${body}`);
  }
};

const parseMessage = (rawMessage) => {
  try {
    return JSON.parse(rawMessage);
  } catch {
    return {
      message: rawMessage
    };
  }
};

const main = async () => {
  const natsConnection = await connect({
    servers: NATS_URL,
    name: "broadcaster"
  });

  log("nats_connected", {
    url: NATS_URL,
    subject: TODO_EVENTS_SUBJECT,
    queueGroup: BROADCASTER_QUEUE_GROUP
  });

  const subscription = natsConnection.subscribe(TODO_EVENTS_SUBJECT, {
    queue: BROADCASTER_QUEUE_GROUP
  });

  for await (const msg of subscription) {
    const rawMessage = stringCodec.decode(msg.data);
    const event = parseMessage(rawMessage);
    const message = event.message || "Todo status changed";

    try {
      await sendWebhook(message);

      log("webhook_sent", {
        eventType: event.eventType,
        todoId: event.todo?.id,
        message
      });
    } catch (error) {
      log("webhook_failed", {
        error: error.message,
        message
      });
    }
  }
};

main().catch((error) => {
  log("broadcaster_failed", {
    error: error.message
  });

  process.exit(1);
});