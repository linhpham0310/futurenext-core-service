// .prettierrc.js
module.exports = {
  semi: true, // Dùng dấu chấm phẩy cuối dòng
  singleQuote: true, // Dùng dấu nháy đơn thay vì nháy kép
  trailingComma: "es5", // Thêm dấu phẩy cuối trong object/array (tương thích ES5)
  tabWidth: 2, // Độ rộng tab là 2 spaces
  printWidth: 100, // Giới hạn độ dài dòng code trước khi tự động xuống dòng
  arrowParens: "always", // Luôn có dấu ngoặc đơn quanh tham số của arrow function (vd: (x) => x)
  bracketSpacing: true, // Thêm space giữa dấu ngoặc nhọn và nội dung object (vd: { foo: bar })
  jsxSingleQuote: false, // Dùng nháy kép trong JSX
};
