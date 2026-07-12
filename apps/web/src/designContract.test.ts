import { describe, expect, test } from "vitest"
import contract from "../design-contract.json"

describe("Web design contract", () => {
  test("keeps view and action identifiers unique", () => {
    const identifiers = [...contract.views, ...contract.actions].map(item => item.id)
    expect(new Set(identifiers).size).toBe(identifiers.length)
  })

  test("requires permissions, endpoints, explicit states, and one production auth mode", () => {
    expect(contract.actions.every(action => action.permission && action.endpoint && action.states.length >= 4)).toBe(true)
    expect(contract.authModes.filter(mode => mode.production).map(mode => mode.id)).toEqual(["cognito"])
    expect(contract.realtime.channel).toBe("verified subject")
  })
})
