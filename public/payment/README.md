# Payment QR image

The checkout PromptPay / Thai QR Payment image lives here as:

```
k-plus-payment.jpg
```

Full path: `public/payment/k-plus-payment.jpg`, served at `/payment/k-plus-payment.jpg`.

It is rendered on the checkout page (`/checkout`,
`src/components/public/CheckoutClient.tsx`) via `next/image`, shown in the
PromptPay QR payment card before the slip-upload section.

Notes:
- Use a roughly square image for best results (displayed `object-contain`).
- To replace the QR, overwrite `k-plus-payment.jpg` (keep the same name).
