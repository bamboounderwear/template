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

// Process CSS with PostCSS and Tailwind
async function processCSS() {
  const css = fs.readFileSync('styles.css', 'utf8');
  const result = await postcss([
    tailwindcss,
    autoprefixer
  ]).process(css, {
    from: 'styles.css',
    to: path.join(distDir, 'styles.css')
  });

  fs.writeFileSync(path.join(distDir, 'styles.css'), result.css);
  console.log('CSS processed with Tailwind');
}

// Parse parameters from include tag parameter string (e.g., ' pageTitle="Home" slogan="Welcome"')
function parseParams(paramsString) {
  const params = {};
  // Match key="value" pairs
  const regex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = regex.exec(paramsString)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

// Replace include tags with the corresponding component content,
// replacing placeholders with passed parameters.
function processTemplate(content) {
  return content.replace(/{{>\s*(\w+)([^}]*)}}/g, (match, componentName, paramsString) => {
    const componentPath = path.join(componentsDir, `${componentName}.html`);
    if (!fs.existsSync(componentPath)) {
      console.error(`Component "${componentName}" not found at ${componentPath}`);
      return '';
    }
    let componentContent = fs.readFileSync(componentPath, 'utf8');
    const params = parseParams(paramsString);
    // Replace each placeholder in the component (e.g., {{pageTitle}}) with the provided value
    for (const key in params) {
      const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      componentContent = componentContent.replace(placeholderRegex, params[key]);
    }
    return componentContent;
  });
}

// Recursively process directories and files from the source (pages)
// to the destination (dist) while maintaining the same folder structure.
function processDirectory(srcDir, destDir) {
  fs.readdirSync(srcDir).forEach(entry => {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      // Create the subdirectory in dist if it doesn't exist
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      // Recursively process the subdirectory
      processDirectory(srcPath, destPath);
    } else if (stats.isFile()) {
      // Process files by replacing the component include tags
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
    // Process CSS first
    await processCSS();
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