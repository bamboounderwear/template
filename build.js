const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'pages');
const componentsDir = path.join(__dirname, 'components');
const distDir = path.join(__dirname, 'dist');

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

function processTemplate(content) {
  // This regex captures the component name and the parameter string.
  return content.replace(/{{>\s*(\w+)(.*?)}}/g, (match, componentName, paramsString) => {
    const componentPath = path.join(componentsDir, `${componentName}.html`);
    if (!fs.existsSync(componentPath)) {
      console.error(`Component "${componentName}" not found at ${componentPath}`);
      return '';
    }
    let componentContent = fs.readFileSync(componentPath, 'utf8');

    // Parse parameters in the form key="value"
    // Example paramsString: ' title="Custom Title" slogan="The Best Site Ever"'
    const paramsRegex = /(\w+)\s*=\s*"([^"]*)"/g;
    let paramMatch;
    while ((paramMatch = paramsRegex.exec(paramsString)) !== null) {
      const key = paramMatch[1];
      const value = paramMatch[2];
      // Replace all placeholders in the component content that match the key.
      const placeholderRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      componentContent = componentContent.replace(placeholderRegex, value);
    }
    return componentContent;
  });
}

// Process each page in the pages directory
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
