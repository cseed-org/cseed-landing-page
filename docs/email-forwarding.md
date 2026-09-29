# Custom-domain email forwarding

Use Cloudflare Email Routing to forward mail such as `hello@yourdomain.com` to an existing Gmail, Outlook, or other inbox. No website code changes are required, except updating your contact address if needed.

## Setup

1. Make sure Cloudflare manages your domain's DNS.
2. Open **Email Routing** in the Cloudflare dashboard.
3. Add your existing inbox under **Destination Addresses** and click the verification link Cloudflare emails you.
4. Follow Cloudflare's setup prompts to add the required email DNS records. Use the exact values provided. If you already use another email provider, review its records before replacing them: changing MX records changes where incoming mail is delivered.
5. Create a routing rule for `hello@yourdomain.com`, choose the action to send to an email address, and select your verified inbox.
6. Send a test message from a different email account and confirm it arrives, checking spam as well.

## Forward to multiple people

A basic routing rule has one destination. To deliver the same message to several people:

1. Add and verify every recipient under **Destination Addresses**.
2. Create a Cloudflare Email Worker with an `email` handler that calls `message.forward(address)` once for each verified recipient.
3. Set the routing rule for `hello@yourdomain.com` to send to that Worker.
4. Test delivery to every recipient.

Do not create duplicate rules for the same custom address; only the first matching rule processes the message.

## Cost and limitations

- Email Routing is free; domain registration still costs money. Email Workers are subject to Workers plan limits.
- Forwarding does not create a separate mailbox or provide outgoing email from your custom address. Replies normally come from your existing inbox address.
- Each recipient gets an independent copy; read status and replies are not shared.
- To send as `hello@yourdomain.com`, configure an outgoing email service or use a hosted mailbox.

## Official references

- [Cloudflare forwarding setup](https://developers.cloudflare.com/email-service/get-started/route-emails/)
- [Routing rules and destination addresses](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/)
- [Multiple destinations and Workers limits](https://developers.cloudflare.com/email-service/platform/limits/#email-routing-limits)
