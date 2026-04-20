// api/send-whatsapp.js
// Backend API to send WhatsApp via WhatSchimp

const WHATSCHIMP_API_URL = 'https://app.whatchimp.com/api/v1/whatsapp/send';
const WHATSCHIMP_API_KEY = process.env.WHATSCHIMP_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, template, variables } = req.body;

    if (!phone || !template) {
      return res.status(400).json({ error: 'Phone and template are required' });
    }

    // Format phone number (ensure +234 format)
    const formattedPhone = phone.replace(/\s/g, '').startsWith('+') 
      ? phone.replace(/\s/g, '')
      : `+234${phone.replace(/^0/, '')}`;

    const payload = {
      phone: formattedPhone,
      template: template,
      variables: variables || {}
    };

    console.log('📤 Sending WhatsApp:', { phone: formattedPhone, template });

    const response = await fetch(WHATSCHIMP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSCHIMP_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatSchimp error:', data);
      return res.status(response.status).json({ 
        error: data.message || 'Failed to send',
        details: data
      });
    }

    console.log('✅ WhatsApp sent successfully');
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: 'Internal error',
      message: error.message 
    });
  }
}