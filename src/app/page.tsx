'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bus, Loader2, Download } from 'lucide-react';
import { routes } from './data/routes';

function App() {
  const [routeNumber, setRouteNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const filtered = routes.filter(suggestion =>
      suggestion.toLowerCase().includes(routeNumber.toLowerCase())
    );
    setFilteredSuggestions(filtered);
  }, [routeNumber]);

  const handleSearch = async () => {
    if (!routeNumber) return;
    setPreviewUrl('')
    setLoading(true);
    try {
      const response = await fetch(`/api/route?route=${routeNumber}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Route not found');
      }

      setPreviewUrl(`/api/route?route=${routeNumber}#toolbar=0`);
    } catch (error) {
      alert(`Error finding route information ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!routeNumber) return;
    
    setDownloading(true);
    try {
      const response = await fetch(`/api/route?route=${routeNumber}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Route not found');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `route-${routeNumber}-stops.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error downloading route information ${error}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-block p-3 bg-blue-500 rounded-full mb-4">
              <Bus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              BMTC Route Finder
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Find and download bus stop information for any route
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={routeNumber}
                onChange={(e) => {
                  setRouteNumber(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Enter route number (e.g., 500K)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 text-gray-900 rounded-xl 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          placeholder:text-gray-400
                          outline-none transition-all duration-200
                          text-sm sm:text-base"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
                >
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50 transition-colors duration-150
                                text-sm sm:text-base"
                      onClick={() => {
                        setRouteNumber(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSearch}
                disabled={!routeNumber || loading}
                className="bg-blue-500 text-white rounded-xl py-2.5 sm:py-3 font-medium 
                          transition-all duration-200 hover:bg-blue-600 
                          disabled:bg-gray-200 disabled:cursor-not-allowed 
                          text-sm sm:text-base
                          flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search Route
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                disabled={!routeNumber || downloading || !previewUrl}
                className="bg-green-500 text-white rounded-xl py-2.5 sm:py-3 font-medium 
                          transition-all duration-200 hover:bg-green-600 
                          disabled:bg-gray-200 disabled:cursor-not-allowed 
                          text-sm sm:text-base
                          flex items-center justify-center gap-2"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Frame */}
          {previewUrl && (
            <div className="mt-6 sm:mt-8 rounded-2xl overflow-hidden shadow-lg bg-white">
              <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600">Route Preview</h2>
              </div>
              <iframe 
                src={previewUrl}
                width="100%" height="100%"
                // style="border: none; position: absolute; top: 0; left: 0;"
                className="w-full h-[300px] sm:h-[400px] border-0"
                title="Route Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
