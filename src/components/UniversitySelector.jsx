import React from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, School } from "lucide-react";

const UniversitySelector = () => {
  const universities = [
    {
      name: "University of Lagos (Unilag)",
      location: "Lagos, Nigeria",
      iconColor: "bg-blue-100 text-blue-600",
      slug: "university-of-lagos-unilag",
    },
    {
      name: "Obafemi Awolowo University (OAU)",
      location: "Ile-Ife, Nigeria",
      iconColor: "bg-green-100 text-green-600",
      slug: "obafemi-awolowo-university-oau",
    },
    {
      name: "University of Ibadan (UI)",
      location: "Ibadan, Nigeria",
      iconColor: "bg-yellow-100 text-yellow-600",
      slug: "university-of-ibadan-ui",
    },
    {
      name: "Ahmadu Bello University (ABU)",
      location: "Zaria, Nigeria",
      iconColor: "bg-purple-100 text-purple-600",
      slug: "ahmadu-bello-university-abu",
    },
    {
      name: "Covenant University (CU)",
      location: "Ota, Nigeria",
      iconColor: "bg-red-100 text-red-600",
      slug: "covenant-university-cu",
    },
    {
      name: "University of Ilorin (Unilorin)",
      location: "Ilorin, Nigeria",
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
              to={`/campus-events?university=${encodeURIComponent(uni.name)}`}
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
            className="text-gray-600 flex justify-center gap-2 hover:text-cyan-500 transition"
          >
            Browse all universities <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UniversitySelector;