const WHATSCHIMP_API_TOKEN = process.env.WHATSCHIMP_API_KEY;
const WHATSCHIMP_PHONE_NUMBER_ID = process.env.WHATSCHIMP_PHONE_NUMBER_ID;

// Template IDs from WhatSchimp dashboard
const TEMPLATE_IDS = {
  welcome_new_user: '356582',
  resending_ticket: '356578',
  event_reminder: '356563',
  ticket_confimation: '356557'
};

export default async function handler(req, res) {
  console.log('🔔 WhatsApp API called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // Format phone number
    const formattedPhone = phone.replace(/\s/g, '').startsWith('+')
      ? phone.replace(/\s/g, '')
      : '+234' + phone.replace(/^0/, '');

    // Build URL with query params as shown in WhatSchimp docs
    const url = 'https://app.whatchimp.com/api/v1/whatsapp/send/template' +
      '?apiToken=' + WHATSCHIMP_API_TOKEN +
      '&phone_number_id=' + WHATSCHIMP_PHONE_NUMBER_ID +
      '&template_id=' + templateId +
      '&phone_number=' + encodeURIComponent(formattedPhone);

    console.log('📤 Sending template to WhatSchimp:', {
      template,
      templateId,
      phone: formattedPhone
    });

    const response = await fetch(url, {
      method: 'POST'
    });

    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({
        error: 'Invalid response from WhatsApp service',
        details: responseText.substring(0, 200)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Failed to send WhatsApp message',
        details: data
      });
    }

    console.log('✅ WhatsApp template sent successfully');
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Exception in WhatsApp API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}