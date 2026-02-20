import { useState, useEffect } from 'react';
import { Menu, Save, X, Upload } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadWithProgress, compressImage } from '../../services/cloudinaryService';

export default function AdminEventForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingEvent, setFetchingEvent] = useState(isEdit);
  const [universities, setUniversities] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '', description: '', category: '',
    subCategory: 'events', religionType: '', eventType: 'regular', 
    eventDuration: 'single', date: '', time: '', startDate: '', endDate: '', 
    dailyStartTime: '', dailyEndTime: '', recurringPattern: 'weekly', 
    recurringDay: 'Monday', recurringTime: '', placeAvailability: 'Always Open', 
    openingTime: '', closingTime: '', location: '', address: '', mapLocation: '',
    organizerName: '', organizerPhone: '', organizerEmail: '',
    university: '', platform: '', platformLink: '', price: '',
    isFree: false, capacity: '', imageUrl: '', ticketLink: '',
    status: 'published', isFeatured: false, isTrending: false
  });

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      const uniList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUniversities(uniList);
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([
        { id: 1, name: 'University of Lagos (Unilag)' },
        { id: 2, name: 'King Saud University (KSU)' },
        { id: 3, name: 'University of Ibadan (UI)' },
        { id: 4, name: 'University of Ghana (Legon)' },
        { id: 5, name: 'Covenant University (CU)' },
        { id: 6, name: 'University of Ilorin (Unilorin)' }
      ]);
    }
  };

  useEffect(() => {
    if (isEdit) {
      const loadEvent = async () => {
        try {
          const docRef = doc(db, 'events', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            const formattedData = { ...data };
            if (data.date instanceof Timestamp) {
              formattedData.date = data.date.toDate().toISOString().split('T')[0];
            }
            if (data.startDate instanceof Timestamp) {
              formattedData.startDate = data.startDate.toDate().toISOString().split('T')[0];
            }
            if (data.endDate instanceof Timestamp) {
              formattedData.endDate = data.endDate.toDate().toISOString().split('T')[0];
            }
            
            setFormData(prev => ({ ...prev, ...formattedData }));
          }
        } catch (err) {
          console.error('Error loading event:', err);
        }
        setFetchingEvent(false);
      };
      loadEvent();
    }
  }, [id, isEdit]);

  const allCategories = [
    'Business & Tech', 'Art & Culture', 'Food & Dining', 'Sport & Fitness',
    'Education', 'Religion & Community', 'Nightlife & Parties', 'Family & Kids Fun',
    'Networking & Social', 'Gaming & Esport', 'Music & Concerts', 'Cinema & Show'
  ];

  const platforms = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Twitter Space', 'YouTube Live', 'Facebook Live', 'Other'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // ✅ Cloudinary Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      // Compress image before upload
      console.log('📦 Compressing image...');
      const compressedFile = await compressImage(file, 1200, 0.8);
      console.log(`Size reduced: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      // Upload to Cloudinary
      console.log('☁️ Uploading to Cloudinary...');
      const imageUrl = await uploadWithProgress(
        compressedFile,
        'events', // Folder name
        (progress) => {
          setUploadProgress(progress);
          console.log(`📤 Upload progress: ${progress}%`);
        }
      );

      console.log('✅ Upload complete:', imageUrl);

      // Update form data
      setFormData(prev => ({
        ...prev,
        imageUrl: imageUrl
      }));

      setUploading(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const stringToTimestamp = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return Timestamp.fromDate(date);
    } catch (err) {
      console.error('Error converting date:', dateString, err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      alert('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        price: formData.isFree ? 0 : Number(formData.price) || 0,
        capacity: Number(formData.capacity) || 0,
        date: stringToTimestamp(formData.date),
        startDate: stringToTimestamp(formData.startDate),
        endDate: stringToTimestamp(formData.endDate),
        updatedAt: serverTimestamp()
      };

      console.log('📤 Saving event with dates:', {
        date: eventData.date,
        startDate: eventData.startDate,
        endDate: eventData.endDate
      });

      if (isEdit) {
        await updateDoc(doc(db, 'events', id), eventData);
        alert('✅ Event updated successfully!');
      } else {
        eventData.createdAt = serverTimestamp();
        eventData.savedCount = 0;
        await addDoc(collection(db, 'events'), eventData);
        alert('✅ Event created successfully!');
      }
      navigate('/admin/events');
    } catch (err) {
      console.error('Error saving event:', err);
      alert('❌ Error saving event: ' + err.message);
    }
    setLoading(false);
  };

  const showSubCategory = ['Family & Kids Fun', 'Food & Dining', 'Sport & Fitness', 'Art & Culture', 'Nightlife & Parties'].includes(formData.category);
  const showReligionType = formData.category === 'Religion & Community';
  const isPlace = formData.subCategory === 'places';

  if (fetchingEvent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <button onClick={() => navigate('/admin/events')} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isPlace ? 'Place Name' : 'Event Title'} *
                    </label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'e.g. The Creative Hub' : 'Enter event title'} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Describe your event" />
                  </div>

                  {!isPlace && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Type *</label>
                      <select name="eventType" value={formData.eventType} onChange={handleChange} required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="regular">Regular Event</option>
                        <option value="campus">Campus Event</option>
                        <option value="webinar">Webinar/Virtual</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select name="category" value={formData.category} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                      <option value="">Select a category</option>
                      {allCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {showSubCategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sub-Category *</label>
                      <select name="subCategory" value={formData.subCategory} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="events">Events</option>
                        <option value="places">Places</option>
                      </select>
                    </div>
                  )}

                  {showReligionType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Religion Type *</label>
                      <select name="religionType" value={formData.religionType} onChange={handleChange} required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="">Select religion type</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule */}
              {!isPlace ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Schedule</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Duration *</label>
                      <select name="eventDuration" value={formData.eventDuration} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="single">Single Day Event</option>
                        <option value="multi">Multi-Day Event</option>
                        <option value="recurring">Recurring Event</option>
                      </select>
                    </div>

                    {formData.eventDuration === 'single' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                          <input type="date" name="date" value={formData.date} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                          <input type="time" name="time" value={formData.time} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}

                    {formData.eventDuration === 'multi' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Start Time *</label>
                          <input type="time" name="dailyStartTime" value={formData.dailyStartTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Daily End Time *</label>
                          <input type="time" name="dailyEndTime" value={formData.dailyEndTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}

                    {formData.eventDuration === 'recurring' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Pattern *</label>
                          <select name="recurringPattern" value={formData.recurringPattern} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="weekends">Weekends Only</option>
                            <option value="weekdays">Weekdays Only</option>
                          </select>
                        </div>
                        {formData.recurringPattern === 'weekly' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week *</label>
                            <select name="recurringDay" value={formData.recurringDay} onChange={handleChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                          <input type="time" name="recurringTime" value={formData.recurringTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability & Hours</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
                      <select name="placeAvailability" value={formData.placeAvailability} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="Always Open">Always Open (Daily)</option>
                        <option value="Weekends Only">Weekends Only</option>
                        <option value="Mon-Fri">Mon-Fri</option>
                        <option value="Mon-Sat">Mon-Sat</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Opening Time *</label>
                        <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Closing Time *</label>
                        <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campus / Webinar specific */}
              {formData.eventType === 'campus' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus Event Details</h3>
                  <select name="university" value={formData.university} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                    <option value="">Select university</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.name}>{uni.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.eventType === 'webinar' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Webinar Details</h3>
                  <div className="space-y-4">
                    <select name="platform" value={formData.platform} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                      <option value="">Select platform</option>
                      {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="url" name="platformLink" value={formData.platformLink} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Meeting link (optional)" />
                  </div>
                </div>
              )}

              {/* Organizer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizer Information <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
                <div className="space-y-4">
                  <input type="text" name="organizerName" value={formData.organizerName} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder="Organizer name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="tel" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Phone number" />
                    <input type="email" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Email address" />
                  </div>
                </div>
              </div>

              {/* Location */}
              {formData.eventType !== 'webinar' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="space-y-4">
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="City, Country (e.g. Lagos, Nigeria)" />
                    <input type="text" name="address" value={formData.address} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Full venue address" />
                    <input type="url" name="mapLocation" value={formData.mapLocation} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Google Maps link (optional)" />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isFree" checked={formData.isFree} onChange={handleChange}
                      className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                    <span className="text-sm font-medium text-gray-700">This is a free event</span>
                  </label>

                  {!formData.isFree && (
                    <input type="number" name="price" value={formData.price} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Price in ₦" />
                  )}

                  <input type="url" name="ticketLink" value={formData.ticketLink} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder="Ticket purchase link (optional)" />

                  <input type="number" name="capacity" value={formData.capacity} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder="Capacity (max attendees)" />
                </div>
              </div>

              {/* Media - Cloudinary Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Image *</h3>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-cyan-400 transition">
                  <div className="space-y-1 text-center">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Event preview" 
                          className="mx-auto h-48 w-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-cyan-600 hover:text-cyan-500">
                            <span>Upload an image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                      </>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility</h3>
                <div className="space-y-4">
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                  </select>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                      <span className="text-sm font-medium text-gray-700">Featured Event</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                      <span className="text-sm font-medium text-gray-700">Trending</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button type="submit" disabled={loading || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50">
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}</span>
                </button>
                <button type="button" onClick={() => navigate('/admin/events')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}