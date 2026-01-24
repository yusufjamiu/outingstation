import React from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, School } from "lucide-react";

const UniversitySelector = () => {
  const universities = [
    {
      name: "University of Lagos (Unilag)",
      location: "Lagos, Nigeria.",
      iconColor: "bg-blue-100 text-blue-600",
      slug: "university-of-lagos-unilag",
    },
    {
      name: "King Saud University (KSU)",
      location: "Riyadh, Saudi Arabia.",
      iconColor: "bg-green-100 text-green-600",
      slug: "king-saud-university-ksu",
    },
    {
      name: "University of Ibadan (UI)",
      location: "Ibadan, Nigeria.",
      iconColor: "bg-yellow-100 text-yellow-600",
      slug: "university-of-ibadan-ui",
    },
    {
      name: "University of Ghana (Legon)",
      location: "Accra, Ghana.",
      iconColor: "bg-purple-100 text-purple-600",
      slug: "university-of-ghana-legon",
    },
    {
      name: "Covenant University (CU)",
      location: "Ota, Nigeria.",
      iconColor: "bg-red-100 text-red-600",
      slug: "covenant-university-cu",
    },
    {
      name: "University of Ilorin (Unilorin)",
      location: "Ilorin, Nigeria.",
      iconColor: "bg-indigo-100 text-indigo-600",
      slug: "university-of-ilorin-unilorin",
    },
  ];

  return (
    <section className="bg-white py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {universities.map((uni, index) => (
            <Link
              key={index}
              to={`/campus?university=${uni.slug}`}
              className="border rounded-xl p-6 hover:shadow-lg transition"
            >
              <div className="flex gap-4">
                <div
                  className={`w-12 h-12 rounded-full ${uni.iconColor} flex items-center justify-center`}
                >
                  <School />
                </div>
                <div>
                  <h3 className="font-bold">{uni.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin size={14} /> {uni.location}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/campus-events"
            className="text-gray-600 flex justify-center gap-2"
          >
            Browse all universities <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UniversitySelector;
