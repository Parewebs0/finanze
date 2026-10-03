import { EntityOrigin, EntityStatus, EntityType, type Entity } from "@/types"

/**
 * Banks and external integrations the spending analysis can be scoped to.
 * Manual entries and non-bank products stay out: the page is per connection,
 * not a global mix of every account.
 */
export function isAnalysisSource(entity: Entity): boolean {
  if (
    entity.origin === EntityOrigin.MANUAL ||
    entity.origin === EntityOrigin.INTERNAL
  ) {
    return false
  }
  if (entity.type !== EntityType.FINANCIAL_INSTITUTION) return false
  return (
    entity.status === EntityStatus.CONNECTED ||
    entity.status === EntityStatus.REQUIRES_LOGIN
  )
}
