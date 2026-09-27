import { describe, expect, it } from "vitest"
import { EntityOrigin, EntityStatus, EntityType, type Entity } from "@/types"
import { isAnalysisSource } from "@/utils/expenseAnalysis"

function entity(partial: Partial<Entity>): Entity {
  return {
    id: "bank",
    name: "Bank",
    type: EntityType.FINANCIAL_INSTITUTION,
    origin: EntityOrigin.NATIVE,
    natural_id: "bank",
    features: [],
    last_fetch: {} as Entity["last_fetch"],
    virtual_features: {} as Entity["virtual_features"],
    status: EntityStatus.CONNECTED,
    ...partial,
  }
}

describe("isAnalysisSource", () => {
  it("includes connected and login-required banks", () => {
    expect(isAnalysisSource(entity({}))).toBe(true)
    expect(
      isAnalysisSource(
        entity({
          origin: EntityOrigin.EXTERNALLY_PROVIDED,
          status: EntityStatus.REQUIRES_LOGIN,
        }),
      ),
    ).toBe(true)
  })

  it("excludes disconnected, manual and non-bank connections", () => {
    expect(
      isAnalysisSource(entity({ status: EntityStatus.DISCONNECTED })),
    ).toBe(false)
    expect(isAnalysisSource(entity({ origin: EntityOrigin.MANUAL }))).toBe(
      false,
    )
    expect(isAnalysisSource(entity({ type: EntityType.CRYPTO_EXCHANGE }))).toBe(
      false,
    )
    expect(
      isAnalysisSource(entity({ type: EntityType.MARKET_FORECAST_PLATFORM })),
    ).toBe(false)
  })
})
