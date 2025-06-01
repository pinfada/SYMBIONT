module.exports = {
  plugins: [
    require('@tailwindcss/postcss'), // Plugin Tailwind v4
    require('autoprefixer'),
    require('postcss-prefix-selector')({
      prefix: '.ext-',
      includeFiles: [/popup\.css$/],
      transform: function (prefix, selector, prefixedSelector) {
        // Ne préfixe que les classes, pas html/body ni les keyframes
        if (selector.startsWith('body') || 
            selector.startsWith('html') || 
            selector.startsWith('@') ||
            selector.startsWith(':root') ||
            selector.includes('*')) {
          return selector;
        }
        return prefixedSelector;
      }
    })
  ]
};