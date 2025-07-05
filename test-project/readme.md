# Test Project

This project is intended to be run separately from the parent project. To set up an isolated environment with Yarn, follow these steps:

## Steps

1. **Create an empty `yarn.lock` file:**

  ```sh
  cd /d:/Repositories/binary-collections/test-project
  type nul > yarn.lock
  ```

2. **Initialize a new Yarn project:**

  ```sh
  yarn init -y
  ```

3. **Install dependencies as needed:**

  ```sh
  yarn add <package-name>
  ```

This ensures the `test-project` has its own dependency tree, separate from the parent project.