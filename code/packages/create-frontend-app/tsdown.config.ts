import { writeFileSync } from 'node:fs';
import { defineConfig } from 'tsdown';
import typesPkg from '../types/package.json';
import sdkPkg from '../sdk/package.json';
import storeWebsocketsPkg from '../store-websockets/package.json';
import storeAzureWebPubsubPkg from '../store-azure-web-pubsub/package.json';
import reactPkg from '../react/package.json';

const versions = {
  '@inditextech/weave-react': reactPkg.version,
  '@inditextech/weave-sdk': sdkPkg.version,
  '@inditextech/weave-store-azure-web-pubsub': storeAzureWebPubsubPkg.version,
  '@inditextech/weave-store-websockets': storeWebsocketsPkg.version,
  '@inditextech/weave-types': typesPkg.version,
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
  platform: 'node',
  dts: true,
});
