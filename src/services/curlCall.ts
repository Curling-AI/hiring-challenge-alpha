import { exec } from 'child_process';
import { WebSocket } from 'ws';

export function getCurlInfo(url: string, socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = generateCommand(url);
    if (!command) return reject("Invalid command");
    socket.send(JSON.stringify({
      type: "approvalRequest",
      content: command
    }));

    const responseHandler = async (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "approval") {
          socket.off('message', responseHandler);
          
          if (data.content) {
            exec(command, (error, stdout) => {
              error ? reject(`Error: ${error.message}`) : resolve(stdout);
            });
            socket.send(JSON.stringify({
              type: "approvalResponse",
              content: "approved"
            }));
          } else {
            socket.send(JSON.stringify({
              type: "approvalResponse",
              content: "denied"
            }));
            resolve("Command not approved");
          }
        }
      } catch (e) {
        reject("Invalid response format");
      }
    };

    socket.on('message', responseHandler);
  });
}

function generateCommand(url: string): string {
  try {
    new URL(url);
    return `curl ${url}`;
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
    return '';
  }
}