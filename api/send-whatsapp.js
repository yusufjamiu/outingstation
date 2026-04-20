// api/send-whatsapp.js
// Backend API to send WhatsApp via WhatSchimp

const WHATSCHIMP_API_URL = 'https://app.whatchimp.com/api/v1/whatsapp/send';
const WHATSCHIMP_API_KEY = process.env.WHATSCHIMP_API_KEY;

export default async function handler(req, res) {
  // Log request for debugging
  console.log('🔔 WhatsApp API called');
  console.log('Method:', req.method);
  console.log('Has API Key:', !!WHATSCHIMP_API_KEY);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, template, variables } = req.body;

    console.log('📥 Request body:', { phone, template, variables });

    if (!phone || !template) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Phone and template are required' });
    }

    if (!WHATSCHIMP_API_KEY) {
      console.error('❌ API key not configured');
      return res.status(500).json({ error: 'WhatsApp API key not configured' });
    }

    // Format phone number
    const formattedPhone = phone.replace(/\s/g, '').startsWith('+') 
      ? phone.replace(/\s/g, '')
      : `+234${phone.replace(/^0/, '')}`;

    const payload = {
      phone: formattedPhone,
      template: template,
      variables: variables || {}
    };

    console.log('📤 Sending to WhatSchimp:', {
      url: WHATSCHIMP_API_URL,
      phone: formattedPhone,
      template: template
    });

    const response = await fetch(WHATSCHIMP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSCHIMP_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 WhatSchimp response status:', response.status);

    // Get response text first
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', responseText);
      return res.status(500).json({ 
        error: 'Invalid response from WhatsApp service',
        details: responseText.substring(0, 200)
      });
    }

    if (!response.ok) {
      console.error('❌ WhatSchimp API error:', data);
      return res.status(response.status).json({ 
        error: data.message || 'Failed to send WhatsApp message',
        details: data
      });
    }

    console.log('✅ WhatsApp sent successfully');
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Exception in WhatsApp API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}