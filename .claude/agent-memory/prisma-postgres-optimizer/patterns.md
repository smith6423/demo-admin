# Query & Schema Patterns

## Safe User List Query (soft delete + no password leak)
```typescript
const users = await prisma.user.findMany({
  where: { deletedAt: null },
  select: {
    id: true,
    email: true,
    name: true,
    isActive: true,
    createdAt: true,
    role: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: 'desc' },
  skip,
  take,
})
```

## Soft Delete Operation
```typescript
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
  select: { id: true },
})
```

## Paginated Count + Data (single round-trip)
```typescript
const [total, items] = await prisma.$transaction([
  prisma.user.count({ where: { deletedAt: null } }),
  prisma.user.findMany({ where: { deletedAt: null }, skip, take, select: { ... } }),
])
```

## Error Handling Wrapper
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  return await prisma.user.create({ data, select: { id: true, email: true } })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new Error('Unique constraint violation')
    if (error.code === 'P2025') throw new Error('Record not found')
  }
  throw new Error('Database operation failed')
}
```
