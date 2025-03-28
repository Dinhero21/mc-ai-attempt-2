import { WebSocketServer } from 'ws';

export const messages: string[] = [];

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  for (const message of messages) {
    ws.send(message);
  }
});

export function writeMessage(message: unknown): void {
  const stringified = JSON.stringify(message);
  messages.push(stringified);

  for (const client of wss.clients) {
    client.send(stringified);
  }
}
