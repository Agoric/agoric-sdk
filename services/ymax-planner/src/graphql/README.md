Each GraphQL API used by this package should have an api-* subdirectory here,
with the following contents:
* a codegen.ts file that exports a
  [GraphQL Codegen](https://the-guild.dev/graphql/codegen) CodegenConfig based
  upon its containing directory name by this directory's
  **codegen-config.base.ts**:
  ```ts
  import { makeCodegenConfigForFileUrl } from '../codegen-config.base.ts';

  export default makeCodegenConfigForFileUrl(import.meta.url);
  ```
* a **request-documents/** subdirectory containing a *.graphql file for each
  request document used by the containing package
* a **__generated/** subdirectory containing generated code
