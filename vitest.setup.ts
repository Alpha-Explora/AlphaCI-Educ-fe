import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// EXPLICIT, because Testing Library's automatic cleanup does not register here.
// RTL installs its own afterEach hook only when a global `afterEach` exists —
// which it does not, since this project does not set `globals: true`. Without
// this, every render stays in the document and the SECOND test onwards fails
// with "found multiple elements", pointing at an assertion that is correct.
afterEach(cleanup);
