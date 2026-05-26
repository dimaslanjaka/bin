complex patterns:

```log
--pattern hexo/lib/**/* --pattern yarn.lock --ignore **/{__tests__,__mocks__,test,tests,coverage}/** --ignore **/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx} --ignore **/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx}
```

```bash
node src/run-by-checksum-cli.js --pattern yarn.lock --ignore **/{__tests__,__mocks__,test,tests,coverage}/** --ignore **/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx} --pattern **/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx} -p src/**/*.cjs --exec "echo hello world"

node src/run-by-checksum-cli.js --pattern yarn.lock --ignore **/*.{test,spec,bench,benchmark}.{js,cjs,mjs,jsx,ts,tsx} --pattern **/{jest.config,jest.setup,setupTests}.{js,cjs,mjs,jsx,ts,tsx} -p src/**/*.{cjs,mjs,js} -p test/**/*.{cjs,mjs,js} --exec "echo hello world"
```