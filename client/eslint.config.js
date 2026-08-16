// import antfu from '@antfu/eslint-config'

// export antfu({
//   formatters: true,
//   unocss: true,
//   vue: true,
// })

import json from "@eslint/json";

export default [
  {
    plugins: {
      json,
    },
  },
  {
    files: ["**/*.json"],
    languageOptions: {
      parser: json.parser,
    },
    rules: {
      // Turn off the json/sort-keys rule completely
      "json/sort-keys": "off"
    },
  },
];