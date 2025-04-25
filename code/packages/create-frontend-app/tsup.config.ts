import { writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';
import typesPkg from '../types/package.json';
import sdkPkg from '../sdk/package.json';
import storeWebsocketsPkg from '../store-websockets/package.json';
import storeAzureWebPubsubPkg from '../store-azure-web-pubsub/package.json';
import reactPkg from '../react/package.json';

const versions = {
  '@inditextech/weavejs-types': typesPkg.version,
  '@inditextech/weavejs-sdk': sdkPkg.version,
  '@inditextech/weavejs-store-websockets': storeWebsocketsPkg.version,
  '@inditextech/weavejs-store-azure-web-pubsub': storeAzureWebPubsubPkg.version,
  '@inditextech/weavejs-react': reactPkg.version,
};

writeFileSync(
  './src/versions.js',
  `export const versions = ${JSON.stringify(versions)}`
);

console.log('Create-Weavejs-Frontend-App: versions.json updated');

export default defineConfig({
  entry: ['./src/index.ts', './src/create-app.ts'],
  format: 'esm',
  target: 'node18',
  dts: true,
});
