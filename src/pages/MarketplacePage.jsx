import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Palette, PawPrint, Gift, ShoppingBasket, Cake, CupSoda } from 'lucide-react';

export const MARKETPLACE_SECTIONS = [
  { type: 'Decorator', slug: 'decorator', label: 'Decorators', icon: Palette },
  { type: 'Livestock Seller', slug: 'livestock-seller', label: 'Livestock', icon: PawPrint },
  { type: 'Gift Vendor', slug: 'gift-vendor', label: 'Gift Vendors', icon: Gift },
  { type: 'Food Stuffs Seller', slug: 'food-stuffs-seller', label: 'Food Stuffs', icon: ShoppingBasket },
  { type: 'Baker', slug: 'baker', label: 'Bakers', icon: Cake },
  { type: 'Beverages Seller', slug: 'beverages-seller', label: 'Beverages', icon: CupSoda },
];

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Discover</p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Marketplace</h1>
          <p className="text-sm text-gray-500">Buy or book directly — pick a category to browse.</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto">
          {MARKETPLACE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.type}
                to={`/marketplace/${section.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 md:p-5 flex flex-col items-center justify-center text-center gap-2"
              >
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-100 rounded-full opacity-40 blur-xl group-hover:opacity-60 transition-opacity"></div>
                <Icon size={20} className="relative z-10 text-cyan-500" />
                <span className="relative z-10 font-bold text-gray-900 text-xs md:text-sm leading-tight">{section.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}