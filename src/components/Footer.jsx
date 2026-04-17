import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Facebook, Instagram } from 'lucide-react';
import OutingStation from '../assets/image.png';
import GooglePlayImg from '../assets/google-play-badge.png';
import AppStoreImg from '../assets/app-store-badge.svg';

function GooglePlayBadge() {
  return (
    <a href="https://play.google.com/store/apps/details?id=com.outingstation" target="_blank" rel="noopener noreferrer">
      <img src={GooglePlayImg} alt="Get it on Google Play" className="h-9 w-auto" />
    </a>
  );
}

function AppStoreBadge() {
  return (
    <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
      <img src={AppStoreImg} alt="Download on the App Store" className="h-9 w-auto" />
    </a>
  );
}

function Footer() {
  return (
    <footer className="bg-cyan-600 text-white py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img src={OutingStation} alt="OutingStation" className="w-10 h-10 rounded-xl" />
              <span className="text-white font-bold text-xl">OutingStation</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              Discover events happening near you from local gatherings to virtual experiences.
            </p>
            <div className="flex flex-row gap-3 mt-2">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">

              <div>
                <h3 className="font-bold text-lg mb-4">Explore</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/events" className="hover:text-white transition">Browse Events</Link></li>
                  <li><Link to="/categories" className="hover:text-white transition">Categories</Link></li>
                  <li><Link to="/campus-events" className="hover:text-white transition">University Events</Link></li>
                  <li><Link to="/webinar-events" className="hover:text-white transition">Virtual & Webinar Events</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-4">Cities</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/city/lagos" className="hover:text-white transition">Lagos</Link></li>
                  <li><Link to="/city/abuja" className="hover:text-white transition">Abuja</Link></li>
                  <li><Link to="/city/ibadan" className="hover:text-white transition">Ibadan</Link></li>
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1">
                <h3 className="font-bold text-lg mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/about" className="hover:text-white transition">About OutingStation</Link></li>
                  <li><Link to="/how-it-works" className="hover:text-white transition">How It Works</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition">Contact Us</Link></li>
                  <li><Link to="/faqs" className="hover:text-white transition">FAQS</Link></li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mb-6"></div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex gap-6">
            <a href="https://x.com/OutingStation" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition"><Twitter size={22} /></a>
            <a href="https://www.linkedin.com/company/outingstation" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition"><Linkedin size={22} /></a>
            <a href="https://www.facebook.com/outingstation/" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition"><Facebook size={22} /></a>
            <a href="https://www.instagram.com/outingstation/" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition"><Instagram size={22} /></a>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/90">
            <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="/cookies" className="hover:text-white transition">Cookie Policy</Link>
          </div>
        </div>

        <div className="border-t border-white/20 mt-6 pt-6 text-center text-sm text-white/70">
          © {new Date().getFullYear()} OutingStation Limited. All rights reserved.
        </div>

      </div>
    </footer>
  );
}

export default Footer;