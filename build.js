const fs = require('fs');
const path = require('path');

// Define directories
const pagesDir = path.join(__dirname, 'pages');
const componentsDir = path.join(__dirname, 'components');
const distDir = path.join(__dirname, 'dist');

// Ensure the dist directory exists (create it if not)
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Function to process a page’s content by replacing component tags
function processTemplate(content) {
  // Look for include tags like: {{> nav}} or {{> footer}}
  return content.replace(/{{>\s*(\w+)\s*}}/g, (match, componentName) => {
    const componentPath = path.join(componentsDir, `${componentName}.html`);
    if (fs.existsSync(componentPath)) {
      return fs.readFileSync(componentPath, 'utf8');
    } else {
      console.error(`Component "${componentName}" not found at ${componentPath}`);
      return '';
    }
  });
}

// Read all pages and process them
fs.readdir(pagesDir, (err, files) => {
  if (err) {
    console.error('Error reading pages directory:', err);
    return;
  }
  
  files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading file ${file}:`, err);
        return;
      }
      
      const processedContent = processTemplate(data);
      const outputPath = path.join(distDir, file);
      fs.writeFile(outputPath, processedContent, 'utf8', err => {
        if (err) {
          console.error(`Error writing file ${file}:`, err);
        } else {
          console.log(`Built ${file}`);
        }
      });
    });
  });
});
