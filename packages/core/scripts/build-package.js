const fs = require('fs');
const path = require('path');

// 读取原始 package.json
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 创建构建版本的 package.json
const buildPackageJson = {
  ...packageJson,
  main: 'index.esm.js',
  module: 'index.esm.js',
  types: 'main.d.ts',
  // 移除开发相关的脚本
  scripts: {
    ...packageJson.scripts
  }
};

// 确保 dist 目录存在
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// 写入 dist/package.json
const distPackagePath = path.join(distPath, 'package.json');
fs.writeFileSync(distPackagePath, JSON.stringify(buildPackageJson, null, 2));

console.log('✅ Generated dist/package.json with build configuration');
console.log('📦 Main entry:', buildPackageJson.main);
console.log('📦 Module entry:', buildPackageJson.module);
console.log('📦 Types entry:', buildPackageJson.types);