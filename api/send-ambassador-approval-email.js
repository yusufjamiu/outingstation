import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, ambassadorType, university, city, state } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const firstName = name.split(' ')[0];
    const isCampus = ambassadorType === 'campus';
    const locationLine = isCampus
      ? university
      : `${city}, ${state}`;

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're an OutingStation Ambassador!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%); padding: 48px 36px; text-align: center;">
              <p style="color: rgba(255,255,255,0.75); margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">OutingStation</p>
              <h1 style="color: #ffffff; margin: 0 0 10px; font-size: 32px; font-weight: 900;">You're In! 🎉</h1>
              <p style="color: #e0f2fe; margin: 0; font-size: 16px;">Your Ambassador Application has been Approved</p>
              <div style="display: inline-block; margin-top: 16px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 6px 20px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800;">
                  ${isCampus ? '🎓 Campus Ambassador' : '🏙️ City Ambassador'} · ${locationLine}
                </span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 36px 0;">
              <p style="font-size: 18px; color: #0f172a; margin: 0 0 16px; font-weight: 800;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 24px; line-height: 1.7;">
                Congratulations! Your application to join the OutingStation Ambassador Program has been reviewed and approved. 
                You are now officially an OutingStation Ambassador — welcome to the team. 🚀
              </p>

              <!-- Badge notice -->
              <div style="background: linear-gradient(135deg, #ecfeff, #e0f2fe); border: 1px solid #a5f3fc; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; color: #0e7490; line-height: 1.6;">
                  ⭐ Your <strong>Ambassador badge</strong> is now active on your OutingStation profile. Open the app to see it on your account.
                </p>
              </div>

              <!-- Getting started -->
              <div style="background-color: #f8fafc; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
                <p style="font-size: 15px; color: #0f172a; font-weight: 800; margin: 0 0 16px;">Here's how to get started:</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                        <strong style="color: #0891b2;">1. Open the OutingStation app</strong><br/>
                        Log in with your account and check out your new Ambassador badge on your profile.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                        <strong style="color: #0891b2;">2. Find your referral link</strong><br/>
                        Go to your profile settings and copy your unique referral link. Every person who signs up through your link earns you credits.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                        <strong style="color: #0891b2;">3. Start sharing</strong><br/>
                        Share OutingStation with your network — friends, classmates, colleagues. The more people you bring in, the more you earn.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                        <strong style="color: #0891b2;">4. Bring in event organizers</strong><br/>
                        Know anyone running events? Connect them with OutingStation. Organizers you bring in earn you additional rewards.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Ambassador Kit notice -->
              <div style="background: linear-gradient(135deg, #fdf4ff, #fae8ff); border: 1px solid #e9d5ff; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 6px; font-size: 14px; color: #7c3aed; font-weight: 800;">📦 Your Ambassador Kit is coming</p>
                <p style="margin: 0; font-size: 13px; color: #6d28d9; line-height: 1.6;">
                  We'll be sending you your full Ambassador Kit shortly — talking points, content ideas, graphics, and everything you need to represent OutingStation well. Keep an eye on your inbox.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://www.outingstation.com/settings"
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 15px; letter-spacing: 0.3px;">
                  Open OutingStation →
                </a>
              </div>

              <p style="font-size: 14px; color: #94a3b8; text-align: center; margin: 0 0 32px; line-height: 1.6;">
                Questions? Reply to this email or reach us at 
                <a href="mailto:admin@outingstation.com" style="color: #0891b2; text-decoration: none;">admin@outingstation.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 28px 36px; text-align: center;">
              <p style="margin: 0 0 4px; color: #ffffff; font-size: 15px; font-weight: 800;">Welcome to the movement! 🚀</p>
              <p style="margin: 0 0 12px; color: rgba(255,255,255,0.75); font-size: 13px;">— Yusuf Jamiu, Founder & CEO, OutingStation</p>
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 11px;">© ${new Date().getFullYear()} OutingStation Limited. outingstation.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: '"OutingStation" <' + process.env.GMAIL_USER + '>',
      to: email,
      subject: `Congratulations ${firstName}! You're an OutingStation Ambassador 🎉`,
      html: emailHTML
    });

    console.log('✅ Ambassador approval email sent to:', email);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Ambassador approval email error:', error);
    return res.status(500).json({ error: error.message });
  }
}