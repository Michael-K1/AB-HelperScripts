module.exports= {
    'src/**/*.mts': ['npx prettier --write','npx eslint --cache --fix', () => 'npx tsc --pretty --noEmit']
}
