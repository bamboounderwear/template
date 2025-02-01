const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const pagesDir = path.join(__dirname, 'pages');
const componentsDir = path.join(__dirname, 'components');
const distDir = path.join(__dirname, 'dist');

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Ensure the dist/assets directory exists
const distAssetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir);
}

// Copy assets to dist
function copyAssets() {
  const assetsDir = path.join(__dirname, 'assets');
  if (fs.existsSync(assetsDir)) {
    fs.cpSync(assetsDir, distAssetsDir, { recursive: true });
  }
  console.log('Assets copied to dist');
}

// Process CSS with PostCSS and Tailwind
async function processCSS() {
  const css = fs.readFileSync('assets/css/styles.css', 'utf8');
  const result = await postcss([
    tailwindcss,
    autoprefixer
  ]).process(css, {
    from: 'assets/css/styles.css',
    to: 'dist/assets/css/styles.css'
  });

  // Ensure the css directory exists in dist/assets
  const distCssDir = path.join(distAssetsDir, 'css');
  if (!fs.existsSync(distCssDir)) {
    fs.mkdirSync(distCssDir, { recursive: true });
  }

  fs.writeFileSync(path.join(distDir, 'assets/css/styles.css'), result.css);
  console.log('CSS processed with Tailwind');
}

// Parse parameters from include tag parameter string
function parseParams(paramsString) {
  const params = {};
  const regex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(paramsString)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

// Fix asset paths based on the current page depth
function fixAssetPaths(content, depth) {
  const prefix = '../'.repeat(depth);
  return content.replace(/href="assets\//g, `href="${prefix}assets/`)
                .replace(/src="assets\//g, `src="${prefix}assets/`);
}

// Replace include tags with the corresponding component content
function processTemplate(content, filePath) {
  // Calculate the depth of the current file relative to the dist directory
  const relativePath = path.relative(distDir, filePath);
  const depth = relativePath.split(path.sep).length - 1;

  return content.replace(/{{>\s*(\w+)([^}]*)}}/g, (match, componentName, paramsString) => {
    const componentPath = path.join(componentsDir, `${componentName}.html`);
    if (!fs.existsSync(componentPath)) {
      console.error(`Component "${componentName}" not found at ${componentPath}`);
      return '';
    }
    let componentContent = fs.readFileSync(componentPath, 'utf8');
    const params = parseParams(paramsString);
    
    // Fix asset paths in the component based on the page depth
    componentContent = fixAssetPaths(componentContent, depth);
    
    for (const key in params) {
      const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      componentContent = componentContent.replace(placeholderRegex, params[key]);
    }
    return componentContent;
  });
}

// Process directories and files
function processDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.readdirSync(srcDir).forEach(entry => {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      processDirectory(srcPath, destPath);
    } else if (stats.isFile()) {
      const content = fs.readFileSync(srcPath, 'utf8');
      const processedContent = processTemplate(content, destPath);
      fs.writeFileSync(destPath, processedContent, 'utf8');
      console.log(`Built ${destPath}`);
    }
  });
}

// Main build process
async function build() {
  try {
    // Process CSS first
    await processCSS();
    // Copy assets
    copyAssets();
    // Then process HTML files
    processDirectory(pagesDir, distDir);
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();