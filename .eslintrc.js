module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // tích hợp Prettier, tắt rule ESLint xung đột
  ],
  rules: {
    // thêm rules tùy chỉnh ở đây, ví dụ:
    // '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
