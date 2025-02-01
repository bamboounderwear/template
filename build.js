const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

const pagesDir = path.join(__dirname, 'pages');
const componentsDir = path.join(__dirname, 'components');
const distDir = path.join(__dirname, 'dist');

// Clean dist directory
function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);
  console.log('Cleaned dist directory');
}

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
    // Ensure js and css directories exist in dist/assets
    const distJsDir = path.join(distAssetsDir, 'js');
    const distCssDir = path.join(distAssetsDir, 'css');
    
    if (!fs.existsSync(distJsDir)) {
      fs.mkdirSync(distJsDir, { recursive: true });
    }
    if (!fs.existsSync(distCssDir)) {
      fs.mkdirSync(distCssDir, { recursive: true });
    }

    // Copy JS files
    if (fs.existsSync(path.join(assetsDir, 'js'))) {
      fs.cpSync(path.join(assetsDir, 'js'), distJsDir, { recursive: true });
    }

    console.log('Assets copied to dist');
  }
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

// Replace include tags with the corresponding component content
function processTemplate(content) {
  return content.replace(/{{>\s*(\w+)([^}]*)}}/g, (match, componentName, paramsString) => {
    const componentPath = path.join(componentsDir, `${componentName}.html`);
    if (!fs.existsSync(componentPath)) {
      console.error(`Component "${componentName}" not found at ${componentPath}`);
      return '';
    }
    let componentContent = fs.readFileSync(componentPath, 'utf8');
    const params = parseParams(paramsString);
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
      const processedContent = processTemplate(content);
      fs.writeFileSync(destPath, processedContent, 'utf8');
      console.log(`Built ${destPath}`);
    }
  });
}

// Main build process
async function build() {
  try {
    // Clean dist first
    cleanDist();
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