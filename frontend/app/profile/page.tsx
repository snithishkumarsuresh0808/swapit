'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [wantedSkills, setWantedSkills] = useState<string[]>([]);
  const [wantedSkillInput, setWantedSkillInput] = useState('');
  const [availability, setAvailability] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [timeSlots, setTimeSlots] = useState({
    morning: false,
    afternoon: false,
    evening: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addWantedSkill = () => {
    if (wantedSkillInput.trim() && !wantedSkills.includes(wantedSkillInput.trim())) {
      setWantedSkills([...wantedSkills, wantedSkillInput.trim()]);
      setWantedSkillInput('');
    }
  };

  const removeWantedSkill = (skillToRemove: string) => {
    setWantedSkills(wantedSkills.filter(skill => skill !== skillToRemove));
  };

  const handleAvailabilityChange = (day: string) => {
    setAvailability(prev => ({ ...prev, [day]: !prev[day as keyof typeof prev] }));
  };

  const handleTimeSlotChange = (slot: string) => {
    setTimeSlots(prev => ({ ...prev, [slot]: !prev[slot as keyof typeof prev] }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (skills.length === 0) {
      setError('Please add at least one skill you have');
      return;
    }

    if (wantedSkills.length === 0) {
      setError('Please add at least one skill you want to learn');
      return;
    }

    const selectedDays = Object.entries(availability)
      .filter(([_, isSelected]) => isSelected)
      .map(([day]) => day);

    const selectedTimeSlots = Object.entries(timeSlots)
      .filter(([_, isSelected]) => isSelected)
      .map(([slot]) => slot);

    if (selectedDays.length === 0) {
      setError('Please select at least one day of availability');
      return;
    }

    if (selectedTimeSlots.length === 0) {
      setError('Please select at least one time slot');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/profile/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          skills,
          wanted_skills: wantedSkills,
          availability: selectedDays,
          time_slots: selectedTimeSlots,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile created successfully! AI is analyzing your skill graph...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
           
            <p className="mt-2 text-sm text-gray-600">
              Tell us about your skills and what you'd like to learn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Skills Section */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Skills
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white sm:text-sm"
                  placeholder="e.g., JavaScript, Python, Guitar"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm border border-indigo-200 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Wanted Skills Section */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Skills You Want to Learn
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={wantedSkillInput}
                  onChange={(e) => setWantedSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWantedSkill())}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white sm:text-sm"
                  placeholder="e.g., React, Machine Learning, Piano"
                />
                <button
                  type="button"
                  onClick={addWantedSkill}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {wantedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm border border-green-200 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeWantedSkill(skill)}
                      className="text-green-600 hover:text-green-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Availability Section */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Availability (Days)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <label
                    key={day}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={availability[day as keyof typeof availability]}
                      onChange={() => handleAvailabilityChange(day)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900 capitalize">
                      {day}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Slots Section */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Time Slots
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['morning', 'afternoon', 'evening'].map((slot) => (
                  <label
                    key={slot}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={timeSlots[slot as keyof typeof timeSlots]}
                      onChange={() => handleTimeSlotChange(slot)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900 capitalize">
                      {slot}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                Create Profile & Analyze Skills
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
