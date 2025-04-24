import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [{
  ignores: ['dist/', 'scripts/', 'node_modules/', 'template/'],
},

  js.configs.recommended,
  ...ts.configs.recommended,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    plugins: {
      'react-hooks': hooksPlugin,
    },
    settings: {
      react: {
        version: '18.3.1',
      },
      tailwindcss: {
        config: './tailwind.config.js',
        callees: ['clsx', 'cva', 'cn'],
      },
    },
    rules: {
      'import/no-relative-packages': 'off',
    },
  },
];
