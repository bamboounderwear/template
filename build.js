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

// Create necessary directories
function createDirectories() {
  // Create dist/assets
  const distAssetsDir = path.join(distDir, 'assets');
  fs.mkdirSync(distAssetsDir, { recursive: true });

  // Create dist/assets/css
  const distCssDir = path.join(distAssetsDir, 'css');
  fs.mkdirSync(distCssDir, { recursive: true });

  // Create dist/assets/js
  const distJsDir = path.join(distAssetsDir, 'js');
  fs.mkdirSync(distJsDir, { recursive: true });

  console.log('Created necessary directories');
}

// Copy assets to dist
function copyAssets() {
  const assetsDir = path.join(__dirname, 'assets');
  if (fs.existsSync(assetsDir)) {
    // Copy JS files
    const jsDir = path.join(assetsDir, 'js');
    if (fs.existsSync(jsDir)) {
      fs.cpSync(jsDir, path.join(distDir, 'assets', 'js'), { recursive: true });
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
    // Create all necessary directories
    createDirectories();
    // Process CSS
    await processCSS();
    // Copy assets
    copyAssets();
    // Process HTML files
    processDirectory(pagesDir, distDir);
    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();