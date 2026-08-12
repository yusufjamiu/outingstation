// api/send-notification.js
//
// ✅ MERGED — this replaces 5 separate serverless functions:
//   send-ambassador-approval-email.js, send-bulk-reminder.js,
//   send-launch-email.js, send-welcome-email.js, send-whatsapp.js
// Vercel's Hobby plan caps deployments at 12 serverless functions;
// this project had 14. These 5 were the safest to merge because every
// caller is YOUR OWN app code (admin panel, signup flow, WhatsAppService)
// — no external service (unlike Paystack's webhook) depends on these
// exact URLs, so updating the callers is safe and fully within your
// control.
//
// Each original handler's logic — HTML templates, required fields,
// error handling — is preserved exactly as-is, just routed by a `type`
// field in the request body instead of living in its own file.
//
// CALLERS MUST UPDATE:
//   POST /api/send-ambassador-approval-email  →  POST /api/send-notification  { type: 'ambassador-approval', ...sameBodyAsBefore }
//   POST /api/send-bulk-reminder              →  POST /api/send-notification  { type: 'bulk-reminder', ...sameBodyAsBefore }
//   POST /api/send-launch-email               →  POST /api/send-notification  { type: 'launch-email', ...sameBodyAsBefore }
//   POST /api/send-welcome-email              →  POST /api/send-notification  { type: 'welcome-email', ...sameBodyAsBefore }
//   POST /api/send-whatsapp                   →  POST /api/send-notification  { type: 'whatsapp', ...sameBodyAsBefore }
// i.e. every existing field (name, email, phone, template, variables,
// eventTitle, users, etc.) stays exactly the same — just add `type` and
// change the URL.

import nodemailer from 'nodemailer';

// ─── Shared email transporter (was duplicated 4x across the old files) ────
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ─── ambassador-approval ───────────────────────────────────────────────
async function handleAmbassadorApproval(req, res) {
  const { name, email, ambassadorType, university, city, state } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const transporter = getTransporter();
  const firstName = name.split(' ')[0];
  const isCampus = ambassadorType === 'campus';
  const locationLine = isCampus ? university : `${city}, ${state}`;

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
          <tr>
            <td style="padding: 36px 36px 0;">
              <p style="font-size: 18px; color: #0f172a; margin: 0 0 16px; font-weight: 800;">Hi ${firstName},</p>
              <p style="font-size: 15px; color: #475569; margin: 0 0 24px; line-height: 1.7;">
                Congratulations! Your application to join the OutingStation Ambassador Program has been reviewed and approved.
                You are now officially an OutingStation Ambassador — welcome to the team. 🚀
              </p>
              <div style="background: linear-gradient(135deg, #ecfeff, #e0f2fe); border: 1px solid #a5f3fc; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; color: #0e7490; line-height: 1.6;">
                  ⭐ Your <strong>Ambassador badge</strong> is now active on your OutingStation profile. Open the app to see it on your account.
                </p>
              </div>
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
              <div style="background: linear-gradient(135deg, #fdf4ff, #fae8ff); border: 1px solid #e9d5ff; border-radius: 14px; padding: 18px 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 6px; font-size: 14px; color: #7c3aed; font-weight: 800;">📦 Your Ambassador Kit is coming</p>
                <p style="margin: 0; font-size: 13px; color: #6d28d9; line-height: 1.6;">
                  We'll be sending you your full Ambassador Kit shortly — talking points, content ideas, graphics, and everything you need to represent OutingStation well. Keep an eye on your inbox.
                </p>
              </div>
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
    html: emailHTML,
  });

  console.log('✅ Ambassador approval email sent to:', email);
  return res.status(200).json({ success: true });
}

// ─── bulk-reminder ──────────────────────────────────────────────────────
async function handleBulkReminder(req, res) {
  const { eventTitle, eventDate, eventLocation, users } = req.body;

  if (!users || users.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }

  const transporter = getTransporter();
  const results = [];

  for (const user of users) {
    if (!user.userEmail || user.userEmail === 'N/A') {
      results.push({ name: user.userName, status: 'skipped', reason: 'no email' });
      continue;
    }

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Event Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📅 Saved Event Reminder!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px 0;">Hi ${user.userName},</p>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 20px 0;">
                You saved <strong>${eventTitle}</strong> and we wanted to remind you about it!
              </p>
              <div style="background-color: #f0fdfa; border-left: 4px solid #06b6d4; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> ${eventDate}</p>
                <p style="margin: 0;"><strong>📍 Location:</strong> ${eventLocation}</p>
              </div>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 20px 0;">
                Don't miss out! Get your tickets now on OutingStation.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.outingstation.com" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Visit OutingStation
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                - OutingStation Team
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

    try {
      await transporter.sendMail({
        from: `"OutingStation" <${process.env.GMAIL_USER}>`,
        to: user.userEmail,
        subject: `📅 Reminder: ${eventTitle}`,
        html: emailHTML,
      });
      results.push({ name: user.userName, email: user.userEmail, status: 'sent' });
      console.log(`✅ Email sent to ${user.userName}`);
    } catch (error) {
      results.push({ name: user.userName, email: user.userEmail, status: 'failed', error: error.message });
      console.error(`❌ Failed for ${user.userName}:`, error);
    }
  }

  const sent = results.filter((r) => r.status === 'sent').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  return res.status(200).json({ success: true, sent, failed, skipped, results });
}

// ─── launch-email ───────────────────────────────────────────────────────
async function handleLaunchEmail(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const transporter = getTransporter();

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
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px;">🎉 We're Live!</h1>
              <p style="color: #e0f7fa; margin: 0; font-size: 16px;">OutingStation is officially open</p>
            </td>
          </tr>
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
          <tr>
            <td style="padding: 24px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">OutingStation</p>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">Events & Tickets, Simplified ✨</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Lagos • Abuja • Ibadan • Port Harcourt • Kano • Benin City</p>
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
    html: emailHTML,
  });

  console.log('✅ Launch email sent to:', email);
  return res.status(200).json({ success: true });
}

// ─── welcome-email ──────────────────────────────────────────────────────
async function handleWelcomeEmail(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const transporter = getTransporter();
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
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px;">Welcome to OutingStation!</h1>
              <p style="color: #e0f7fa; margin: 0; font-size: 16px;">One App. Many Experiences.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #1e293b; margin: 0 0 16px 0; font-weight: bold;">Hi ${firstName},</p>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                We are thrilled to have you on board. OutingStation is your central hub for discovering events,
                exploring places, booking tickets and experiencing everything happening around you —
                on campus, in your city and beyond.
              </p>
              <div style="background-color: #f0fdfa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #0891b2; font-weight: bold; margin: 0 0 16px 0;">Here is what you can do on OutingStation:</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">🔍 <strong>Discover</strong> events, places and experiences near you</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">🎟️ <strong>Book tickets</strong> for events seamlessly and securely</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">🏙️ <strong>Explore city places</strong> — art centres, parks, gardens, family fun spots and more</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">🎓 <strong>Campus events and places</strong> — discover what is happening at your university</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">💻 <strong>Webinars and virtual events</strong> — attend online events from anywhere</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">❤️ <strong>Save events</strong> and get automatic reminders before they start</p></td></tr>
                  <tr><td style="padding: 8px 0;"><p style="margin: 0; font-size: 15px; color: #334155;">🤝 <strong>Refer friends</strong> and earn credits redeemable on the platform</p></td></tr>
                </table>
              </div>
              <p style="font-size: 16px; color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                Ready to explore? Head over to OutingStation and start discovering everything happening around you.
              </p>
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
          <tr>
            <td style="padding: 24px 30px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: bold;">OutingStation</p>
              <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">Your Central Hub for Outings and Experiences</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">Lagos • Abuja • Kano • Abia</p>
              <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 11px;">You are receiving this because you just created an account on OutingStation.</p>
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
    html: emailHTML,
  });

  console.log('✅ Welcome email sent to:', email);
  return res.status(200).json({ success: true });
}

// ─── whatsapp ───────────────────────────────────────────────────────────
const WHATSCHIMP_API_TOKEN = process.env.WHATSCHIMP_API_KEY;
const WHATSCHIMP_PHONE_NUMBER_ID = process.env.WHATSCHIMP_PHONE_NUMBER_ID;

const TEMPLATE_IDS = {
  welcome_new_use: '381227',
  resending_ticket: '356578',
  event_reminder: '356563',
  ticket_confimation: '356557',
};

async function handleWhatsapp(req, res) {
  console.log('🔔 WhatsApp notification called');

  const { phone, template, variables } = req.body;

  if (!phone || !template) {
    return res.status(400).json({ error: 'Phone and template are required' });
  }
  if (!WHATSCHIMP_API_TOKEN) {
    return res.status(500).json({ error: 'WhatsApp API token not configured' });
  }
  if (!WHATSCHIMP_PHONE_NUMBER_ID) {
    return res.status(500).json({ error: 'WhatsApp phone number ID not configured' });
  }

  const templateId = TEMPLATE_IDS[template];
  if (!templateId) {
    return res.status(400).json({ error: 'Unknown template: ' + template });
  }

  const formattedPhone = phone.replace(/\s/g, '').startsWith('+')
    ? phone.replace(/\s/g, '')
    : '+234' + phone.replace(/^0/, '');

  let url = 'https://app.whatchimp.com/api/v1/whatsapp/send/template' +
    '?apiToken=' + WHATSCHIMP_API_TOKEN +
    '&phone_number_id=' + WHATSCHIMP_PHONE_NUMBER_ID +
    '&template_id=' + templateId +
    '&phone_number=' + encodeURIComponent(formattedPhone);

  if (variables && typeof variables === 'object') {
    Object.keys(variables).forEach((key) => {
      url += '&variable' + key + '=' + encodeURIComponent(variables[key]);
    });
  }

  console.log('📤 Sending template to WhatSchimp:', { template, templateId, phone: formattedPhone, variables });
  console.log('🔗 Full URL:', url.replace(WHATSCHIMP_API_TOKEN, 'HIDDEN'));

  const response = await fetch(url, { method: 'POST' });
  const responseText = await response.text();
  console.log('📄 Raw response:', responseText);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    return res.status(500).json({
      error: 'Invalid response from WhatsApp service',
      details: responseText.substring(0, 200),
    });
  }

  if (!response.ok || data.status === '0') {
    return res.status(400).json({ error: data.message || 'Failed to send WhatsApp message', details: data });
  }

  console.log('✅ WhatsApp template sent successfully');
  return res.status(200).json({ success: true, data });
}

// ─── Router ─────────────────────────────────────────────────────────────
const HANDLERS = {
  'ambassador-approval': handleAmbassadorApproval,
  'bulk-reminder': handleBulkReminder,
  'launch-email': handleLaunchEmail,
  'welcome-email': handleWelcomeEmail,
  'whatsapp': handleWhatsapp,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body || {};
  const fn = HANDLERS[type];

  if (!fn) {
    return res.status(400).json({
      error: `Unknown or missing notification type: "${type}". Expected one of: ${Object.keys(HANDLERS).join(', ')}`,
    });
  }

  try {
    return await fn(req, res);
  } catch (error) {
    console.error(`❌ send-notification (${type}) error:`, error);
    return res.status(500).json({ error: error.message });
  }
}