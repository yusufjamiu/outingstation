// COMPLETE SubmitEventPage.jsx - WITH CLOUDINARY UPLOAD + REFERRAL CODE
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift } from 'lucide-react'; // ✅ NEW IMPORT

const SubmitEventPage = () => {
  const [formData, setFormData] = useState({
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    organizationName: '',
    referralCode: '', // ✅ NEW FIELD
    listingType: 'event',
    eventTitle: '',
    eventCategory: '',
    customCategory: '',
    eventType: 'physical',
    eventDescription: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    operatingHours: '',
    alwaysOpen: false,
    city: '',
    customCity: '',
    venueName: '',
    address: '',
    mapsLink: '',
    platform: '',
    webinarLink: '',
    isFree: 'yes',
    ticketPrice: '',
    wantOutingstationTicketing: 'no',
    externalTicketLink: '',
    eventImage: null,
    additionalInfo: '',
    agreedToTerms: false,
    isUniversityEvent: false,
    universityName: '',
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTerms, setShowTerms] = useState(false);

  const categories = [
    'Business & Tech', 'Art & Culture', 'Food & Dining', 
    'Sport & Fitness', 'Education', 'Religion & Community',
    'Nightlife & Parties', 'Family & Kids Fun', 'Networking & Social',
    'Gaming & Esport', 'Music & Concerts', 'Cinema & Show',
    'Other',
  ];

  const cities = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
  
  const platforms = [
    'Zoom', 
    'Google Meet', 
    'Microsoft Teams', 
    'YouTube Live', 
    'Instagram Live',
    'LinkedIn Live',
    'Twitter Space',
    'Other'
  ];

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      console.log('📤 Uploading to Cloudinary...');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Cloudinary upload successful!');
      return data.secure_url;
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, eventImage: 'Image must be less than 10MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, eventImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const e = {};
    const isEvent = formData.listingType === 'event';
    const isPlace = formData.listingType === 'place';
    
    if (!formData.organizerName.trim()) e.organizerName = 'Name required';
    if (!formData.organizerEmail.trim()) e.organizerEmail = 'Email required';
    if (!formData.organizerPhone.trim()) e.organizerPhone = 'Phone required';
    
    if (!formData.eventTitle.trim()) e.eventTitle = isPlace ? 'Place name required' : 'Event title required';
    if (!formData.eventCategory) e.eventCategory = 'Category required';
    
    if (formData.eventCategory === 'Other' && !formData.customCategory.trim()) {
      e.customCategory = 'Please specify category';
    }
    
    if (formData.eventDescription.length < 100) e.eventDescription = 'Min 100 characters';
    
    if (isEvent) {
      if (!formData.startDate) e.startDate = 'Start date required';
      if (!formData.startTime) e.startTime = 'Start time required';
      
      if (formData.endDate && formData.startDate) {
        const start = new Date(formData.startDate + 'T' + (formData.startTime || '00:00'));
        const end = new Date(formData.endDate + 'T' + (formData.endTime || '23:59'));
        if (end < start) {
          e.endDate = 'End date cannot be before start date';
        }
      }
      
      if (formData.eventType === 'webinar' || formData.eventType === 'hybrid') {
        if (!formData.platform.trim()) e.platform = 'Platform required';
        if (!formData.webinarLink.trim()) e.webinarLink = 'Registration link required';
      }

      if (formData.isUniversityEvent && !formData.universityName.trim()) {
        e.universityName = 'University name required';
      }
    }
    
    if (isPlace && !formData.alwaysOpen && !formData.operatingHours.trim()) {
      e.operatingHours = 'Operating hours required (or check "Always Open")';
    }
    
    if (!formData.city) e.city = 'City required';
    
    if (formData.city === 'Others' && !formData.customCity.trim()) {
      e.customCity = 'Please specify city';
    }
    
    if (!formData.venueName.trim()) e.venueName = isPlace ? 'Place name required' : 'Venue required';
    if (!formData.address.trim()) e.address = 'Address required';
    
    if (formData.isFree === 'no') {
      if (!formData.ticketPrice.trim()) e.ticketPrice = isPlace ? 'Entry fee required' : 'Price required';
      if (formData.wantOutingstationTicketing === 'no' && !formData.externalTicketLink.trim()) {
        e.externalTicketLink = isPlace ? 'Payment link required' : 'Ticket link required';
      }
    }
    
    if (!formData.eventImage) e.eventImage = 'Image required';
    if (!formData.agreedToTerms) e.agreedToTerms = 'Please agree to terms';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = 'https://via.placeholder.com/800x400/0891b2/ffffff?text=Event+Image';
      
      if (formData.eventImage) {
        try {
          console.log('📤 Attempting Cloudinary upload...');
          
          const uploadPromise = uploadToCloudinary(formData.eventImage);
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout after 10 seconds')), 10000)
          );
          
          imageUrl = await Promise.race([uploadPromise, timeoutPromise]);
          console.log('✅ Image uploaded successfully!');
        } catch (uploadError) {
          console.warn('⚠️ Image upload failed/timeout, using placeholder:', uploadError.message);
        }
      }

      console.log('💾 Saving to Firestore...');

      const finalCategory = formData.eventCategory === 'Other' && formData.customCategory.trim()
        ? formData.customCategory.trim()
        : formData.eventCategory;

      const finalCity = formData.city === 'Others' && formData.customCity.trim()
        ? formData.customCity.trim()
        : formData.city;

      await addDoc(collection(db, 'event_submissions'), {
        organizerName: formData.organizerName,
        organizerEmail: formData.organizerEmail,
        organizerPhone: formData.organizerPhone,
        organizationName: formData.organizationName || null,
        referralCode: formData.referralCode.trim().toUpperCase() || null, // ✅ NEW: Save referral code
        listingType: formData.listingType,
        subCategory: formData.listingType === 'place' ? 'places' : (formData.isUniversityEvent ? 'campus' : 'events'),
        eventTitle: formData.eventTitle,
        eventCategory: finalCategory,
        eventType: formData.listingType === 'event' ? formData.eventType : 'physical',
        eventDescription: formData.eventDescription,
        startDate: formData.listingType === 'event' ? formData.startDate : null,
        startTime: formData.listingType === 'event' ? formData.startTime : null,
        endDate: formData.listingType === 'event' ? (formData.endDate || formData.startDate) : null,
        endTime: formData.listingType === 'event' ? (formData.endTime || formData.startTime) : null,
        operatingHours: formData.listingType === 'place' ? (formData.alwaysOpen ? 'Always Open' : formData.operatingHours) : null,
        alwaysOpen: formData.listingType === 'place' ? formData.alwaysOpen : false,
        city: finalCity,
        venueName: formData.venueName,
        address: formData.address,
        mapsLink: formData.mapsLink || null,
        platform: formData.platform || null,
        webinarLink: formData.webinarLink || null,
        isFree: formData.isFree === 'yes',
        ticketPrice: formData.isFree === 'yes' ? 0 : parseFloat(formData.ticketPrice) || 0,
        wantOutingstationTicketing: formData.wantOutingstationTicketing === 'yes',
        externalTicketLink: formData.externalTicketLink || null,
        imageUrl: imageUrl,
        additionalInfo: formData.additionalInfo || null,
        isUniversityEvent: formData.isUniversityEvent || false,
        universityName: formData.universityName || null,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      console.log('✅ Saved to Firestore successfully!');
      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('❌ SUBMISSION ERROR:', error);
      let errorMessage = 'Submission failed. ';
      if (error.code === 'permission-denied') {
        errorMessage += 'Firestore permission denied.';
      } else if (error.message) {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {formData.listingType === 'place' ? 'Place' : 'Event'} Submitted! 🎉
          </h2>
          
          <p className="text-gray-600 text-lg mb-8">
            <strong className="text-cyan-600">"{formData.eventTitle}"</strong> is under review
          </p>

          <div className="bg-cyan-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">📋 What Happens Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Review within <strong>24-48 hours</strong></span>
              </div>
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Email updates to <strong>{formData.organizerEmail}</strong></span>
              </div>
              {formData.wantOutingstationTicketing === 'yes' && (
                <div className="flex items-start">
                  <span className="text-cyan-600 font-bold mr-3">•</span>
                  <span className="text-gray-700"><strong className="text-cyan-600">We'll contact you</strong> about {formData.listingType === 'place' ? 'payment' : 'ticketing'} setup</span>
                </div>
              )}
              {/* ✅ NEW: Show credit reward if referral code provided */}
              {formData.referralCode && (
                <div className="flex items-start">
                  <span className="text-cyan-600 font-bold mr-3">•</span>
                  <span className="text-gray-700"><strong className="text-green-600">Get ₦100 credits</strong> when approved!</span>
                </div>
              )}
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Verification call to <strong>{formData.organizerPhone}</strong></span>
              </div>
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Once approved, <strong className="text-green-600">goes live!</strong></span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <a href="/" className="block w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-blue-700 transition shadow-lg">
              Back to Home
            </a>
            <button onClick={() => window.location.reload()} className="block w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition">
              Submit Another {formData.listingType === 'place' ? 'Place' : 'Event'}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Questions? <a href="mailto:events@outingstation.com" className="text-cyan-600 hover:underline font-medium">events@outingstation.com</a>
          </p>
        </div>
      </div>
    );
  }

  const isEvent = formData.listingType === 'event';
  const isPlace = formData.listingType === 'place';
  const isVirtual = isEvent && (formData.eventType === 'webinar' || formData.eventType === 'hybrid');
  const isPhysical = isPlace || (isEvent && (formData.eventType === 'physical' || formData.eventType === 'hybrid'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 leading-tight">
            List on<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
              OutingStation
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            List events, venues, restaurants, museums, parks - any place worth discovering in Lagos!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {[
            { icon: '📱', title: 'Massive Reach', desc: 'Thousands daily' },
            { icon: '💰', title: '100% Free', desc: 'Zero fees' },
            { icon: '🎫', title: 'Ticketing Help', desc: 'We can help' },
            { icon: '⚡', title: 'Fast Approval', desc: '24-48 hours' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition text-center">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">{b.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">{b.title}</h3>
              <p className="text-xs md:text-sm text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          
          {/* SECTION 1: Organizer */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">1</div>
              <h2 className="text-2xl font-black text-gray-900">Your Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="organizerName" value={formData.organizerName} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.organizerName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="John Doe" />
                {errors.organizerName && <p className="text-red-500 text-sm mt-1">{errors.organizerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                <input type="email" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.organizerEmail ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="john@example.com" />
                {errors.organizerEmail && <p className="text-red-500 text-sm mt-1">{errors.organizerEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <input type="tel" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.organizerPhone ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="+234 801 234 5678" />
                {errors.organizerPhone && <p className="text-red-500 text-sm mt-1">{errors.organizerPhone}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Organization Name</label>
                <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition" placeholder="Company Ltd (optional)" />
              </div>

              {/* ✅ NEW: REFERRAL CODE INPUT FIELD */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Your Referral Code <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={20} />
                  <input 
                    type="text" 
                    name="referralCode" 
                    value={formData.referralCode} 
                    onChange={handleChange}
                    maxLength={12}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition uppercase" 
                    placeholder="JOHN2024"
                  />
                </div>
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                  <span>💰</span>
                  <span>Earn ₦100 credits when your event is approved!</span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Listing Details */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">2</div>
              <h2 className="text-2xl font-black text-gray-900">Listing Details</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-cyan-200">
                <label className="block text-sm font-bold text-gray-900 mb-3">What are you listing? <span className="text-red-500">*</span></label>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { value: 'event', icon: '🎉', label: 'Event', desc: 'Concert, festival, workshop, conference' },
                    { value: 'place', icon: '🏛️', label: 'Place/Venue', desc: 'Museum, restaurant, park, cinema' }
                  ].map(item => (
                    <button key={item.value} type="button" onClick={() => setFormData(prev => ({ ...prev, listingType: item.value }))} className={`px-6 py-4 border-2 rounded-xl text-left transition ${formData.listingType === item.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600 shadow-lg' : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-500'}`}>
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <div className="font-bold text-lg">{item.label}</div>
                      <div className={`text-sm ${formData.listingType === item.value ? 'text-cyan-100' : 'text-gray-500'}`}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Place Name' : 'Event Title'} <span className="text-red-500">*</span></label>
                <input type="text" name="eventTitle" value={formData.eventTitle} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.eventTitle ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder={isPlace ? 'National Museum Lagos' : 'Lagos Music Festival 2026'} />
                {errors.eventTitle && <p className="text-red-500 text-sm mt-1">{errors.eventTitle}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                  <select name="eventCategory" value={formData.eventCategory} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.eventCategory ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                    <option value="">Select category</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {errors.eventCategory && <p className="text-red-500 text-sm mt-1">{errors.eventCategory}</p>}
                  
                  {formData.eventCategory === 'Other' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        name="customCategory"
                        value={formData.customCategory}
                        onChange={handleChange}
                        placeholder="Please specify category"
                        className={`w-full px-4 py-3 border-2 ${errors.customCategory ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                      />
                      {errors.customCategory && <p className="text-red-500 text-sm mt-1">{errors.customCategory}</p>}
                    </div>
                  )}
                </div>

                {isEvent && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Event Type <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { value: 'physical', label: 'Physical (In-Person)' },
                        { value: 'webinar', label: 'Virtual (Online)' },
                        { value: 'hybrid', label: 'Hybrid (Both)' }
                      ].map(type => (
                        <button 
                          key={type.value} 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))} 
                          className={`px-4 py-3 border-2 rounded-xl text-sm font-bold transition ${formData.eventType === type.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                      <div className="flex items-start">
                        <input 
                          type="checkbox" 
                          name="isUniversityEvent" 
                          checked={formData.isUniversityEvent} 
                          onChange={handleChange} 
                          className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 mr-3" 
                        />
                        <div className="flex-1">
                          <label className="text-sm font-bold text-gray-900 cursor-pointer">
                            🎓 This is a University/Campus Event
                          </label>
                          <p className="text-xs text-gray-600 mt-1">Check this if your event is happening at a university campus</p>
                        </div>
                      </div>

                      {formData.isUniversityEvent && (
                        <div className="mt-3">
                          <input
                            type="text"
                            name="universityName"
                            value={formData.universityName}
                            onChange={handleChange}
                            placeholder="Enter university name (e.g., University of Lagos)"
                            className={`w-full px-4 py-3 border-2 ${errors.universityName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-blue-500 focus:outline-none transition`}
                          />
                          {errors.universityName && <p className="text-red-500 text-sm mt-1">{errors.universityName}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description <span className="text-red-500">*</span> (min 100 characters)</label>
                <textarea name="eventDescription" value={formData.eventDescription} onChange={handleChange} rows={5} className={`w-full px-4 py-3 border-2 ${errors.eventDescription ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder={isPlace ? 'Describe this place. What can visitors see or do? What makes it special?' : 'Describe your event. What can attendees expect?'} />
                <div className="flex justify-between mt-1">
                  {errors.eventDescription && <p className="text-red-500 text-sm">{errors.eventDescription}</p>}
                  <p className={`text-sm ml-auto ${formData.eventDescription.length >= 100 ? 'text-green-600' : 'text-gray-500'}`}>{formData.eventDescription.length}/100</p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3A: Date & Time (Events) */}
          {isEvent && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">3</div>
                <h2 className="text-2xl font-black text-gray-900">Date & Time</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.startDate ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.startTime ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.endDate ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition" />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3B: Operating Hours (Places) */}
          {isPlace && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">3</div>
                <h2 className="text-2xl font-black text-gray-900">Operating Hours</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <input type="checkbox" name="alwaysOpen" checked={formData.alwaysOpen} onChange={handleChange} className="h-5 w-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 mr-3" />
                  <label className="text-sm font-bold text-gray-700">This place is always open (24/7)</label>
                </div>

                {!formData.alwaysOpen && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Operating Hours <span className="text-red-500">*</span></label>
                    <textarea name="operatingHours" value={formData.operatingHours} onChange={handleChange} rows={3} className={`w-full px-4 py-3 border-2 ${errors.operatingHours ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="Mon-Fri: 9AM-5PM&#10;Sat-Sun: 10AM-8PM&#10;Closed on public holidays" />
                    {errors.operatingHours && <p className="text-red-500 text-sm mt-1">{errors.operatingHours}</p>}
                    <p className="text-xs text-gray-500 mt-2">💡 Example: Mon-Fri: 9AM-5PM, Sat: 10AM-8PM, Sun: Closed</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: Location */}
          {isPhysical && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">4</div>
                <h2 className="text-2xl font-black text-gray-900">Location</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                  <select name="city" value={formData.city} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  
                  {formData.city === 'Others' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        name="customCity"
                        value={formData.customCity}
                        onChange={handleChange}
                        placeholder="Enter your city"
                        className={`w-full px-4 py-3 border-2 ${errors.customCity ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                      />
                      {errors.customCity && <p className="text-red-500 text-sm mt-1">{errors.customCity}</p>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Place Name' : 'Venue Name'} <span className="text-red-500">*</span></label>
                  <input type="text" name="venueName" value={formData.venueName} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.venueName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder={isPlace ? 'National Museum' : 'Eko Hotel & Suites'} />
                  {errors.venueName && <p className="text-red-500 text-sm mt-1">{errors.venueName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Address <span className="text-red-500">*</span></label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.address ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="123 Main Street, Victoria Island, Lagos" />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Google Maps Link</label>
                  <input type="url" name="mapsLink" value={formData.mapsLink} onChange={handleChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition" placeholder="https://maps.google.com/..." />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Virtual Details */}
          {isVirtual && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{formData.eventType === 'hybrid' ? '5' : '4'}</div>
                <h2 className="text-2xl font-black text-gray-900">Virtual Event Details</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Platform <span className="text-red-500">*</span></label>
                  <select name="platform" value={formData.platform} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.platform ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                    <option value="">Select platform</option>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.platform && <p className="text-red-500 text-sm mt-1">{errors.platform}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Registration Link <span className="text-red-500">*</span></label>
                  <input type="url" name="webinarLink" value={formData.webinarLink} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.webinarLink ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="https://zoom.us/webinar/..." />
                  {errors.webinarLink && <p className="text-red-500 text-sm mt-1">{errors.webinarLink}</p>}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Ticketing */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{isVirtual && formData.eventType === 'hybrid' ? '6' : isVirtual || isPhysical ? '5' : '5'}</div>
              <h2 className="text-2xl font-black text-gray-900">{isPlace ? 'Entry Fee' : 'Ticketing'}</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">{isPlace ? 'Is entry free?' : 'Is this event free?'} <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'yes', label: 'Free' },
                    { value: 'no', label: isPlace ? 'Paid Entry' : 'Paid Event' }
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, isFree: opt.value }))} className={`px-6 py-3 border-2 rounded-xl font-bold transition ${formData.isFree === opt.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.isFree === 'no' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Entry Fee (₦)' : 'Ticket Price (₦)'} <span className="text-red-500">*</span></label>
                    <input type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.ticketPrice ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="5000" />
                    {errors.ticketPrice && <p className="text-red-500 text-sm mt-1">{errors.ticketPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">{isPlace ? 'Do you want OutingStation to handle payments?' : 'Do you want OutingStation to handle ticketing?'}</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: 'yes', label: 'Yes, Please!' },
                        { value: 'no', label: 'No, I Have My Own' }
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, wantOutingstationTicketing: opt.value }))} className={`px-6 py-3 border-2 rounded-xl font-bold transition ${formData.wantOutingstationTicketing === opt.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.wantOutingstationTicketing === 'no' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'External Payment Link' : 'External Ticket Link'} <span className="text-red-500">*</span></label>
                      <input type="url" name="externalTicketLink" value={formData.externalTicketLink} onChange={handleChange} className={`w-full px-4 py-3 border-2 ${errors.externalTicketLink ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} placeholder="https://eventbrite.com/..." />
                      {errors.externalTicketLink && <p className="text-red-500 text-sm mt-1">{errors.externalTicketLink}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SECTION 7: Image */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{isVirtual && formData.eventType === 'hybrid' ? '7' : isVirtual || isPhysical ? '6' : '6'}</div>
              <h2 className="text-2xl font-black text-gray-900">{isPlace ? 'Place' : 'Event'} Image</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Upload Image <span className="text-red-500">*</span></label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                {errors.eventImage && <p className="text-red-500 text-sm mt-1">{errors.eventImage}</p>}
                <p className="text-xs text-gray-500 mt-2">Max 10MB. JPG, PNG, or WebP. Landscape orientation (16:9) works best.</p>
              </div>

              {imagePreview && (
                <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 8: Additional Info */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{isVirtual && formData.eventType === 'hybrid' ? '8' : isVirtual || isPhysical ? '7' : '7'}</div>
              <h2 className="text-2xl font-black text-gray-900">Additional Information</h2>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Anything else we should know?</label>
              <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} rows={4} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition" placeholder={isPlace ? 'Accessibility info, parking details, special requirements...' : 'Dress code, parking, special requirements...'} />
            </div>
          </div>

          {/* Terms & Submit */}
          <div className="border-t-2 border-gray-200 pt-8">
            <div className="flex items-start mb-6">
              <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleChange} className="mt-1 h-5 w-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
              <label className="ml-3 text-sm text-gray-700">
                I confirm all information is accurate and I have rights to use all media. I agree to OutingStation's{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-cyan-600 hover:underline font-medium underline"
                >
                  Terms & Conditions
                </button>
                {' '}and understand submissions are subject to review. <span className="text-red-500">*</span>
              </label>
            </div>
            {errors.agreedToTerms && <p className="text-red-500 text-sm mb-4">{errors.agreedToTerms}</p>}

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:from-cyan-700 hover:to-blue-700 transition shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                `🚀 Submit ${isPlace ? 'Place' : 'Event'} for Review`
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">Review within 24-48 hours</p>
          </div>
        </form>
        
        {/* Terms Modal */}
        {showTerms && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowTerms(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900">Terms & Conditions</h2>
                <button onClick={() => setShowTerms(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">×</button>
              </div>
              
              <div className="p-6 space-y-6 text-gray-700">
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">1. Submission Guidelines</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• All information provided must be accurate and truthful</li>
                    <li>• You must have the legal right to use all images and content submitted</li>
                    <li>• Events and places must be real and verifiable</li>
                    <li>• Submissions may be rejected if they violate our community standards</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">2. Review Process</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• All submissions are reviewed within 24-48 hours</li>
                    <li>• OutingStation reserves the right to approve, reject, or request modifications</li>
                    <li>• We may contact you for verification or additional information</li>
                    <li>• Approved listings will be published on our platform</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">3. Content Ownership & Rights</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• You retain ownership of all content you submit</li>
                    <li>• By submitting, you grant OutingStation a non-exclusive license to display your content</li>
                    <li>• We may use submitted images for promotional purposes on our platform and social media</li>
                    <li>• You can request removal of your listing at any time</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">4. Prohibited Content</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• No illegal activities or content</li>
                    <li>• No explicit sexual content or adult services</li>
                    <li>• No hate speech, discrimination, or harmful content</li>
                    <li>• No pyramid schemes or misleading business practices</li>
                    <li>• No spam or duplicate submissions</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">5. Ticketing & Payments</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• If you choose OutingStation ticketing, separate terms will apply</li>
                    <li>• For external ticketing, you are solely responsible for payment processing</li>
                    <li>• OutingStation is not liable for any ticketing or payment disputes</li>
                    <li>• All fees and pricing must be clearly disclosed to attendees</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">6. Liability & Disclaimers</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• OutingStation is a listing platform and not responsible for event execution</li>
                    <li>• You are responsible for the safety and legality of your event/place</li>
                    <li>• We are not liable for any damages, injuries, or losses at your event/place</li>
                    <li>• You must comply with all local laws and regulations</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">7. Modifications & Termination</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• OutingStation may update these terms at any time</li>
                    <li>• We reserve the right to remove any listing without notice</li>
                    <li>• You can update or cancel your listing through your account</li>
                    <li>• Violations may result in permanent ban from the platform</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">8. Contact & Support</h3>
                  <p className="text-sm">
                    For questions or concerns, contact us at:{' '}
                    <a href="mailto:events@outingstation.com" className="text-cyan-600 hover:underline font-medium">
                      events@outingstation.com
                    </a>
                  </p>
                </section>

                <div className="bg-cyan-50 rounded-xl p-4 border-2 border-cyan-200">
                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900">Last updated:</strong> March 2026<br/>
                    By submitting your listing, you acknowledge that you have read, understood, and agree to these terms.
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6">
                <button onClick={() => setShowTerms(false)} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-blue-700 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitEventPage;