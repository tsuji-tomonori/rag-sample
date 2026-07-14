import { describe, expect, test } from "vitest"
import { runtimeConfig } from "./runtimeConfig.js"

describe("runtimeConfig", () => {
  test("uses explicit local mode without Cognito fallback values", () => {
    expect(runtimeConfig({ VITE_AUTH_MODE:"local", BASE_URL:"/", MODE:"test", DEV:false, PROD:false, SSR:false })).toEqual({ authMode:"local", apiBaseUrl:"" })
  })

  test("rejects incomplete Cognito settings", () => {
    expect(() => runtimeConfig({ VITE_AUTH_MODE:"cognito", BASE_URL:"/", MODE:"test", DEV:false, PROD:false, SSR:false })).toThrow(/configuration is missing/)
  })
})
