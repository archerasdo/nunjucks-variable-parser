module.exports = {
  extends: 'airbnb-base', // eslint-config-airbnb-base
  root: true, 
  parserOptions: {
      sourceType: 'module'
  },
  env: {
      browser: true,
  },
  rules: {
      "indent": ["error", 2],
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "no-console": "error",
      "arrow-parens": 0,
      "no-use-before-define": ["error", {"functions": false }],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}