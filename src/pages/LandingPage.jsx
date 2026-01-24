import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CategoryGrid from '../components/CategoryGrid';
import FeaturedEvents from '../components/FeaturedEvents';
import UniversitySelector from '../components/UniversitySelector';
import WebinarSection from '../components/WebinarSection';
import HowItWorks from '../components/HowItWorks';
import campusImage from '../assets/campus.jpg';
import studentsImage from '../assets/Students.jpg';
import concertImage from '../assets/concertImage.jpg';
import heroImage2 from '../assets/heroImage2.jpg';
import { Search, MapPin, Grid } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-cyan-50 to-white px-4">
      <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 pt-8 pb-8 px-4 md:px-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-40 left-10 w-64 h-64 bg-cyan-100 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
              Discover <span className="text-cyan-400 italic">Events</span> Happening<br className="hidden sm:block" />Near You
            </h1>
            <p className="text-gray-500 text-sm md:text-base lg:text-lg px-4">
              From your event in Lagos to Tech meetup in Riyadh, find your next<br className="hidden sm:block" />unforgettable experience today!
            </p>
          </div>

          {/* Search Section */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 mb-16">
            <div className="flex items-center bg-white rounded-full shadow-lg px-4 md:px-6 py-3 md:py-4 w-full lg:max-w-2xl">
              <MapPin className="text-cyan-400 mr-2 md:mr-3 flex-shrink-0" size={20} />
              <input 
                type="text" 
                placeholder="Search address, event" 
                className="flex-1 outline-none text-gray-600 text-sm md:text-base min-w-0"
              />
              <span className="text-gray-400 mx-2 md:mx-4">|</span>
              <select className="outline-none text-gray-600 bg-transparent text-sm md:text-base mr-2 md:mr-6">
                <option>Lagos</option>
                <option>Riyadh</option>
                <option>Dubai</option>
              </select>

              <button className="hidden md:block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-3 rounded-full">
                Explore
                </button>
            </div>

            {/* Mobile Explore Button */}
            <button className="md:hidden w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-3 rounded-full">
              Explore
            </button>
            
            <Link to="/categories">
            <button className="w-full lg:w-auto bg-white text-gray-700 px-6 md:px-8 py-3 md:py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2">
              <Grid size={20} /> 
              Browse by Category
              </button>
              </Link>
          </div>

          {/* Images Grid */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-6">
            {/* Left Image with Card */}
            <div className="relative mb-8 md:mb-0">
              <div className="w-56 h-56 md:w-64 md:h-64 bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl overflow-hidden shadow-xl mx-auto">
                <img 
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop" 
                  alt="Friends outdoors"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Trusted Users Card */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 md:gap-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold">12K</div>
                    <div className="text-xs md:text-sm opacity-90">Trusted Users</div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-red-400 border-2 border-white"></div>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-yellow-400 border-2 border-white"></div>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-400 border-2 border-white"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Images Stack */}
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="w-56 h-32 md:w-64 md:h-40 bg-gradient-to-br from-blue-200 to-purple-200 rounded-2xl overflow-hidden shadow-xl mx-auto">
                <img 
                  src={heroImage2}
                  alt="Conference"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-56 h-32 md:w-64 md:h-40 bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl overflow-hidden shadow-xl mx-auto">
                <img 
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop" 
                  alt="Workshop"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* About Section */}
      <section className="bg-gray-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Image */}
          <div className="relative">
  {/* Decorative Dashed Arrow */}
  <svg 
    className="absolute -top-16 right-0 w-48 h-32 text-cyan-400 hidden lg:block" 
    viewBox="0 0 200 150"
    fill="none"
  >
    <path 
      d="M10 80 Q 60 20, 100 60 T 180 40" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeDasharray="8,8"
      fill="none"
    />
    <path 
      d="M175 35 L180 40 L175 45 M180 40 L172 40" 
      stroke="currentColor" 
      strokeWidth="2"
      fill="none"
    />
  </svg>

  {/* Image Container with Cyan Background */}
  <div className="relative">
    <div className="absolute -left-6 -top-6 w-full h-full bg-cyan-400 rounded-3xl"></div>
    <div className="relative bg-gray-800 rounded-3xl overflow-hidden shadow-2xl h-64 md:h-96 lg:h-[500px]">
      <img 
        src={concertImage}
        alt="Crowd at event"
        className="w-full h-full object-cover"
      />
    </div>
  </div>
</div>

          {/* Right Side - Content */}
          <div>
            {/* Small text above heading */}
            <p className="text-gray-500 text-sm md:text-base mb-3">
              We bring you the events happening near you
            </p>

            {/* Main Heading */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
              Discover Local Happenings
            </h2>

            {/* Subheading */}
            <h3 className="text-xl md:text-2xl font-semibold text-cyan-400 mb-4">
              What Outing Station Does.
            </h3>

            {/* Description */}
            <p className="text-gray-600 text-base md:text-lg mb-8 leading-relaxed">
              Outing Station is a platform for discovering, browsing, and managing diverse events, from local gatherings to virtual webinars, with features like city-based search, category filters, and detailed event information.
            </p>

            {/* Feature List */}
            <div className="space-y-6 mb-10">
              <div className="flex gap-4">
                <div className="w-1 bg-cyan-400 flex-shrink-0"></div>
                <p className="text-gray-700 text-sm md:text-base">
                  Quickly find diverse events, from university gatherings to virtual webinars, happening nearby or online
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1 bg-cyan-400 flex-shrink-0"></div>
                <p className="text-gray-700 text-sm md:text-base">
                  Filter events by category, city, date, and price to pinpoint exactly what you're looking for.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1 bg-cyan-400 flex-shrink-0"></div>
                <p className="text-gray-700 text-sm md:text-base">
                  Get all essential information, including location, time, and pricing, with convenient options to share or save events.
                </p>
              </div>
            </div>

            {/* Button */}
            <Link to="/events">
            <button className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow mx-auto lg:mx-0 block">
  View All Event
</button>

            </Link>
          </div>
        </div>
      </div>
    </section>

      {/* Categories */}
      <section className="py-2 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <CategoryGrid />
        </div>
      </section>

      {/* University Events */}
<section className="bg-gradient-to-br from-gray-100 to-gray-50 py-16 md:py-24 px-4 md:px-6">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

      {/* Images — TOP on mobile */}
      <div className="relative order-1 lg:order-1">
        {/* Main University Image */}
        <div className="rounded-3xl overflow-hidden shadow-2xl">
          <img 
            src={campusImage} 
            alt="University campus"
            className="w-full h-64 md:h-80 lg:h-96 object-cover"
          />
        </div>

        {/* Overlapping Students Image */}
        <div className="absolute bottom-0 right-0 lg:right-12 transform translate-y-8 w-64 md:w-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
          <img 
            src={studentsImage} 
            alt="Students hanging out"
            className="w-full h-48 md:h-56 object-cover"
          />
        </div>
      </div>

      {/* Text — BELOW images on mobile */}
      <div className="order-2 lg:order-2">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Discover University Events
        </h2>

        <p className="text-gray-600 text-base md:text-lg mb-8 leading-relaxed">
          From guest lectures to campus parties, find out what's happening at your school. Connect with your community and never miss a beat.
        </p>

        <Link 
  to="/campus-events"
  className="inline-block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow text-base md:text-lg"
>
  Select University
</Link>
      </div>

    </div>
  </div>
</section>


          {/* University List */}
          <div className="mt-12">
            <UniversitySelector />
          </div>
       

      {/* Featured Events */}
      <FeaturedEvents />

      {/* Webinar Section */}
      <WebinarSection />

      {/* How It Works */}
      <HowItWorks />

      <Footer />
    </div>
  );
}