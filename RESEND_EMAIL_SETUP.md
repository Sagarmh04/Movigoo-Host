# 📧 Resend Email Setup for Support Tickets

## ✅ Implementation Complete

The support ticket system now uses **Resend** for production-grade transactional emails.

---

## 🔑 Environment Variable Required

### **For Local Development**
Add to `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
```

### **For Production (Vercel)**
Add to Vercel Environment Variables:
```
RESEND_API_KEY=re_your_api_key_here
```

---

## 🚀 Getting Your Resend API Key

1. **Sign up at Resend**: https://resend.com/signup
2. **Verify your domain** (optional, for production sender):
   - Go to Domains → Add Domain
   - Add DNS records for `movigoo.in`
   - Verify ownership
3. **Get API Key**:
   - Go to API Keys → Create API Key
   - Copy the key (starts with `re_`)
   - Add to environment variables

---

## 📨 Email Configuration

### **Current Sender**
```
Movigoo Support <onboarding@resend.dev>
```
This is Resend's default sender for testing and works immediately.

### **Future Sender (After Domain Verification)**
```
Movigoo Support <support@movigoo.in>
```
Update in `app/api/support/notify/route.ts`:
```typescript
from: "Movigoo Support <support@movigoo.in>",
```

---

## 📬 Email Recipients

### **Ticket Created**
- **To**: `movigootech@gmail.com`
- **Subject**: `New Support Ticket: SUP-10231 - [Subject]`
- **Content**: Ticket ID, category, user details, description

### **Support Reply**
- **To**: User's email address
- **Subject**: `Support Reply: SUP-10231`
- **Content**: Reply message, link to view conversation

---

## 🛡️ Error Handling

### **Graceful Degradation**
- ✅ Email failures **do NOT** break ticket creation
- ✅ Errors are logged to console
- ✅ Tickets are still saved to Firestore

### **Development Fallback**
If `RESEND_API_KEY` is not set:
- Emails are logged to console instead
- System continues to work normally
- No production impact

---

## 🧪 Testing Email Delivery

### **Local Testing**
1. Add `RESEND_API_KEY` to `.env.local`
2. Create a support ticket
3. Check Resend dashboard for delivery status

### **Production Testing**
1. Deploy to Vercel with `RESEND_API_KEY` set
2. Create a test ticket
3. Verify email received at `movigootech@gmail.com`

---

## 📊 Monitoring

### **Resend Dashboard**
- View all sent emails
- Check delivery status
- Monitor bounce/spam rates
- View email logs

### **Console Logs**
Success:
```
✅ Email sent successfully to movigootech@gmail.com
```

Failure:
```
Failed to send email via Resend: [error details]
```

---

## 🔧 Troubleshooting

### **Issue: Emails not sending**
**Check**:
1. `RESEND_API_KEY` is set correctly
2. API key is valid (not expired/revoked)
3. Resend account is active
4. Check Resend dashboard for errors

### **Issue: Emails going to spam**
**Solutions**:
1. Verify your domain in Resend
2. Set up SPF, DKIM, DMARC records
3. Use verified sender email (`support@movigoo.in`)

### **Issue: Rate limiting**
**Solutions**:
1. Check Resend plan limits
2. Upgrade plan if needed
3. Implement email queuing (future enhancement)

---

## 📈 Resend Free Tier Limits

- **100 emails/day** (free tier)
- **3,000 emails/month** (free tier)
- Upgrade to paid plan for higher limits

---

## 🔐 Security Best Practices

✅ **Never commit API keys to git**
✅ **Use environment variables only**
✅ **Rotate keys periodically**
✅ **Monitor usage in Resend dashboard**
✅ **Set up alerts for suspicious activity**

---

## 📝 Implementation Details

### **Files Modified**
- `app/api/support/notify/route.ts` - Resend integration
- `package.json` - Added `resend` dependency

### **Code Changes**
```typescript
import { Resend } from "resend";

async function sendEmail(to: string, subject: string, body: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: "Movigoo Support <onboarding@resend.dev>",
    to,
    subject,
    text: body,
  });
}
```

---

## ✅ Production Checklist

- [ ] Sign up for Resend account
- [ ] Get API key
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Deploy to production
- [ ] Test ticket creation
- [ ] Verify email delivery to `movigootech@gmail.com`
- [ ] (Optional) Verify domain for custom sender
- [ ] Monitor Resend dashboard for delivery issues

---

**Status**: ✅ **Production Ready**

The email system is fully functional and will work immediately after adding the `RESEND_API_KEY` environment variable.
