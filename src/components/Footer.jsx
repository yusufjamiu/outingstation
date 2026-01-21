import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Facebook } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

const Footer = () => {
  return (
    <footer className="bg-cyan-600 text-white py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Logo */}
          <div>
            <img
              src={OutingStation}
              alt="Outing Station"
              className="h-14 mb-6"
            />
          </div>

          {/* Links Wrapper */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">

              {/* Explore */}
              <div>
                <h3 className="font-bold text-lg mb-4">Explore</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/events">Browse Events</Link></li>
                  <li><Link to="/categories">Categories</Link></li>
                  <li><Link to="/university">University Events</Link></li>
                  <li><Link to="/webinars">Virtual & Webinar Events</Link></li>
                </ul>
              </div>

              {/* Cities */}
              <div>
                <h3 className="font-bold text-lg mb-4">Cities</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/city/lagos">Lagos</Link></li>
                  <li><Link to="/city/abuja">Abuja</Link></li>
                  <li><Link to="/city/ibadan">Ibadan</Link></li>
                  <li>
                    <Link to="/city/riyadh">
                      Riyadh <span className="text-white/80">View more..</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div className="col-span-2 md:col-span-1">
                <h3 className="font-bold text-lg mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-white/90">
                  <li><Link to="/about">About OutingStation</Link></li>
                  <li><Link to="/how-it-works">How It Works</Link></li>
                  <li><Link to="/contact">Contact Us</Link></li>
                  <li><Link to="/faqs">FAQS</Link></li>
                </ul>
              </div>

            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 mb-6"></div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 md:flex md:justify-between items-start md:items-center gap-6">

  {/* Social Icons — left on mobile */}
  <div className="flex gap-6">
    <a href="#" className="hover:text-white/80"><Twitter size={22} /></a>
    <a href="#" className="hover:text-white/80"><Linkedin size={22} /></a>
    <a href="#" className="hover:text-white/80"><Facebook size={22} /></a>
  </div>

  {/* Legal Links — right on mobile */}
  <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-sm text-white/90 text-right md:text-left">
    <Link to="/terms">Terms of Service</Link>
    <Link to="/privacy">Privacy Policy</Link>
    <Link to="/cookies">Cookie Policy</Link>
  </div>

</div>

      </div>
    </footer>
  );
};

export default Footer;
