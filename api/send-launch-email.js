import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OutingStation is Live!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px;">🎉 We're Live!</h1>
              <p style="color: #e0f7fa; margin: 0; font-size: 16px;">OutingStation is officially open</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #1e293b; margin: 0 0 16px 0; font-weight: bold;">The wait is over! 🚀</p>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                You signed up for early access and the day is finally here. OutingStation is now live and ready for you!
              </p>

              <div style="background-color: #f0fdfa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #0891b2; font-weight: bold; margin: 0 0 16px 0;">🎁 Your Launch Bonus:</p>
                <p style="font-size: 15px; color: #334155; margin: 0 0 8px 0;">✅ Sign up today and get <strong>₦300 free credits</strong></p>
                <p style="font-size: 15px; color: #334155; margin: 0 0 8px 0;">✅ Invite friends and earn even more credits</p>
                <p style="font-size: 15px; color: #334155; margin: 0;">✅ Use credits on your first purchase</p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://www.outingstation.com/signup"
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                  Get Started Now 🎉
                </a>
              </div>

              <p style="font-size: 14px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.6;">
                Questions? Reply to this email or visit
                <a href="https://www.outingstation.com" style="color: #06b6d4;">outingstation.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">OutingStation</p>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">Events & Tickets, Simplified ✨</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Lagos • Abuja • Riyadh • Jeddah</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: '"OutingStation" <' + process.env.GMAIL_USER + '>',
      to: email,
      subject: '🎉 OutingStation is Live — Claim Your ₦300 Bonus!',
      html: emailHTML
    });

    console.log('✅ Launch email sent to:', email);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Launch email error:', error);
    return res.status(500).json({ error: error.message });
  }
}