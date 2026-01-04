module.exports = {
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'prettier'
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    env: {
      browser: true,
      es2021: true,
      node: true,
      webextensions: true
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Ajout de la règle de gestion des commentaires TS
      '@typescript-eslint/ban-ts-comment': [
        'warn', // Utilisez 'warn' pour ne pas bloquer le build, ou 'error' pour rester strict
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': false,
          'minimumDescriptionLength': 5
        }
      ]
    },
    settings: {
      react: {
        version: 'detect' // Bonne pratique pour éviter les warnings react/prop-types
      }
    }
};