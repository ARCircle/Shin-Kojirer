# Quickstart: End-to-End Test Scenario

This guide provides an end-to-end test scenario to validate the core user journey based on the final data model.

## Prerequisites
- The application server is running.
- Assumed IDs for this test:
  - Ramen (BASE_ITEM): `merch_ramen_01`
  - Pork Topping (TOPPING): `merch_pork_02`
  - SNS Discount (DISCOUNT): `merch_discount_03`

## 1. Setup: Create Merchandise and Prices

Before placing an order, we need to ensure the merchandise and their prices are in the system.

**Action**: Send `POST` requests to `/merchandise` and `/merchandise/{id}/prices`.

```bash
# 1. Create Ramen
curl -X POST http://localhost:3000/merchandise -H "Content-Type: application/json" -d '{"id": "merch_ramen_01", "name": "特製ラーメン", "price": 800, "type": "BASE_ITEM"}'

# 2. Create Pork Topping
curl -X POST http://localhost:3000/merchandise -H "Content-Type: application/json" -d '{"id": "merch_pork_02", "name": "チャーシュー", "price": 150, "type": "TOPPING"}'

# 3. Create SNS Discount
curl -X POST http://localhost:3000/merchandise -H "Content-Type: application/json" -d '{"id": "merch_discount_03", "name": "SNS割引", "price": -50, "type": "DISCOUNT"}'
```

## 2. Customer Places an Order

A customer orders one ramen with a pork topping and applies a discount.

**Action**: Send a `POST` request to `/orders` with one group containing the three items.

```bash
# Request
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "groups": [
      {
        "items": [
          { "merchandiseId": "merch_ramen_01" },
          { "merchandiseId": "merch_pork_02" },
          { "merchandiseId": "merch_discount_03" }
        ]
      }
    ]
  }'

# Expected Response (201 Created)
# Note the returned orderId and the groupId for the next steps.
{
  "id": "ord_12345",
  "callNum": 101,
  "status": "ORDERED",
  "groups": [
    {
      "id": "grp_67890",
      "status": "NOT_READY",
      "items": [...] 
    }
  ]
}
```

## 3. Update Statuses

The order is paid for, and the kitchen starts preparing the group.

**Action**: Call the payment and preparation endpoints.

```bash
# 1. Mark the Order as PAID (customer-facing status)
curl -X POST http://localhost:3000/orders/ord_12345/pay

# 2. Mark the Item Group as PREPARING (internal status)
curl -X POST http://localhost:3000/order-item-groups/grp_67890/prepare
```

**Verification**: A `GET` request to `/orders/ord_12345` should show the order `status` as `PAID` and the group `status` as `PREPARING`.

```