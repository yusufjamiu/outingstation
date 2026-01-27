import { useState, useEffect } from 'react';
import { Menu, Save, X } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate, useParams } from 'react-router-dom';

export default function AdminEventForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subCategory: 'events',
    religionType: '',
    eventType: 'regular',
    date: '',
    time: '',
    // For places
    placeAvailability: 'Always Open', // Always Open, Weekends Only, Mon-Fri, Custom
    openingTime: '',
    closingTime: '',
    location: '',
    address: '',
    university: '',
    platform: '',
    platformLink: '',
    price: '',
    isFree: false,
    capacity: '',
    imageUrl: '',
    status: 'draft',
    isFeatured: false,
    isTrending: false
  });

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = () => {
    try {
      const stored = localStorage.getItem('universities');
      if (stored) {
        const universitiesData = JSON.parse(stored);
        setUniversities(universitiesData);
      } else {
        const defaultUniversities = [
          { id: 1, name: 'University of Lagos (Unilag)', location: 'Lagos, Nigeria' },
          { id: 2, name: 'King Saud University (KSU)', location: 'Riyadh, Saudi Arabia' },
          { id: 3, name: 'University of Ibadan (UI)', location: 'Ibadan, Nigeria' },
          { id: 4, name: 'University of Ghana (Legon)', location: 'Accra, Ghana' },
          { id: 5, name: 'Covenant University (CU)', location: 'Ota, Nigeria' },
          { id: 6, name: 'University of Ilorin (Unilorin)', location: 'Ilorin, Nigeria' }
        ];
        setUniversities(defaultUniversities);
      }
    } catch (error) {
      console.error('Error loading universities:', error);
      setUniversities([]);
    }
  };

  const categories = [
    'Business & Tech',
    'Art & Culture',
    'Food & Dining',
    'Sport & Fitness',
    'Education',
    'Religion & Community',
    'Nightlife & Parties',
    'Family & Kids Fun',
    'Networking & Social',
    'Gaming & Esport',
    'Music & Concerts',
    'Cinema & Show'
  ];

  const categoriesWithPlaces = [
    'Family & Kids Fun',
    'Food & Dining',
    'Sport & Fitness',
    'Art & Culture',
    'Nightlife & Parties'
  ];

  const platforms = [
    'Zoom',
    'Google Meet',
    'Microsoft Teams',
    'Twitter Space',
    'YouTube Live',
    'Facebook Live',
    'Other'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save to Firebase
    console.log('Saving event:', formData);
    alert(isEdit ? 'Event updated successfully!' : 'Event created successfully!');
    navigate('/admin/events');
  };

  const showSubCategory = categoriesWithPlaces.includes(formData.category);
  const showReligionType = formData.category === 'Religion & Community';
  const isPlace = formData.subCategory === 'places';

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            
            <button 
              onClick={() => navigate('/admin/events')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
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
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'e.g. The Creative Hub' : 'Enter event title'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'Describe the place and what visitors can expect' : 'Describe your event'}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isPlace && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Event Type *
                        </label>
                        <select
                          name="eventType"
                          value={formData.eventType}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        >
                          <option value="regular">Regular Event</option>
                          <option value="campus">Campus Event</option>
                          <option value="webinar">Webinar/Virtual</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sub-Category */}
                  {showSubCategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sub-Category *
                      </label>
                      <select
                        name="subCategory"
                        value={formData.subCategory}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      >
                        <option value="events">Events</option>
                        <option value="places">Places</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Choose "Events" for time-based activities or "Places" for venues/spots to visit
                      </p>
                    </div>
                  )}

                  {/* Religion Type */}
                  {showReligionType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Religion Type *
                      </label>
                      <select
                        name="religionType"
                        value={formData.religionType}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      >
                        <option value="">Select religion type</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time - Different for Events vs Places */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isPlace ? 'Availability & Hours' : 'Date & Time'}
                </h3>
                
                <div className="space-y-4">
                  {isPlace ? (
                    // PLACES: Availability + Time Range
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Availability *
                        </label>
                        <select
                          name="placeAvailability"
                          value={formData.placeAvailability}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        >
                          <option value="Always Open">Always Open (Daily)</option>
                          <option value="Weekends Only">Weekends Only (Sat-Sun)</option>
                          <option value="Mon-Fri">Mon-Fri (Weekdays)</option>
                          <option value="Mon-Sat">Mon-Sat</option>
                          <option value="Weekdays">Weekdays (Mon-Thu)</option>
                          <option value="Custom">Custom Schedule</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select when this place is open to visitors
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opening Time *
                          </label>
                          <input
                            type="time"
                            name="openingTime"
                            value={formData.openingTime}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Closing Time *
                          </label>
                          <input
                            type="time"
                            name="closingTime"
                            value={formData.closingTime}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    // EVENTS: Single Date + Time
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time *
                        </label>
                        <input
                          type="time"
                          name="time"
                          value={formData.time}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campus Event Fields */}
              {formData.eventType === 'campus' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus Event Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      University *
                    </label>
                    <select
                      name="university"
                      value={formData.university}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    >
                      <option value="">Select university</option>
                      {universities.map(uni => (
                        <option key={uni.id} value={uni.name}>
                          {uni.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Webinar Event Fields */}
              {formData.eventType === 'webinar' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Webinar Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform *
                      </label>
                      <select
                        name="platform"
                        value={formData.platform}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      >
                        <option value="">Select platform</option>
                        {platforms.map(platform => (
                          <option key={platform} value={platform}>{platform}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meeting Link
                      </label>
                      <input
                        type="url"
                        name="platformLink"
                        value={formData.platformLink}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        placeholder="https://zoom.us/j/123456789"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Location (for regular, campus events, and places) */}
              {formData.eventType !== 'webinar' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        placeholder="e.g. Lagos, Nigeria"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        placeholder="Full venue address"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isFree"
                      checked={formData.isFree}
                      onChange={handleChange}
                      className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      {isPlace ? 'Free entry' : 'This is a free event'}
                    </label>
                  </div>

                  {!formData.isFree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isPlace ? 'Entry Fee (₦)' : 'Price (₦)'}
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        placeholder="0"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isPlace ? 'Capacity (max visitors at once)' : 'Capacity'}
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'Maximum visitors at once' : 'Maximum attendees'}
                    />
                  </div>
                </div>
              </div>

              {/* Media */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Media</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter image URL or upload file</p>
                </div>
              </div>

              {/* Visibility & Promotion */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility & Promotion</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="pending">Pending Review</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={formData.isFeatured}
                        onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Featured {isPlace ? 'Place' : 'Event'}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">Show in featured section on homepage</p>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isTrending"
                        checked={formData.isTrending}
                        onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Trending This Week
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">Show in trending section</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium"
                >
                  <Save size={20} />
                  <span>{isEdit ? 'Update' : 'Create'} {isPlace ? 'Place' : 'Event'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/events')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
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