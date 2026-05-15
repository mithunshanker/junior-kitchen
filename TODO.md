# Junior Kitchen — Remaining Audit TODO

> Issues from the full QA audit that were deferred because they require architectural changes or backend infrastructure.
> Last updated: 2026-05-15

---

## 🔴 High

### 1. Firestore role checks are billed reads on every operation
**File:** `firestore.rules`  
**Issue:** `isAdmin()` and `isDelivery()` both call `get()` to fetch the user document on **every** Firestore operation. Each call is a billable read. With many concurrent users this becomes expensive and slow.  
**Fix Required:** Migrate role checks to **Firebase Custom Claims** (set via Cloud Function or Admin SDK on role assignment). Roles then come from `request.auth.token.role` — zero extra reads, instant, and tamper-proof.  
**Steps:**
1. Create a Cloud Function (e.g. `onUserRoleUpdate`) triggered by writes to `users/{uid}` that calls `admin.auth().setCustomUserClaims(uid, { role })`.
2. Update `firestore.rules` to use `request.auth.token.role == "admin"` etc.
3. Force token refresh on the client after role change: `user.getIdToken(true)`.

---

## 🟡 Medium

### 2. Dashboard streams entire orders collection for counting
**File:** `src/routes/admin.index.tsx` (line 19)  
**Issue:** `onSnapshot(collection(db, "orders"))` fetches **every order document** on every change just to count statuses. With 10,000 orders, each status change triggers a read of all 10,000 docs.  
**Fix Required:** Use one of:
- Firestore Aggregation API: `getCountFromServer(query(collection(db, "orders"), where("status", "==", "pending")))` per status.
- A Cloud Function that maintains a `meta/orderCounts` counter document (`{ pending, preparing, ready, delivered }`) and updates it on each order write.

---

### 3. Customer page streams ALL orders for client-side joins
**File:** `src/routes/admin.customers.tsx` (line 51)  
**Issue:** `onSnapshot(collection(db, "orders"), orderBy("createdAt", "desc"))` loads **every order** into memory to do a client-side join per customer. Grows unboundedly with order volume.  
**Fix Required:** Load orders **on-demand** when a customer row is expanded:
```ts
// Only fetch when expanded
const [userOrders, setUserOrders] = useState<OrderDoc[]>([]);
useEffect(() => {
  if (!expanded) return;
  getDocs(query(collection(db, "orders"), where("userId", "==", c.uid), orderBy("createdAt", "desc"), limit(10)))
    .then(snap => setUserOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDoc))));
}, [expanded, c.uid]);
```

---

### 4. Delivery Partners page streams ALL orders for client-side joins
**File:** `src/routes/admin.delivery.tsx` (line 52)  
**Issue:** Same problem as above — entire orders collection loaded to compute per-partner order history.  
**Fix Required:** Same on-demand approach — fetch orders per partner only when their row is expanded.

---

### 5. "Deliveries" count shows customer orders, not actual deliveries
**File:** `src/routes/admin.delivery.tsx` (line 65–67)  
**Issue:** `ordersFor(uid)` filters by `userId == uid`, which counts orders the person *placed as a customer*, not orders *they delivered*. A partner who was previously a customer will show inflated numbers.  
**Fix Required:** Filter by `deliveredByUid` instead:
```ts
function deliveriesFor(uid: string) {
  return orders.filter((o) => o.deliveredByUid === uid);
}
```
Note: historical orders before `deliveredByUid` was added will show 0 — this is acceptable and accurate.

---

## 🔵 Low

### 6. Brief NAV tab flash for delivery role before redirect fires
**File:** `src/routes/admin.tsx`  
**Issue:** Between the render and the `useEffect` guard firing, a delivery partner could briefly see nav tabs they shouldn't (Dashboard, Menu, Delivery) before being redirected. The loading guard mitigates this but doesn't fully eliminate the one-render flash.  
**Fix Required:** The cleanest fix is item #1 above (Custom Claims), which allows synchronous role checking before any render. Alternatively, derive the filtered NAV entirely from the resolved `role` and render no content at all until `role` is confirmed, using a Suspense boundary or stricter loading gate.

---

## Summary

| # | Severity | File | Requires |
|---|---|---|---|
| 1 | 🔴 High | `firestore.rules` | Firebase Custom Claims + Cloud Function |
| 2 | 🟡 Medium | `admin.index.tsx` | Aggregation API or counter document |
| 3 | 🟡 Medium | `admin.customers.tsx` | On-demand per-customer order fetch |
| 4 | 🟡 Medium | `admin.delivery.tsx` | On-demand per-partner order fetch |
| 5 | 🟡 Medium | `admin.delivery.tsx` | Filter by `deliveredByUid` not `userId` |
| 6 | 🔵 Low | `admin.tsx` | Custom Claims (see #1) or stricter loading gate |
