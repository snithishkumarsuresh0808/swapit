'use client';

import { useState, useEffect } from 'react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: {
    skills: string[];
    wantedSkills: string[];
    availability: { [key: string]: boolean };
    timeSlots: { [key: string]: boolean };
    images?: File[];
    videos?: File[];
  }) => void;
  initialData?: {
    skills: string[];
    wanted_skills: string[];
    availability: string[];
    time_slots: string[];
  };
  isEditing?: boolean;
}

export default function CreatePostModal({ isOpen, onClose, onSubmit, initialData, isEditing = false }: CreatePostModalProps) {
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
  const [images, setImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);

  // Populate form when editing
  useEffect(() => {
    if (initialData && isEditing) {
      setSkills(initialData.skills || []);
      setWantedSkills(initialData.wanted_skills || []);

      // Set availability
      const availabilityState = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      };
      initialData.availability?.forEach((day) => {
        availabilityState[day as keyof typeof availabilityState] = true;
      });
      setAvailability(availabilityState);

      // Set time slots
      const timeSlotsState = {
        morning: false,
        afternoon: false,
        evening: false,
      };
      initialData.time_slots?.forEach((slot) => {
        timeSlotsState[slot as keyof typeof timeSlotsState] = true;
      });
      setTimeSlots(timeSlotsState);
    }
  }, [initialData, isEditing, isOpen]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).filter(file => {
        // Validate image files
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`);
          return false;
        }
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large. Max size is 10MB`);
          return false;
        }
        return true;
      });
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newVideos = Array.from(e.target.files).filter(file => {
        // Validate video files
        if (!file.type.startsWith('video/')) {
          alert(`${file.name} is not a video file`);
          return false;
        }
        // Check file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} is too large. Max size is 50MB`);
          return false;
        }
        return true;
      });
      setVideos(prev => [...prev, ...newVideos]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      skills,
      wantedSkills,
      availability,
      timeSlots,
      images,
      videos
    });
    // Reset form
    setSkills([]);
    setSkillInput('');
    setWantedSkills([]);
    setWantedSkillInput('');
    setAvailability({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    });
    setTimeSlots({
      morning: false,
      afternoon: false,
      evening: false,
    });
    setImages([]);
    setVideos([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Post' : 'Create New Post'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <p className="text-sm text-gray-600">
            Tell us about your skills and what you'd like to learn
          </p>

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

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200 bg-gray-100"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded truncate">
                      {image.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Upload Videos
            </label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoUpload}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {videos.length > 0 && (
              <div className="mt-3 space-y-2">
                {videos.map((video, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <svg className="w-8 h-8 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium truncate">{video.name}</p>
                        <p className="text-xs text-gray-500">{(video.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all font-semibold"
            >
              Create Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
