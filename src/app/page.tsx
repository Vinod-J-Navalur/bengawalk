'use client';

import { useState } from 'react';

export default function Home() {
  const [routeNumber, setRouteNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!routeNumber) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ routeNumber }),
      });

      if (!response.ok) {
        throw new Error('Route not found');
      }

      // Create blob from response and download
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
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">
          BMTC Route Stop Finder
        </h1>
        
        <div className="space-y-4">
          <input
            type="text"
            value={routeNumber}
            onChange={(e) => setRouteNumber(e.target.value)}
            placeholder="Enter route number"
            className="w-full p-2 border rounded"
          />
          
          <button
            onClick={handleDownload}
            disabled={!routeNumber || loading}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {loading ? 'Generating PDF...' : 'Download Route Stops PDF'}
          </button>
        </div>
      </div>
    </main>
  );
}
