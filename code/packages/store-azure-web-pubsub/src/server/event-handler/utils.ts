import type { IncomingMessage } from 'node:http';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isJsonObject(obj: any): boolean {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBase64JsonString(obj: Record<string, any>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

export function fromBase64JsonString(
  base64String: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  if (base64String === undefined) {
    return {};
  }

  try {
    const buf = Buffer.from(base64String, 'base64').toString();
    const parsed = JSON.parse(buf);
    return isJsonObject(parsed) ? parsed : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.warn('Unexpected state format:' + e);
    return {};
  }
}

export function getHttpHeader(
  req: IncomingMessage,
  key: string
): string | undefined {
  if (!key) return undefined;

  // According to https://nodejs.org/api/http.html#http_class_http_incomingmessage, header names are always lower-cased
  const value = req.headers[key.toLowerCase()];

  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }

  return value[0];
}

export function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise(function (resolve, reject) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunks: any = [];
    req.on('data', function (chunk) {
      chunks.push(chunk);
    });
    req.on('end', function () {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    // reject on request error
    req.on('error', function (err) {
      // This is not a "Second reject", just a different sort of failure
      reject(err);
    });
  });
}
