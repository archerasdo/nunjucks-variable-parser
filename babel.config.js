module.exports = api => {
  const isTest = api.env("test");
  if (isTest) {
    return {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "current",
            },
          },
        ],
      ],
      plugins: [
        [
          "@babel/plugin-proposal-decorators",
          {
            legacy: true,
          },
        ],
      ],
    };
  }

  return {
    presets: [["@babel/preset-env", { loose: false }]],
    plugins: [
      [
        "@babel/plugin-proposal-decorators",
        {
          legacy: true,
        },
      ],
    ],
  };
};
