# Manual Testing Checklist

Quick reference for QA testing before releases. Run `npx prisma db seed` first to create test users.

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@test.com | Test123! |
| SELLER | seller@test.com | Test123! |
| ACCOUNTANT | accountant@test.com | Test123! |
| OPERATOR | operator@test.com | Test123! |

---

## Authentication

- [ ] Login as ADMIN (admin@test.com / Test123!)
- [ ] Login as SELLER (seller@test.com / Test123!)
- [ ] Login as ACCOUNTANT (accountant@test.com / Test123!)
- [ ] Login as OPERATOR (operator@test.com / Test123!)
- [ ] Invalid login shows error message
- [ ] Logout works and redirects to /login
- [ ] Protected routes redirect to /login when not authenticated

---

## Request Module

### As SELLER
- [ ] View request list (only own requests)
- [ ] Create new request
- [ ] Edit own request
- [ ] Cannot edit others' requests
- [ ] Status change works
- [ ] BOOKING status generates bookingCode
- [ ] Follow-up date updates correctly

### As ADMIN
- [ ] View all requests (all sellers)
- [ ] Can edit any request

---

## Operator Module

### As OPERATOR
- [ ] View operator list
- [ ] Claim unclaimed operator
- [ ] Edit claimed operator
- [ ] Cannot edit locked operators
- [ ] Cannot edit operators claimed by others

### As ACCOUNTANT
- [ ] Approve operators
- [ ] Lock/unlock operators

---

## Revenue Module

### As ACCOUNTANT
- [ ] View revenue list
- [ ] Create new revenue
- [ ] Edit unlocked revenue
- [ ] Lock revenue
- [ ] Unlock revenue (ADMIN only for locked)
- [ ] Multi-currency calculation (USD/EUR → VND)
- [ ] Cannot edit locked revenue

### As ADMIN
- [ ] Can unlock any locked revenue

---

## Supplier Module

### As ACCOUNTANT/ADMIN
- [ ] View supplier list
- [ ] Create supplier with unique code
- [ ] Edit supplier
- [ ] Add transaction (deposit, refund, adjustment, fee)
- [ ] Balance calculation correct
- [ ] Supplier reports show correct totals

---

## Settings & Config

### As ADMIN only
- [ ] Access /settings page
- [ ] Manage sellers
- [ ] Manage follow-up statuses
- [ ] Reorder follow-up statuses

### Other roles
- [ ] Get 403 Forbidden on /settings

---

## RBAC Verification

| Route | ADMIN | SELLER | ACCOUNTANT | OPERATOR |
|-------|-------|--------|------------|----------|
| /requests | ✓ | ✓ | ✓ | ✓ |
| /operators | ✓ | - | ✓ | ✓ |
| /revenues | ✓ | - | ✓ | - |
| /suppliers | ✓ | - | ✓ | - |
| /settings | ✓ | - | - | - |

---

## Error Handling

- [ ] API errors show toast notification
- [ ] Form validation errors display correctly
- [ ] 404 page for invalid routes
- [ ] 403 page for unauthorized access

---

## Mobile Responsiveness

- [ ] Dashboard responsive on mobile
- [ ] Tables scroll horizontally
- [ ] Forms usable on mobile
- [ ] Navigation menu works on mobile

---

## Notes

- Run seed before testing: `npx prisma db seed`
- Clear browser cache if login issues
- Check browser console for JS errors
