import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email } = req.body;

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

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to OutingStation!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px;">Welcome to OutingStation!</h1>
              <p style="color: #e0f7fa; margin: 0; font-size: 16px;">One App. Many Experiences.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #1e293b; margin: 0 0 16px 0; font-weight: bold;">Hi ${firstName},</p>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                We are thrilled to have you on board. OutingStation is your central hub for discovering events, 
                exploring places, booking tickets and experiencing everything happening around you — 
                on campus, in your city and beyond.
              </p>

              <!-- What you can do -->
              <div style="background-color: #f0fdfa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #0891b2; font-weight: bold; margin: 0 0 16px 0;">Here is what you can do on OutingStation:</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">🔍 <strong>Discover</strong> events, places and experiences near you</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">🎟️ <strong>Book tickets</strong> for events seamlessly and securely</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">🏙️ <strong>Explore city places</strong> — art centres, parks, gardens, family fun spots and more</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">🎓 <strong>Campus events and places</strong> — discover what is happening at your university</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">💻 <strong>Webinars and virtual events</strong> — attend online events from anywhere</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">❤️ <strong>Save events</strong> and get automatic reminders before they start</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 15px; color: #334155;">🤝 <strong>Refer friends</strong> and earn credits redeemable on the platform</p>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 16px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                Ready to explore? Head over to OutingStation and start discovering everything happening around you.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://www.outingstation.com/events" 
                   style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                  Start Exploring
                </a>
              </div>

              <p style="font-size: 14px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.6;">
                Have questions? Reply to this email or visit 
                <a href="https://www.outingstation.com" style="color: #06b6d4;">outingstation.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">OutingStation</p>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">Your Central Hub for Outings and Experiences</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Lagos • Abuja • Kano • Abia
              </p>
              <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 11px;">
                You are receiving this because you just created an account on OutingStation.
              </p>
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
      subject: 'Welcome to OutingStation, ' + firstName + '!',
      html: emailHTML
    });

    console.log('✅ Welcome email sent to:', email);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Welcome email error:', error);
    return res.status(500).json({ error: error.message });
  }
}