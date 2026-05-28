# Member deletion dependency checks

Member deletion is handled by `DeleteMemberUseCase` in the application layer.
It deletes only clean members: members that are not referenced by membership
payments or attendance lists.

When a new entity starts storing member ids, update the deletion dependency
checks before the feature ships:

- add an application port method that returns ids of records referencing a
  member
- back the method with an indexed Dexie lookup suitable for mobile-first
  local reads
- include the returned ids in `DeleteMemberResult`
- keep the member untouched and skip the `member.deleted` event whenever any
  dependency list is non-empty

This keeps destructive member operations explicit and prevents orphaned
local-first records.
