import { createApp } from "./app.js";

const port = parsePort(process.env.PORT);
const app = createApp();

app.listen(port, () => {
  console.log(`Task API listening on port ${port}`);
});

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
}